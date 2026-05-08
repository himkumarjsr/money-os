import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    if (!process.env.EMAIL_FROM) {
      return NextResponse.json({ error: "Missing EMAIL_FROM" }, { status: 500 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const dayOfWeek = new Date().getDay();

    const { data: tip, error: tipError } = await supabaseAdmin
      .from("finance_tips")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (tipError) throw tipError;

    const tipTitle = tip?.title ?? "Daily Finance Tip";
    const tipContent =
      tip?.content ??
      "Track your expenses today and align your spending with your monthly goals.";

    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from("notification_preferences")
      .select("user_id")
      .eq("email_consent", true)
      .eq("morning_tips", true);

    if (subscribersError) throw subscribersError;
    if (!subscribers?.length) return NextResponse.json({ message: "No subscribers" });

    const userIds = Array.from(new Set(subscribers.map((s) => s.user_id)));

    const { data: profileRows, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, name")
      .in("id", userIds);

    if (usersError) throw usersError;

    const emailByUserId = new Map<string, string>();
    for (const row of profileRows ?? []) {
      const em = typeof row.email === "string" ? row.email.trim() : "";
      if (em.includes("@")) emailByUserId.set(row.id, em);
    }

    for (const uid of userIds) {
      if (emailByUserId.has(uid)) continue;
      try {
        const { data: authData, error: authLookupErr } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (authLookupErr) {
          console.warn("send-daily-tip: auth lookup failed", uid, authLookupErr.message);
          continue;
        }
        const em = authData.user?.email?.trim();
        if (em && em.includes("@")) emailByUserId.set(uid, em);
      } catch (e) {
        console.warn("send-daily-tip: getUserById threw", uid, e);
      }
    }

    if (emailByUserId.size === 0) {
      return NextResponse.json({ message: "No subscribers with resolvable email" });
    }

    let sent = 0;
    for (const email of Array.from(emailByUserId.values())) {
      await resend.emails.send({
        from: `Finkoin Tips <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `💰 ${tipTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#534AB7;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <div style="font-size:40px;margin-bottom:8px;">FK</div>
              <div style="color:rgba(255,255,255,0.8);font-size:14px;">Your daily finance tip</div>
            </div>
            <h2 style="font-size:22px;font-weight:800;color:#111110;margin-bottom:12px;">${tipTitle}</h2>
            <p style="font-size:16px;color:#5F5E5A;line-height:1.7;margin-bottom:24px;">${tipContent}</p>
            <a href="https://finkoin.com/analyse" style="display:block;background:#534AB7;color:white;text-decoration:none;padding:14px;border-radius:10px;text-align:center;font-weight:700;font-size:15px;margin-bottom:24px;">
              Check my financial health →
            </a>
            <div style="border-top:1px solid #E8E6F0;padding-top:16px;font-size:11px;color:#9B9A94;text-align:center;">
              Finkoin · finkoin.com<br/>
              Educational content only. Not investment advice.<br/>
              <a href="https://finkoin.com/settings" style="color:#534AB7;">Unsubscribe</a>
            </div>
          </body>
          </html>
        `,
      });
      sent += 1;
    }

    return NextResponse.json({
      success: true,
      sent,
      tip: tipTitle,
    });
  } catch (err: any) {
    console.error("Send tip error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
