import { describe, expect, it } from "vitest";
import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "./analyse-form-schema";
import {
  GOAL_DEFAULTS,
  answerPromptedGoal,
  applyGoalEdit,
  detectGoals,
  dismissGoal,
  promptedGoalOffers,
  restoreDismissedGoals,
} from "./goalDetection";

const NOW = new Date(2026, 9, 7);

function profile(over: Partial<AnalyseFormValues>): FinancialProfile {
  return normalizeAnalyseFormValues({
    ...analyseDefaultValues,
    monthlySalary: 150_000,
    selfAge: 32,
    ownsHome: true,
    ownsCar: true,
    ...over,
  } as AnalyseFormValues);
}

const ids = (p: FinancialProfile) => detectGoals(p, NOW).map((g) => g.id);

describe("detectGoals - implied goals", () => {
  it("always includes retirement, even with nothing else", () => {
    expect(ids(profile({ lifeStage: "bachelor" }))).toEqual(["retirement"]);
  });

  it("adds per-child education and marriage goals sized by each child's age", () => {
    const goals = detectGoals(
      profile({ lifeStage: "kids", numberOfKids: 2, kidsAges: [2, 15] }),
      NOW,
    );
    const edu = goals.filter((g) => g.type === "kid_education");
    expect(edu.map((g) => g.yearsToGoal).sort((a, b) => a - b)).toEqual([
      3, 16,
    ]);
    expect(goals.filter((g) => g.type === "kid_marriage")).toHaveLength(2);
    expect(edu[0].targetAmount).toBe(GOAL_DEFAULTS.kidEducation);
  });

  it("splits a legacy blended kids target equally until per-child targets exist", () => {
    const goals = detectGoals(
      profile({
        lifeStage: "kids",
        numberOfKids: 2,
        kidsAges: [4, 8],
        kidsEducationFundTarget: 4_000_000,
      }),
      NOW,
    );
    const edu = goals.filter((g) => g.type === "kid_education");
    expect(edu.every((g) => g.targetAmount === 2_000_000)).toBe(true);
    expect(edu.every((g) => !g.isDefaultTarget)).toBe(true);
  });

  it("adds home purchase when renting and vehicle when no car", () => {
    const goals = detectGoals(
      profile({
        lifeStage: "bachelor",
        ownsHome: false,
        ownsCar: false,
        rentAmount: 25_000,
      }),
      NOW,
    );
    const home = goals.find((g) => g.id === "home_purchase");
    // ₹1 Cr estimated home (400× rent) → 40% upfront.
    expect(home?.targetAmount).toBe(
      25_000 * GOAL_DEFAULTS.homePriceRentMultiple * 0.4,
    );
    expect(home?.home).toMatchObject({ priceIsEstimate: true });
    expect(goals.some((g) => g.id === "vehicle_purchase")).toBe(true);
  });

  it("sizes the home goal from the user's price, with or without interiors", () => {
    const base = { ownsHome: false, rentAmount: 25_000 };
    const find = (extra: object) =>
      detectGoals(profile({ ...base, ...extra }), NOW).find(
        (g) => g.id === "home_purchase",
      );
    expect(find({ homePurchasePrice: 1_00_00_000 })?.targetAmount).toBe(
      40_00_000,
    );
    expect(
      find({ homePurchasePrice: 1_00_00_000, homeIncludeInteriors: false })
        ?.targetAmount,
    ).toBe(30_00_000);
  });

  it("writes a home price edit back over an old downpayment figure", () => {
    const next = applyGoalEdit(
      profile({ ownsHome: false, homePurchaseTarget: 8_40_000 }),
      "home_purchase",
      { homePrice: 80_00_000, homeIncludeInteriors: false, targetYear: 2030 },
      NOW,
    );
    expect(next).toMatchObject({
      homePurchasePrice: 80_00_000,
      homeIncludeInteriors: false,
      homePurchaseYear: 2030,
    });
    expect(next.homePurchaseTarget).toBeUndefined();
  });

  it("adds debt-free when there are loans and eldercare when supporting parents", () => {
    const goals = detectGoals(
      profile({
        lifeStage: "married",
        parentsSupport: 10_000,
        unifiedLoans: [
          {
            id: "l1",
            loanType: "personal_loan",
            lenderName: "ICICI",
            monthlyEMI: 12_000,
            outstandingAmount: 300_000,
            remainingMonths: 30,
          },
        ],
      }),
      NOW,
    );
    const debt = goals.find((g) => g.id === "debt_free");
    expect(debt).toMatchObject({
      targetAmount: 300_000,
      yearsToGoal: 3,
      removable: false,
    });
    expect(goals.some((g) => g.id === "parents_eldercare")).toBe(true);
  });

  it("sizes the parents goal to the uncovered medical gap only", () => {
    const gap = detectGoals(
      profile({
        parentsSupport: 70_000,
        parentsHealthInsuranceSumInsured: 300_000,
        parentsEmergencyCash: 50_000,
      }),
      NOW,
    ).find((g) => g.id === "parents_eldercare");
    expect(gap?.targetAmount).toBe(150_000);

    const covered = detectGoals(
      profile({
        parentsSupport: 70_000,
        parentsHealthInsuranceSumInsured: 500_000,
      }),
      NOW,
    );
    expect(covered.some((g) => g.id === "parents_eldercare")).toBe(false);
  });

  it("sets the debt-free year from the big loans, not a tiny balance", () => {
    const goals = detectGoals(
      profile({
        unifiedLoans: [
          {
            id: "l1",
            loanType: "personal_loan",
            lenderName: "ICICI",
            monthlyEMI: 42_055,
            outstandingAmount: 1_599_862,
            remainingMonths: 47,
          },
          {
            id: "l2",
            loanType: "other",
            lenderName: "BF",
            monthlyEMI: 11,
            outstandingAmount: 1_000,
            remainingMonths: 89,
          },
        ],
      }),
      NOW,
    );
    const debt = goals.find((g) => g.id === "debt_free");
    expect(debt?.yearsToGoal).toBe(4);
    expect(debt?.reason).toContain("Pay off BF in one go.");
  });

  it("sorts nearest goal first", () => {
    const years = detectGoals(
      profile({
        lifeStage: "kids",
        numberOfKids: 1,
        kidsAges: [10],
        ownsCar: false,
      }),
      NOW,
    ).map((g) => g.yearsToGoal);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

describe("prompted goals", () => {
  it("offers the marriage toggle to bachelors and the baby toggle to married-no-kids, once", () => {
    expect(promptedGoalOffers(profile({ lifeStage: "bachelor" }))).toEqual([
      "marriage",
    ]);
    expect(promptedGoalOffers(profile({ lifeStage: "married" }))).toEqual([
      "baby",
    ]);
    expect(
      promptedGoalOffers(
        profile({ lifeStage: "kids", numberOfKids: 1, kidsAges: [3] }),
      ),
    ).toEqual([]);
    const answered = answerPromptedGoal(
      profile({ lifeStage: "bachelor" }),
      "marriage",
      false,
    );
    expect(promptedGoalOffers(answered)).toEqual([]);
    expect(ids(answered)).not.toContain("marriage");
  });

  it("re-asks when an older build stored a plain 'no' with nothing hidden", () => {
    const legacy = {
      ...profile({ lifeStage: "bachelor" }),
      planningMarriage: false,
    };
    expect(promptedGoalOffers(legacy)).toEqual(["marriage"]);
  });

  it("'Not now' hides the goal instead of discarding it, and restore re-asks", () => {
    for (const [lifeStage, offer] of [
      ["bachelor", "marriage"],
      ["married", "baby"],
    ] as const) {
      const base = profile({ lifeStage });
      const notNow = answerPromptedGoal(base, offer, false);
      expect(notNow).toEqual(
        dismissGoal(answerPromptedGoal(base, offer, true), offer),
      );
      expect(notNow.dismissedGoals).toEqual([offer]);
      expect(ids(notNow)).not.toContain(offer);
      const restored = restoreDismissedGoals(notNow);
      expect(promptedGoalOffers(restored)).toEqual([offer]);
      expect(ids(answerPromptedGoal(restored, offer, true))).toContain(offer);
    }
  });

  it("adds the wedding fund only after the user says yes", () => {
    const yes = answerPromptedGoal(
      profile({ lifeStage: "bachelor" }),
      "marriage",
      true,
    );
    expect(ids(yes)).toContain("marriage");
  });
});

describe("editing goals", () => {
  it("writes per-child amounts and survives a normalize round trip", () => {
    const base = profile({
      lifeStage: "kids",
      numberOfKids: 2,
      kidsAges: [2, 15],
    });
    const edited = applyGoalEdit(
      base,
      "kid_education:1",
      { targetAmount: 3_500_000 },
      NOW,
    );
    const round = normalizeAnalyseFormValues(edited as AnalyseFormValues);
    const g = detectGoals(round, NOW).find((x) => x.id === "kid_education:1");
    expect(g?.targetAmount).toBe(3_500_000);
    expect(g?.isDefaultTarget).toBe(false);
  });

  it("maps retirement year to retirement age", () => {
    const edited = applyGoalEdit(
      profile({ lifeStage: "bachelor" }),
      "retirement",
      { targetYear: 2046 },
      NOW,
    );
    expect(edited.retirementAge).toBe(52);
  });

  it("removes implied goals but never retirement", () => {
    const base = profile({ lifeStage: "bachelor", ownsCar: false });
    expect(ids(dismissGoal(base, "vehicle_purchase"))).not.toContain(
      "vehicle_purchase",
    );
    expect(ids(dismissGoal(base, "retirement"))).toContain("retirement");
  });

  it("restoring a removed wedding goal re-opens the question", () => {
    const yes = answerPromptedGoal(
      profile({ lifeStage: "bachelor" }),
      "marriage",
      true,
    );
    const removed = dismissGoal(yes, "marriage");
    expect(promptedGoalOffers(removed)).toEqual([]);
    const restored = restoreDismissedGoals(removed);
    expect(restored.dismissedGoals).toEqual([]);
    expect(promptedGoalOffers(restored)).toEqual(["marriage"]);
  });
});
