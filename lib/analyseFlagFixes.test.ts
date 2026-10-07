// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AI_CACHE_KEY,
  AI_CACHE_MAX_ENTRIES,
  FORCED_REFRESH_MIN_INTERVAL_MS,
  canForceRefresh,
  createAiPlanCache,
  type KeyValueStorage,
} from "./aiPlanCache";
import {
  findFirstInvalidAnalyseStep,
  fullAnalyseSchema,
  step1Schema,
  step5Schema,
  step7Schema,
} from "./analyse-form-schema";
import {
  buildUserAnalyseScenarioForm,
  buildUserAnalyseScenarioProfile,
} from "./analyseUserScenarioFixture";
import {
  SCORE_BANDS,
  analyseFinances,
  emergencyFundMonthsNeeded,
  scoreBand,
} from "./financialEngine";
import {
  mergeEnginePriorityPlan,
  noGainProjectionMessage,
  openPriorities,
  scoreProjectionGain,
} from "./fixPlanMerge";
import { buildFixPlanPdfData } from "./fixPlanPdfData";
import { buildFixPlanPdf } from "./generatePDF";
import { paywallConfirmLabel, paywallPriceNote } from "./paywallCopy";
import { loadPdfFonts } from "./pdfFonts.server";
import {
  buildPriorityPlan,
  debtPayoffNumbers,
  simulateLoanPayoff,
} from "./priorityEngine";

const issuesAt = (
  result: { success: boolean; error?: { issues: { path: unknown[] }[] } },
  pathPrefix: string,
) =>
  (result.success ? [] : result.error!.issues).filter(
    (i) => i.path.join(".") === pathPrefix,
  );

describe("validation rules that used to pass on defaulted zeros", () => {
  it("requires a positive kids education target", () => {
    const zero = step7Schema.safeParse({
      lifeStage: "kids",
      primaryGoal: "retire_early",
      kidsEducationFundTarget: 0,
    });
    expect(issuesAt(zero, "kidsEducationFundTarget")).toHaveLength(1);

    const filled = step7Schema.safeParse({
      lifeStage: "kids",
      primaryGoal: "retire_early",
      kidsEducationFundTarget: 25_00_000,
    });
    expect(filled.success).toBe(true);

    const notKids = step7Schema.safeParse({
      lifeStage: "married",
      primaryGoal: "retire_early",
      kidsEducationFundTarget: 0,
    });
    expect(notKids.success).toBe(true);
  });

  it("does not count other-insurance rows with a 0 premium", () => {
    const base = {
      hasHealthInsurance: false,
      hasTermInsurance: false,
      hasOtherInsurance: true,
    };
    const zero = step5Schema.safeParse({
      ...base,
      otherInsurancePremiums: [{ premiumAmount: 0, frequency: "yearly" }],
    });
    expect(issuesAt(zero, "otherInsurancePremiums")).toHaveLength(1);
    expect(issuesAt(zero, "otherInsurancePremiums.0.premiumAmount")).toHaveLength(1);

    const ok = step5Schema.safeParse({
      ...base,
      otherInsurancePremiums: [{ premiumAmount: 12_000, frequency: "yearly" }],
    });
    expect(ok.success).toBe(true);
  });

  it("fails a blank kid age but accepts a typed 0 (under one year)", () => {
    const base = {
      lifeStage: "kids",
      selfAge: 35,
      numberOfKids: 2,
      kidsGenders: ["boy", "girl"],
      cityTier: "metro",
    };
    const blank = step1Schema.safeParse({ ...base, kidsAges: [5, undefined] });
    expect(issuesAt(blank, "kidsAges.1")).toHaveLength(1);
    const blankString = step1Schema.safeParse({ ...base, kidsAges: [5, ""] });
    expect(issuesAt(blankString, "kidsAges.1")).toHaveLength(1);
    expect(step1Schema.safeParse({ ...base, kidsAges: [5, 0] }).success).toBe(true);
  });
});

