import { describe, expect, it } from "vitest";
import {
  BASE_UNIVERSAL_CAPS,
  BUCKET_CAPS,
  getInsuranceCriticalFloor,
  getInsuranceGuideline,
  getInsurancePremiumsMonthly,
  getUnallocatedIncome,
  getUniversalBucketActuals,
  getUniversalBucketRows,
  getUniversalBucketStatus,
  getUniversalCaps,
  hasHomeLoan,
} from "./universal-buckets";

describe("constants", () => {
  it("exposes expected bucket cap fractions", () => {
    expect(BUCKET_CAPS).toEqual({
      needs: 0.3,
      wants: 0.05,
      security: 0.1,
      loans: 0.3,
      investment: 0.25,
    });
    expect(BASE_UNIVERSAL_CAPS.loans).toBe(0.3);
  });
});

describe("hasHomeLoan", () => {
  it("detects positive home / second property EMI", () => {
    expect(hasHomeLoan({})).toBe(false);
    expect(hasHomeLoan({ homeLoanEMI: 0 })).toBe(false);
    expect(hasHomeLoan({ homeLoanEMI: 100 })).toBe(true);
    expect(hasHomeLoan({ secondPropertyEMI: 50 })).toBe(true);
  });
});

describe("getUniversalCaps", () => {
  const pct = (caps: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(caps).map(([k, v]) => [k, Math.round(v * 100)]),
    );
  const total = (caps: Record<string, number>) =>
    Math.round(Object.values(caps).reduce((a, b) => a + b, 0) * 100);

  it("uses life-stage splits once Analyse answers exist", () => {
    const base = { cityTier: "tier2", monthlySalary: 100000 } as const;
    expect(
      pct(getUniversalCaps({ ...base, lifeStage: "bachelor", selfAge: 25 })),
    ).toEqual({ needs: 30, wants: 5, security: 7, loans: 30, investment: 28 });
    expect(
      pct(getUniversalCaps({ ...base, lifeStage: "bachelor", selfAge: 32 })),
    ).toEqual({ needs: 30, wants: 5, security: 10, loans: 30, investment: 25 });
    expect(
      pct(getUniversalCaps({ ...base, lifeStage: "kids", selfAge: 35 })),
    ).toEqual({ needs: 33, wants: 5, security: 12, loans: 28, investment: 22 });
    expect(
      pct(getUniversalCaps({ ...base, lifeStage: "senior", selfAge: 65 })),
    ).toEqual({ needs: 40, wants: 7, security: 15, loans: 10, investment: 28 });
  });

  it("shifts Needs by income band for the city", () => {
    const married = { lifeStage: "married", selfAge: 35 } as const;
    expect(
      pct(
        getUniversalCaps({
          ...married,
          cityTier: "metro",
          monthlySalary: 35000,
        }),
      ),
    ).toEqual({ needs: 40, wants: 5, security: 10, loans: 25, investment: 20 });
    expect(
      pct(
        getUniversalCaps({
          ...married,
          cityTier: "tier3",
          monthlySalary: 35000,
        }),
      ),
    ).toEqual({ needs: 30, wants: 5, security: 10, loans: 30, investment: 25 });
    expect(
      pct(
        getUniversalCaps({
          ...married,
          cityTier: "metro",
          monthlySalary: 350000,
        }),
      ),
    ).toEqual({ needs: 25, wants: 5, security: 10, loans: 30, investment: 30 });
  });

  it("keeps floors and takes any shortfall from Needs", () => {
    const caps = getUniversalCaps({
      lifeStage: "kids",
      selfAge: 38,
      cityTier: "metro",
      monthlySalary: 30000,
      parentsSupport: 5000,
      homeLoanEMI: 8000,
    });
    expect(pct(caps)).toEqual({
      needs: 37,
      wants: 5,
      security: 15,
      loans: 28,
      investment: 15,
    });
    expect(total(caps)).toBe(100);
  });

  it("lowers Loans for ages 45 to 59", () => {
    expect(
      pct(
        getUniversalCaps({
          lifeStage: "married",
          selfAge: 50,
          cityTier: "tier2",
          monthlySalary: 100000,
        }),
      ),
    ).toEqual({ needs: 30, wants: 5, security: 10, loans: 25, investment: 30 });
  });

  it("every combination adds up to 100 and respects floors", () => {
    for (const lifeStage of ["bachelor", "married", "kids", "senior"] as const)
      for (const selfAge of [24, 35, 50, 65])
        for (const cityTier of ["metro", "tier2", "tier3"] as const)
          for (const monthlySalary of [15000, 80000, 400000])
            for (const parentsSupport of [0, 5000])
              for (const homeLoanEMI of [0, 20000]) {
                const caps = getUniversalCaps({
                  lifeStage,
                  selfAge,
                  cityTier,
                  monthlySalary,
                  parentsSupport,
                  homeLoanEMI,
                });
                expect(total(caps)).toBe(100);
                expect(caps.wants).toBeGreaterThanOrEqual(0.05 - 1e-9);
                expect(caps.security).toBeGreaterThanOrEqual(0.07 - 1e-9);
                expect(caps.investment).toBeGreaterThanOrEqual(0.15 - 1e-9);
              }
  });

  it("returns the generic caps without Analyse answers", () => {
    expect(getUniversalCaps({})).toEqual(BUCKET_CAPS);
    expect(getUniversalCaps({ homeLoanEMI: 50000 } as never)).toEqual(
      BUCKET_CAPS,
    );
  });
});

