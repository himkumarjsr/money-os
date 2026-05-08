import { mirrorFeedbackToGoogleForm } from "@/lib/googleFeedbackForm";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  context: z.string().max(160).optional(),
  area: z.string().max(80),
  highlights: z.string().max(4000).optional().default(""),
  improvements: z.string().max(4000).optional().default(""),
  recommend: z.enum(["yes", "maybe", "no"]),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json(
      { error: "SIGN_IN_REQUIRED", message: "Sign in to send feedback." },
      { status: 401 },
    );
  }

  const { rating, context, area, highlights, improvements, recommend } = parsed.data;

  const hl = highlights.trim();
  const im = improvements.trim();
  const parts: string[] = [];
  parts.push(`Area: ${area}`);
  if (hl) parts.push(`What worked:\n${hl}`);
  if (im) parts.push(`To improve:\n${im}`);
  parts.push(`Recommend: ${recommend}`);
  const message = parts.join("\n\n---\n\n");

  const answers = {
    area,
    highlights: hl,
    improvements: im,
    recommend,
  };

  const { error } = await supabase.from("app_feedback").insert({
    user_id: user.id,
    rating,
    message,
    context: context?.trim() || null,
    recommend,
    answers,
  });

  if (error) {
    console.error("app_feedback insert:", error);
    return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });
  }

  void mirrorFeedbackToGoogleForm({
    rating,
    area,
    highlights: hl,
    improvements: im,
    recommend,
    context: context?.trim() || "",
    userId: user.id,
  });

  return NextResponse.json({ ok: true });
}
