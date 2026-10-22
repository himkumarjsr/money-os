import { describe, expect, it } from "vitest";
import { rankSummary } from "@/lib/fkRewards";

describe("rankSummary", () => {
  it("shows rank of total for small boards", () => {
    expect(rankSummary(1, 5, 20, "this month")).toBe("#1 of 5 this month");
  });
  it("adds the percentile once the board is big enough", () => {
    expect(rankSummary(3, 1200, 1, "this month")).toBe(
      "#3 of 1,200 · Top 1% this month",
    );
  });
  it("falls back to the percentile when the total is unknown", () => {
    expect(rankSummary(2, null, 40, "all time")).toBe("Top 40% all time");
  });
});
