import { encryptSensitiveFields, decrypt, hashData } from "@/lib/encryption";
import {
  getAuthedUser,
  rateLimit,
  tooManyRequests,
  unauthorized,
} from "@/lib/apiGuard";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) return unauthorized();

    const limit = rateLimit(
      `financial-data-post:${user.id}`,
      30,
      60 * 60 * 1000,
    );
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const body = await req.json();
    const submission = body?.submission;
    if (!submission || typeof submission !== "object") {
      return NextResponse.json(
        { error: "Missing submission" },
        { status: 400 },
      );
    }

    if (!process.env.ENCRYPTION_KEY) {
      // Optional encrypted vault — analyse snapshot is the source of truth.
      console.warn(
        "Financial data save skipped: ENCRYPTION_KEY not set in env",
      );
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "encryption_unavailable",
      });
    }

    const encrypted = encryptSensitiveFields(
      submission as Record<string, unknown>,
    );
    const hash = hashData(submission as object);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("user_financial_data").upsert(
      {
        user_id: user.id,
        encrypted_data: encrypted.encryptedData,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        encryption_version: encrypted.version,
        data_hash: hash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Save failed";
    console.error("Financial data save error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) return unauthorized();

    const limit = rateLimit(
      `financial-data-get:${user.id}`,
      60,
      60 * 60 * 1000,
    );
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ data: null, skipped: true });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("user_financial_data")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ data: null });
    }

    const decrypted = decrypt(
      data.encrypted_data as string,
      data.iv as string,
      data.auth_tag as string,
    );

    return NextResponse.json({ data: decrypted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Load failed";
    console.error("Financial data load error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
