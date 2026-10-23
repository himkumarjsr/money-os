import { describe, expect, it } from "vitest";
import { buildUserAnalyseScenarioProfile } from "@/lib/analyseUserScenarioFixture";
import {
  computeRealEmergencyFund,
  medicalEmergencyTarget,
} from "@/lib/financialEngine";
import {
  emergencyFundExplain,
  medicalFundExplain,
} from "@/lib/safetyNetExplain";

describe("safety net explanations", () => {
  const p = buildUserAnalyseScenarioProfile();

  it("shows the months × monthly base and what fills the emergency fund", () => {
    const fund = computeRealEmergencyFund(p);
    const e = emergencyFundExplain(p, fund, 10_00_000);
    expect(e.target).toMatch(/\d+ months for .* × ₹[\d,]+\/month/);
    expect(e.target).toContain("₹10,00,000");
    expect(e.filled).toMatch(/^Filled by|^Nothing/);
    expect(e.filled).not.toMatch(/NaN|undefined/);
  });

  it("breaks down the medical target and its sources", () => {
    const target = medicalEmergencyTarget(p);
    const m = medicalFundExplain(p, {
      current: target,
      target,
      fromSavings: 1_00_000,
    });
    expect(m.target).toContain(`= ₹${target.toLocaleString("en-IN")}`);
    expect(m.filled).toMatch(/savings left over after the emergency fund/);
    expect(m.filled).not.toMatch(/short/);
  });
});
