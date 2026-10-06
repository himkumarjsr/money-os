// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildUserAnalyseScenarioProfile } from "./analyseUserScenarioFixture";
import { analyseFinances } from "./financialEngine";
import { buildFixPlanPdfData } from "./fixPlanPdfData";
import { buildFixPlanPdf } from "./generatePDF";
import { buildPriorityPlan } from "./priorityEngine";

describe("buildFixPlanPdfData", () => {
  it("falls back to defaults for an empty plan", () => {
    const { phases, keySnapshot } = buildFixPlanPdfData(undefined, undefined);
    expect(keySnapshot).toEqual([
      "Monthly surplus: ₹0",
      "Debt: none in engine plan",
    ]);
    expect(phases.map((p) => p.phase)).toEqual([1, 2, 3, 4]);
    expect(phases[0].tasks).toEqual(["Complete your financial review"]);
    expect(phases[0].outcomes).toEqual([
      "Address top risk: safety and liquidity",
    ]);
    expect(phases[1].tasks).toEqual(["Build financial foundation"]);
    expect(phases[1].outcomes).toEqual(["Improved financial health"]);
    expect(phases[2].tasks).toEqual(["Grow wealth systematically"]);
    expect(phases[3].tasks).toHaveLength(3);
    expect(phases[0].color).toEqual([226, 75, 74]);
  });

  it("groups priorities by rank and summarises debts and gaps", () => {
    const longIn12 = "x".repeat(200);
    const { phases, keySnapshot } = buildFixPlanPdfData(
      {
        monthlySurplus: 12345.6,
        debts: [
          {
            type: "personal_loan",
            displayName: "Personal loan",
            outstanding: 500000,
            rate: 14,
            emi: 15000,
            extraEMIRecommended: 5000,
            monthsToClearWithExtra: 20,
          },
          { type: "car_loan", rate: 9 },
        ],
        priorities: [
          { id: "sip", rank: 4, title: "Start SIP" },
          {
            id: "term_insurance",
            rank: 2,
            title: "Term cover",
            actionThisWeek: "Buy term plan",
            gap: 10000000,
          },
          {
            id: "emergency_fund",
            rank: 1,
            title: "Emergency fund",
            description: "Park 3 months in liquid fund",
            gap: 150000,
          },
          {
            id: "health_insurance",
            rank: 3,
            title: "Health cover",
            gap: 0,
          },
          { id: "misc", title: "Unranked", whyThisMatters: "why" },
        ],
      },
      { in12Months: longIn12 },
    );

    expect(keySnapshot).toEqual([
      "Monthly surplus: ₹12,346",
      "Personal loan: outstanding ₹5,00,000 @ 14% · EMI ₹15,000/mo · extra ₹5,000/mo · ~30 mo to clear",
      "car_loan: outstanding ₹0 @ 9% · EMI ₹0/mo · extra ₹0/mo · ~0 mo to clear",
      "Emergency fund gap: ₹1,50,000",
      "Term cover gap: ₹1,00,00,000",
    ]);
    expect(phases[0].tasks).toEqual([
      "Emergency fund: Park 3 months in liquid fund",
    ]);
    expect(phases[0].outcomes).toEqual(["Address top risk: Unranked"]);
    expect(phases[1].tasks).toEqual([
      "Term cover — Buy term plan",
      "Health cover",
    ]);
    expect(phases[1].outcomes).toEqual([longIn12.slice(0, 160)]);
    expect(phases[2].tasks).toEqual(["Start SIP"]);
  });

  it("uses whyThisMatters when a rank-1 priority has no action or description", () => {
    const { phases } = buildFixPlanPdfData(
      { priorities: [{ rank: 1, title: "Fund", whyThisMatters: "Because" }] },
      {},
    );
    expect(phases[0].tasks).toEqual(["Fund: Because"]);
  });
});

describe("buildFixPlanPdf (server path)", () => {
  const profile = {
    ...buildUserAnalyseScenarioProfile(),
    name: "Asha Rao",
  } as any;
  const result = analyseFinances(profile);
  const priorityPlan = buildPriorityPlan(profile, result);
  const explanations = {
    greeting: "Hi Asha",
    overallSummary: "Focus on safety first.",
    in12Months: "Debt-free path in sight.",
  };

  it("builds a complete PDF in Node without a browser", () => {
    const { doc, fileName } = buildFixPlanPdf(
      profile,
      result,
      priorityPlan,
      explanations,
      buildFixPlanPdfData(priorityPlan, explanations),
      { timeZone: "Asia/Kolkata" },
    );
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    const text = Buffer.from(bytes).toString("latin1");

    expect(bytes.byteLength).toBeGreaterThan(10_000);
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("12-MONTH ACTION PLAN");
    expect(text).toContain("PHASE 1: Phase 1");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(9);

    const istDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    expect(fileName).toBe(`Finkoin-Report-Asha-Rao-${istDate}.pdf`);
  });

  it("defaults the filename to the local date when no zone is given", () => {
    const { fileName } = buildFixPlanPdf(
      { name: "!!" },
      {},
      { priorities: [] },
      {},
      {},
    );
    expect(fileName).toMatch(/^Finkoin-Report-User-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
