import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public, sanitized snippets — backed by `app_feedback` (RLS blocks direct anon reads). */
export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data: rows, error } = await admin
      .from("app_feedback")
      .select("id, rating, message, created_at, user_id, answers")
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("testimonials query:", error);
      return NextResponse.json({ testimonials: [] });
    }

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await admin.from("users").select("id, name").in("id", userIds);
    const nameById = new Map((profiles ?? []).map((p: { id: string; name: string | null }) => [p.id, p.name]));

    const testimonials = (rows ?? []).map((r) => {
      const answers = (r.answers ?? {}) as Record<string, unknown>;
      const scoreRaw = answers.score_at_time ?? answers.score;
      let score_at_time = 0;
      if (typeof scoreRaw === "number" && Number.isFinite(scoreRaw)) score_at_time = scoreRaw;
      else if (typeof scoreRaw === "string") {
        const n = Number(scoreRaw);
        if (Number.isFinite(n)) score_at_time = n;
      }
      const nm = nameById.get(r.user_id);
      return {
        id: r.id,
        rating: r.rating,
        message: r.message,
        user_name: (typeof nm === "string" && nm.trim()) || "Finkoin User",
        user_city: typeof answers.user_city === "string" ? answers.user_city : "",
        user_profession: typeof answers.user_profession === "string" ? answers.user_profession : "",
        score_at_time,
        created_at: r.created_at,
      };
    });

    return NextResponse.json({ testimonials });
  } catch (e) {
    console.error("testimonials GET:", e);
    return NextResponse.json({ testimonials: [] });
  }
}
