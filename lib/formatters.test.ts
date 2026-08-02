import { describe, expect, it } from "vitest";
import {
  formatIndian,
  formatIndianCompact,
  formatInWords,
  formatSliderLabel,
  handleMoneyInput,
  parseIndianInput,
} from "./formatters";

describe("formatIndian", () => {
  it("formats with Indian grouping", () => {
    expect(formatIndian(1000)).toBe("1,000");
    expect(formatIndian(100000)).toBe("1,00,000");
  });

  it("treats falsy and NaN as zero", () => {
    expect(formatIndian(0)).toBe("0");
    expect(formatIndian(NaN)).toBe("0");
  });

  it("keeps up to 2 decimal places (paise)", () => {
    expect(formatIndian(12.4)).toBe("12.40");
    expect(formatIndian(12.6)).toBe("12.60");
    expect(formatIndian(11410.29)).toBe("11,410.29");
    expect(formatIndian(1000)).toBe("1,000");
  });

  it("formats negative numbers", () => {
    expect(formatIndian(-1500)).toBe("-1,500");
  });
});

describe("formatIndianCompact", () => {
  it("uses Cr / L / K thresholds", () => {
    expect(formatIndianCompact(2_00_00_000)).toBe("₹2 Cr");
    expect(formatIndianCompact(1_00_00_000)).toBe("₹1 Cr");
    expect(formatIndianCompact(5_00_000)).toBe("₹5 L");
    expect(formatIndianCompact(1_00_000)).toBe("₹1 L");
    expect(formatIndianCompact(2500)).toBe("₹3K");
    expect(formatIndianCompact(1000)).toBe("₹1K");
  });

  it("falls back to Indian format below 1000", () => {
    expect(formatIndianCompact(999)).toBe("₹999");
    expect(formatIndianCompact(0)).toBe("₹0");
  });

  it("handles boundary just below thresholds", () => {
    expect(formatIndianCompact(99_999)).toBe("₹100K");
    expect(formatIndianCompact(99_99_999)).toBe("₹100 L");
  });
});

describe("formatInWords", () => {
  it("handles zero and non-finite", () => {
    expect(formatInWords(0)).toBe("Zero");
    expect(formatInWords(NaN)).toBe("");
    expect(formatInWords(Infinity)).toBe("");
    expect(formatInWords(-Infinity)).toBe("");
  });

  it("spells small amounts", () => {
    expect(formatInWords(1)).toBe("One");
    expect(formatInWords(19)).toBe("Nineteen");
    expect(formatInWords(21)).toBe("Twenty-one");
    expect(formatInWords(100)).toBe("One hundred");
    expect(formatInWords(105)).toBe("One hundred five");
  });

  it("spells thousands and lakhs", () => {
    expect(formatInWords(1000)).toBe("One thousand");
    expect(formatInWords(2895)).toBe("Two thousand eight hundred ninety-five");
    expect(formatInWords(1_00_000)).toBe("One lakh");
    expect(formatInWords(2_00_000)).toBe("Two lakhs");
    expect(formatInWords(1_00_050)).toBe("One lakh fifty");
  });

  it("spells crores", () => {
    expect(formatInWords(1_00_00_000)).toBe("One crore");
    expect(formatInWords(2_00_00_000)).toBe("Two crores");
    expect(formatInWords(1_00_00_100)).toBe("One crore one hundred");
  });

  it("uses absolute value for negatives and rounds fractions", () => {
    expect(formatInWords(-21)).toBe("Twenty-one");
    expect(formatInWords(0.4)).toBe("Zero");
    expect(formatInWords(0.6)).toBe("One");
  });
});

describe("parseIndianInput", () => {
  it("returns null for empty or non-numeric", () => {
    expect(parseIndianInput("")).toBeNull();
    expect(parseIndianInput("   ")).toBeNull();
    expect(parseIndianInput("abc")).toBeNull();
  });

  it("parses plain and comma-separated numbers", () => {
    expect(parseIndianInput("1,50,000")).toBe(150000);
    expect(parseIndianInput("2500.5")).toBe(2500.5);
    expect(parseIndianInput("-100")).toBe(-100);
  });

  it("applies crore / lakh / thousand suffixes", () => {
    expect(parseIndianInput("2 cr")).toBe(2_00_00_000);
    expect(parseIndianInput("1.5 crore")).toBe(1.5 * 1_00_00_000);
    expect(parseIndianInput("3 L")).toBe(3_00_000);
    expect(parseIndianInput("2 lakh")).toBe(2_00_000);
    expect(parseIndianInput("5k")).toBe(5000);
    expect(parseIndianInput("2 thousand")).toBe(2000);
  });

  it("extracts first number from mixed text", () => {
    expect(parseIndianInput("approx 10 lakh")).toBe(10_00_000);
  });
});

describe("handleMoneyInput", () => {
  it("parses clean numeric input and clamps to range", () => {
    expect(handleMoneyInput("1000")).toBe(1000);
    expect(handleMoneyInput("1,000")).toBe(1000);
    expect(handleMoneyInput("₹500")).toBe(500);
    expect(handleMoneyInput("0", 0, 100)).toBe(0);
    expect(handleMoneyInput("999", 0, 100)).toBe(100);
  });

  it("returns null for invalid input", () => {
    expect(handleMoneyInput("abc")).toBeNull();
    expect(handleMoneyInput("12abc")).toBeNull();
    expect(handleMoneyInput("")).toBeNull();
    // negatives are not accepted by the numeric pattern
    expect(handleMoneyInput("-10", 0, 100)).toBeNull();
  });

  it("accepts decimals and empty-ish numeric patterns", () => {
    expect(handleMoneyInput("12.5")).toBe(12.5);
    expect(handleMoneyInput(".5")).toBe(0.5);
  });

  it("defaults max clamp to ₹99 crore", () => {
    expect(handleMoneyInput("990000000")).toBe(990_000_000);
    expect(handleMoneyInput("2000000000")).toBe(990_000_000);
  });
});

describe("formatSliderLabel", () => {
  it("formats money in words with rupee prefix", () => {
    expect(formatSliderLabel(1000, "money")).toBe("₹One thousand");
  });

  it("formats percent, years, months, and number", () => {
    expect(formatSliderLabel(8, "percent")).toBe("8% p.a.");
    expect(formatSliderLabel(7.5, "percent", 0.1)).toBe("7.5% p.a.");
    expect(formatSliderLabel(7.15, "percent", 0.05)).toBe("7.15% p.a.");
    expect(formatSliderLabel(1, "years")).toBe("1 year");
    expect(formatSliderLabel(2, "years")).toBe("2 years");
    expect(formatSliderLabel(1, "months")).toBe("1 month");
    expect(formatSliderLabel(3, "months")).toBe("3 months");
    expect(formatSliderLabel(1500, "number")).toBe("1,500");
  });
});
