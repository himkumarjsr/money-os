import { describe, expect, it } from "vitest";
import {
  postOfficeHoldingsValue,
  projectPostOfficeHolding,
} from "@/lib/postOfficeHoldings";

const now = new Date(2026, 9, 22);

describe("projectPostOfficeHolding", () => {
  it("takes the amount as today's value without a start year", () => {
    const p = projectPostOfficeHolding({ scheme: "nsc", amount: 100000 }, now);
    expect(p.currentValue).toBe(100000);
    expect(p.maturityValue).toBeUndefined();
    expect(p.note).toMatch(/year you started/);
  });

  it("compounds an NSC yearly at the rate locked in when bought", () => {
    const p = projectPostOfficeHolding(
      { scheme: "nsc", amount: 100000, startYear: 2024 },
      now,
    );
    expect(p.ratePct).toBe(7.7);
    expect(p.maturityYear).toBe(2029);
    expect(Math.round(p.maturityValue!)).toBe(144903);
    expect(p.currentValue).toBeGreaterThan(100000);
    expect(p.currentValue).toBeLessThan(p.maturityValue!);
    expect(p.matured).toBe(false);
  });

  it("doubles a KVP and flags it once matured", () => {
    const p = projectPostOfficeHolding(
      { scheme: "kvp", amount: 50000, startYear: 2015 },
      now,
    );
    expect(p.maturityValue).toBe(100000);
    expect(p.matured).toBe(true);
    expect(p.currentValue).toBe(100000);
    expect(p.note).toMatch(/reinvest/);
  });

  it("shows the monthly payout for MIS and keeps the principal", () => {
    const p = projectPostOfficeHolding(
      { scheme: "mis", amount: 900000, startYear: 2024 },
      now,
    );
    expect(p.currentValue).toBe(900000);
    expect(p.payout?.every).toBe("month");
    expect(p.payout?.amount).toBeCloseTo(5550);
    expect(p.maturityYear).toBe(2029);
  });

  it("works out an RD maturity from the monthly deposit", () => {
    const p = projectPostOfficeHolding(
      { scheme: "recurring_deposit", monthlyDeposit: 5000, startYear: 2025 },
      now,
    );
    expect(p.maturityYear).toBe(2030);
    expect(p.maturityValue!).toBeGreaterThan(5000 * 60);
    expect(p.currentValue).toBeGreaterThan(0);
    expect(p.currentValue).toBeLessThan(p.maturityValue!);
  });

  it("sums today's values across holdings", () => {
    expect(
      postOfficeHoldingsValue(
        [
          { scheme: "savings_account", amount: 2000 },
          { scheme: "mis", amount: 100000, startYear: 2024 },
        ],
        now,
      ),
    ).toBe(102000);
  });
});
