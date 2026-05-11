import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    console.log("Feedback API: received", JSON.stringify(body));

    const user_id = typeof body.user_id === "string" ? body.user_id : null;
    const rating = body.rating;
    const message = typeof body.message === "string" ? body.message : "";
    const page_context = typeof body.page_context === "string" ? body.page_context : "app";
    const scoreRaw = body.score_at_time;
    const scoreNum = scoreRaw != null && scoreRaw !== "" ? Number(scoreRaw) : NaN;

    if (rating == null || Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json({ error: "Rating 1 to 5 required" }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      rating: Number(rating),
      message: message?.trim() || null,
      page_context: page_context || "app",
      score_at_time: Number.isFinite(scoreNum) ? scoreNum : null,
      is_approved: false,
      is_featured: false,
    };

    if (user_id && UUID_RE.test(user_id)) {
      insertData.user_id = user_id;
    }

    console.log("Feedback API: inserting", JSON.stringify(insertData));

    const { data, error } = await supabaseAdmin.from("feedback").insert(insertData).select().single();

    if (error) {
      console.error("Feedback API DB error:", error.code, error.message, error.details);
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 500 },
      );
    }

    console.log("Feedback API: success", data?.id);

    let fkAwarded = 0;
    if (user_id && UUID_RE.test(user_id)) {
      try {
        const ref = page_context || "app";
        const { data: already } = await supabaseAdmin
          .from("fk_transactions")
          .select("id")
          .eq("user_id", user_id)
          .eq("reason", "feedback_submitted")
          .eq("reference_id", ref)
          .maybeSingle();

        if (!already) {
          const { data: gam } = await supabaseAdmin
            .from("gamification")
            .select("fk_balance, total_earned")
            .eq("user_id", user_id)
            .maybeSingle();

          await supabaseAdmin.from("gamification").upsert(
            {
              user_id,
              fk_balance: (Number(gam?.fk_balance) || 0) + 50,
              total_earned: (Number(gam?.total_earned) || 0) + 50,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

          await supabaseAdmin.from("fk_transactions").insert({
            user_id,
            amount: 50,
            reason: "feedback_submitted",
            reference_id: ref,
          });
          fkAwarded = 50;
        }
      } catch (fkErr) {
        console.error("FK award error:", fkErr);
      }
    }

    return NextResponse.json({
      success: true,
      feedback_id: data?.id,
      fk_awarded: fkAwarded,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Feedback API catch:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select(
        `
          id,
          rating,
          message,
          user_name,
          user_city,
          user_profession,
          score_at_time,
          created_at
        `,
      )
      .eq("is_approved", true)
      .eq("is_featured", true)
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      testimonials: data || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
