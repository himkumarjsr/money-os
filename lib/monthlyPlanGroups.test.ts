import { describe, expect, it } from "vitest";
import { groupMonthlyPlan } from "./monthlyPlanGroups";
import { buildPriorityPlan, debtPayoffNumbers } from "./priorityEngine";

const row = (month: number, sip: number, note = "Same.") => ({
  month,
  emergency: 0,
  medical: 0,
  termYearly: 0,
  sip,
  extraDebt: 0,
  remaining: 0,
  note,
});

describe("groupMonthlyPlan", () => {
  it("folds repeated months into one range", () => {
    const groups = groupMonthlyPlan([
      row(1, 5000, "First."),
      row(2, 9000),
      row(3, 9000),
      row(4, 9000),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["1", "2–4"]);
  });

  it("keeps months apart when amounts differ", () => {
    expect(
      groupMonthlyPlan([row(1, 1), row(2, 2)]).map((g) => g.label),
    ).toEqual(["1", "2"]);
  });
});

describe("monthly plan notes", () => {
  it("gives repeated months the same plain note", () => {
    const plan = buildPriorityPlan(
      {
        monthlySalary: 300_000,
        lifeStage: "bachelor",
        selfAge: 30,
        city: "metro",
        savingsAccountBalance: 5_000_000,
        medicalEmergencyFund: 300_000,
        hasTermInsurance: false,
      },
      { needsActual: 50_000, overallScore: 60 },
    );
    const rows = plan.monthlyPlan ?? [];
    expect(rows.every((r) => !/month \d/.test(r.note))).toBe(true);
    expect(groupMonthlyPlan(rows).length).toBeLessThan(rows.length);
  });
});

describe("debtPayoffNumbers", () => {
  it("flags an EMI that barely covers the interest", () => {
    expect(
      debtPayoffNumbers({ outstanding: 1000, rate: 12.85, emi: 11 }).emiTooLow,
    ).toBe(true);
    expect(
      debtPayoffNumbers({ outstanding: 100_000, rate: 12, emi: 5000 })
        .emiTooLow,
    ).toBe(false);
  });
});
