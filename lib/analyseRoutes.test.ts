import { describe, expect, it } from "vitest";
import { ANALYSE_RETAKE_HREF, isAnalyseRetake } from "./analyseRoutes";

describe("analyse routes", () => {
  it("marks the retake link", () => {
    expect(isAnalyseRetake(ANALYSE_RETAKE_HREF.split("?")[1] ?? "")).toBe(true);
    expect(isAnalyseRetake("?retake=1")).toBe(true);
  });

  it("treats a plain visit as not a retake", () => {
    expect(isAnalyseRetake("")).toBe(false);
    expect(isAnalyseRetake("?from=home")).toBe(false);
  });
});
