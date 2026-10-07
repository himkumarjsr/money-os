/**
 * Planned investments: reminders + Tracker line items created from the Fix Plan
 * after explicit consent. Nothing is ever invested, debited or moved — the user
 * starts each SIP themselves and marks it started. Rows live only in
 * `user_planned_investments` (owner-only RLS); nothing is cached on-device.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoalItem } from "@/lib/priorityEngine";

export const PLANNED_INVESTMENTS_TABLE = "user_planned_investments";
export const PLANNED_CONSENT_VERSION = "v1";
/** Remind this many days before the start month begins. */
export const PLANNED_REMIND_DAYS_BEFORE = 3;
export const PLANNED_REMINDER_CATEGORY = "planned_investment_reminder";

export type PlannedStatus = "pending" | "started" | "done";

export type PlannedInvestment = {
  id: string;
  user_id: string;
  source_kind: "goal" | "priority";
  source_id: string;
  source_label: string;
  instrument_key: string;
  instrument_label: string;
  monthly_amount: number;
  /** YYYY-MM-01 */
  start_month: string;
  consent_given_at: string;
  consent_version: string;
  status: PlannedStatus;
  started_at: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannedInvestmentDraft = Pick<
  PlannedInvestment,
  | "source_kind"
  | "source_id"
  | "source_label"
  | "instrument_key"
  | "instrument_label"
  | "monthly_amount"
  | "start_month"
>;

const pad = (n: number) => String(n).padStart(2, "0");

/** First day of the month `offset` months from `now`, as YYYY-MM-01 (local calendar). */
export function monthStart(now: Date, offset = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

export function formatStartMonth(startMonth: string): string {
  const [y, m] = startMonth.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

/** One draft per instrument slice of every funded goal. */
export function buildPlannedDrafts(
  goals: GoalItem[] | undefined,
  startMonth: string,
): PlannedInvestmentDraft[] {
  const out: PlannedInvestmentDraft[] = [];
  for (const g of goals ?? []) {
    if (!g.goalId || !g.allocation) continue;
    for (const s of g.allocation.slices) {
      if (s.monthly <= 0) continue;
      out.push({
        source_kind: "goal",
        source_id: g.goalId,
        source_label: (g.label ?? g.goalType).slice(0, 120),
        instrument_key: s.key,
        instrument_label: s.label,
        monthly_amount: Math.round(s.monthly),
        start_month: startMonth,
      });
    }
  }
  return out;
}

export type GoalPlanProgress = {
  total: number;
  started: number;
  /** Earliest start month among rows still pending. */
  nextStart: string | null;
};

/** Per source (goal) progress for the Fix Plan: started counts done too. */
export function plannedProgressBySource(
  rows: PlannedInvestment[],
): Record<string, GoalPlanProgress> {
  const out: Record<string, GoalPlanProgress> = {};
  for (const r of rows) {
    const p = (out[r.source_id] ??= { total: 0, started: 0, nextStart: null });
    p.total += 1;
    if (r.status === "pending") {
      if (!p.nextStart || r.start_month < p.nextStart) p.nextStart = r.start_month;
    } else {
      p.started += 1;
    }
  }
  return out;
}

/** Pending, not yet reminded, and the start month begins within the reminder window (or already began). */
export function isPlannedReminderDue(
  row: Pick<PlannedInvestment, "status" | "reminded_at" | "start_month">,
  today: Date,
): boolean {
  if (row.status !== "pending" || row.reminded_at) return false;
  const [y, m] = row.start_month.split("-").map(Number);
  if (!y || !m) return false;
  const start = new Date(y, m - 1, 1);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((start.getTime() - startOfToday.getTime()) / 86_400_000);
  return days <= PLANNED_REMIND_DAYS_BEFORE;
}

/** Notification copy deliberately carries no rupee amounts (lock screens, shared devices). */
export function plannedReminderCopy(count: number, startMonth: string) {
  return {
    title: "Time to start your planned investments",
    body: `${count} planned ${count === 1 ? "investment starts" : "investments start"} in ${formatStartMonth(startMonth)}. Nothing is invested automatically — open Tracker to see them and mark each one started.`,
  };
}

export async function fetchPlannedInvestments(
  sb: SupabaseClient,
  userId: string,
): Promise<PlannedInvestment[]> {
  const { data, error } = await sb
    .from(PLANNED_INVESTMENTS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("source_label", { ascending: true })
    .order("monthly_amount", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PlannedInvestment[];
}

/**
 * Write the consented plan. Existing rows keep their status (a started SIP
 * stays started) and get the new amount; pending rows that are no longer in
 * the plan are removed. Started rows are never deleted here.
 */
export async function savePlannedInvestments(
  sb: SupabaseClient,
  userId: string,
  drafts: PlannedInvestmentDraft[],
  now: Date = new Date(),
): Promise<void> {
  const consentAt = now.toISOString();
  if (drafts.length > 0) {
    const { error } = await sb.from(PLANNED_INVESTMENTS_TABLE).upsert(
      drafts.map((d) => ({
        ...d,
        user_id: userId,
        consent_given_at: consentAt,
        consent_version: PLANNED_CONSENT_VERSION,
        reminded_at: null,
        updated_at: consentAt,
      })),
      { onConflict: "user_id,source_id,instrument_key" },
    );
    if (error) throw new Error(error.message);
  }

  const keep = new Set(drafts.map((d) => `${d.source_id}|${d.instrument_key}`));
  const { data: pending, error: readErr } = await sb
    .from(PLANNED_INVESTMENTS_TABLE)
    .select("id, source_id, instrument_key")
    .eq("user_id", userId)
    .eq("status", "pending");
  if (readErr) throw new Error(readErr.message);
  const stale = (pending ?? [])
    .filter((r) => !keep.has(`${r.source_id}|${r.instrument_key}`))
    .map((r) => r.id as string);
  if (stale.length > 0) {
    const { error } = await sb
      .from(PLANNED_INVESTMENTS_TABLE)
      .delete()
      .eq("user_id", userId)
      .in("id", stale);
    if (error) throw new Error(error.message);
  }
}

export async function setPlannedInvestmentStatus(
  sb: SupabaseClient,
  userId: string,
  id: string,
  status: PlannedStatus,
  now: Date = new Date(),
): Promise<void> {
  const { error } = await sb
    .from(PLANNED_INVESTMENTS_TABLE)
    .update({
      status,
      started_at: status === "pending" ? null : now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePlannedInvestment(
  sb: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await sb
    .from(PLANNED_INVESTMENTS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
