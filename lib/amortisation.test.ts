import { describe, expect, it } from "vitest";
import {
  calculateOutstanding,
  generateAmortisationTable,
} from "./amortisation";

describe("generateAmortisationTable", () => {
  it("returns empty for zero or negative tenure", () => {
    expect(generateAmortisationTable(100000, 10, 0, 5000)).toEqual([]);
    expect(generateAmortisationTable(100000, 10, -3, 5000)).toEqual([]);
  });

  it("generates one row per month", () => {
    const rows = generateAmortisationTable(120000, 12, 3, 10100, "2025-01-15");
    expect(rows).toHaveLength(3);
    expect(rows[0].month).toBe(1);
    expect(rows[2].month).toBe(3);
  });

  it("dates start the month after loan start", () => {
    const rows = generateAmortisationTable(100000, 12, 2, 9000, "2025-01-15");
    expect(rows[0].date).toBe("Feb 2025");
    expect(rows[1].date).toBe("Mar 2025");
  });

  it("accepts Date objects for loan start", () => {
    const rows = generateAmortisationTable(
      100000,
      12,
      1,
      9000,
      new Date(2024, 5, 20),
    );
    expect(rows[0].date).toBe("Jul 2024");
  });

  it("splits EMI into interest and principal", () => {
    const principal = 100000;
    const annualRate = 12;
    const emi = 8884.88;
    const rows = generateAmortisationTable(
      principal,
      annualRate,
      12,
      emi,
      "2025-01-01",
    );
    const first = rows[0];
    expect(first.openingBalance).toBe(principal);
    expect(first.emi).toBe(emi);
    expect(first.interest).toBeCloseTo(principal * (annualRate / 12 / 100), 5);
    expect(first.principal).toBeCloseTo(emi - first.interest, 5);
    expect(first.closingBalance).toBeCloseTo(
      Math.max(0, first.openingBalance - first.principal),
      5,
    );
  });

  it("never reports negative closing balance", () => {
    const rows = generateAmortisationTable(1000, 0, 2, 600, "2025-01-01");
    for (const row of rows) {
      expect(row.closingBalance).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles zero interest rate", () => {
    const rows = generateAmortisationTable(10000, 0, 2, 5000, "2025-06-01");
    expect(rows[0].interest).toBe(0);
    expect(rows[0].principal).toBe(5000);
    expect(rows[0].closingBalance).toBe(5000);
  });

  it("rounds fractional tenure months", () => {
    expect(generateAmortisationTable(10000, 10, 2.4, 1000)).toHaveLength(2);
    expect(generateAmortisationTable(10000, 10, 2.6, 1000)).toHaveLength(3);
  });
});

describe("calculateOutstanding", () => {
  it("returns 0 for non-positive EMI or remaining months", () => {
    expect(calculateOutstanding(0, 10, 12)).toBe(0);
    expect(calculateOutstanding(-100, 10, 12)).toBe(0);
    expect(calculateOutstanding(5000, 10, 0)).toBe(0);
    expect(calculateOutstanding(5000, 10, -2)).toBe(0);
    expect(calculateOutstanding(NaN as unknown as number, 10, 12)).toBe(0);
  });

  it("returns EMI * n when rate is zero", () => {
    expect(calculateOutstanding(5000, 0, 12)).toBe(60000);
    expect(calculateOutstanding(5000, -5, 10)).toBe(50000);
  });

  it("discounts future EMIs at positive rates", () => {
    const outstanding = calculateOutstanding(10000, 12, 12);
    expect(outstanding).toBeGreaterThan(0);
    expect(outstanding).toBeLessThan(10000 * 12);
    expect(outstanding).toBeCloseTo(112551.03, 0);
  });

  it("handles nullish-like zeros via Math.max", () => {
    expect(calculateOutstanding(0, 12, 24)).toBe(0);
    expect(calculateOutstanding(8000, 0, 1)).toBe(8000);
  });
});
