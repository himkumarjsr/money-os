import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function authorizeRequest(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const isValidCron =
    !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  return isValidCron || isVercelCron;
}

async function handleReminders(req: NextRequest) {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase env" },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;

    const { data: obligations, error } = await supabaseAdmin
      .from("financial_obligations")
      .select("*")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!obligations?.length) {
      return NextResponse.json({ success: true, reminded: 0 });
    }

    let reminded = 0;

    for (const ob of obligations as Array<{
      user_id: string;
      title: string;
      amount: number;
      frequency: string;
      due_day?: number | null;
      due_month?: number | null;
      remind_days_before?: number | null;
      category?: string | null;
    }>) {
      const remindBefore = ob.remind_days_before ?? 7;
      let shouldRemind = false;

      if (ob.frequency === "monthly") {
        const daysUntilDue = (ob.due_day || 1) - todayDay;
        shouldRemind = daysUntilDue === remindBefore;
      } else if (
        ob.frequency === "yearly" &&
        (ob.due_month == null || ob.due_month === todayMonth)
      ) {
        const daysUntilDue = (ob.due_day || 1) - todayDay;
        shouldRemind = daysUntilDue === remindBefore;
      }

      if (!shouldRemind) continue;

      const emoji = (ob.category || "").startsWith("insurance")
        ? "🛡️"
        : (ob.category || "").startsWith("loan")
          ? "🏦"
          : (ob.category || "").startsWith("investment")
            ? "📈"
            : "📌";

      const { error: insertErr } = await supabaseAdmin
        .from("user_notifications")
        .insert({
          user_id: ob.user_id,
          title: `${ob.title} due in ${remindBefore} days`,
          content: `Keep ₹${Number(ob.amount || 0).toLocaleString("en-IN")} ready for your ${ob.title}. Due on day ${ob.due_day || ob.due_month || "—"}.`,
          emoji,
          category: "obligation_reminder",
          is_read: false,
          shown_as_popup: false,
        });

      if (!insertErr) reminded += 1;
    }

    return NextResponse.json({ success: true, reminded });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleReminders(req);
}

export async function GET(req: NextRequest) {
  return handleReminders(req);
}
