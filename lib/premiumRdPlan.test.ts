import { describe, expect, it } from "vitest";
import {
  applyRenewalMonths,
  buildPremiumRdObligations,
  buildPremiumRdPlan,
  listYearlyPremiums,
  monthsUntilRenewal,
  premiumRdHeadline,
  PREMIUM_RD_CATEGORY,
  PREMIUM_RD_SOURCE,
  type PremiumRdProfile,
} from "./premiumRdPlan";

// 9 October 2026
const OCT = new Date(2026, 9, 9);

describe("monthsUntilRenewal", () => {
  it("counts this month up to the month before renewal", () => {
    expect(monthsUntilRenewal(3, OCT)).toBe(5); // Oct–Feb
    expect(monthsUntilRenewal(11, OCT)).toBe(1);
    expect(monthsUntilRenewal(9, OCT)).toBe(11);
  });

  it("plans for next year when the renewal is this month", () => {
    expect(monthsUntilRenewal(10, OCT)).toBe(12);
  });
});

describe("listYearlyPremiums", () => {
  it("lists only yearly premiums", () => {
    const list = listYearlyPremiums({
      hasHealthInsurance: true,
      healthInsurancePremiumInput: 24000,
      healthInsurancePremiumFrequency: "yearly",
      hasTermInsurance: true,
      termInsurancePremiumInput: 1500,
      termInsurancePremiumFrequency: "monthly",
      carInsurancePremiumInput: 12000,
      carInsurancePremiumFrequency: "yearly",
      carInsuranceRenewalMonth: 4,
      hasOtherInsurance: true,
      otherInsurancePremiums: [
        { policyName: "LIC", premiumAmount: 36000, frequency: "yearly" },
      ],
    });
    expect(list.map((p) => p.key)).toEqual(["health", "car", "other:0"]);
    expect(list[0].renewalMonth).toBeNull();
    expect(list[1].renewalMonth).toBe(4);
    expect(list[2].label).toBe("LIC");
  });

  it("skips a premium whose cover is switched off", () => {
    expect(
      listYearlyPremiums({
        hasHealthInsurance: false,
        healthInsurancePremiumInput: 24000,
        healthInsurancePremiumFrequency: "yearly",
      }),
    ).toEqual([]);
  });
});

describe("buildPremiumRdPlan", () => {
  it("uses premium / 12 a year or more away", () => {
    const plan = buildPremiumRdPlan(
      {
        hasHealthInsurance: true,
        healthInsurancePremiumInput: 24000,
        healthInsurancePremiumFrequency: "yearly",
        healthInsuranceRenewalMonth: 10,
      },
      OCT,
    );
    expect(plan.rdItems[0].monthly).toBe(2000);
    expect(premiumRdHeadline(plan)[0]).toBe(
      "Your health premium of ₹24,000 is due in October. Save ₹2,000 a month in an RD so it's ready.",
    );
  });

  it("spreads the premium over the months left", () => {
    const plan = buildPremiumRdPlan(
      {
        hasHealthInsurance: true,
        healthInsurancePremiumInput: 24000,
        healthInsurancePremiumFrequency: "yearly",
        healthInsuranceRenewalMonth: 6, // Oct–May = 8 months
      },
      OCT,
    );
    expect(plan.rdItems[0].monthsLeft).toBe(8);
    expect(plan.rdItems[0].monthly).toBe(3000);
    expect(plan.rdItems[0].afterRenewalMonthly).toBe(2000);
  });

  it("suggests savings when the renewal is under 6 months away", () => {
    const plan = buildPremiumRdPlan(
      {
        carInsurancePremiumInput: 12000,
        carInsurancePremiumFrequency: "yearly",
        carInsuranceRenewalMonth: 1, // Oct–Dec = 3 months
      },
      OCT,
    );
    expect(plan.rdItems).toHaveLength(0);
    expect(plan.savingsItems[0].monthly).toBe(4000);
    expect(premiumRdHeadline(plan)[0]).toContain("set aside ₹4,000 a month");
  });

  it("combines several policies into one RD", () => {
    const plan = buildPremiumRdPlan(
      {
        hasHealthInsurance: true,
        healthInsurancePremiumInput: 24000,
        healthInsurancePremiumFrequency: "yearly",
        healthInsuranceRenewalMonth: 10,
        hasTermInsurance: true,
        termInsurancePremiumInput: 12000,
        termInsurancePremiumFrequency: "yearly",
        termInsuranceRenewalMonth: 10,
      },
      OCT,
    );
    expect(plan.rdMonthly).toBe(3000);
    expect(premiumRdHeadline(plan)).toEqual([
      "You pay ₹36,000 a year in yearly premiums. One RD of ₹3,000 a month gets them all ready on time.",
    ]);
  });

  it("asks for a missing renewal month instead of guessing", () => {
    const profile = {
      hasHealthInsurance: true,
      healthInsurancePremiumInput: 24000,
      healthInsurancePremiumFrequency: "yearly" as const,
    };
    const plan = buildPremiumRdPlan(profile, OCT);
    expect(plan.items).toHaveLength(0);
    expect(plan.missing.map((m) => m.key)).toEqual(["health"]);
    const answered = buildPremiumRdPlan(profile, OCT, { health: 10 });
    expect(answered.missing).toHaveLength(0);
    expect(answered.rdMonthly).toBe(2000);
  });
});

describe("buildPremiumRdObligations", () => {
  it("creates a monthly Security obligation for the RD and the savings", () => {
    const plan = buildPremiumRdPlan(
      {
        hasHealthInsurance: true,
        healthInsurancePremiumInput: 24000,
        healthInsurancePremiumFrequency: "yearly",
        healthInsuranceRenewalMonth: 10,
        carInsurancePremiumInput: 12000,
        carInsurancePremiumFrequency: "yearly",
        carInsuranceRenewalMonth: 1,
      },
      OCT,
    );
    const rows = buildPremiumRdObligations(plan);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: "RD for insurance premiums",
      category: PREMIUM_RD_CATEGORY,
      amount: 2000,
      frequency: "monthly",
      source: PREMIUM_RD_SOURCE,
    });
    expect(rows[1]).toMatchObject({
      title: "Savings for insurance premiums",
      amount: 4000,
    });
    expect(rows[1].notes).toContain("₹1,000 a month after renewal");
  });

  it("creates nothing without a plan", () => {
    expect(buildPremiumRdObligations(buildPremiumRdPlan({}, OCT))).toEqual([]);
  });
});

describe("applyRenewalMonths", () => {
  it("writes picked months back, including other policies", () => {
    const next = applyRenewalMonths<PremiumRdProfile>(
      {
        hasOtherInsurance: true,
        otherInsurancePremiums: [{ premiumAmount: 5000, frequency: "yearly" }],
      },
      { health: 3, "other:0": 8, car: 13 },
    );
    expect(next.healthInsuranceRenewalMonth).toBe(3);
    expect(next.otherInsurancePremiums?.[0]?.renewalMonth).toBe(8);
    expect(next.carInsuranceRenewalMonth).toBeUndefined();
  });
});
