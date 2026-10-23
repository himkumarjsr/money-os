import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { buildUserAnalyseScenarioProfile } from "@/lib/analyseUserScenarioFixture";
import { analyseFinances } from "@/lib/financialEngine";
import {
  householdInviteUrl,
  monthRange,
  normaliseInviteCode,
  spendByBucket,
} from "@/lib/householdClient";
import { combineHouseholdProfiles } from "@/lib/householdProfile";

const person = (over: Partial<FinancialProfile>) =>
  ({
    ...buildUserAnalyseScenarioProfile(),
    unifiedLoans: [],
    ...over,
  }) as FinancialProfile;

describe("combineHouseholdProfiles", () => {
  const asha = person({
    lifeStage: "bachelor",
    selfAge: 31,
    monthlySalary: 1_50_000,
    spouseIncome: 0,
    rentAmount: 40_000,
    grocery: 8_000,
    shopping: 5_000,
    epfBalance: 6_00_000,
    monthlySIP: 20_000,
    retirementAge: 55,
    unifiedLoans: [
      {
        loanType: "car_loan",
        lenderName: "HDFC",
        monthlyEMI: 15_000,
        remainingMonths: 24,
      },
    ],
  });
  const bala = person({
    lifeStage: "married",
    selfAge: 33,
    monthlySalary: 1_00_000,
    spouseIncome: 1_50_000,
    rentAmount: 40_000,
    grocery: 10_000,
    shopping: 3_000,
    epfBalance: 4_00_000,
    monthlySIP: 10_000,
    retirementAge: 60,
    unifiedLoans: [
      {
        loanType: "car_loan",
        lenderName: "hdfc ",
        monthlyEMI: 15_000,
        remainingMonths: 24,
      },
      {
        loanType: "personal_loan",
        lenderName: "SBI",
        monthlyEMI: 8_000,
        remainingMonths: 12,
      },
    ],
  });
  const both = combineHouseholdProfiles(asha, bala);

  it("counts shared home costs once and adds up personal money", () => {
    expect(both.rentAmount).toBe(40_000);
    expect(both.grocery).toBe(10_000);
    expect(both.shopping).toBe(8_000);
    expect(both.epfBalance).toBe(10_00_000);
    expect(both.monthlySIP).toBe(30_000);
  });

  it("uses the partner's pay as spouse income, not a guess", () => {
    expect(both.monthlySalary).toBe(1_50_000);
    expect(both.spouseIncome).toBe(1_00_000);
    expect(both.spouseAge).toBe(33);
    expect(both.lifeStage).toBe("married");
  });

  it("keeps the viewer's goals and drops a loan both entered", () => {
    expect(both.retirementAge).toBe(55);
    expect(both.unifiedLoans?.map((l) => l.lenderName)).toEqual([
      "HDFC",
      "SBI",
    ]);
  });

  it("does not change either person's own profile", () => {
    expect(asha.shopping).toBe(5_000);
    expect(bala.unifiedLoans).toHaveLength(2);
  });

  it("gives a report with both incomes", () => {
    const solo = analyseFinances(asha);
    const together = analyseFinances(both);
    expect(together.netWorth).toBeGreaterThan(solo.netWorth);
    expect(Number.isFinite(together.overallScore)).toBe(true);
  });
});

describe("household helpers", () => {
  it("cleans a typed code", () => {
    expect(normaliseInviteCode(" ab cd-23 45 ")).toBe("ABCD2345");
  });

  it("builds the invite link", () => {
    expect(householdInviteUrl("ABCD2345", "https://www.finkoin.com/")).toBe(
      "https://www.finkoin.com/household?code=ABCD2345",
    );
  });

  it("gives the month's first and last day", () => {
    expect(monthRange(new Date(2026, 1, 10))).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("totals spends by bucket", () => {
    const row = (amount: number, bucket: string) => ({
      id: String(amount),
      date: "2026-10-01",
      amount,
      category: "food",
      subcategory: null,
      description: null,
      bucket,
      payment_method: null,
    });
    expect(
      spendByBucket([row(100, "needs"), row(50, "wants"), row(25, "needs")]),
    ).toEqual({
      total: 175,
      buckets: [
        ["needs", 125],
        ["wants", 50],
      ],
    });
  });
});
