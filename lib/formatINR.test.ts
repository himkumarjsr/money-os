import { describe, expect, it } from "vitest";
import { formatCompactINR, formatINR } from "./formatINR";

describe("formatINR", () => {
  it("formats whole rupees with Indian grouping", () => {
    expect(formatINR(1000)).toBe("₹1,000");
    expect(formatINR(100000)).toBe("₹1,00,000");
    expect(formatINR(10000000)).toBe("₹1,00,00,000");
  });

  it("rounds fractional values", () => {
    expect(formatINR(10.4)).toBe("₹10");
    expect(formatINR(10.5)).toBe("₹11");
    expect(formatINR(10.6)).toBe("₹11");
  });

  it("handles zero and negative", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(-500)).toBe("₹-500");
    expect(formatINR(-1000.4)).toBe("₹-1,000");
  });

  it("maps non-finite values to zero", () => {
    expect(formatINR(NaN)).toBe("₹0");
    expect(formatINR(Infinity)).toBe("₹0");
    expect(formatINR(-Infinity)).toBe("₹0");
  });
});

describe("formatCompactINR", () => {
  it("formats compact Indian notation with rupee prefix", () => {
    expect(formatCompactINR(0)).toBe("₹0");
    expect(formatCompactINR(999)).toMatch(/^₹/);
    expect(formatCompactINR(1000)).toMatch(/^₹/);
    expect(formatCompactINR(1_00_000)).toMatch(/^₹/);
    expect(formatCompactINR(1_00_00_000)).toMatch(/^₹/);
  });

  it("rounds before compact formatting", () => {
    expect(formatCompactINR(1499.4)).toBe(formatCompactINR(1499));
    expect(formatCompactINR(1499.6)).toBe(formatCompactINR(1500));
  });

  it("handles negative and non-finite", () => {
    expect(formatCompactINR(-1000)).toMatch(/^₹-/);
    expect(formatCompactINR(NaN)).toBe("₹0");
    expect(formatCompactINR(Infinity)).toBe("₹0");
    expect(formatCompactINR(-Infinity)).toBe("₹0");
  });
});
