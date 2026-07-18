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

  it("includes positive needs line items only", () => {
    const items = getBucketBreakdown("needs", {
      rentAmount: 20000,
      rentMaintenanceMonthly: 2000,
      homeLoanEMI: 15000,
      secondPropertyEMI: 8000,
      vegetables: 0,
      grocery: 5000,
      medicine: -10,
      electricity: NaN as unknown as number,
      internet: 800,
      gas: 400,
      water: 300,
      fuel: 2000,
      cabMetro: 1500,
      entertainment: 1000,
      kidsSchoolFees: 12000,
      parentsSupport: 5000,
      personalCare: 700,
      kidsActivities: 2500,
      houseHelpMonthly: 4000,
      cookHelpMonthly: 3500,
    });
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Rent",
        "Rent maintenance",
        "Home loan EMI",
        "Second property EMI",
        "Groceries",
        "Internet and mobile",
        "Gas",
        "Water",
        "Fuel",
        "Cab / metro",
        "Entertainment",
        "Kids school fees",
        "Parents support",
        "Personal care",
        "Kids activities",
        "House help",
        "Cook help",
      ]),
    );
    expect(labels).not.toContain("Vegetables");
    expect(labels).not.toContain("Medicine");
    expect(labels).not.toContain("Electricity");
    expect(items.find((i) => i.label === "Rent")?.value).toBe(20000);
  });

  it("includes shopping under wants", () => {
    expect(getBucketBreakdown("wants", { shopping: 3000 })).toEqual([
      { label: "Shopping", value: 3000 },
    ]);
    expect(getBucketBreakdown("wants", { shopping: 0 })).toEqual([]);
  });

  it("builds security from monthly premiums when provided", () => {
    const items = getBucketBreakdown("security", {
      healthInsurancePremiumMonthly: 1200,
      termInsurancePremiumMonthly: 800,
      carInsurancePremiumMonthly: 400,
      bikeInsurancePremiumMonthly: 100,
      otherInsurancePremiumMonthly: 50,
      ssy: 500,
    });
    expect(items).toEqual(
      expect.arrayContaining([
        { label: "Health insurance premium", value: 1200 },
        { label: "Term insurance premium", value: 800 },
        { label: "Car insurance premium", value: 400 },
        { label: "Bike insurance premium", value: 100 },
        { label: "Other insurance premium", value: 50 },
        { label: "SSY contribution", value: 500 },
      ]),
    );
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
    // Uses trimmed name only for emptiness check; label keeps original string.
    expect(items).toEqual([
      { label: "  Accidental  ", value: 200 },
      { label: "Other insurance (2)", value: 300 },
    ]);
  });

  it("builds loans breakdown including obligations", () => {
    const items = getBucketBreakdown("loans", {
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
      }),
    ).toEqual([
      { label: "Monthly SIP", value: 10000 },
      { label: "Monthly RD", value: 2000 },
      { label: "NPS contribution", value: 1500 },
    ]);
  });
});
