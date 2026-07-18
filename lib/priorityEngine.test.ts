import { describe, expect, it } from "vitest";
import { buildPriorityPlan } from "./priorityEngine";

function profile(overrides: Record<string, unknown> = {}) {
  return {
    lifeStage: "kids",
    selfAge: 36,
    monthlySalary: 200_000,
    spouseIncome: 50_000,
    otherIncome: 5_000,
    rentAmount: 20_000,
    rentMaintenanceMonthly: 2_000,
    foodTotal: 0,
    vegetables: 3_000,
    grocery: 7_000,
    medicine: 1_000,
    transportTotal: 0,
    fuel: 3_000,
    cabMetro: 2_000,
    utilityTotal: 0,
    electricity: 2_000,
    internet: 1_000,
    gas: 500,
    water: 500,
    domesticHelpTotal: 0,
    houseHelpMonthly: 1_000,
    cookHelpMonthly: 1_000,
    lifestyleTotal: 0,
    entertainment: 4_000,
    shopping: 3_000,
    personalCare: 1_000,
    kidsSchoolFees: 5_000,
    kidsActivities: 1_000,
    parentsSupport: 3_000,
    homeLoanEMI: 10_000,
    homeLoanRemainingMonths: 100,
    homeLoanRate: 8,
    carLoanEMI: 5_000,
    carLoanLenderName: "Car Bank",
    carLoanOutstanding: 100_000,
    bikeEMI: 2_000,
    personalLoanEMI: 3_000,
    personalLoanLenderName: "Personal Bank",
    creditCardBillMonthly: 1_000,
    additionalObligations: [
      {
        type: "Education",
        lenderName: "College",
        monthlyAmount: 2_000,
        outstandingAmount: 20_000,
        rateOfInterest: 9,
      },
      { type: "Education", lenderName: "College", monthlyAmount: 2_000 },
    ],
    monthlySIP: 5_000,
    monthlyRD: 1_000,
    monthlyPPFContribution: 500,
    monthlyNPSContribution: 500,
    monthlyEPFContribution: 2_000,
    ssy: 0,
    customInvestments: [{ monthlyContribution: 500, currentValue: 10_000 }],
    healthInsurancePremiumMonthly: 500,
    termInsurancePremiumMonthly: 300,
    carInsurancePremiumMonthly: 100,
    bikeInsurancePremiumMonthly: 100,
    otherInsurancePremiums: [{ premiumAmount: 1_200, frequency: "yearly" }],
    savingsAccountBalance: 10_000,
    liquidMFValue: 10_000,
    fdValue: 200_000,
    fdRate: 5,
    totalEquityValue: 0,
    mfValue: 20_000,
    indianStocksValue: 10_000,
    usStocksValueINR: 5_000,
    usMFValueINR: 5_000,
    rsuValueINR: 5_000,
    ppfBalance: 10_000,
    epfBalance: 20_000,
    numberOfKids: 1,
    kidsAges: [9],
    kidsGenders: ["girl"],
    primaryGoal: "buy_house",
    homePurchaseTarget: 5_000_000,
    retirementAge: 60,
    hasTermInsurance: false,
    termInsuranceSumAssured: 0,
    hasHealthInsurance: false,
    healthInsuranceSumInsured: 0,
    ...overrides,
  };
}

describe("buildPriorityPlan", () => {
  it("builds sequenced safety priorities, debts, goal, FD suggestion, and monthly plan", () => {
    const plan = buildPriorityPlan(profile(), {
      needsActual: 50_000,
      overallScore: 40,
    });
    expect(plan.monthlyIncome).toBe(255_000);
    expect(plan.priorities.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "emergency_fund",
        "medical_fund",
        "term_insurance",
        "health_insurance",
        "start_sip",
        "ssy_girl_age_9",
      ]),
    );
    expect(plan.debts).toHaveLength(6);
    expect(plan.debts[0]?.type).toBe("Credit card");
    expect(plan.goals[0]).toMatchObject({
      goalType: "buy_house",
      readyToStart: false,
    });
    expect(plan.fdSuggestion).toMatchObject({
      bank: "Unity Small Finance Bank",
      currentRate: 5,
    });
    expect(plan.monthlyPlan).toHaveLength(12);
    expect(plan.topAction).toContain("Transfer");
  });

  it("supports complete coverage, explicit totals, car and FIRE goals", () => {
    const plan = buildPriorityPlan(
      profile({
        lifeStage: "bachelor",
        selfAge: 28,
        spouseIncome: 80_000,
        foodTotal: 10_000,
        transportTotal: 2_000,
        utilityTotal: 3_000,
        domesticHelpTotal: 0,
        lifestyleTotal: 1_000,
        savingsAccountBalance: 5_000_000,
        homePurchaseTarget: undefined,
        liquidMFValue: 1_000_000,
        fdValue: 0,
        fdRate: 0,
        homeLoanEMI: 0,
        carLoanEMI: 0,
        bikeEMI: 0,
        personalLoanEMI: 0,
        creditCardBillMonthly: 0,
        additionalObligations: [],
        numberOfKids: 0,
        kidsAges: [],
        kidsGenders: [],
        hasTermInsurance: true,
        termInsuranceSumAssured: 100_000_000,
        hasHealthInsurance: true,
        healthInsuranceSumInsured: 5_000_000,
        primaryGoal: "buy_car",
        ownsCar: false,
      }),
      { needsActual: 20_000, overallScore: 99 },
    );
    expect(plan.monthlyIncome).toBe(205_000);
    expect(
      plan.priorities.find((item) => item.id === "emergency_fund")?.status,
    ).toBe("complete");
    expect(plan.priorities.some((item) => item.id === "term_insurance")).toBe(
      false,
    );
    expect(plan.goals).toEqual([
      {
        goalType: "buy_car",
        targetAmount: 800_000,
        currentSaved: 0,
        monthlyRequired: expect.any(Number),
        yearsToGoal: 2,
        instrument: "Post Office RD or Liquid MF",
        readyToStart: true,
        blockedBy: null,
        icon: "🚗",
      },
    ]);
    expect(plan.fdSuggestion).toBeUndefined();
  });
});
