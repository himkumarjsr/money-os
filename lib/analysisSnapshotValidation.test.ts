import { describe, expect, it } from "vitest";
import { isValidStoredAnalysis } from "./analysisSnapshotValidation";

describe("isValidStoredAnalysis", () => {
  it("rejects nullish and non-objects", () => {
    expect(isValidStoredAnalysis(null)).toBe(false);
    expect(isValidStoredAnalysis(undefined)).toBe(false);
    expect(isValidStoredAnalysis("x")).toBe(false);
    expect(isValidStoredAnalysis(1)).toBe(false);
    expect(isValidStoredAnalysis([])).toBe(false);
  });

  it("rejects missing scores or arrays", () => {
    expect(isValidStoredAnalysis({})).toBe(false);
    expect(
      isValidStoredAnalysis({
        scores: {},
        issues: [],
        flags: [],
        planSteps: [],
      }),
    ).toBe(false);
    expect(
      isValidStoredAnalysis({
        scores: {},
        issues: [],
        flags: [],
        planSteps: [],
        securityChecklist: "nope",
      }),
    ).toBe(false);
  });

  it("accepts a well-shaped payload", () => {
    expect(
      isValidStoredAnalysis({
        scores: { overall: 70 },
        issues: [],
        flags: [],
        planSteps: [],
        securityChecklist: [],
      }),
    ).toBe(true);
  });
});
