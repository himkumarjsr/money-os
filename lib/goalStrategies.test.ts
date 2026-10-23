import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { buildUserAnalyseScenarioProfile } from "@/lib/analyseUserScenarioFixture";
import { detectGoals } from "@/lib/goalDetection";
import {
  buildGoalStrategies,
  buildYearlyRoadmap,
  goalReachLine,
  goalReachPutInLine,
  projectGoalReach,
  loanEmi,
  loanOutstanding,
} from "@/lib/goalStrategies";

const NOW = new Date(2026, 9, 22);
const base = (over: Partial<FinancialProfile> = {}): FinancialProfile =>
  ({
    ...buildUserAnalyseScenarioProfile(),
    ownsHome: false,
    rentAmount: 30_000,
    homePurchasePrice: 2_00_00_000,
    homePurchaseTarget: undefined,
    homePurchaseYear: 2031,
    retirementTargetCorpus: 3_00_00_000,
    ...over,
  }) as FinancialProfile;
const forGoal = (p: FinancialProfile, id: string) =>
  buildGoalStrategies(p, NOW).find((s) => s.goalId === id)!;

describe("loan maths", () => {
  it("matches a standard EMI and pays off to zero", () => {
    expect(Math.round(loanEmi(10_00_000, 8.5, 20))).toBe(8678);
    expect(loanOutstanding(10_00_000, 8.5, 20, 20)).toBe(0);
    expect(loanOutstanding(10_00_000, 8.5, 20, 0)).toBeCloseTo(10_00_000);
  });
});

describe("buildGoalStrategies", () => {
  it("sizes the home goal from the price and checks the EMI against income", () => {
    const home = forGoal(base(), "home_purchase");
    const check = home.strategies.find((s) => s.id === "home_emi_check")!;
    expect(check.detail).toContain("₹80,00,000 upfront");
    expect(check.detail).toContain("₹1,60,00,000");
    expect(check.detail).toMatch(/rent stops/);
  });

  it("never uses EPF for anything but retirement", () => {
    for (const g of buildGoalStrategies(base(), NOW))
      expect(g.strategies.map((s) => s.id)).not.toContain("epf_home");
  });

  it("flags a home loan that outlives an early retirement", () => {
    const flag = forGoal(base(), "home_purchase").strategies.find(
      (s) => s.id === "loan_past_retirement",
    );
    expect(flag?.kind).toBe("check");
    expect(flag?.detail).toMatch(/owed when you retire/);
  });

  it("combines smart moves into a lower SIP than the plain plan", () => {
    const ret = forGoal(base(), "retirement");
    expect(ret.smartMonthly).toBeLessThan(ret.baseMonthly);
    expect(ret.summary).toMatch(/is enough/);
    for (const s of ret.strategies)
      expect(s.detail).not.toMatch(/NaN|undefined/);
  });

  it("rolls a finished loan's EMI into a later goal", () => {
    const p = base({
      unifiedLoans: [
        { loanType: "car_loan", monthlyEMI: 20_000, remainingMonths: 24 },
      ],
    });
    const all = buildGoalStrategies(p, NOW);
    const withRollover = all.filter((g) =>
      g.strategies.some((s) => s.id === "emi_rollover"),
    );
    expect(withRollover).toHaveLength(1);
    expect(withRollover[0].goalId).toBe("home_purchase");
  });

  it("asks once whether an older home amount was the price", () => {
    const g = detectGoals(
      base({ homePurchasePrice: undefined, homePurchaseTarget: 2_00_00_000 }),
      NOW,
    ).find((x) => x.id === "home_purchase");
    expect(g?.home?.unclearAmount).toBe(true);
  });
});

