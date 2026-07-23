import { describe, expect, it } from "vitest";
import { getBucketBreakdown } from "./bucket-breakdown";

describe("getBucketBreakdown", () => {
  it("returns empty list for empty profile", () => {
    expect(getBucketBreakdown("needs", {})).toEqual([]);
    expect(getBucketBreakdown("wants", {})).toEqual([]);
    expect(getBucketBreakdown("security", {})).toEqual([]);
    expect(getBucketBreakdown("loans", {})).toEqual([]);
    expect(getBucketBreakdown("investment", {})).toEqual([]);
  });

  it("includes positive needs line items matching universal buckets", () => {
    const items = getBucketBreakdown("needs", {
      lifeStage: "kids",
      rentAmount: 20000,
      rentMaintenanceMonthly: 2000,
      foodTotal: 8000,
      transportTotal: 3500,
      utilityTotal: 1500,
      domesticHelpTotal: 7500,
      kidsSchoolFees: 12000,
      kidsActivities: 2500,
      parentsSupport: 5000,
    });
    expect(items).toEqual([
      { label: "Rent", value: 20000 },
      { label: "Rent maintenance", value: 2000 },
      { label: "Food and daily essentials", value: 8000 },
      { label: "Transport", value: 3500 },
      { label: "Utilities", value: 1500 },
      { label: "Domestic help", value: 7500 },
      { label: "Kids school fees", value: 12000 },
      { label: "Kids activities", value: 2500 },
      { label: "Parents support", value: 5000 },
    ]);
  });

  it("includes lifestyle under wants", () => {
    expect(getBucketBreakdown("wants", { lifestyleTotal: 4000 })).toEqual([
      {
        label: "Lifestyle (shopping, entertainment, personal care)",
        value: 4000,
      },
    ]);
    expect(getBucketBreakdown("wants", { shopping: 3000 })).toEqual([
      { label: "Shopping", value: 3000 },
    ]);
  });

  it("builds security from monthly premiums when provided", () => {
    const items = getBucketBreakdown("security", {
      healthInsurancePremiumMonthly: 1200,
      termInsurancePremiumMonthly: 800,
      carInsurancePremiumMonthly: 400,
      bikeInsurancePremiumMonthly: 100,
      otherInsurancePremiumMonthly: 50,
    });
    expect(items).toEqual(
      expect.arrayContaining([
        { label: "Health insurance premium", value: 1200 },
        { label: "Term insurance premium", value: 800 },
        { label: "Car insurance premium", value: 400 },
        { label: "Bike insurance premium", value: 100 },
        { label: "Other insurance premium", value: 50 },
      ]),
    );
    expect(items.find((i) => i.label.includes("SSY"))).toBeUndefined();
  });

  it("converts yearly health premium input when monthly missing", () => {
    const items = getBucketBreakdown("security", {
      hasHealthInsurance: true,
      healthInsurancePremiumInput: 12000,
      healthInsurancePremiumFrequency: "yearly",
    });
    expect(items).toEqual([{ label: "Health insurance premium", value: 1000 }]);
  });

  it("converts term/car/bike premiums from input when monthly missing", () => {
    const items = getBucketBreakdown("security", {
      hasTermInsurance: true,
      termInsurancePremiumInput: 12000,
      termInsurancePremiumFrequency: "yearly",
      carInsurancePremiumInput: 6000,
      carInsurancePremiumFrequency: "yearly",
      bikeInsurancePremiumInput: 1200,
      bikeInsurancePremiumFrequency: "yearly",
    });
    expect(items).toEqual(
      expect.arrayContaining([
        { label: "Term insurance premium", value: 1000 },
        { label: "Car insurance premium", value: 500 },
        { label: "Bike insurance premium", value: 100 },
      ]),
    );
  });

  it("skips security premiums when flags/inputs are absent", () => {
    expect(
      getBucketBreakdown("security", {
        hasHealthInsurance: false,
        hasTermInsurance: false,
      }),
    ).toEqual([]);
  });

  it("lists other insurance policies with names or fallback labels", () => {
    const items = getBucketBreakdown("security", {
      hasOtherInsurance: true,
      otherInsurancePremiums: [
        {
          policyName: "  Accidental  ",
          premiumAmount: 2400,
          frequency: "yearly",
        },
        { policyName: "  ", premiumInput: 300, frequency: "monthly" },
        { premiumAmount: 0, frequency: "monthly" },
      ],
    });
    expect(items).toEqual([
      { label: "  Accidental  ", value: 200 },
      { label: "Other insurance (2)", value: 300 },
    ]);
  });

  it("builds loans breakdown including obligations", () => {
    const items = getBucketBreakdown("loans", {
      homeLoanEMI: 15000,
      homeLoanLenderName: "HDFC",
      carLoanEMI: 8000,
      bikeEMI: 2000,
      personalLoanEMI: 3000,
      creditCardBillMonthly: 1500,
      additionalObligations: [
        { type: "Education", monthlyAmount: 4000 },
        { type: "  ", monthlyAmount: 1000 },
        { type: "Skip", monthlyAmount: 0 },
      ] as never,
    });
    expect(items).toEqual([
      { label: "Home loan EMI (HDFC)", value: 15000 },
      { label: "Car loan EMI", value: 8000 },
      { label: "Bike loan EMI", value: 2000 },
      { label: "Personal loan EMI", value: 3000 },
      { label: "Credit card payment", value: 1500 },
      { label: "Education", value: 4000 },
      { label: "Other obligation", value: 1000 },
    ]);
  });

  it("builds investment breakdown", () => {
    expect(
      getBucketBreakdown("investment", {
        monthlySIP: 10000,
        monthlyRD: 2000,
        monthlyNPSContribution: 1500,
        monthlyPPFContribution: 500,
        monthlyEPFContribution: 2000,
        ssy: 1000,
        customInvestments: [
          {
            label: "Gold SIP",
            monthlyContribution: 300,
            currentValue: 0,
            type: "other",
          },
        ],
      }),
    ).toEqual([
      { label: "Monthly SIP", value: 10000 },
      { label: "Monthly RD", value: 2000 },
      { label: "NPS contribution", value: 1500 },
      { label: "PPF contribution", value: 500 },
      { label: "EPF contribution (employee)", value: 2000 },
      { label: "SSY contribution", value: 1000 },
      { label: "Gold SIP", value: 300 },
    ]);
  });
});
