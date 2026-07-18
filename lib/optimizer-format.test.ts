import { describe, expect, it } from "vitest";
import { fmt, fmtWords } from "./optimizer-format";

describe("fmt", () => {
  it("formats whole rupees with Indian grouping", () => {
    expect(fmt(1000)).toBe("₹1,000");
    expect(fmt(150000)).toBe("₹1,50,000");
  });

  it("rounds and coerces invalid values to zero", () => {
    expect(fmt(10.4)).toBe("₹10");
    expect(fmt(10.6)).toBe("₹11");
    expect(fmt(NaN)).toBe("₹0");
    expect(fmt(null as unknown as number)).toBe("₹0");
    expect(fmt(undefined as unknown as number)).toBe("₹0");
    expect(fmt("abc" as unknown as number)).toBe("₹0");
  });

  it("formats zero and negative", () => {
    expect(fmt(0)).toBe("₹0");
    expect(fmt(-2500)).toBe("₹-2,500");
  });
});

describe("fmtWords", () => {
  it("returns string for small amounts", () => {
    expect(fmtWords(0)).toBe("0");
    expect(fmtWords(999)).toBe("999");
  });

  it("uses thousand / lakh / crore scales", () => {
    expect(fmtWords(1000)).toBe("1 thousand");
    expect(fmtWords(2500)).toBe("2 thousand");
    expect(fmtWords(1_00_000)).toBe("1 lakh");
    expect(fmtWords(1_25_000)).toBe("1 lakh 25 thousand");
    expect(fmtWords(1_00_00_000)).toBe("1 crore");
    expect(fmtWords(1_50_00_000)).toBe("1 crore 50 lakh");
  });

  it("mirrors negatives as absolute wording", () => {
    expect(fmtWords(-1_00_000)).toBe("1 lakh");
    expect(fmtWords(-2500)).toBe("2 thousand");
  });

  it("coerces invalid to zero", () => {
    expect(fmtWords(NaN)).toBe("0");
    expect(fmtWords(null as unknown as number)).toBe("0");
  });

  it("rounds before scaling", () => {
    expect(fmtWords(1499.6)).toBe("1 thousand");
  });
});
