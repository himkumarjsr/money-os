import { describe, expect, it } from "vitest";
import {
  PO_RATES,
  poKvpMaturity,
  poMisMonthly,
  poNscMaturity,
  poRdMaturity,
  poSavingsYearly,
  poScssQuarterly,
  poSsyMaturity,
  poTdMaturity,
  poTdRate,
} from "./postOfficeSchemes";

describe("postOfficeSchemes rates", () => {
  it("exposes Jul–Sep 2026 notified rates", () => {
    expect(PO_RATES.savings).toBe(4);
    expect(PO_RATES.td1).toBe(6.9);
    expect(PO_RATES.td5).toBe(7.5);
    expect(PO_RATES.rd).toBe(6.7);
    expect(PO_RATES.nsc).toBe(7.7);
    expect(PO_RATES.kvp).toBe(7.5);
    expect(PO_RATES.kvpMonths).toBe(115);
    expect(PO_RATES.mis).toBe(7.4);
    expect(PO_RATES.scss).toBe(8.2);
    expect(PO_RATES.ssy).toBe(8.2);
    expect(PO_RATES.ppf).toBe(7.1);
  });
});

describe("postOfficeSchemes math", () => {
  it("matches notified NSC example (~₹14,490 on ₹10,000)", () => {
    expect(Math.round(poNscMaturity(10_000, PO_RATES.nsc))).toBe(14_490);
  });

  it("compounds TD quarterly for each tenure", () => {
    expect(poTdRate(1)).toBe(6.9);
    expect(poTdRate(2)).toBe(7.0);
    expect(poTdRate(3)).toBe(7.1);
    expect(poTdRate(5)).toBe(7.5);
    const m = poTdMaturity(10_000, 5, PO_RATES.td5);
    expect(m).toBeGreaterThan(14_000);
    expect(m).toBeLessThan(15_500);
  });

  it("computes RD maturity above total deposits", () => {
    const monthly = 1_000;
    const m = poRdMaturity(monthly, 5, PO_RATES.rd);
    expect(m).toBeGreaterThan(monthly * 60);
    expect(poRdMaturity(monthly, 5, 0)).toBe(monthly * 60);
  });

  it("doubles KVP principal", () => {
    expect(poKvpMaturity(50_000)).toBe(1_00_000);
  });

  it("pays MIS monthly and SCSS quarterly from notified rates", () => {
    expect(poMisMonthly(10_000)).toBeCloseTo(61.666, 2);
    expect(poScssQuarterly(10_000)).toBeCloseTo(205, 0);
    expect(poSavingsYearly(1_00_000)).toBe(4_000);
  });

  it("compounds SSY yearly deposits", () => {
    const m = poSsyMaturity(1_00_000, 15, PO_RATES.ssy);
    expect(m).toBeGreaterThan(15_00_000);
    expect(poSsyMaturity(1_00_000, 0, PO_RATES.ssy)).toBe(0);
    expect(poSsyMaturity(1_00_000, 5, 0)).toBe(5_00_000);
  });
});