describe("getUniversalBucketStatus", () => {
  it("returns good at or below cap", () => {
    expect(getUniversalBucketStatus(100, 100)).toBe("good");
    expect(getUniversalBucketStatus(99, 100)).toBe("good");
    expect(getUniversalBucketStatus(0, 0)).toBe("good");
  });

  it("returns warning up to 15% over cap", () => {
    expect(getUniversalBucketStatus(110, 100)).toBe("warning");
    expect(getUniversalBucketStatus(115, 100)).toBe("warning");
  });

  it("returns critical beyond 15% over", () => {
    expect(getUniversalBucketStatus(115.1, 100)).toBe("critical");
    expect(getUniversalBucketStatus(200, 100)).toBe("critical");
  });
});

describe("getInsurancePremiumsMonthly", () => {
  it("sums monthly premiums", () => {
    expect(
      getInsurancePremiumsMonthly({
        healthInsurancePremiumMonthly: 1000,
        termInsurancePremiumMonthly: 500,
        carInsurancePremiumMonthly: 200,
        bikeInsurancePremiumMonthly: 100,
        otherInsurancePremiumMonthly: 50,
      }),
    ).toBe(1850);
  });

  it("returns 0 when empty", () => {
    expect(getInsurancePremiumsMonthly({})).toBe(0);
  });

  it("uses yearly inputs when monthly missing and flags set", () => {
    expect(
      getInsurancePremiumsMonthly({
        hasHealthInsurance: true,
        healthInsurancePremiumInput: 12000,
        healthInsurancePremiumFrequency: "yearly",
        hasTermInsurance: true,
        termInsurancePremiumInput: 6000,
        termInsurancePremiumFrequency: "yearly",
      }),
    ).toBe(1500);
  });
});

