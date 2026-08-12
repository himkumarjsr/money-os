import { describe, expect, it } from "vitest";
import {
  CALCULATOR_MONEY_MAX,
  clampCalculatorValue,
  formatCalculatorFieldValue,
  snapToStep,
  stepDecimals,
} from "./calculatorInput";

describe("CALCULATOR_MONEY_MAX", () => {
  it("caps at ₹99 crore", () => {
    expect(CALCULATOR_MONEY_MAX).toBe(990_000_000);
  });
});

describe("stepDecimals", () => {
  it("counts fractional digits", () => {
    expect(stepDecimals(1)).toBe(0);
    expect(stepDecimals(0.1)).toBe(1);
    expect(stepDecimals(0.05)).toBe(2);
    expect(stepDecimals(0.01)).toBe(2);
  });

  it("handles invalid steps", () => {
    expect(stepDecimals(0)).toBe(0);
    expect(stepDecimals(-1)).toBe(0);
    expect(stepDecimals(NaN)).toBe(0);
  });

  it("handles scientific-notation steps", () => {
    expect(stepDecimals(1e-2)).toBe(2);
    expect(stepDecimals(1e-4)).toBe(4);
  });
});

describe("snapToStep", () => {
  it("snaps interest rates onto 0.1 grid", () => {
    expect(snapToStep(7.54, 6, 0.1)).toBe(7.5);
    expect(snapToStep(7.56, 6, 0.1)).toBe(7.6);
    expect(snapToStep(12, 6, 0.1)).toBe(12);
  });

  it("removes float noise on 0.05 steps", () => {
    expect(snapToStep(7 + 0.05 * 3, 7, 0.05)).toBe(7.15);
  });

  it("returns min for non-finite values", () => {
    expect(snapToStep(NaN, 6, 0.1)).toBe(6);
  });

  it("passthrough when step is invalid", () => {
    expect(snapToStep(7.77, 0, 0)).toBe(7.77);
  });
});

describe("clampCalculatorValue", () => {
  it("clamps money to CALCULATOR_MONEY_MAX", () => {
    expect(
      clampCalculatorValue(2_000_000_000, 0, CALCULATOR_MONEY_MAX, 1),
    ).toBe(CALCULATOR_MONEY_MAX);
  });

  it("clamps rate into min/max with decimal step when snapping", () => {
    expect(clampCalculatorValue(5, 6, 20, 0.1)).toBe(6);
    expect(clampCalculatorValue(25, 6, 20, 0.1)).toBe(20);
    expect(clampCalculatorValue(12.34, 6, 20, 0.1)).toBe(12.3);
  });

  it("keeps exact typed money when snap is false (no step rounding)", () => {
    // Large steps used for sliders must not rewrite free-form entry.
    expect(
      clampCalculatorValue(
        2_25_00_000,
        1_00_000,
        CALCULATOR_MONEY_MAX,
        10_00_000,
        {
          snap: false,
        },
      ),
    ).toBe(2_25_00_000);
    expect(
      clampCalculatorValue(
        2_25_00_000,
        1_00_000,
        CALCULATOR_MONEY_MAX,
        50_000,
        {
          snap: false,
        },
      ),
    ).toBe(2_25_00_000);
  });

  it("snaps money onto slider step when snap is true", () => {
    expect(
      clampCalculatorValue(
        2_25_00_000,
        30_00_000,
        CALCULATOR_MONEY_MAX,
        10_00_000,
        {
          snap: true,
        },
      ),
    ).toBe(2_30_00_000);
  });
});

describe("formatCalculatorFieldValue", () => {
  const money = (n: number) => `₹${n}`;

  it("formats percent without forcing the step grid", () => {
    expect(formatCalculatorFieldValue(7.5, "percent", 0.1, money)).toBe("7.5");
    expect(formatCalculatorFieldValue(7.15, "percent", 0.05, money)).toBe(
      "7.15",
    );
    expect(formatCalculatorFieldValue(12.34, "percent", 0.1, money)).toBe(
      "12.34",
    );
    expect(formatCalculatorFieldValue(NaN, "percent", 0.1, money)).toBe("0");
  });

  it("formats years/months and delegates money", () => {
    expect(formatCalculatorFieldValue(5, "years", 1, money)).toBe("5");
    expect(formatCalculatorFieldValue(2.5, "months", 0.5, money)).toBe("2.5");
    expect(formatCalculatorFieldValue(1000, "money", 1, money)).toBe("₹1000");
  });
});
