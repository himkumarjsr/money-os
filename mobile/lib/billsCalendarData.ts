/**
 * Supabase reads/writes for the Bills screen - port of web
 * lib/billsCalendarData.ts. The date logic lives in lib/billsCalendar.ts;
 * this file only loads its inputs and records paid / skipped for a month.
 */

import type {
  BillCard,
  BillChecklistRow,
  BillItem,
  BillObligation,
  BillPolicy,
} from "@/lib/billsCalendar";
import { monthKey, monthOf } from "@/lib/billsCalendar";
import { getSupabase } from "@/lib/supabase";
import { loadCreditCardsMerged } from "@/lib/trackerCreditCards";
import { fetchUserPolicies } from "@/lib/policyVault";

export type BillsData = {
  obligations: BillObligation[];
  checklist: BillChecklistRow[];
  cards: BillCard[];
  policies: BillPolicy[];
  /** Month the user joined (YYYY-MM-01): the calendar goes back no further. */
  joinedMonth: string | null;
};

function toObligation(row: Record<string, unknown>): BillObligation {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    category: String(row.category ?? "other"),
    amount: Number(row.amount ?? 0),
    frequency: String(row.frequency ?? "monthly"),
    due_day: row.due_day == null ? null : Number(row.due_day),
    due_month: row.due_month == null ? null : Number(row.due_month),
    due_date: row.due_date == null ? null : String(row.due_date).slice(0, 10),
    end_month:
      row.end_month == null ? null : String(row.end_month).slice(0, 10),
    start_month: monthOf(
      row.created_at == null ? null : String(row.created_at),
    ),
    is_active: row.is_active !== false,
  };
}

function toChecklistRow(row: Record<string, unknown>): BillChecklistRow {
  const status = String(row.status ?? "pending");
  return {
    id: String(row.id ?? ""),
    obligation_id: String(row.obligation_id ?? ""),
    checklist_month: String(row.checklist_month ?? "").slice(0, 10),
    status:
      status === "paid" || status === "skipped" || status === "auto_debit"
        ? status
        : "pending",
    expected_amount:
      row.expected_amount == null ? null : Number(row.expected_amount),
    paid_amount: row.paid_amount == null ? null : Number(row.paid_amount),
  };
}

/**
 * Everything the calendar needs for one month. Each source fails soft: a
 * missing card or policy table shows the rest of the calendar.
 */
export async function loadBillsData(
  userId: string,
  year: number,
  monthIndex: number,
): Promise<BillsData> {
  const supabase = getSupabase();
  const month = monthKey(year, monthIndex);

  // Create the month's checklist rows so paid / skipped can be recorded.
  // Past months are left alone: generating them now would add bills that
  // only started later (setBillStatus creates a row when one is marked).
  const now = new Date();
  if (year * 12 + monthIndex >= now.getFullYear() * 12 + now.getMonth()) {
    const { error: rpcError } = await supabase.rpc(
      "generate_monthly_checklist",
      { p_user_id: userId, p_month: month },
    );
    if (rpcError) console.error("bills: generate checklist", rpcError);
  }

  const [obRes, rowRes, cards, policyRes, sessionRes] = await Promise.all([
    supabase
      .from("financial_obligations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("obligation_checklist")
      .select("*")
      .eq("user_id", userId)
      .eq("checklist_month", month),
    loadCreditCardsMerged(userId).catch(() => []),
    fetchUserPolicies(userId).catch(() => ({ policies: [], error: null })),
    supabase.auth.getSession().catch(() => null),
  ]);

  if (obRes.error) throw new Error(obRes.error.message);

  return {
    obligations: (obRes.data ?? []).map((r) =>
      toObligation(r as Record<string, unknown>),
    ),
    checklist: rowRes.error
      ? []
      : (rowRes.data ?? []).map((r) =>
          toChecklistRow(r as Record<string, unknown>),
        ),
    cards: cards.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      last4: c.last4,
      dueDay: c.dueDay,
    })),
    policies: policyRes.policies.map((p) => ({
      id: p.id,
      insurerName: p.insurerName,
      planName: p.planName,
      premiumAmount: p.premiumAmount,
      renewalDate: p.renewalDate,
      status: p.status,
    })),
    joinedMonth: monthOf(sessionRes?.data.session?.user.created_at),
  };
}

/**
 * Record an obligation as paid / skipped / pending for the month it falls in.
 * Creates the checklist row when the month's row doesn't exist yet (e.g. a
 * quarterly bill before migration 054 is applied).
 */
export async function setBillStatus(
  userId: string,
  item: BillItem,
  status: "paid" | "skipped" | "pending",
): Promise<void> {
  if (item.kind !== "obligation" || !item.obligationId) return;
  const supabase = getSupabase();
  const paid = status === "paid";
  const patch = {
    status,
    paid_at: paid ? new Date().toISOString() : null,
    paid_amount: paid ? (item.amount ?? 0) : null,
  };
  if (item.checklistId) {
    const { error } = await supabase
      .from("obligation_checklist")
      .update(patch)
      .eq("id", item.checklistId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("obligation_checklist").upsert(
    {
      user_id: userId,
      obligation_id: item.obligationId,
      checklist_month: `${item.date.slice(0, 7)}-01`,
      expected_amount: item.amount ?? 0,
      ...patch,
    },
    { onConflict: "user_id,obligation_id,checklist_month" },
  );
  if (error) throw new Error(error.message);
}
