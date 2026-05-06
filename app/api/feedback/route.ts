import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().max(8000).optional().default(""),
  context: z.string().max(160).optional(),
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

  const { rating, message, context } = parsed.data;

  const { error } = await supabase.from("app_feedback").insert({
    user_id: user.id,
    rating,
    message: message.trim(),
    context: context?.trim() || null,
  });

  if (error) {
    console.error("app_feedback insert:", error);
    return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