describe("projectGoalReach", () => {
  const goal = {
    type: "home_purchase",
    targetAmount: 80_00_000,
    targetYear: 2031,
    yearsToGoal: 5,
    currentSaved: 10_00_000,
  };

  it("finds the year a short-funded goal is actually reached", () => {
    const reach = projectGoalReach(
      base({ annualSalaryIncreasePct: 0 }),
      { ...goal, monthlyAllocated: 50_000 },
      NOW,
    );
    expect(reach.onTime).toBe(false);
    expect(reach.reachYear).toBeGreaterThan(2031);
    const last = reach.rows[reach.rows.length - 1];
    expect(last.year).toBe(reach.reachYear);
    expect(last.value).toBeGreaterThanOrEqual(80_00_000 * 0.995);
    // A year of ₹50,000 SIPs, each in today's rupees.
    let paidIn = 0;
    for (let m = 1; m <= 12; m++) paidIn += 50_000 / Math.pow(1.06, m / 12);
    expect(reach.rows[0].invested).toBe(Math.round(10_00_000 + paidIn));
    expect(goalReachLine(reach, goal)).toMatch(
      /^₹80,00,000 by 2031 isn't realistic at ₹50,000\/month\. At this pace you reach it in 20\d\d \(\d+ years? late\)\. You'd have about ₹[\d,]+ by 2031\. To make 2031, invest ₹[\d,]+\/month in all\.$/,
    );
    // The suggested SIP reaches it on time; ₹100 less does not.
    const fix = reach.onTimeMonthly!;
    expect(fix).toBeGreaterThan(50_000);
    const base0 = base({ annualSalaryIncreasePct: 0 });
    expect(
      projectGoalReach(base0, { ...goal, monthlyAllocated: fix }, NOW).onTime,
    ).toBe(true);
    expect(
      projectGoalReach(base0, { ...goal, monthlyAllocated: fix - 200 }, NOW)
        .onTime,
    ).toBe(false);
  });

  it("splits Put in into savings, SIPs and retirement accounts", () => {
    const p = base({
      annualSalaryIncreasePct: 0,
      epfBalance: 15_00_000,
      monthlyEPFContribution: 30_000,
    });
    const ret = projectGoalReach(
      p,
      {
        type: "retirement",
        targetAmount: 5_00_00_000,
        targetYear: 2040,
        yearsToGoal: 14,
        currentSaved: 20_00_000,
        monthlyAllocated: 20_000,
      },
      NOW,
    );
    for (const r of ret.rows) {
      const parts = r.putIn!;
      expect(
        Math.abs(
          parts.saved +
            parts.pfBalance +
            parts.sipPaid +
            parts.pfPaid -
            r.invested,
        ),
      ).toBeLessThanOrEqual(2);
    }
    const first = ret.rows[0].putIn!;
    expect(first.saved).toBe(5_00_000);
    expect(first.pfBalance).toBe(15_00_000);
    // EPF paid is counted in today's rupees, like the SIPs: under face value.
    expect(first.pfPaid).toBeLessThan(30_000 * 12);
    expect(first.pfPaid).toBeGreaterThan(30_000 * 12 * 0.95);
    expect(goalReachPutInLine(ret.rows[0])).toMatch(
      /₹5,00,000 savings set aside today \+ ₹15,00,000 EPF \/ PPF \/ NPS balance today \+ .* of monthly SIPs paid by 2027 \+ .* of EPF \/ PPF \/ NPS contributions by 2027 = /,
    );
  });

  it("says where the savings set aside come from", () => {
    const reach = projectGoalReach(
      base({ annualSalaryIncreasePct: 0 }),
      {
        ...goal,
        currentSaved: 6_00_000,
        monthlyAllocated: 50_000,
        sources: { debt: 2_00_000, equity: 3_50_000, gold: 50_000 },
      },
      NOW,
    );
    expect(goalReachPutInLine(reach.rows[0])).toMatch(
      /^₹6,00,000 savings set aside today \(₹2,00,000 FDs \/ post office \+ ₹3,50,000 mutual funds & stocks \+ ₹50,000 gold\) \+ /,
    );
    const one = projectGoalReach(
      base(),
      {
        ...goal,
        currentSaved: 2_00_000,
        sources: { debt: 2_00_000, equity: 0, gold: 0 },
      },
      NOW,
    );
    expect(goalReachPutInLine(one.rows[0])).toMatch(
      /₹2,00,000 savings set aside today \(from your FDs \/ post office\)/,
    );
  });

  it("shows a never-reached goal up to its target year, with the SIP it needs", () => {
    const reach = projectGoalReach(
      base({ annualSalaryIncreasePct: 0 }),
      {
        ...goal,
        targetAmount: 50_00_00_000,
        currentSaved: 0,
        monthlyAllocated: 1_000,
      },
      NOW,
    );
    expect(reach.reachYear).toBeNull();
    expect(reach.rows[reach.rows.length - 1].year).toBe(2031);
    expect(goalReachLine(reach, goal)).toMatch(
      /isn't realistic at ₹1,000\/month - it isn't reached even in 40 years\. You'd have about ₹[\d,]+ by 2031\. To make 2031, invest ₹[\d,]+\/month in all\./,
    );
  });

  it("is on time when the plan funds the full SIP", () => {
    const reach = projectGoalReach(
      base({ annualSalaryIncreasePct: 0 }),
      { ...goal, monthlyAllocated: 1_50_000 },
      NOW,
    );
    expect(reach.onTime).toBe(true);
    expect(reach.rows[reach.rows.length - 1].year).toBe(2031);
  });

  it("counts EPF / PPF / NPS only for retirement", () => {
    const p = base({ epfBalance: 50_00_000 });
    const home = projectGoalReach(p, { ...goal, currentSaved: 0 }, NOW);
    const ret = projectGoalReach(
      p,
      { ...goal, type: "retirement", currentSaved: 50_00_000 },
      NOW,
    );
    expect(ret.rows[0].value).toBeGreaterThan(home.rows[0].value + 40_00_000);
  });
});