describe("final submit uses the full schema", () => {
  const complete = () => ({
    ...buildUserAnalyseScenarioForm(),
    carLoanOutstanding: 0,
  });

  it("passes a complete profile", () => {
    expect(findFirstInvalidAnalyseStep(complete())).toBeNull();
  });

  it("sends a salary of 0 back to step 2", () => {
    const bad = { ...complete(), monthlySalary: 0 };
    expect(step7Schema.safeParse(bad).success).toBe(true);
    expect(fullAnalyseSchema.safeParse(bad).success).toBe(false);
    const found = findFirstInvalidAnalyseStep(bad);
    expect(found?.step).toBe(2);
    expect(found?.issues[0]?.path).toEqual(["monthlySalary"]);
  });

  it("reports the earliest failing step first", () => {
    const bad = {
      ...complete(),
      monthlySalary: 0,
      selfAge: undefined,
    };
    expect(findFirstInvalidAnalyseStep(bad)?.step).toBe(1);
  });
});

describe("emergency fund months — one source", () => {
  it("is life-stage aware between 6 and 12 months", () => {
    expect(emergencyFundMonthsNeeded({ lifeStage: "bachelor" })).toBe(6);
    expect(
      emergencyFundMonthsNeeded({ lifeStage: "bachelor", parentsSupport: 5000 }),
    ).toBe(9);
    expect(emergencyFundMonthsNeeded({ lifeStage: "married", kidsAges: [] })).toBe(9);
    expect(emergencyFundMonthsNeeded({ lifeStage: "kids", kidsAges: [4] })).toBe(12);
    expect(emergencyFundMonthsNeeded({ lifeStage: "senior" })).toBe(12);
    expect(emergencyFundMonthsNeeded({ lifeStage: "single" })).toBe(6);
  });

  it("drives the engine target, the safety checklist and the Fix Plan priority", () => {
    const profile = buildUserAnalyseScenarioProfile() as any;
    const months = emergencyFundMonthsNeeded(profile);
    const analysis = analyseFinances(profile);
    const er = analysis.realEmergencyFund;
    expect(analysis.scores.emergencyFundGap).toBeCloseTo(
      Math.max(0, er.monthlyExpenses * months - er.realTotal),
      0,
    );

    const plan = buildPriorityPlan(profile, analysis);
    const ef = plan.priorities.find((p) => p.id === "emergency_fund");
    expect(ef?.whyThisMatters).toContain(`${months} months`);

    const efCheck = analysis.securityChecklist.find(
      (c) => c.label === "Emergency fund",
    );
    if (efCheck?.actionNeeded) {
      expect(efCheck.actionNeeded).toContain(`${months} months`);
    }
  });
});

describe("score bands", () => {
  it("uses 70 / 40 everywhere", () => {
    expect(SCORE_BANDS).toEqual({ good: 70, warning: 40 });
    expect(scoreBand(70)).toBe("good");
    expect(scoreBand(69)).toBe("warning");
    expect(scoreBand(40)).toBe("warning");
    expect(scoreBand(39)).toBe("critical");
  });
});

