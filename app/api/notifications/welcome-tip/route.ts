import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient, getSupabaseAdmin } from "@/lib/supabaseServer";

const DEFAULT_TITLE = "Daily Finance Tip";
const DEFAULT_CONTENT =
  "Track your expenses today and align your spending with your monthly goals.";

export async function POST() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 503 });
    }
    if (!process.env.EMAIL_FROM) {
      return NextResponse.json({ error: "Missing EMAIL_FROM" }, { status: 503 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing Supabase env" }, { status: 503 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
    }

    const toEmail = user.email?.trim();
    if (!toEmail?.includes("@")) {
      return NextResponse.json({ error: "NO_EMAIL_ON_ACCOUNT" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: pref, error: prefErr } = await admin
      .from("notification_preferences")
      .select("email_consent, morning_tips")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefErr) throw prefErr;
    if (!pref?.email_consent || !pref?.morning_tips) {
      return NextResponse.json({ error: "NOT_SUBSCRIBED" }, { status: 403 });
    }

    const dayOfWeek = new Date().getDay();
    const { data: tip, error: tipError } = await admin
      .from("finance_tips")
      .select("title, content")
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (tipError) throw tipError;

    const title = tip?.title ?? DEFAULT_TITLE;
    const content = tip?.content ?? DEFAULT_CONTENT;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `Finkoin Tips <${process.env.EMAIL_FROM}>`,
      to: toEmail,
      subject: `You're subscribed — 💰 ${title}`,
      html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#111110;border-radius:12px;padding:10px 14px;color:#fff;font-size:12px;font-weight:700;margin-bottom:14px;">
              You're subscribed to daily finance tips
            </div>
            <div style="background:#534AB7;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <div style="font-size:40px;margin-bottom:8px;">FK</div>
              <div style="color:rgba(255,255,255,0.8);font-size:14px;">Here's today's tip</div>
            </div>
            <h2 style="font-size:22px;font-weight:800;color:#111110;margin-bottom:12px;">${title}</h2>
            <p style="font-size:16px;color:#5F5E5A;line-height:1.7;margin-bottom:24px;">${content}</p>
            <p style="font-size:14px;color:#5F5E5A;line-height:1.6;margin-bottom:24px;">
              You'll also get a short tip by email each morning. Manage this anytime in Settings.
            </p>
            <a href="https://finkoin.com/settings" style="display:block;background:#534AB7;color:white;text-decoration:none;padding:14px;border-radius:10px;text-align:center;font-weight:700;font-size:15px;margin-bottom:24px;">
              Notification settings →
            </a>
            <div style="border-top:1px solid #E8E6F0;padding-top:16px;font-size:11px;color:#9B9A94;text-align:center;">
              Finkoin · finkoin.com<br/>
              Educational content only. Not investment advice.
            </div>
          </body>
          </html>
        `,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("welcome-tip error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