describe("buildYearlyRoadmap", () => {
  const goals = [
    {
      label: "Home purchase",
      type: "home_purchase",
      targetAmount: 80_00_000,
      targetYear: 2031,
      yearsToGoal: 5,
      currentSaved: 10_00_000,
      monthlyAllocated: 50_000,
    },
    {
      label: "Car",
      type: "vehicle_purchase",
      targetAmount: 10_00_000,
      targetYear: 2028,
      yearsToGoal: 2,
      currentSaved: 0,
      monthlyAllocated: 50_000,
    },
  ];

  it("runs every year until the last goal is funded and names the events", () => {
    const p = base({
      annualSalaryIncreasePct: 0,
      unifiedLoans: [
        { loanType: "car_loan", monthlyEMI: 15_000, remainingMonths: 30 },
      ],
    });
    const rows = buildYearlyRoadmap(p, goals, NOW);
    expect(rows[0].year).toBe(2027);
    const homeReach = projectGoalReach(p, goals[0], NOW);
    const last = rows[rows.length - 1];
    // The moved money pays for the home sooner than its own SIP alone.
    expect(last.year).toBeGreaterThanOrEqual(2031);
    expect(last.year).toBeLessThan(homeReach.reachYear ?? 9999);
    expect(last.events.join()).toMatch(/Home purchase/);
    expect(rows[0].monthly).toBe(1_00_000);
    expect(rows.find((r) => r.year === 2028)?.events.join()).toMatch(
      /Car done: its ₹50,000\/month SIP moves to home purchase/,
    );
    expect(rows.find((r) => r.year === 2029)?.events.join()).toMatch(
      /car loan ends: its ₹15,000 EMI moves to home purchase/,
    );
    // The car is paid for in 2028: its SIP keeps going, into the home.
    expect(rows.find((r) => r.year === 2029)?.monthly).toBe(1_00_000);
    // From 2030 the car loan's EMI joins it.
    expect(rows.find((r) => r.year === 2030)?.monthly).toBe(1_15_000);
    // Worth never drops while nothing is paid out.
    const y2029 = rows.find((r) => r.year === 2029)!.worth;
    expect(rows.find((r) => r.year === 2030)!.worth).toBeGreaterThan(y2029);
  });

  it("keeps the old shape when nothing frees up", () => {
    const p = base({ annualSalaryIncreasePct: 0, unifiedLoans: [] });
    const rows = buildYearlyRoadmap(p, [goals[0]], NOW);
    const reach = projectGoalReach(p, goals[0], NOW);
    expect(rows.map((r) => r.worth)).toEqual(reach.rows.map((r) => r.value));
    expect(rows.every((r) => r.monthly === 50_000)).toBe(true);
  });
});