describe("getUniversalBucketActuals", () => {
  it("returns zeros for empty profile", () => {
    expect(getUniversalBucketActuals({})).toEqual({
      needs: 0,
      wants: 0,
      security: 0,
      loans: 0,
      investment: 0,
    });
  });

  it("prefers food/transport/utility totals over line items", () => {
    const actuals = getUniversalBucketActuals({
      foodTotal: 8000,
      vegetables: 1000,
      grocery: 2000,
      transportTotal: 3000,
      fuel: 9999,
      utilityTotal: 2500,
      electricity: 1,
    });
    expect(actuals.needs).toBe(8000 + 3000 + 2500);
  });

  it("sums line items when totals are missing", () => {
    const actuals = getUniversalBucketActuals({
      vegetables: 1000,
      grocery: 2000,
      medicine: 500,
      fuel: 1500,
      cabMetro: 500,
      electricity: 1000,
      internet: 500,
      gas: 200,
      water: 100,
      rentAmount: 20000,
      rentMaintenanceMonthly: 2000,
    });
    expect(actuals.needs).toBe(
      20000 + 2000 + 1000 + 2000 + 500 + 1500 + 500 + 1000 + 500 + 200 + 100,
    );
  });

  it("skips rent maintenance when rent is zero", () => {
    const actuals = getUniversalBucketActuals({
      rentAmount: 0,
      rentMaintenanceMonthly: 2000,
    });
    expect(actuals.needs).toBe(0);
  });

  it("includes kids costs only for kids life stage", () => {
    const base = {
      kidsSchoolFees: 10000,
      kidsActivities: 2000,
    };
    expect(
      getUniversalBucketActuals({ ...base, lifeStage: "married" }).needs,
    ).toBe(0);
    expect(
      getUniversalBucketActuals({ ...base, lifeStage: "kids" }).needs,
    ).toBe(12000);
  });

  it("puts lifestyle into wants", () => {
    expect(
      getUniversalBucketActuals({
        entertainment: 1000,
        shopping: 2000,
        personalCare: 500,
      }).wants,
    ).toBe(3500);
  });

  it("dedupes additional loan obligations", () => {
    const actuals = getUniversalBucketActuals({
      personalLoanEMI: 1000,
      additionalObligations: [
        { type: "Edu", lenderName: "SBI", monthlyAmount: 2000 },
        { type: "edu", lenderName: "sbi", monthlyAmount: 2000 },
        { type: "Other", lenderName: "HDFC", monthlyAmount: 1500 },
      ] as never,
    });
    expect(actuals.loans).toBe(1000 + 2000 + 1500);
  });

  it("sums investment contributions only", () => {
    expect(
      getUniversalBucketActuals({
        monthlySIP: 10000,
        monthlyRD: 2000,
        monthlyNPSContribution: 1000,
        monthlyPPFContribution: 500,
        monthlyEPFContribution: 1500,
        ssy: 500,
        epfBalance: 999999,
      }).investment,
    ).toBe(15500);
  });

  it("includes customInvestments monthlyContribution in investment", () => {
    const actuals = getUniversalBucketActuals({
      monthlySIP: 5000,
      customInvestments: [
        { label: "SGB", monthlyContribution: 2000, currentValue: 50000 },
      ],
    } as never);
    expect(actuals.investment).toBe(7000);
  });
});

describe("getUniversalBucketRows", () => {
  it("builds five rows with cap labels and status", () => {
    const rows = getUniversalBucketRows({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      rentAmount: 20000,
      shopping: 2000,
      monthlySIP: 5000,
    } as never);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.key)).toEqual([
      "needs",
      "wants",
      "security",
      "loans",
      "investment",
    ]);
    expect(rows[0].capLabel).toBe("30%");
    expect(rows[0].capAmount).toBe(30000);
    expect(rows.find((r) => r.key === "loans")?.capHelper).toContain(
      "home EMI",
    );
  });

  it("marks overspend as warning or critical", () => {
    // wants cap = 5% of 1L = 5k; warning up to 15% over => 5750
    const rows = getUniversalBucketRows({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      shopping: 5500,
    } as never);
    const wants = rows.find((r) => r.key === "wants")!;
    expect(wants.status).toBe("warning");

    const critical = getUniversalBucketRows({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      shopping: 10000,
    } as never).find((r) => r.key === "wants")!;
    expect(critical.status).toBe("critical");
  });
});

describe("getUnallocatedIncome", () => {
  it("subtracts all bucket actuals from income except EPF (deducted at source)", () => {
    const data = {
      monthlySalary: 100000,
      lifeStage: "bachelor" as const,
      rentAmount: 20000,
      shopping: 5000,
      monthlySIP: 10000,
      monthlyEPFContribution: 3000,
      carLoanEMI: 8000,
      healthInsurancePremiumMonthly: 2000,
    };
    const unallocated = getUnallocatedIncome(data);
    const actuals = getUniversalBucketActuals(data);
    expect(unallocated).toBe(
      100000 -
        actuals.needs -
        actuals.wants -
        actuals.security -
        actuals.loans -
        (actuals.investment - 3000),
    );
  });

  it("can be negative when overspending", () => {
    expect(
      getUnallocatedIncome({
        monthlySalary: 10000,
        lifeStage: "bachelor",
        rentAmount: 20000,
      } as never),
    ).toBeLessThan(0);
  });
});

describe("insurance guidelines", () => {
  it("computes 10% guideline and 2% critical floor", () => {
    expect(getInsuranceGuideline(100000)).toBe(10000);
    expect(getInsuranceCriticalFloor(100000)).toBe(2000);
    expect(getInsuranceGuideline(0)).toBe(0);
    expect(getInsuranceCriticalFloor(0)).toBe(0);
  });
});
