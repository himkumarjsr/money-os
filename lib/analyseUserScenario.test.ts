import { describe, expect, it } from "vitest";
import {
  buildUserAnalyseScenarioForm,
  buildUserAnalyseScenarioProfile,
} from "./analyseUserScenarioFixture";
import { getBucketBreakdown } from "./bucket-breakdown";
import {
  analyseFinances,
  computeRealEmergencyFund,
  monthlyTotalIncome,
  totalLoanLiabilities,
} from "./financialEngine";
import {
  getUniversalBucketActuals,
  getUnallocatedIncome,
} from "./universal-buckets";

function sumBreakdown(
  category: "needs" | "wants" | "security" | "loans" | "investment",
  profile: ReturnType<typeof buildUserAnalyseScenarioProfile>,
) {
  return getBucketBreakdown(category, profile).reduce((s, i) => s + i.value, 0);
}

describe("user analyse scenario fixture", () => {
  it("normalizes dual personal loans + home loan without dropping lender names", () => {
    const form = buildUserAnalyseScenarioForm();
    const profile = buildUserAnalyseScenarioProfile();

    expect(profile.monthlySalary).toBe(275_000);
    expect(profile.spouseIncome).toBe(140_000);
    expect(profile.unifiedLoans).toHaveLength(2);
    expect(profile.unifiedLoans?.[0]?.lenderName).toBe("BANK A");
    expect(profile.unifiedLoans?.[1]?.lenderName).toBe("BANK B");
    expect(profile.personalLoanEMI).toBe(66_172);
    expect(profile.additionalObligations).toHaveLength(1);
    expect(profile.additionalObligations[0]?.monthlyAmount).toBe(42_055);
    expect(profile.additionalObligations[0]?.lenderName).toBe("BANK B");
    expect(profile.homeLoanEMI).toBe(27_860);
    expect(profile.homeLoanOutstanding).toBe(2_950_000);
    expect(form.fdMaturityYear).toBe(2027);
  });

  it("matches report-page income, buckets, breakdowns, and net worth", () => {
    const profile = buildUserAnalyseScenarioProfile();
    const income = monthlyTotalIncome(profile);
    expect(income).toBe(415_000);

    const buckets = getUniversalBucketActuals(profile);

    // Needs: rent + food + transport + utility + domestic help
    expect(buckets.needs).toBe(36_750 + 10_000 + 25_000 + 4_000 + 8_500);
    expect(buckets.wants).toBe(2_000);
    expect(buckets.loans).toBe(66_172 + 42_055 + 27_860);
    expect(buckets.investment).toBe(19_000);

    // Insurance premiums (monthly equivalents)
    const healthMo = 19_853 / 12;
    const termMo = 18_599 / 12;
    const carMo = 15_000 / 12;
    const bikeMo = 1_000 / 12;
    const licMo = 2_895 + 67_386 / 12;
    expect(buckets.security).toBeCloseTo(
      healthMo + termMo + carMo + bikeMo + licMo,
      0,
    );

    // Expanded bucket rows must sum to bucket totals (report drill-down)
    expect(sumBreakdown("needs", profile)).toBe(buckets.needs);
    expect(sumBreakdown("wants", profile)).toBe(buckets.wants);
    expect(sumBreakdown("security", profile)).toBeCloseTo(buckets.security, 0);
    expect(sumBreakdown("loans", profile)).toBe(buckets.loans);
    expect(sumBreakdown("investment", profile)).toBe(buckets.investment);

    const totalExpenses =
      buckets.needs +
      buckets.wants +
      buckets.security +
      buckets.loans +
      buckets.investment;
    // EPF is deducted at source — surplus excludes it from outflow
    expect(getUnallocatedIncome(profile)).toBeCloseTo(
      income - (totalExpenses - 19_000),
      0,
    );
    expect(getUnallocatedIncome(profile)).toBeCloseTo(179_615, 0);

    const liabilities = totalLoanLiabilities(profile);
    expect(liabilities).toBe(2_657_000 + 1_650_000 + 2_950_000);

    const result = analyseFinances(profile);
    expect(result.totalLiabilities).toBe(liabilities);
    expect(result.totalAssets).toBe(13_750_000);
    expect(result.netWorth).toBe(6_493_000);
    expect(result.netWorth).toBe(result.totalAssets - result.totalLiabilities);

    // Report safety checklist — debt ratio & savings rate
    expect(result.scores.debtRatio).toBeCloseTo(
      (buckets.loans / income) * 100,
      1,
    );
    expect(result.scores.savingsRate).toBeCloseTo(
      (buckets.investment / income) * 100,
      1,
    );
    expect(result.scores.untrackedCash).toBeCloseTo(179_615, 0);

    // Emergency fund on report (weighted FD + dedicated emergency corpus)
    const er = computeRealEmergencyFund(profile);
    expect(er.realTotal).toBe(350_000 + 700_000);
    expect(result.realEmergencyFund.total).toBe(er.realTotal);
    expect(result.realEmergencyFund.monthsCovered).toBeCloseTo(
      er.realTotal / buckets.needs,
      1,
    );

    // Term insurance row on report
    expect(profile.termInsuranceSumAssured).toBe(10_000_000);
    expect(result.termInsuranceNeeded).toBe(50_000_000);

    // Health insurance row on report (married minimum target ₹10L)
    expect(profile.healthInsuranceSumInsured).toBe(6_000_000);

    // Known modelling note: totalEquityValue and custom RSU are both counted in assets today.
    expect(profile.totalEquityValue).toBe(1_500_000);
    expect(
      (profile.customInvestments ?? []).reduce(
        (s, i) => s + (i.currentValue ?? 0),
        0,
      ),
    ).toBe(1_900_000);
  });
});
