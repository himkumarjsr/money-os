import { describe, expect, it } from "vitest";
import { getExpenseBucketRows } from "./expense-bucket-recommendations";

describe("getExpenseBucketRows", () => {
  it("maps universal bucket rows into expense recommendation shape", () => {
    const rows = getExpenseBucketRows({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      rentAmount: 20000,
      shopping: 2000,
      monthlySIP: 10000,
    } as never);

    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.id)).toEqual([
      "needs",
      "wants",
      "security",
      "loans",
      "investment",
    ]);
    for (const row of rows) {
      expect(row).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          label: expect.any(String),
          actual: expect.any(Number),
          recommended: expect.any(Number),
          overLimit: expect.any(Boolean),
        }),
      );
    }
  });

  it("sets recommended from income * cap percent", () => {
    const rows = getExpenseBucketRows({
      monthlySalary: 100000,
      lifeStage: "bachelor",
    } as never);
    expect(rows.find((r) => r.id === "needs")?.recommended).toBe(30000);
    expect(rows.find((r) => r.id === "wants")?.recommended).toBe(5000);
    expect(rows.find((r) => r.id === "loans")?.recommended).toBe(40000);
    expect(rows.find((r) => r.id === "investment")?.recommended).toBe(20000);
    expect(rows.find((r) => r.id === "security")?.recommended).toBe(5000);
  });

  it("marks overLimit when actual exceeds cap", () => {
    const under = getExpenseBucketRows({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      shopping: 1000,
    } as never).find((r) => r.id === "wants")!;
    expect(under.overLimit).toBe(false);

    const over = getExpenseBucketRows({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      shopping: 6000,
    } as never).find((r) => r.id === "wants")!;
    expect(over.overLimit).toBe(true);
    expect(over.actual).toBe(6000);
  });

  it("handles zero income (recommended zeros)", () => {
    const rows = getExpenseBucketRows({
      monthlySalary: 0,
      lifeStage: "bachelor",
      rentAmount: 5000,
    } as never);
    expect(rows.every((r) => r.recommended === 0)).toBe(true);
    expect(rows.find((r) => r.id === "needs")?.overLimit).toBe(true);
  });
});
