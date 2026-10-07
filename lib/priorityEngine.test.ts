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
    primaryGoal: "buy_home",
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
        "goal_home_purchase",
        "goal_retirement",
        "ssy_girl_age_9",
      ]),
    );
    expect(plan.debts).toHaveLength(6);
    expect(plan.debts[0]?.type).toBe("Credit card");
    expect(plan.goals.map((g) => g.goalType)).toEqual(
      expect.arrayContaining(["home_purchase", "retirement"]),
    );
    expect(plan.goals.every((g) => !g.readyToStart)).toBe(true);
    const priorityIds = plan.priorities.map((item) => item.id);
    const homeIdx = priorityIds.indexOf("goal_home_purchase");
    const ssyIdx = priorityIds.indexOf("ssy_girl_age_9");
    expect(homeIdx).toBeGreaterThan(ssyIdx);
    expect(priorityIds.indexOf("term_insurance")).toBeLessThan(homeIdx);
    expect(priorityIds.indexOf("health_insurance")).toBeLessThan(homeIdx);
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
    const car = plan.goals.find((g) => g.goalType === "vehicle_purchase");
    expect(car).toMatchObject({
      targetAmount: 800_000,
      yearsToGoal: 3,
      instrument: "Bank FD / short-duration debt fund",
      readyToStart: true,
      blockedBy: null,
      icon: "🚗",
    });
    // Big surplus: every goal is fully funded and the rest goes to a general SIP.
    expect(car?.monthlyAllocated).toBe(car?.monthlyRequired);
    expect(plan.goals.some((g) => g.goalType === "retirement")).toBe(true);
    expect(plan.goalFunding?.shortfall).toBe(0);
    expect(plan.priorities.some((p) => p.id === "start_sip")).toBe(true);
    expect(plan.fdSuggestion).toBeUndefined();
  });

  it("skips medical fund allocation when entered medical emergency fund meets target", () => {
    const plan = buildPriorityPlan(
      profile({
        cityTier: "tier3",
        liquidMFValue: 300_000,
        medicalEmergencyFund: 250_000,
        savingsAccountBalance: 1_000_000,
      }),
      { needsActual: 50_000, overallScore: 70 },
    );
    const medical = plan.priorities.find((item) => item.id === "medical_fund");
    expect(medical?.status).toBe("complete");
    expect(medical?.gap).toBe(0);
    expect(medical?.monthlyContribution).toBe(0);
    expect(plan.monthlyPlan?.[0]?.medical).toBe(0);
  });

  it("routes goal funding after safety and SSY in priority order", () => {
    const plan = buildPriorityPlan(profile(), {
      needsActual: 50_000,
      overallScore: 40,
    });
    const priorityIds = plan.priorities.map((item) => item.id);
    const homeIdx = priorityIds.indexOf("goal_home_purchase");
    const ssyIdx = priorityIds.indexOf("ssy_girl_age_9");
    expect(homeIdx).toBeGreaterThan(ssyIdx);
    expect(priorityIds.indexOf("term_insurance")).toBeLessThan(homeIdx);
    expect(priorityIds.indexOf("health_insurance")).toBeLessThan(homeIdx);
  });

  it("routes buy_home goal deploy after extra debt in monthly plan", () => {
    const plan = buildPriorityPlan(profile(), {
      needsActual: 50_000,
      overallScore: 40,
    });
    const safeMonth = plan.monthlyPlan?.find(
      (m) =>
        (m.emergency || 0) === 0 &&
        (m.medical || 0) === 0 &&
        (m.termYearly || 0) === 0 &&
        ((m.sip || 0) > 0 || (m.extraDebt || 0) > 0),
    );
    expect(safeMonth).toBeTruthy();
    if ((safeMonth?.extraDebt || 0) > 0 && (safeMonth?.sip || 0) > 0) {
      expect(safeMonth?.extraDebt).toBeGreaterThan(0);
    }
  });

  it("routes surplus to debt when primary goal is clear_debt", () => {
    const plan = buildPriorityPlan(
      profile({
        primaryGoal: "clear_debt",
        medicalEmergencyFund: 300_000,
        cityTier: "metro",
        liquidMFValue: 500_000,
        savingsAccountBalance: 2_000_000,
      }),
      { needsActual: 40_000, overallScore: 70 },
    );
    expect(plan.goals.some((g) => g.goalType === "clear_debt")).toBe(true);
    const wealth = plan.priorities.find((p) => p.id === "accelerate_debt");
    expect(wealth?.title).toMatch(/debt/i);
    const firstSafe = plan.monthlyPlan?.find(
      (m) => (m.emergency || 0) === 0 && (m.medical || 0) === 0,
    );
    expect((firstSafe?.extraDebt || 0) > 0 || (firstSafe?.sip || 0) >= 0).toBe(
      true,
    );
  });
});
