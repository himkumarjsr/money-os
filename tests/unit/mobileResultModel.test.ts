import { describe, expect, it } from "vitest";
import { BUCKET_CAPS } from "@/lib/universal-buckets";
import type { PriorityItem } from "@/lib/priorityEngine";
import {
  bucketCapRows,
  deriveCtaCopy,
  derivePlanTeaser,
  emergencyFundCheck,
  humaniseEnum,
  profileSummaryLabels,
  safetyNetHeading,
  scoreBandLabel,
  scoreGaugeTone,
} from "../../mobile/components/analyse/result/resultDerivations";

function priority(
  id: string,
  title: string,
  gap: number,
  monthlyContribution = 0,
): PriorityItem {
  return {
    rank: 1,
    id,
    title,
    category: "safety",
    urgency: "high",
    status: gap > 0 ? "missing" : "complete",
    currentAmount: 0,
    targetAmount: gap,
    gap,
    monthlyRequired: monthlyContribution,
    monthlyContribution,
    surplusBefore: 0,
    surplusAfterThis: 0,
    monthsToComplete: 0,
    instrument: "",
    actionThisWeek: `Do ${title}`,
    whyThisMatters: "",
    icon: "",
    canBuyFromFinkoin: false,
  };
}

describe("derivePlanTeaser", () => {
  it("shows step 1, the next two titles, and counts the rest", () => {
    const plan = {
      priorities: [
        priority("emergency_fund", "Emergency fund", 100000),
        priority("closed", "Closed gap", 0),
        priority("term_insurance", "Term cover", 5000000),
        priority("health_insurance", "Health cover", 500000),
        priority("debt", "Clear debt", 0, 4000),
        priority("goal", "Goal", 200000),
      ],
    };
    const t = derivePlanTeaser(plan);
    expect(t.openCount).toBe(5);
    expect(t.first?.title).toBe("Emergency fund");
    expect(t.teaserTitles).toEqual(["Term cover", "Health cover"]);
    expect(t.moreCount).toBe(2);
  });

  it("never reports a negative remainder", () => {
    const t = derivePlanTeaser({
      priorities: [priority("a", "Only one", 1000)],
    });
    expect(t.teaserTitles).toEqual([]);
    expect(t.moreCount).toBe(0);
  });

  it("handles a plan with no open priorities", () => {
    const t = derivePlanTeaser({ priorities: [priority("a", "Done", 0)] });
    expect(t.first).toBeNull();
    expect(t.openCount).toBe(0);
    expect(t.moreCount).toBe(0);
  });
});

describe("deriveCtaCopy", () => {
  it("uses real counts and the top priority title", () => {
    const cta = deriveCtaCopy({
      score: 55,
      openCount: 3,
      topPriorityTitle: "Emergency fund",
      hasCriticalIssues: false,
    });
    expect(cta.title).toBe("Get my optimisation plan →");
    expect(cta.subText).toBe("3 priorities, starting with Emergency fund");
  });

  it("does not claim gaps when there are none", () => {
    const cta = deriveCtaCopy({
      score: 85,
      openCount: 0,
      topPriorityTitle: null,
      hasCriticalIssues: false,
    });
    expect(cta.subText).toMatch(/No open gaps/);
  });

  it("prioritises critical issues over score band", () => {
    expect(
      deriveCtaCopy({
        score: 90,
        openCount: 1,
        topPriorityTitle: "Term cover",
        hasCriticalIssues: true,
      }).title,
    ).toBe("Get my personalised fix plan →");
  });
});

describe("emergencyFundCheck", () => {
  it("uses the same month count for target and isOk", () => {
    const married = emergencyFundCheck({ lifeStage: "married" }, 50000, 8);
    expect(married.months).toBe(9);
    expect(married.target).toBe(450000);
    expect(married.isOk).toBe(false);

    const kids = emergencyFundCheck(
      { lifeStage: "kids", kidsAges: [4] },
      40000,
      12,
    );
    expect(kids.months).toBe(12);
    expect(kids.target).toBe(480000);
    expect(kids.isOk).toBe(true);
  });

  it("bachelor supporting parents needs 9 months", () => {
    const c = emergencyFundCheck(
      { lifeStage: "bachelor", parentsSupport: 10000 },
      30000,
      6,
    );
    expect(c.months).toBe(9);
    expect(c.isOk).toBe(false);
  });
});

describe("profile labels", () => {
  it("maps enums through the label maps", () => {
    expect(
      profileSummaryLabels({
        lifeStage: "kids",
        cityTier: "tier2",
        primaryGoal: "buy_home",
      }),
    ).toEqual(["Married with kids", "Tier 2 city", "Buy a home"]);
  });

  it("humanises unknown values and drops empty ones", () => {
    expect(
      profileSummaryLabels({ lifeStage: "new_stage", primaryGoal: null }),
    ).toEqual(["New stage"]);
    expect(humaniseEnum("build_emergency_fund")).toBe("Build emergency fund");
  });
});

describe("bucketCapRows", () => {
  it("derives caps from BUCKET_CAPS", () => {
    const rows = bucketCapRows({}, 100000);
    for (const row of rows) {
      expect(row.capPercent).toBe(Math.round(BUCKET_CAPS[row.key] * 100));
      expect(row.capAmount).toBeCloseTo(100000 * BUCKET_CAPS[row.key]);
    }
    expect(rows.map((r) => r.key)).toEqual([
      "needs",
      "wants",
      "security",
      "loans",
      "investment",
    ]);
  });
});

describe("score bands", () => {
  it("follows scoreBand thresholds", () => {
    expect(scoreBandLabel(39)).toBe("Critical");
    expect(scoreBandLabel(40)).toBe("Warning");
    expect(scoreBandLabel(69)).toBe("Warning");
    expect(scoreBandLabel(70)).toBe("Good");
    expect(scoreGaugeTone(10)).toBe("red");
    expect(scoreGaugeTone(50)).toBe("amber");
    expect(scoreGaugeTone(80)).toBe("green");
  });
});

describe("safetyNetHeading", () => {
  it("counts rendered items", () => {
    expect(safetyNetHeading(5)).toBe("Your financial safety net — 5 checks");
    expect(safetyNetHeading(1)).toBe("Your financial safety net — 1 check");
  });
});
