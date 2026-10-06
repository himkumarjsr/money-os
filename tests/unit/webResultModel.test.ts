import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  analyseFinances,
  emergencyFundMonthsNeeded,
} from "@/lib/financialEngine";
import { openPriorities } from "@/lib/fixPlanMerge";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import type { PriorityItem } from "@/lib/priorityEngine";
import {
  SCORE_BAND_UI,
  deriveCtaCopy,
  derivePlanTeaser,
  emergencyFundCheck,
  humaniseEnum,
  profileSummaryLabels,
} from "@/app/analyse/result/resultModel";

function item(
  id: string,
  title: string,
  gap: number,
  monthlyContribution = 0,
): PriorityItem {
  return {
    id,
    title,
    gap,
    monthlyContribution,
    actionThisWeek: `Do ${title}`,
  } as PriorityItem;
}

function profile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
  return {
    lifeStage: "bachelor",
    selfAge: 32,
    cityTier: "metro",
    monthlySalary: 200_000,
    rentAmount: 20_000,
    homeLoanEMI: 0,
    secondPropertyEMI: 0,
    carLoanEMI: 0,
    bikeEMI: 0,
    personalLoanEMI: 20_000,
    personalLoanOutstanding: 400_000,
    personalLoanRate: 16,
    additionalObligations: [],
    vegetables: 3_000,
    grocery: 8_000,
    medicine: 1_000,
    fuel: 4_000,
    cabMetro: 2_000,
    electricity: 2_500,
    internet: 1_200,
    gas: 900,
    entertainment: 5_000,
    shopping: 3_000,
    parentsSupport: 0,
    hasHealthInsurance: false,
    hasTermInsurance: false,
    termInsuranceSumAssured: 0,
    savingsAccountBalance: 50_000,
    liquidMFValue: 0,
    emergencyFundCurrent: 0,
    ownsHome: false,
    ownsCar: false,
    monthlySIP: 5_000,
    monthlyEPFContribution: 5_000,
    primaryGoal: "grow_wealth",
    investsInNsc: false,
    ...overrides,
  };
}

describe("derivePlanTeaser", () => {
  it("skips closed priorities and counts the rest as +N more", () => {
    const plan = {
      priorities: [
        item("emergency_fund", "Emergency fund", 0),
        item("medical_fund", "Medical fund", 50_000),
        item("term_insurance", "Term insurance", 1, 0),
        item("health_insurance", "Health insurance", 0, 1_000),
        item("start_sip", "Start SIP", 10_000),
        item("ssy", "SSY", 5_000),
      ],
    };
    const t = derivePlanTeaser(plan);
    expect(t.openCount).toBe(5);
    expect(t.first?.title).toBe("Medical fund");
    expect(t.teaserTitles).toEqual(["Term insurance", "Health insurance"]);
    expect(t.moreCount).toBe(2);
  });

  it("hides +N more when everything open is already shown", () => {
    const t = derivePlanTeaser({
      priorities: [item("a", "A", 1), item("b", "B", 1)],
    });
    expect(t.teaserTitles).toEqual(["B"]);
    expect(t.moreCount).toBe(0);
  });

  it("handles a plan with no open priorities", () => {
    const t = derivePlanTeaser({ priorities: [item("a", "A", 0)] });
    expect(t).toEqual({
      openCount: 0,
      first: null,
      teaserTitles: [],
      moreCount: 0,
    });
    expect(derivePlanTeaser(null).openCount).toBe(0);
  });

  it("matches openPriorities on a real engine plan", () => {
    const p = profile();
    const plan = buildPriorityPlan(p, analyseFinances(p));
    const open = openPriorities(plan);
    const t = derivePlanTeaser(plan);
    expect(t.openCount).toBe(open.length);
    expect(t.first?.title).toBe(open[0]?.title);
    expect(t.teaserTitles).toEqual(
      open.slice(1, 3).map((x: PriorityItem) => x.title),
    );
    expect(1 + t.teaserTitles.length + t.moreCount).toBe(open.length);
  });
});

describe("deriveCtaCopy", () => {
  it("never claims gaps when nothing is open", () => {
    const c = deriveCtaCopy({
      score: 30,
      openCount: 0,
      topPriorityTitle: null,
      hasCriticalIssues: true,
    });
    expect(c.title).toBe("Get my complete financial plan →");
    expect(c.subText).toMatch(/No open gaps/);
  });

  it("uses the real top priority and count", () => {
    const c = deriveCtaCopy({
      score: 55,
      openCount: 4,
      topPriorityTitle: "Medical fund",
      hasCriticalIssues: false,
    });
    expect(c.title).toBe("Get my optimisation plan →");
    expect(c.subText).toBe("4 priorities, starting with Medical fund");
  });

  it("follows scoreBand boundaries", () => {
    const base = {
      openCount: 1,
      topPriorityTitle: "X",
      hasCriticalIssues: false,
    };
    expect(deriveCtaCopy({ ...base, score: 39 }).title).toMatch(/recovery/);
    expect(deriveCtaCopy({ ...base, score: 40 }).title).toMatch(/optimisation/);
    expect(deriveCtaCopy({ ...base, score: 70 }).title).toMatch(/wealth/);
    expect(deriveCtaCopy({ ...base, score: 39 }).subText).toBe(
      "1 priority to work on: X",
    );
  });
});

describe("emergencyFundCheck", () => {
  it.each([
    profile({ lifeStage: "bachelor", parentsSupport: 0 }),
    profile({ lifeStage: "bachelor", parentsSupport: 10_000 }),
    profile({ lifeStage: "married" }),
    profile({ lifeStage: "kids" }),
    profile({ lifeStage: "senior" }),
  ])("uses the same months for target and isOk (%#)", (p) => {
    const months = emergencyFundMonthsNeeded(p);
    const c = emergencyFundCheck(p, 40_000, months);
    expect(c.months).toBe(months);
    expect(c.target).toBe(40_000 * months);
    expect(c.isOk).toBe(true);
    expect(emergencyFundCheck(p, 40_000, months - 0.01).isOk).toBe(false);
  });
});

describe("labels", () => {
  it("never returns raw enum values", () => {
    expect(
      profileSummaryLabels({
        lifeStage: "bachelor",
        cityTier: "metro",
        primaryGoal: "build_insurance_premium_fund",
      }),
    ).toEqual([
      "Single / bachelor",
      "Metro (Mumbai / Delhi / Bengaluru / Chennai / Hyderabad / Pune)",
      "Insurance premium reserve (financial freedom)",
    ]);
  });

  it("humanises unknown keys and drops empty ones", () => {
    expect(
      profileSummaryLabels({ lifeStage: "retire_fire", cityTier: "" }),
    ).toEqual(["Retire fire"]);
    expect(humaniseEnum("some_new-goal")).toBe("Some new goal");
  });

  it("maps score bands to UI tones", () => {
    expect(SCORE_BAND_UI.critical.gaugeTone).toBe("red");
    expect(SCORE_BAND_UI.warning.label).toBe("Warning");
    expect(SCORE_BAND_UI.good.gaugeTone).toBe("green");
  });
});