describe("interest saved uses amortisation", () => {
  it("matches a hand-checked loan", () => {
    // ₹1,00,000 at 12% with ₹5,000/mo EMI vs ₹6,000/mo.
    const base = simulateLoanPayoff(100_000, 12, 5000)!;
    const faster = simulateLoanPayoff(100_000, 12, 6000)!;
    expect(base.months).toBe(23);
    expect(faster.months).toBe(19);
    const n = debtPayoffNumbers({
      outstanding: 100_000,
      rate: 12,
      emi: 5000,
      extraEMIRecommended: 1000,
      monthsToClearWithExtra: 17,
    });
    expect(n.monthsNow).toBe(19);
    expect(n.monthsSaved).toBe(4);
    expect(n.interestSaved).toBe(
      Math.round(base.totalInterest - faster.totalInterest),
    );
    expect(n.interestSaved).toBeGreaterThan(1000);
    expect(n.interestSaved).toBeLessThan(3000);
  });

  it("returns 0 when there is no extra payment or the EMI never clears the loan", () => {
    expect(
      debtPayoffNumbers({ outstanding: 50_000, rate: 10, emi: 2000 }).interestSaved,
    ).toBe(0);
    expect(simulateLoanPayoff(1_000_000, 24, 1000)).toBeNull();
    expect(
      debtPayoffNumbers({
        outstanding: 1_000_000,
        rate: 24,
        emi: 1000,
        extraEMIRecommended: 500,
      }).interestSaved,
    ).toBe(0);
  });
});

describe("Fix Plan merge", () => {
  const engine = {
    priorities: [
      {
        id: "emergency_fund",
        title: "Emergency fund",
        gap: 100_000,
        monthlyContribution: 10_000,
        status: "partial",
        actionThisWeek: "engine action",
        instrument: "Liquid MF",
        whyThisMatters: "engine why",
      },
      {
        id: "medical_fund",
        title: "Medical fund",
        gap: 0,
        monthlyContribution: 0,
        status: "complete",
        actionThisWeek: "engine done",
      },
    ],
    debts: [],
    goals: [],
  };

  it("uses the AI's action this week for open priorities only", () => {
    const merged = mergeEnginePriorityPlan(engine, {
      priorities: [
        { id: "emergency_fund", actionThisWeek: "Move ₹50,000 to liquid MF" },
        { id: "medical_fund", actionThisWeek: "AI copy for a closed gap" },
      ],
    });
    expect(merged.priorities[0].actionThisWeek).toBe("Move ₹50,000 to liquid MF");
    expect(merged.priorities[1].actionThisWeek).toMatch(/^Maintain this completed/);
  });

  it("falls back to the engine action when the AI has none", () => {
    const merged = mergeEnginePriorityPlan(engine, {
      priorities: [{ id: "emergency_fund" }],
    });
    expect(merged.priorities[0].actionThisWeek).toBe("engine action");
  });

  it("shows every open priority, including safety items", () => {
    const ids = openPriorities({
      priorities: [
        { id: "emergency_fund", gap: 1, monthlyContribution: 0 },
        { id: "term_insurance", gap: 0, monthlyContribution: 500 },
        { id: "medical_fund", gap: 0, monthlyContribution: 0 },
        { id: "start_sip", gap: 10, monthlyContribution: 10 },
      ],
    }).map((p: { id: string }) => p.id);
    expect(ids).toEqual(["emergency_fund", "term_insurance", "start_sip"]);
  });

  it("never reports a zero gain as +0", () => {
    expect(scoreProjectionGain({ scoreToday: 80, scoreAfter12Months: 80 })).toBe(0);
    expect(scoreProjectionGain({ scoreToday: 60, scoreAfter12Months: 72 })).toBe(12);
    expect(noGainProjectionMessage(82)).toMatch(/already strong/);
    expect(noGainProjectionMessage(45)).not.toMatch(/strong/);
  });
});

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("AI plan cache", () => {
  it("keeps several profiles and evicts the least recently used", () => {
    const store = memoryStorage();
    const cache = createAiPlanCache(() => store);
    for (let i = 0; i < AI_CACHE_MAX_ENTRIES; i += 1) {
      cache.setCachedPlan(`h${i}`, { i }, null, "fp");
    }
    expect(cache.getCachedPlan("h0")?.aiPlan).toEqual({ i: 0 });
    cache.setCachedPlan("h-new", { i: 99 }, null, "fp");
    expect(cache.getCachedPlan("h1")).toBeNull();
    expect(cache.getCachedPlan("h0")?.aiPlan).toEqual({ i: 0 });
    expect(cache.getCachedPlan("h-new")?.aiPlan).toEqual({ i: 99 });
  });

  it("expires entries after 30 days and reads the old single-plan format", () => {
    const store = memoryStorage();
    const cache = createAiPlanCache(() => store);
    store.setItem(
      AI_CACHE_KEY,
      JSON.stringify({
        profileHash: "legacy",
        aiPlan: { ok: true },
        projection: null,
        generatedAt: new Date().toISOString(),
      }),
    );
    expect(cache.getCachedPlan("legacy")?.aiPlan).toEqual({ ok: true });

    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    store.setItem(
      AI_CACHE_KEY,
      JSON.stringify({
        v: 2,
        entries: [{ profileHash: "old", aiPlan: {}, projection: null, generatedAt: old }],
      }),
    );
    expect(cache.getCachedPlan("old")).toBeNull();
  });

  it("throttles forced refreshes to one per window", () => {
    const store = memoryStorage();
    const cache = createAiPlanCache(() => store);
    const t0 = 1_000_000;
    expect(cache.tryStartForcedRefresh(t0)).toBe(true);
    expect(cache.tryStartForcedRefresh(t0 + 30_000)).toBe(false);
    expect(
      cache.tryStartForcedRefresh(t0 + FORCED_REFRESH_MIN_INTERVAL_MS),
    ).toBe(true);
    expect(canForceRefresh(null)).toBe(true);
  });
});

