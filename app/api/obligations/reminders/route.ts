import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendExpoPushToUser } from "@/lib/expoPush";
import {
  SETTLED_CHECKLIST_STATUSES,
  buildObligationReminderCopy,
  checklistMonthFor,
  obligationReminderDueDate,
  obligationReminderEmoji,
  shouldSendObligationReminder,
} from "@/lib/obligationReminders";
import { hasNamedPaymentForCycle } from "@/lib/obligationReminderPopup";
import {
  PLANNED_INVESTMENTS_TABLE,
  PLANNED_REMINDER_CATEGORY,
  isPlannedReminderDue,
  monthStart,
  plannedReminderCopy,
} from "@/lib/plannedInvestments";
import { sendWebPushToUser } from "@/lib/webPush";

/** One reminder per user per start month for consented planned investments. */
async function sendPlannedInvestmentReminders(
  admin: SupabaseClient,
  today: Date,
): Promise<number> {
  const { data: rows, error } = await admin
    .from(PLANNED_INVESTMENTS_TABLE)
    .select("id, user_id, start_month, status, reminded_at")
    .eq("status", "pending")
    .is("reminded_at", null)
    .lte("start_month", monthStart(today, 1));
  if (error) {
    console.error("planned reminders: read failed", error.message);
    return 0;
  }

  const groups = new Map<string, { userId: string; startMonth: string; ids: string[] }>();
  for (const r of (rows ?? []) as Array<{
    id: string;
    user_id: string;
    start_month: string;
    status: "pending";
    reminded_at: string | null;
  }>) {
    const startMonth = String(r.start_month).slice(0, 10);
    if (!isPlannedReminderDue({ ...r, start_month: startMonth }, today)) continue;
    const key = `${r.user_id}|${startMonth}`;
    const g = groups.get(key) ?? { userId: r.user_id, startMonth, ids: [] };
    g.ids.push(r.id);
    groups.set(key, g);
  }

  let sent = 0;
  for (const g of Array.from(groups.values())) {
    // Claim first so an overlapping run can't double-send.
    const { data: claimed, error: claimErr } = await admin
      .from(PLANNED_INVESTMENTS_TABLE)
      .update({ reminded_at: new Date().toISOString() })
      .in("id", g.ids)
      .is("reminded_at", null)
      .select("id");
    if (claimErr || !claimed?.length) continue;

    const copy = plannedReminderCopy(claimed.length, g.startMonth);
    const { error: insertErr } = await admin.from("user_notifications").insert({
      user_id: g.userId,
      title: copy.title,
      content: copy.body,
      emoji: "📈",
      category: PLANNED_REMINDER_CATEGORY,
      is_read: false,
      shown_as_popup: false,
    });
    if (insertErr) continue;
    const payload = {
      title: copy.title,
      body: copy.body,
      url: "/tracker",
      tag: `planned-${g.startMonth}`,
    };
    await Promise.all([
      sendWebPushToUser(admin, g.userId, payload),
      sendExpoPushToUser(admin, g.userId, payload),
    ]);
    sent += 1;
  }
  return sent;
}

function authorizeRequest(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  // Vercel Cron sends this header when CRON_SECRET is set. Don't trust
  // x-vercel-cron: any client can send it.
  return (
    !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
  );
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
    const plannedReminded = await sendPlannedInvestmentReminders(
      supabaseAdmin,
      today,
    );

    const { data: obligations, error } = await supabaseAdmin
      .from("financial_obligations")
      .select("*")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!obligations?.length) {
      return NextResponse.json({ success: true, reminded: 0, plannedReminded });
    }

    // Reminders target a due date this month or next; skip cycles already settled.
    const { data: settledRows, error: settledErr } = await supabaseAdmin
      .from("obligation_checklist")
      .select("obligation_id, checklist_month")
      .in("checklist_month", [
        checklistMonthFor(today),
        checklistMonthFor(
          new Date(today.getFullYear(), today.getMonth() + 1, 1),
        ),
      ])
      .in("status", [...SETTLED_CHECKLIST_STATUSES]);
    if (settledErr) {
      return NextResponse.json({ error: settledErr.message }, { status: 500 });
    }
    const settled = new Set(
      (settledRows ?? []).map(
        (r) => `${r.obligation_id}|${String(r.checklist_month).slice(0, 10)}`,
      ),
    );

    let reminded = 0;

    for (const ob of obligations as Array<{
      id: string;
      user_id: string;
      title: string;
      amount: number;
      frequency: string;
      due_day?: number | null;
      due_month?: number | null;
      remind_days_before?: number | null;
      category?: string | null;
    }>) {
      if (!shouldSendObligationReminder(ob, today)) continue;
      const due = obligationReminderDueDate(ob, today);
      if (due && settled.has(`${ob.id}|${checklistMonthFor(due)}`)) continue;
      if (
        due &&
        (await hasNamedPaymentForCycle(
          supabaseAdmin,
          ob.user_id,
          ob.title,
          due,
        ))
      ) {
        continue;
      }

      const remindBefore = ob.remind_days_before ?? 7;
      const { title, content } = buildObligationReminderCopy(ob, remindBefore);

      const { error: insertErr } = await supabaseAdmin
        .from("user_notifications")
        .insert({
          user_id: ob.user_id,
          title,
          content,
          emoji: obligationReminderEmoji(ob.category),
          category: "obligation_reminder",
          is_read: false,
          shown_as_popup: false,
        });

      if (!insertErr) reminded += 1;
    }

    return NextResponse.json({ success: true, reminded, plannedReminded });
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
