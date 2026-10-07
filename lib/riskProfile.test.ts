import {
  financialProfileToFormValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import { RISK_QUESTIONS, scoreRiskTolerance } from "@/lib/riskProfile";
import { describe, expect, it } from "vitest";

describe("scoreRiskTolerance", () => {
  it("needs every question answered", () => {
    expect(scoreRiskTolerance(undefined)).toBeUndefined();
    expect(scoreRiskTolerance([])).toBeUndefined();
    expect(scoreRiskTolerance([2, 2])).toBeUndefined();
    expect(scoreRiskTolerance([2, null, 2])).toBeUndefined();
  });

  it("rejects out-of-range scores", () => {
    expect(scoreRiskTolerance([3, 0, 0])).toBeUndefined();
    expect(scoreRiskTolerance([-1, 0, 0])).toBeUndefined();
    expect(scoreRiskTolerance([0.5, 0, 0])).toBeUndefined();
  });

  it("buckets the total score", () => {
    expect(scoreRiskTolerance([0, 0, 0])).toBe("conservative");
    expect(scoreRiskTolerance([1, 0, 0])).toBe("conservative");
    expect(scoreRiskTolerance([1, 1, 0])).toBe("moderate");
    expect(scoreRiskTolerance([2, 1, 1])).toBe("moderate");
    expect(scoreRiskTolerance([2, 2, 1])).toBe("aggressive");
    expect(scoreRiskTolerance([2, 2, 2])).toBe("aggressive");
  });

  it("has three questions with three options each", () => {
    expect(RISK_QUESTIONS).toHaveLength(3);
    for (const q of RISK_QUESTIONS) expect(q.options).toHaveLength(3);
  });
});

describe("risk fields through the analyse form", () => {
  const base: Partial<AnalyseFormValues> = {
    lifeStage: "bachelor",
    selfAge: 30,
    cityTier: "metro",
    monthlySalary: 100_000,
  };

  it("derives riskTolerance from the answers and round-trips both", () => {
    const profile = normalizeAnalyseFormValues({
      ...base,
      riskAnswers: [2, 2, 1],
    } as AnalyseFormValues);
    expect(profile.riskTolerance).toBe("aggressive");
    expect(profile.riskAnswers).toEqual([2, 2, 1]);

    const form = financialProfileToFormValues(profile);
    expect(form.riskAnswers).toEqual([2, 2, 1]);
    expect(form.riskTolerance).toBe("aggressive");
  });

  it("leaves riskTolerance unset when the quiz is skipped or partial", () => {
    expect(
      normalizeAnalyseFormValues(base as AnalyseFormValues).riskTolerance,
    ).toBeUndefined();
    expect(
      normalizeAnalyseFormValues({
        ...base,
        riskAnswers: [2, null, null],
      } as AnalyseFormValues).riskTolerance,
    ).toBeUndefined();
  });
});