describe("paywall copy", () => {
  it("never implies a charge while payments are off", () => {
    expect(paywallConfirmLabel({ paymentsEnabled: false, priceInr: 99 })).not.toMatch(
      /unlock|₹/i,
    );
    expect(paywallPriceNote(false)).toMatch(/won't be charged/);
    expect(paywallConfirmLabel({ paymentsEnabled: true, priceInr: 99 })).toBe(
      "Confirm and unlock ₹99",
    );
    expect(paywallPriceNote(true)).toBeNull();
  });
});

describe("Fix Plan PDF fonts", () => {
  const profile = { ...buildUserAnalyseScenarioProfile(), name: "Asha Rao" } as any;
  const result = analyseFinances(profile);
  const plan = buildPriorityPlan(profile, result);
  const data = buildFixPlanPdfData(plan, {});

  it("embeds Noto Sans so ₹ renders", () => {
    const fonts = loadPdfFonts();
    expect(fonts).not.toBeNull();
    const { doc } = buildFixPlanPdf(profile, result, plan, {}, data, {
      fonts: fonts!,
    });
    const raw = Buffer.from(doc.output("arraybuffer")).toString("latin1");
    expect(raw).toContain("/BaseFont /NotoSans");
    expect(raw).toContain("/FontFile2");
  });

  it("prints Rs. instead of a broken ₹ when no Unicode font is available", () => {
    const { doc } = buildFixPlanPdf(profile, result, plan, {}, data);
    const raw = Buffer.from(doc.output("arraybuffer")).toString("latin1");
    expect(raw).toContain("Rs. ");
    expect(raw).not.toContain("\u20b9");
  });
});

describe("mobile keeps byte-identical copies of shared logic", () => {
  const shared = [
    "aiPlanCache.ts",
    "analyse-form-schema.ts",
    "analyseResultModel.ts",
    "financialEngine.ts",
    "fixPlanMerge.ts",
    "goalDetection.ts",
    "goalFunding.ts",
    "paywallCopy.ts",
    "plannedInvestments.ts",
    "portfolioAllocation.ts",
    "priorityEngine.ts",
    "riskProfile.ts",
    "saveAnalyseProfile.ts",
    "universal-buckets.ts",
  ];
  it.each(shared)("%s", (file) => {
    const root = path.resolve(__dirname, "..");
    expect(readFileSync(path.join(root, "mobile/lib", file), "utf8")).toBe(
      readFileSync(path.join(root, "lib", file), "utf8"),
    );
  });
});
