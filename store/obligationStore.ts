"use client";

import { create } from "zustand";
import { getSupabase } from "@/lib/supabase";

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
  termInsuranceRenewalDay?: number;
  termInsuranceRenewalMonth?: number;
  healthInsurancePremiumInput?: number;
  healthInsurancePremiumMonthly?: number;
  healthInsuranceRenewalDay?: number;
  healthInsuranceRenewalMonth?: number;
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
  ) => Promise<void>;
  deleteObligation: (id: string) => Promise<void>;
  markPaid: (checklistId: string, amount: number) => Promise<void>;
  markSkipped: (checklistId: string) => Promise<void>;
  generateChecklist: (userId: string, month?: Date) => Promise<void>;
  syncFromHealthCheck: (
    userId: string,
    submission: ObligationSyncProfile,
  ) => Promise<void>;
}

function monthStartIso(month: Date): string {
  return new Date(month.getFullYear(), month.getMonth(), 1)
    .toISOString()
    .split("T")[0]!;
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
  const totalObligated = items.reduce(
    (s, i) => s + (i.expected_amount || 0),
    0,
  );
  const totalPaid = items
    .filter((i) => i.status === "paid" || i.status === "auto_debit")
    .reduce((s, i) => s + (i.paid_amount || i.expected_amount || 0), 0);
  const totalPending = items
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + (i.expected_amount || 0), 0);
  return { totalObligated, totalPaid, totalPending };
}

function yearlyPremium(input?: number, monthly?: number): number {
  if (monthly != null && monthly > 0) return monthly * 12;
  if (input != null && input > 0) return input;
  return 0;
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

      const items = (data ?? []).map((row) =>
        mapChecklist(row as Record<string, unknown>),
      );
      set({
        checklist: items,
        currentMonth: monthStart,
        ...totals(items),
        loading: false,
      });
    } catch (err) {
      console.error("fetchChecklist error:", err);
      set({ loading: false });
    }
  },

  addObligation: async (obligation) => {
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("updateObligation error:", error);
      return;
    }

    set((state) => ({
      obligations: state.obligations.map((o) =>
        o.id === id ? { ...o, ...data } : o,
      ),
    }));
  },

  deleteObligation: async (id) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("financial_obligations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("deleteObligation error:", error);
      return;
    }

    set((state) => ({
      obligations: state.obligations.filter((o) => o.id !== id),
    }));
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

  syncFromHealthCheck: async (userId, submission) => {
    const supabase = getSupabase();
    const obligations: Array<Record<string, unknown>> = [];

    const termPremium = yearlyPremium(
      submission.termInsurancePremiumInput,
      submission.termInsurancePremiumMonthly,
    );
    if (termPremium > 0) {
      obligations.push({
        user_id: userId,
        title: "Term Insurance Premium",
        category: "insurance_life",
        amount: termPremium,
        frequency: "yearly",
        due_day: submission.termInsuranceRenewalDay || 1,
        due_month: submission.termInsuranceRenewalMonth || 1,
        source: "health_check",
        remind_days_before: 14,
        is_active: true,
      });
    }

    const healthPremium = yearlyPremium(
      submission.healthInsurancePremiumInput,
      submission.healthInsurancePremiumMonthly,
    );
    if (healthPremium > 0) {
      obligations.push({
        user_id: userId,
        title: "Health Insurance Premium",
        category: "insurance_health",
        amount: healthPremium,
        frequency: "yearly",
        due_day: submission.healthInsuranceRenewalDay || 1,
        due_month: submission.healthInsuranceRenewalMonth || 1,
        source: "health_check",
        remind_days_before: 14,
        is_active: true,
      });
    }

    const loans = submission.unifiedLoans ?? [];
    const homeFromUnified = loans.find(
      (l) => l.loanType === "home_loan" && (l.monthlyEMI ?? 0) > 0,
    );
    const homeEmi = homeFromUnified?.monthlyEMI ?? submission.homeLoanEMI ?? 0;
    if (homeEmi > 0) {
      obligations.push({
        user_id: userId,
        title: homeFromUnified?.lenderName
          ? `Home Loan EMI · ${homeFromUnified.lenderName}`
          : "Home Loan EMI",
        category: "loan_emi",
        amount: homeEmi,
        frequency: "monthly",
        due_day: homeFromUnified?.emiDay || submission.homeLoanEMIDay || 5,
        source: "health_check",
        remind_days_before: 3,
        is_active: true,
      });
    }

    const carFromUnified = loans.find(
      (l) => l.loanType === "car_loan" && (l.monthlyEMI ?? 0) > 0,
    );
    const carEmi = carFromUnified?.monthlyEMI ?? submission.carLoanEMI ?? 0;
    if (carEmi > 0) {
      obligations.push({
        user_id: userId,
        title: carFromUnified?.lenderName
          ? `Car Loan EMI · ${carFromUnified.lenderName}`
          : "Car Loan EMI",
        category: "loan_emi",
        amount: carEmi,
        frequency: "monthly",
        due_day: carFromUnified?.emiDay || submission.carLoanEMIDay || 5,
        source: "health_check",
        remind_days_before: 3,
        is_active: true,
      });
    }

    const personalFromUnified = loans.find(
      (l) => l.loanType === "personal_loan" && (l.monthlyEMI ?? 0) > 0,
    );
    const personalEmi =
      personalFromUnified?.monthlyEMI ?? submission.personalLoanEMI ?? 0;
    if (personalEmi > 0) {
      obligations.push({
        user_id: userId,
        title: personalFromUnified?.lenderName
          ? `Personal Loan EMI · ${personalFromUnified.lenderName}`
          : "Personal Loan EMI",
        category: "loan_emi",
        amount: personalEmi,
        frequency: "monthly",
        due_day:
          personalFromUnified?.emiDay || submission.personalLoanEMIDay || 5,
        source: "health_check",
        remind_days_before: 3,
        is_active: true,
      });
    }

    const eduFromUnified = loans.find(
      (l) => l.loanType === "education_loan" && (l.monthlyEMI ?? 0) > 0,
    );
    if ((eduFromUnified?.monthlyEMI ?? 0) > 0) {
      obligations.push({
        user_id: userId,
        title: eduFromUnified?.lenderName
          ? `Education Loan EMI · ${eduFromUnified.lenderName}`
          : "Education Loan EMI",
        category: "loan_emi",
        amount: eduFromUnified!.monthlyEMI!,
        frequency: "monthly",
        due_day: eduFromUnified?.emiDay || submission.educationLoanEMIDay || 5,
        source: "health_check",
        remind_days_before: 3,
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

    if ((submission.creditCardBillMonthly ?? 0) > 0) {
      obligations.push({
        user_id: userId,
        title: "Credit Card Bill",
        category: "credit_card",
        amount: submission.creditCardBillMonthly,
        frequency: "monthly",
        due_day: submission.creditCardBillDay || 5,
        source: "health_check",
        remind_days_before: 3,
        is_active: true,
      });
    }

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

    if (obligations.length === 0) return;

    for (const ob of obligations) {
      const { error } = await supabase.from("financial_obligations").upsert(
        {
          ...ob,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,title,category" },
      );
      if (error) {
        console.error("syncFromHealthCheck upsert error:", error);
      }
    }

    await get().generateChecklist(userId);
    await get().fetchObligations(userId);
  },
}));
