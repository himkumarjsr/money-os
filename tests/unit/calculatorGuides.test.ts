import { describe, expect, it } from "vitest";
import { INDEXABLE_CALC_IDS } from "@/app/calculators/calculator-seo";
import {
  GUIDED_CALC_IDS,
  getCalcGuide,
  inr,
  inrShort,
} from "@/app/calculators/calculator-guides";

describe("calculator guides", () => {
  it("only covers calculators that have a page", () => {
    for (const id of GUIDED_CALC_IDS) expect(INDEXABLE_CALC_IDS).toContain(id);
  });

  it("builds every guide with finite numbers", () => {
    for (const id of GUIDED_CALC_IDS) {
      const g = getCalcGuide(id)!;
      const text = JSON.stringify(g);
      expect(text).not.toMatch(/NaN|Infinity|undefined/);
      expect(g.example.steps.length).toBeGreaterThan(0);
      for (const row of g.table?.rows ?? []) {
        expect(row.length).toBe(g.table!.head.length);
      }
    }
  });

  it("matches the textbook SIP and EMI examples", () => {
    expect(getCalcGuide("sip")!.example.steps[2]).toContain("₹49,95,802");
    expect(getCalcGuide("emi")!.example.steps[1]).toContain("₹21,247");
  });

  it("covers every calculator page", () => {
    const missing = INDEXABLE_CALC_IDS.filter((id) => !getCalcGuide(id));
    expect(missing).toEqual([]);
  });

  it("returns null for an unknown calculator", () => {
    expect(getCalcGuide("not-a-calculator")).toBeNull();
  });

  it("formats rupees the Indian way", () => {
    expect(inr(1234567)).toBe("₹12,34,567");
    expect(inrShort(1_00_00_000)).toBe("₹1 crore");
    expect(inrShort(25_00_000)).toBe("₹25 lakh");
    expect(inrShort(11_54_000)).toBe("₹11.5 lakh");
  });
});
