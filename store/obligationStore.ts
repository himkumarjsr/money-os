"use client";

import { create } from "zustand";
import {
  financialProfileToFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import {
  applyLoanDetails,
  loanDrift,
  loansNeedingDetails,
  mergeTrackerLoansIntoProfile,
  planLoanObligationSync,
  type LoanDriftItem,
  type LoanObligationLike,
  type UnifiedLoan,
} from "@/lib/loanObligationSync";
import {
  PREMIUM_RD_SOURCE,
  type PremiumRdObligation,
} from "@/lib/premiumRdPlan";
import { getSupabase } from "@/lib/supabase";
import {
  ANALYSE_SNAPSHOT_VERSION,
  fetchUserAnalyseSnapshot,
  upsertUserAnalyseSnapshot,
} from "@/lib/userAnalyseSnapshot";
import { useFinancialStore } from "@/store/financialStore";

export interface FinancialObligation {
  id: string;
  user_id: string;
  title: string;
  category: string;
  amount: number;
  frequency: string;
  due_day?: number | null;
  due_month?: number | null;
  due_date?: string | null;
  source: string;
  is_active: boolean;
  remind_days_before: number;
  notes?: string | null;
}

export interface ChecklistItem {
  id: string;
  obligation_id: string;
  checklist_month: string;
  expected_amount: number;
  status: "pending" | "paid" | "skipped" | "auto_debit";
  paid_at?: string | null;
  paid_amount?: number | null;
  obligation?: FinancialObligation | null;
}

/** Minimal profile slice used when syncing from health check. */
export type ObligationSyncProfile = {
  termInsurancePremiumInput?: number;
  termInsurancePremiumMonthly?: number;
  termInsurancePremiumFrequency?: "monthly" | "yearly";
  termInsuranceRenewalDay?: number;
  termInsuranceRenewalMonth?: number;
  healthInsurancePremiumInput?: number;
  healthInsurancePremiumMonthly?: number;
  healthInsurancePremiumFrequency?: "monthly" | "yearly";
  healthInsuranceRenewalDay?: number;
  healthInsuranceRenewalMonth?: number;
  carInsurancePremiumInput?: number;
  carInsurancePremiumMonthly?: number;
  carInsurancePremiumFrequency?: "monthly" | "yearly";
  carInsuranceRenewalDay?: number;
  carInsuranceRenewalMonth?: number;
  bikeInsurancePremiumInput?: number;
  bikeInsurancePremiumMonthly?: number;
  bikeInsurancePremiumFrequency?: "monthly" | "yearly";
  bikeInsuranceRenewalDay?: number;
  bikeInsuranceRenewalMonth?: number;
  homeLoanEMI?: number;
  homeLoanEMIDay?: number;
  carLoanEMI?: number;
  carLoanEMIDay?: number;
  personalLoanEMI?: number;
  personalLoanEMIDay?: number;
  educationLoanEMIDay?: number;
  monthlySIP?: number;
  sipAutoDebitDay?: number;
  creditCardBillMonthly?: number;
  creditCardBillDay?: number;
  monthlyPPFContribution?: number;
  ppfDepositDay?: number;
  unifiedLoans?: Array<{
    loanType?: string;
    monthlyEMI?: number;
    emiDay?: number;
    lenderName?: string;
  }>;
};

interface ObligationState {
  obligations: FinancialObligation[];
  checklist: ChecklistItem[];
  currentMonth: string;
  loading: boolean;
  totalObligated: number;
  totalPaid: number;
  totalPending: number;

  fetchObligations: (userId: string) => Promise<void>;
  fetchChecklist: (userId: string, month?: Date) => Promise<void>;
  addObligation: (
    obligation: Partial<FinancialObligation> & {
      user_id: string;
      title: string;
      category: string;
      amount: number;
    },
  ) => Promise<string | null>;
  updateObligation: (
    id: string,
    data: Partial<FinancialObligation>,
  ) => Promise<boolean>;
  /**
   * Mark obligation closed (EMI paid off, policy cancelled, etc.).
   * Soft-deactivates so generateChecklist never creates next-month rows.
   * Keeps this month's paid ✓ history; drops pending/skipped + future months.
   */
  closeObligation: (id: string, month?: Date) => Promise<boolean>;
  /** @deprecated Prefer closeObligation — same soft-deactivate path. */
  deleteObligation: (id: string, month?: Date) => Promise<void>;
  markPaid: (checklistId: string, amount: number) => Promise<void>;
  markUnpaid: (checklistId: string) => Promise<void>;
  markSkipped: (checklistId: string) => Promise<void>;
  /** Hard-delete all obligations + checklist rows for the user. */
  resetAllObligations: (userId: string) => Promise<void>;
  generateChecklist: (userId: string, month?: Date) => Promise<void>;
  /**
   * `previous` = the profile the form was edited from; loans the user removed
   * from it are closed in Tracker.
   */
  syncFromHealthCheck: (
    userId: string,
    submission: ObligationSyncProfile,
    previous?: FinancialProfile | null,
  ) => Promise<void>;
  /**
   * Analyse result "add to my monthly obligations" for the insurance-premium
   * RD: creates or updates the rows and closes ones the plan no longer needs.
   */
  saveAnalyseRdObligations: (
    userId: string,
    rows: PremiumRdObligation[],
  ) => Promise<boolean>;
  /** Tracker → Analyse: fold Tracker loan EMIs into the saved report. */
  syncLoansToAnalyse: (userId: string) => Promise<void>;
  /** Syncs, then reports when the numbers were saved, loan drift, and imported loans missing details. */
  loanReportStatus: (userId: string) => Promise<LoanReportStatus>;
  /** One-time outstanding/rate answer (or skip) for a loan imported from Tracker. */
  saveLoanDetails: (
    userId: string,
    loanId: string,
    details: { outstandingAmount?: number; interestRate?: number } | "skip",
  ) => Promise<boolean>;
}

export type LoanReportStatus = {
  submittedAt: string | null;
  drift: LoanDriftItem[];
  needDetails: UnifiedLoan[];
};

const LOAN_COLUMNS =
  "id,title,category,amount,due_day,is_active,source,updated_at";

async function fetchLoanObligations(
  userId: string,
): Promise<LoanObligationLike[]> {
  const { data } = await getSupabase()
    .from("financial_obligations")
    .select(LOAN_COLUMNS)
    .eq("user_id", userId)
    .eq("category", "loan_emi");
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    category: String(r.category ?? ""),
    amount: Number(r.amount ?? 0),
    due_day: r.due_day == null ? null : Number(r.due_day),
    is_active: r.is_active !== false,
    source: r.source == null ? null : String(r.source),
    updated_at: r.updated_at == null ? null : String(r.updated_at),
  }));
}

