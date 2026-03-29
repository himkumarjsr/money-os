import type { LifeStage } from "@/lib/analyse-form-schema";
import type { FinancialProfile } from "@/lib/financialEngine";
import { isMetroCity, monthlyTotalIncome } from "@/lib/financialEngine";

export type ExpenseBucketRow = {
  id: string;
  label: string;
  actual: number;
  recommended: number;
  overLimit: boolean;
};

const METRO_BENCHMARK_MULT = 1.3;

/** Recommended caps as a share of monthly income, tuned lightly by life stage. */
function incomeShareCaps(stage: LifeStage): Record<string, number> {
  switch (stage) {
    case "single_bachelor":
      return {
        rent: 0.26,
        otherEmi: 0.12,
        food: 0.14,
        transport: 0.12,
        utilities: 0.07,
        entertainment: 0.1,
        insurance: 0.08,
        kids: 0,
        parents: 0.06,
      };
    case "married_no_kids":
      return {
        rent: 0.3,
        otherEmi: 0.14,
        food: 0.15,
        transport: 0.12,
        utilities: 0.08,
        entertainment: 0.09,
        insurance: 0.09,
        kids: 0,
        parents: 0.07,
      };
    case "married_with_kids":
      return {
        rent: 0.34,
        otherEmi: 0.14,
        food: 0.16,
        transport: 0.11,
        utilities: 0.08,
        entertainment: 0.08,
        insurance: 0.09,
        kids: 0.14,
        parents: 0.08,
      };
    case "pre_retirement_50_plus":
      return {
        rent: 0.22,
        otherEmi: 0.1,
        food: 0.13,
        transport: 0.1,
        utilities: 0.08,
        entertainment: 0.09,
        insurance: 0.12,
        kids: 0,
        parents: 0.09,
      };
  }
}

function n(v: number | undefined): number {
  return v ?? 0;
}

/**
 * Builds horizontal-bar data: actual vs recommended monthly cap.
 * Metro cities use a higher benchmark (same rule as emergency uplift).
 */
export function getExpenseBucketRows(p: FinancialProfile): ExpenseBucketRow[] {
  const income = Math.max(monthlyTotalIncome(p), 1);
  const caps = incomeShareCaps(p.lifeStage);
  const cityMult = isMetroCity(p.city) ? METRO_BENCHMARK_MULT : 1;

  const rows: ExpenseBucketRow[] = [
    {
      id: "rent",
      label: "Rent / home loan EMI",
      actual: n(p.rentOrHomeLoanEmi),
      recommended: income * caps.rent * cityMult,
      overLimit: false,
    },
    {
      id: "otherEmi",
      label: "Other loan EMIs",
      actual: n(p.otherLoanEmis),
      recommended: income * caps.otherEmi * cityMult,
      overLimit: false,
    },
    {
      id: "food",
      label: "Food & groceries",
      actual: n(p.foodGroceries),
      recommended: income * caps.food * cityMult,
      overLimit: false,
    },
    {
      id: "transport",
      label: "Transport",
      actual: n(p.transport),
      recommended: income * caps.transport * cityMult,
      overLimit: false,
    },
    {
      id: "utilities",
      label: "Utilities",
      actual: n(p.utilities),
      recommended: income * caps.utilities * cityMult,
      overLimit: false,
    },
    {
      id: "entertainment",
      label: "Entertainment & dining",
      actual: n(p.entertainmentDiningShopping),
      recommended: income * caps.entertainment * cityMult,
      overLimit: false,
    },
    {
      id: "insurance",
      label: "Insurance premiums",
      actual: n(p.insurancePremiumsMonthly),
      recommended: income * caps.insurance * cityMult,
      overLimit: false,
    },
  ];

  if (p.lifeStage === "married_with_kids") {
    rows.push({
      id: "kids",
      label: "Kids expenses",
      actual: n(p.kidsExpenses),
      recommended: income * caps.kids * cityMult,
      overLimit: false,
    });
  }

  rows.push({
    id: "parents",
    label: "Parents / family support",
    actual: n(p.parentsFamilySupport),
    recommended: income * caps.parents * cityMult,
    overLimit: false,
  });

  return rows.map((r) => ({
    ...r,
    overLimit: r.actual > r.recommended + 1,
  }));
}
