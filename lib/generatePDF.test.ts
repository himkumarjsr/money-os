import { describe, expect, it } from "vitest";
import { buildUserAnalyseScenarioProfile } from "./analyseUserScenarioFixture";
import { analyseFinances } from "./financialEngine";
import { COMPLETE_WHY, mergeEnginePriorityPlan } from "./fixPlanMerge";
import { buildFixPlanPdfData } from "./fixPlanPdfData";
import { buildFixPlanPdf, formatCapPercent } from "./generatePDF";
import { buildPriorityPlan } from "./priorityEngine";

const LONG_ACTION =
  "From month 7, add a top-up for ~4.0 crore only (you already have 1.0Cr). Keep the old policy - income proof limits often block a second full policy at today's salary.";
const STALE_WHY =
  "If your income stops tomorrow you need 9 months to recover. (gap 0, 0/mo from surplus)";

/** Helvetica output keeps text as literal strings in the content stream. */
function renderText() {
  const profile = {
    ...buildUserAnalyseScenarioProfile(),
    name: "Test User",
    primaryGoal: "retire_early",
  } as any;
  const result = analyseFinances(profile);
  const engine = buildPriorityPlan(profile, result);
  const plan = mergeEnginePriorityPlan(engine, {
    priorities: engine.priorities.map((p: any) => ({
      id: p.id,
      actionThisWeek: LONG_ACTION,
    })),
  });
  const expl = {
    priorityExplanations: Object.fromEntries(
      plan.priorities.map((p: any) => [p.id, STALE_WHY]),
    ),
  };
  const { doc } = buildFixPlanPdf(
    profile,
    result,
    plan,
    expl,
    buildFixPlanPdfData(plan, expl),
  );
  const raw = Buffer.from(doc.output("arraybuffer")).toString("latin1");
  const text = Array.from(
    raw.matchAll(/\((.*?)(?<!\\)\) Tj/g),
    (m) => m[1],
  ).join("\n");
  return { text, plan };
}

describe("formatCapPercent", () => {
  it("turns stored fractions into percents", () => {
    expect(formatCapPercent(0.3)).toBe("30%");
    expect(formatCapPercent(0.05)).toBe("5%");
    expect(formatCapPercent(0.125)).toBe("12.5%");
  });

  it("leaves whole percents alone and handles junk", () => {
    expect(formatCapPercent(40)).toBe("40%");
    expect(formatCapPercent(undefined)).toBe("0%");
    expect(formatCapPercent("x")).toBe("0%");
  });
});

describe("Fix Plan PDF text", () => {
  const { text, plan } = renderText();

  it("prints bucket caps as percents, not fractions", () => {
    expect(text).toContain("30%");
    expect(text).not.toMatch(/^0\.\d+%$/m);
  });

  it("prints all five budget buckets, including the 5% insurance row", () => {
    const table = text.slice(text.indexOf("Monthly Budget Allocation"));
    const labels = table.split("\n").slice(6, 36);
    for (const label of ["Needs", "Wants", "Insurance", "Loans", "Investment"])
      expect(labels).toContain(label);
    for (const cap of ["30%", "5%", "40%", "20%"]) expect(labels).toContain(cap);
  });

  it("labels the goal instead of printing the enum", () => {
    expect(text).toContain("Retire early");
    expect(text).not.toContain("retire_early");
  });

  it("wraps long actions instead of cutting them off", () => {
    expect(text).toMatch(/at today's salary\./);
  });

  it("uses on-track copy for completed priorities", () => {
    const completed = plan.priorities.filter(
      (p: any) => p.gap <= 0 || p.monthlyContribution <= 0,
    );
    expect(completed.length).toBeGreaterThan(0);
    const staleCount = text.split("you need 9 months to recover").length - 1;
    expect(staleCount).toBe(plan.priorities.length - completed.length);
    expect(text).toContain(COMPLETE_WHY.split(". ")[0]);
  });
});