let loanSyncInFlight: Promise<void> | null = null;

/** First day of month as local YYYY-MM-01 (avoid UTC shift from toISOString). */
export function monthStartIso(month: Date): string {
  const y = month.getFullYear();
  const m = String(month.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function mapObligation(row: Record<string, unknown>): FinancialObligation {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    title: String(row.title ?? ""),
    category: String(row.category ?? "other"),
    amount: Number(row.amount ?? 0),
    frequency: String(row.frequency ?? "monthly"),
    due_day: row.due_day == null ? null : Number(row.due_day),
    due_month: row.due_month == null ? null : Number(row.due_month),
    due_date: row.due_date == null ? null : String(row.due_date),
    source: String(row.source ?? "manual"),
    is_active: row.is_active !== false,
    remind_days_before: Number(row.remind_days_before ?? 7),
    notes: row.notes == null ? null : String(row.notes),
  };
}

function mapChecklist(row: Record<string, unknown>): ChecklistItem {
  const obRaw = row.obligation;
  const obligation =
    obRaw && typeof obRaw === "object"
      ? mapObligation(obRaw as Record<string, unknown>)
      : null;
  const status = String(row.status ?? "pending");
  return {
    id: String(row.id ?? ""),
    obligation_id: String(row.obligation_id ?? ""),
    checklist_month: String(row.checklist_month ?? ""),
    expected_amount: Number(row.expected_amount ?? 0),
    status:
      status === "paid" || status === "skipped" || status === "auto_debit"
        ? status
        : "pending",
    paid_at: row.paid_at == null ? null : String(row.paid_at),
    paid_amount: row.paid_amount == null ? null : Number(row.paid_amount),
    obligation,
  };
}

function totals(items: ChecklistItem[]) {
  // Closed (inactive) rows stay visible this month but don't inflate pending.
  const open = items.filter((i) => i.obligation?.is_active !== false);
  const totalObligated = open.reduce((s, i) => s + (i.expected_amount || 0), 0);
  const totalPaid = items
    .filter((i) => i.status === "paid" || i.status === "auto_debit")
    .reduce((s, i) => s + (i.paid_amount || i.expected_amount || 0), 0);
  const totalPending = open
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + (i.expected_amount || 0), 0);
  return { totalObligated, totalPaid, totalPending };
}

