import { describe, expect, it } from "vitest";
import { buildUserAnalyseScenarioProfile } from "./analyseUserScenarioFixture";
import { analyseFinances, termPremiumMonthlyEstimate } from "./financialEngine";
import type { FinancialProfile } from "./analyse-form-schema";

const base = () => buildUserAnalyseScenarioProfile();
const pillar = (p: FinancialProfile, id: string) =>
  analyseFinances(p).moneyScore!.pillars.find((x) => x.id === id)!;

const single = (over: Partial<FinancialProfile> = {}): FinancialProfile => ({
  ...base(),
  lifeStage: "bachelor",
  numberOfKids: 0,
  parentsSupport: 0,
  spouseIncome: 0,
  unifiedLoans: [],
  personalLoanEMI: 0,
  homeLoanEMI: 0,
  carLoanEMI: 0,
  bikeEMI: 0,
  additionalObligations: [],
  hasTermInsurance: false,
  termInsuranceSumAssured: 0,
  ...over,
});

describe("money score", () => {
  it("adds six pillars to the overall score and explains each", () => {
    const r = analyseFinances(base());
    const ms = r.moneyScore!;
    expect(ms.pillars.map((p) => p.id)).toEqual([
      "safety",
      "protection",
      "debt",
      "saving",
      "goals",
      "wealth",
    ]);
    expect(ms.pillars.reduce((s, p) => s + p.max, 0)).toBe(100);
    expect(r.overallScore).toBe(ms.total);
    for (const p of ms.pillars) expect(p.line.length).toBeGreaterThan(10);
  });

  it("marks down a household that invests little and points to the fix", () => {
    const saving = pillar(base(), "saving");
    expect(saving.points).toBeLessThan(5);
    expect(saving.action?.text).toMatch(/Raise monthly investing/);
  });

  it("does not push a top-up on ₹1Cr term cover", () => {
    const r = analyseFinances(base());
    const term = r.securityChecklist.find((c) => c.label === "Term insurance");
    expect(term?.status).toBe("ok");
    expect(term?.actionNeeded).toBeUndefined();
    expect(pillar(base(), "protection").line).toMatch(/solid base/);
  });

  it("treats term cover as optional with no dependants or loans", () => {
    const r = analyseFinances(single());
    expect(r.issues.some((i) => i.code === "term_missing")).toBe(false);
    expect(pillar(single(), "protection").line).toMatch(/optional/);
  });

  it("caps company-only health cover and asks for an own policy", () => {
    const p = single({ healthInsuranceSource: "employer" });
    const protection = pillar(p, "protection");
    expect(protection.points).toBeLessThanOrEqual(16);
    expect(protection.action?.text).toMatch(/Buy your own health policy/);
    const own = analyseFinances({
      ...p,
      healthInsuranceSource: "both",
      healthInsuranceSumInsured: 1_000_000,
      employerHealthCover: 500_000,
    }).securityChecklist.find((c) => c.label === "Medical insurance");
    expect(own?.status).toBe("ok");
  });

  it("fills the medical fund from savings beyond the emergency fund", () => {
    // Enough in the bank to cover the emergency fund (needs, EMIs and premiums) with room to spare.
    const r = analyseFinances({ ...base(), savingsAccountBalance: 30_00_000 });
    const med = r.securityChecklist.find(
      (c) => c.label === "Medical emergency fund",
    );
    expect(med?.detail).toMatch(/from savings you hold beyond/);
  });

  it("prices term cover realistically by age", () => {
    expect(termPremiumMonthlyEstimate(1_00_00_000, 28)).toBe(850);
    expect(termPremiumMonthlyEstimate(1_00_00_000, 42)).toBe(2500);
    expect(termPremiumMonthlyEstimate(0, 30)).toBe(0);
  });
});