function premiumObligationAmount(
  input?: number,
  monthly?: number,
  frequency?: "monthly" | "yearly",
): { amount: number; frequency: "monthly" | "yearly" } | null {
  const freq = frequency === "yearly" ? "yearly" : "monthly";
  if (freq === "monthly") {
    const amount =
      monthly != null && monthly > 0
        ? monthly
        : input != null && input > 0
          ? input
          : 0;
    return amount > 0 ? { amount, frequency: "monthly" } : null;
  }
  const amount =
    input != null && input > 0
      ? input
      : monthly != null && monthly > 0
        ? monthly * 12
        : 0;
  return amount > 0 ? { amount, frequency: "yearly" } : null;
}

export const useObligationStore = create<ObligationState>((set, get) => ({
  obligations: [],
  checklist: [],
  currentMonth: new Date().toISOString().slice(0, 7),
  loading: false,
  totalObligated: 0,
  totalPaid: 0,
  totalPending: 0,

  fetchObligations: async (userId) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("financial_obligations")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("category");

    if (error) {
      console.error("fetchObligations error:", error);
      return;
    }
    set({
      obligations: (data ?? []).map((row) =>
        mapObligation(row as Record<string, unknown>),
      ),
    });
    void get().syncLoansToAnalyse(userId);
  },

  fetchChecklist: async (userId, month = new Date()) => {
    set({ loading: true });
    try {
      const supabase = getSupabase();
      const monthStart = monthStartIso(month);

      const { data, error } = await supabase
        .from("obligation_checklist")
        .select(
          `
            *,
            obligation:financial_obligations(*)
          `,
        )
        .eq("user_id", userId)
        .eq("checklist_month", monthStart)
        .order("created_at");

      if (error) {
        console.error("fetchChecklist error:", error);
        set({ loading: false });
        return;
      }

      const items = (data ?? [])
        .map((row) => mapChecklist(row as Record<string, unknown>))
        // Keep closed (is_active=false) rows for this month so they can show struck-out.
        // Drop orphan rows with no joined obligation.
        .filter((c) => c.obligation != null)
        // Credit card bills belong in Credit card dues — never the checklist.
        .filter((c) => (c.obligation?.category || "") !== "credit_card");

      // Heal stale expected_amount so UI + amount-match stay aligned after edits.
      const healed = items.map((c) => {
        const live = Number(c.obligation?.amount);
        if (
          (c.status === "pending" || c.status === "skipped") &&
          Number.isFinite(live) &&
          live > 0 &&
          Math.abs(live - Number(c.expected_amount || 0)) >= 1
        ) {
          return { ...c, expected_amount: live };
        }
        return c;
      });

      const stale = healed.filter((c, i) => {
        const orig = items[i];
        return (
          orig &&
          Math.abs(Number(c.expected_amount) - Number(orig.expected_amount)) >=
            1
        );
      });
      if (stale.length > 0) {
        void Promise.all(
          stale.map((c) =>
            supabase
              .from("obligation_checklist")
              .update({ expected_amount: c.expected_amount })
              .eq("id", c.id),
          ),
        );
      }

      set({
        checklist: healed,
        currentMonth: monthStart,
        ...totals(healed),
        loading: false,
      });
    } catch (err) {
      console.error("fetchChecklist error:", err);
      set({ loading: false });
    }
  },

  addObligation: async (obligation) => {
    // Credit card bills belong only in Credit card dues.
    if ((obligation.category || "").trim() === "credit_card") {
      return null;
    }
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("financial_obligations")
        .insert({
          ...obligation,
          is_active: obligation.is_active ?? true,
          remind_days_before: obligation.remind_days_before ?? 7,
          source: obligation.source ?? "manual",
          frequency: obligation.frequency ?? "monthly",
        })
        .select()
        .single();

      if (error) throw error;
      const mapped = mapObligation(data as Record<string, unknown>);
      set((state) => ({
        obligations: [...state.obligations, mapped],
      }));
      if (mapped.category === "loan_emi") {
        void get().syncLoansToAnalyse(mapped.user_id);
      }
      return mapped.id;
    } catch (err) {
      console.error("addObligation error:", err);
      return null;
    }
  },

  updateObligation: async (id, data) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("financial_obligations")
      .update({
        ...data,
        // Manual edit wins over analyse sync — don't let health-check overwrite.
        source: "manual",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("updateObligation error:", error);
      return false;
    }

    // Checklist stores its own expected_amount (generate RPC does ON CONFLICT DO NOTHING),
    // so amount edits must update pending/skipped rows or the UI looks unchanged.
    if (data.amount != null && Number.isFinite(Number(data.amount))) {
      const { error: checklistErr } = await supabase
        .from("obligation_checklist")
        .update({ expected_amount: Number(data.amount) })
        .eq("obligation_id", id)
        .in("status", ["pending", "skipped"]);
      if (checklistErr) {
        console.error("updateObligation checklist amount:", checklistErr);
      }
    }

    set((state) => {
      const checklist = state.checklist.map((c) => {
        if (c.obligation_id !== id) return c;
        const nextAmount =
          data.amount != null && Number.isFinite(Number(data.amount))
            ? Number(data.amount)
            : c.expected_amount;
        return {
          ...c,
          expected_amount:
            c.status === "paid" || c.status === "auto_debit"
              ? c.expected_amount
              : nextAmount,
          obligation: c.obligation
            ? { ...c.obligation, ...data, source: "manual" }
            : c.obligation,
        };
      });
      return {
        obligations: state.obligations.map((o) =>
          o.id === id ? { ...o, ...data, source: "manual" } : o,
        ),
        checklist,
        ...totals(checklist),
      };
    });
    const edited = get().obligations.find((o) => o.id === id);
    if (edited?.category === "loan_emi") {
      void get().syncLoansToAnalyse(edited.user_id);
    }
    return true;
  },

  closeObligation: async (id, month = new Date()) => {
    const supabase = getSupabase();
    const monthStart = monthStartIso(month);
    const closing =
      get().obligations.find((o) => o.id === id) ??
      get().checklist.find((c) => c.obligation_id === id)?.obligation;

    // Stop forever — generate_monthly_checklist only picks is_active = true,
    // so next months never get a new row.
    const { error } = await supabase
      .from("financial_obligations")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("closeObligation error:", error);
      return false;
    }

    // Only remove future months. Keep THIS month’s row (paid or pending)
    // so the UI can show it struck-out as closed.
    const { error: futureErr } = await supabase
      .from("obligation_checklist")
      .delete()
      .eq("obligation_id", id)
      .gt("checklist_month", monthStart);
    if (futureErr) {
      console.error("closeObligation future checklist:", futureErr);
    }

    set((state) => {
      const checklist = state.checklist.map((c) => {
        if (c.obligation_id !== id) return c;
        return {
          ...c,
          obligation: c.obligation
            ? { ...c.obligation, is_active: false }
            : c.obligation,
        };
      });
      return {
        obligations: state.obligations.filter((o) => o.id !== id),
        checklist,
        ...totals(checklist),
      };
    });
    if (closing?.category === "loan_emi") {
      void get().syncLoansToAnalyse(closing.user_id);
    }
    return true;
  },

  deleteObligation: async (id, month) => {
    await get().closeObligation(id, month);
  },

  markPaid: async (checklistId, amount) => {
    const supabase = getSupabase();
    const paidAt = new Date().toISOString();
    const { error } = await supabase
      .from("obligation_checklist")
      .update({
        status: "paid",
        paid_at: paidAt,
        paid_amount: amount,
      })
      .eq("id", checklistId);

    if (error) {
      console.error("markPaid error:", error);
      return;
    }

    set((state) => {
      const updated = state.checklist.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              status: "paid" as const,
              paid_at: paidAt,
              paid_amount: amount,
            }
          : c,
      );
      return { checklist: updated, ...totals(updated) };
    });
  },

  markUnpaid: async (checklistId) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("obligation_checklist")
      .update({
        status: "pending",
        paid_at: null,
        paid_amount: null,
      })
      .eq("id", checklistId);

    if (error) {
      console.error("markUnpaid error:", error);
      return;
    }

    set((state) => {
      const updated = state.checklist.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              status: "pending" as const,
              paid_at: null,
              paid_amount: null,
            }
          : c,
      );
      return { checklist: updated, ...totals(updated) };
    });
  },

  resetAllObligations: async (userId) => {
    const supabase = getSupabase();
    // Checklist first (FK), then obligations — hard delete from DB
    const { error: checklistErr } = await supabase
      .from("obligation_checklist")
      .delete()
      .eq("user_id", userId);
    if (checklistErr) {
      console.error("resetAllObligations checklist:", checklistErr);
      return;
    }
    const { error: obErr } = await supabase
      .from("financial_obligations")
      .delete()
      .eq("user_id", userId);
    if (obErr) {
      console.error("resetAllObligations obligations:", obErr);
      return;
    }
    set({
      obligations: [],
      checklist: [],
      totalObligated: 0,
      totalPaid: 0,
      totalPending: 0,
    });
  },

  markSkipped: async (checklistId) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("obligation_checklist")
      .update({ status: "skipped" })
      .eq("id", checklistId);

    if (error) {
      console.error("markSkipped error:", error);
      return;
    }

    set((state) => {
      const updated = state.checklist.map((c) =>
        c.id === checklistId ? { ...c, status: "skipped" as const } : c,
      );
      return { checklist: updated, ...totals(updated) };
    });
  },

  generateChecklist: async (userId, month = new Date()) => {
    const supabase = getSupabase();
    const { error } = await supabase.rpc("generate_monthly_checklist", {
      p_user_id: userId,
      p_month: monthStartIso(month),
    });
    if (error) {
      console.error("generateChecklist error:", error);
    }
    await get().fetchChecklist(userId, month);
  },

  syncFromHealthCheck: async (userId, submission, previous) => {
    const supabase = getSupabase();
    const obligations: Array<Record<string, unknown>> = [];

    const termPremium = premiumObligationAmount(
      submission.termInsurancePremiumInput,
      submission.termInsurancePremiumMonthly,
      submission.termInsurancePremiumFrequency,
    );
    if (termPremium) {
      obligations.push({
        user_id: userId,
        title: "Term Insurance Premium",
        category: "insurance_life",
        amount: termPremium.amount,
        frequency: termPremium.frequency,
        due_day: submission.termInsuranceRenewalDay || 1,
        due_month:
          termPremium.frequency === "yearly"
            ? submission.termInsuranceRenewalMonth || 1
            : null,
        source: "health_check",
        remind_days_before: termPremium.frequency === "yearly" ? 14 : 7,
        is_active: true,
      });
    }

    const healthPremium = premiumObligationAmount(
      submission.healthInsurancePremiumInput,
      submission.healthInsurancePremiumMonthly,
      submission.healthInsurancePremiumFrequency,
    );
    if (healthPremium) {
      obligations.push({
        user_id: userId,
        title: "Health Insurance Premium",
        category: "insurance_health",
        amount: healthPremium.amount,
        frequency: healthPremium.frequency,
        due_day: submission.healthInsuranceRenewalDay || 1,
        due_month:
          healthPremium.frequency === "yearly"
            ? submission.healthInsuranceRenewalMonth || 1
            : null,
        source: "health_check",
        remind_days_before: healthPremium.frequency === "yearly" ? 14 : 7,
        is_active: true,
      });
    }

    const carPremium = premiumObligationAmount(
      submission.carInsurancePremiumInput,
      submission.carInsurancePremiumMonthly,
      submission.carInsurancePremiumFrequency,
    );
    if (carPremium) {
      obligations.push({
        user_id: userId,
        title: "Car Insurance Premium",
        category: "insurance_vehicle",
        amount: carPremium.amount,
        frequency: carPremium.frequency,
        due_day: submission.carInsuranceRenewalDay || 1,
        due_month:
          carPremium.frequency === "yearly"
            ? submission.carInsuranceRenewalMonth || 1
            : null,
        source: "health_check",
        remind_days_before: carPremium.frequency === "yearly" ? 14 : 7,
        is_active: true,
      });
    }

    const bikePremium = premiumObligationAmount(
      submission.bikeInsurancePremiumInput,
      submission.bikeInsurancePremiumMonthly,
      submission.bikeInsurancePremiumFrequency,
    );
    if (bikePremium) {
      obligations.push({
        user_id: userId,
        title: "Two-wheeler Insurance Premium",
        category: "insurance_vehicle",
        amount: bikePremium.amount,
        frequency: bikePremium.frequency,
        due_day: submission.bikeInsuranceRenewalDay || 1,
        due_month:
          bikePremium.frequency === "yearly"
            ? submission.bikeInsuranceRenewalMonth || 1
            : null,
        source: "health_check",
        remind_days_before: bikePremium.frequency === "yearly" ? 14 : 7,
        is_active: true,
      });
    }

    if ((submission.monthlySIP ?? 0) > 0) {
      obligations.push({
        user_id: userId,
        title: "Mutual Fund SIP",
        category: "investment_sip",
        amount: submission.monthlySIP,
        frequency: "monthly",
        due_day: submission.sipAutoDebitDay || 1,
        source: "health_check",
        remind_days_before: 2,
        is_active: true,
      });
    }

    // Credit card bills are tracked only under Credit card dues (not obligations).

    if ((submission.monthlyPPFContribution ?? 0) > 0) {
      obligations.push({
        user_id: userId,
        title: "PPF Deposit",
        category: "investment_ppf",
        amount: submission.monthlyPPFContribution,
        frequency: "monthly",
        due_day: submission.ppfDepositDay || 1,
        source: "health_check",
        remind_days_before: 2,
        is_active: true,
      });
    }

    try {
      const plan = planLoanObligationSync(
        submission as FinancialProfile,
        await fetchLoanObligations(userId),
        previous,
      );
      for (const row of plan.inserts) {
        obligations.push({
          user_id: userId,
          title: row.title,
          category: "loan_emi",
          amount: row.amount,
          frequency: "monthly",
          due_day: row.due_day,
          source: "health_check",
          remind_days_before: 3,
          is_active: true,
        });
      }
      const now = new Date().toISOString();
      for (const row of plan.updates) {
        await supabase
          .from("financial_obligations")
          .update({
            amount: row.amount,
            due_day: row.due_day,
            is_active: true,
            updated_at: now,
          })
          .eq("id", row.id);
        await supabase
          .from("obligation_checklist")
          .update({ expected_amount: row.amount })
          .eq("obligation_id", row.id)
          .in("status", ["pending", "skipped"]);
      }
      for (const id of plan.deactivate) {
        await get().closeObligation(id);
      }
    } catch (err) {
      console.error("syncFromHealthCheck loans:", err);
    }

    if (obligations.length === 0) {
      await get().fetchObligations(userId);
      return;
    }

    // Insert missing analyse-derived rows only. Never overwrite / reactivate
    // existing rows — closed (is_active=false) EMIs must stay closed so they
    // never reappear next month after a health-check sync.
    for (const ob of obligations) {
      const { error } = await supabase.from("financial_obligations").upsert(
        {
          ...ob,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,title,category",
          ignoreDuplicates: true,
        },
      );
      if (error) {
        console.error("syncFromHealthCheck upsert error:", error);
      }
    }

    await get().generateChecklist(userId);
    await get().fetchObligations(userId);
  },

  saveAnalyseRdObligations: async (userId, rows) => {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    for (const row of rows) {
      // Same unique key as the health-check sync, but update: the amount
      // follows the latest plan.
      const { data, error } = await supabase
        .from("financial_obligations")
        .upsert(
          { ...row, user_id: userId, updated_at: now },
          { onConflict: "user_id,title,category" },
        )
        .select("id")
        .single();
      if (error || !data) {
        console.error("saveAnalyseRdObligations upsert error:", error);
        return false;
      }
      await supabase
        .from("obligation_checklist")
        .update({ expected_amount: row.amount })
        .eq("obligation_id", (data as { id: string }).id)
        .in("status", ["pending", "skipped"]);
    }

    const keep = new Set(rows.map((r) => r.title));
    const { data: existing } = await supabase
      .from("financial_obligations")
      .select("id,title")
      .eq("user_id", userId)
      .eq("source", PREMIUM_RD_SOURCE)
      .eq("is_active", true);
    for (const ob of (existing ?? []) as { id: string; title: string }[]) {
      if (!keep.has(ob.title)) await get().closeObligation(ob.id);
    }

    await get().generateChecklist(userId);
    await get().fetchObligations(userId);
    return true;
  },

  syncLoansToAnalyse: (userId) => {
    if (loanSyncInFlight) return loanSyncInFlight;
    loanSyncInFlight = (async () => {
      try {
        const snap = await fetchUserAnalyseSnapshot(userId);
        if (!snap) return;
        const { profile, changed, numbersChanged } =
          mergeTrackerLoansIntoProfile(
            snap.lastSubmission,
            await fetchLoanObligations(userId),
            { closedAfter: snap.submittedAt },
          );
        if (!changed) return;
        await saveSnapshotProfile(userId, snap, profile, numbersChanged);
      } catch (err) {
        console.warn("syncLoansToAnalyse failed:", err);
      } finally {
        loanSyncInFlight = null;
      }
    })();
    return loanSyncInFlight;
  },

  loanReportStatus: async (userId) => {
    await get().syncLoansToAnalyse(userId);
    const snap = await fetchUserAnalyseSnapshot(userId);
    if (!snap) return { submittedAt: null, drift: [], needDetails: [] };
    return {
      submittedAt: snap.submittedAt,
      drift: loanDrift(snap.lastSubmission, await fetchLoanObligations(userId)),
      needDetails: loansNeedingDetails(snap.lastSubmission),
    };
  },

  saveLoanDetails: async (userId, loanId, details) => {
    const snap = await fetchUserAnalyseSnapshot(userId);
    if (!snap) return false;
    const profile = applyLoanDetails(snap.lastSubmission, loanId, details);
    return saveSnapshotProfile(userId, snap, profile, details !== "skip");
  },
}));

/** Re-runs the engine on `profile`, saves the snapshot and refreshes the screen. */
async function saveSnapshotProfile(
  userId: string,
  snap: NonNullable<Awaited<ReturnType<typeof fetchUserAnalyseSnapshot>>>,
  profile: FinancialProfile,
  numbersChanged: boolean,
): Promise<boolean> {
  const result = analyseFinances(profile);
  const analysis = {
    ...(snap.analysis ?? {}),
    unifiedLoans: financialProfileToFormValues(profile).unifiedLoans,
  };
  const { error } = await upsertUserAnalyseSnapshot(userId, {
    profile,
    result,
    submittedAt:
      numbersChanged || !snap.submittedAt
        ? new Date().toISOString()
        : snap.submittedAt,
    version: ANALYSE_SNAPSHOT_VERSION,
    aiPlan: snap.aiPlan,
    analysis,
  });
  if (error) {
    console.warn("Analyse snapshot save failed:", error.message);
    return false;
  }
  useFinancialStore.getState().hydrateFromSnapshot(profile, result, {
    aiPlan: snap.aiPlan,
    analysisPatch: analysis,
  });
  return true;
}
