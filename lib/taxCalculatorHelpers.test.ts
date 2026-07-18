import { describe, expect, it } from "vitest";
import {
  businessIncomeIllustrative,
  commutedPensionExemptIllustrative,
  familyPensionExemptAnnual,
  gratuityTaxableExempt,
  leaveEncashmentTaxableExemptIllustrative,
  ltaSplit,
  pensionAnnualFromMonthly,
  rentalTaxableIncomeIllustrative,
  rsuSaleGain,
  rsuVestingIncomeAnnual,
} from "./taxCalculatorHelpers";

describe("gratuityTaxableExempt", () => {
  it("fully exempts government gratuity", () => {
    expect(gratuityTaxableExempt(50_00_000, "government", 0, 0)).toEqual({
      exempt: 50_00_000,
      taxable: 0,
    });
  });

  it("caps private gratuity by formula and 20L", () => {
    const result = gratuityTaxableExempt(30_00_000, "private", 26_00_000, 10);
    // formula = (26L/26)*15*10 = 1L*15*10 = 1.5Cr; min(30L, 1.5Cr, 20L) = 20L
    expect(result.exempt).toBe(20_00_000);
    expect(result.taxable).toBe(10_00_000);
  });

  it("handles zero / negative inputs for private", () => {
    expect(gratuityTaxableExempt(0, "private", 10_00_000, 5)).toEqual({
      exempt: 0,
      taxable: 0,
    });
    expect(gratuityTaxableExempt(-100, "private", -1, -2)).toEqual({
      exempt: 0,
      taxable: 0,
    });
  });

  it("never exempts more than received for private", () => {
    const result = gratuityTaxableExempt(1_00_000, "private", 26_00_000, 20);
    expect(result.exempt).toBe(1_00_000);
    expect(result.taxable).toBe(0);
  });
});

describe("leaveEncashmentTaxableExemptIllustrative", () => {
  it("fully exempts government retirement encashment", () => {
    expect(
      leaveEncashmentTaxableExemptIllustrative(
        10_00_000,
        "retirement",
        "government",
        0,
        0,
        0,
      ),
    ).toEqual({ exempt: 10_00_000, taxable: 0 });
  });

  it("applies private retirement caps", () => {
    const result = leaveEncashmentTaxableExemptIllustrative(
      30_00_000,
      "retirement",
      "private",
      1_00_000,
      20,
      60,
    );
    // salaryLinked = min(1L*60/30, 30L) = 2L; exempt = min(30L, 25L, 2L) = 2L
    expect(result.exempt).toBe(2_00_000);
    expect(result.taxable).toBe(28_00_000);
  });

  it("uses during-service salary-linked exempt only", () => {
    const result = leaveEncashmentTaxableExemptIllustrative(
      1_00_000,
      "during_service",
      "private",
      50_000,
      5,
      30,
    );
    expect(result.exempt).toBe(50_000);
    expect(result.taxable).toBe(50_000);
  });

  it("handles zero leave days and negatives", () => {
    expect(
      leaveEncashmentTaxableExemptIllustrative(
        50_000,
        "during_service",
        "private",
        40_000,
        1,
        0,
      ),
    ).toEqual({ exempt: 0, taxable: 50_000 });
    expect(
      leaveEncashmentTaxableExemptIllustrative(
        -10,
        "during_service",
        "private",
        -1,
        0,
        -5,
      ),
    ).toEqual({ exempt: 0, taxable: 0 });
  });
});

describe("ltaSplit", () => {
  it("taxable fully when not claiming or zero received", () => {
    expect(ltaSplit(50000, false, 20000)).toEqual({
      exempt: 0,
      taxable: 50000,
    });
    expect(ltaSplit(0, true, 20000)).toEqual({ exempt: 0, taxable: 0 });
    expect(ltaSplit(-100, true, 20000)).toEqual({ exempt: 0, taxable: 0 });
  });

  it("exempts lesser of received and travel cost", () => {
    expect(ltaSplit(50000, true, 20000)).toEqual({
      exempt: 20000,
      taxable: 30000,
    });
    expect(ltaSplit(15000, true, 20000)).toEqual({ exempt: 15000, taxable: 0 });
    expect(ltaSplit(15000, true, -5)).toEqual({ exempt: 0, taxable: 15000 });
  });
});

describe("rentalTaxableIncomeIllustrative", () => {
  it("computes NAV, 30% std deduction, and interest", () => {
    const result = rentalTaxableIncomeIllustrative(6_00_000, 50_000, 1_00_000);
    expect(result.grossRent).toBe(6_00_000);
    expect(result.lessMunicipal).toBe(50_000);
    expect(result.nav).toBe(5_50_000);
    expect(result.less30).toBe(1_65_000);
    expect(result.lessInterest).toBe(1_00_000);
    expect(result.taxable).toBe(2_85_000);
  });

  it("floors negatives at zero", () => {
    const result = rentalTaxableIncomeIllustrative(-1, -2, -3);
    expect(result).toEqual({
      grossRent: 0,
      lessMunicipal: 0,
      nav: 0,
      less30: 0,
      lessInterest: 0,
      taxable: 0,
    });
  });

  it("does not go below zero taxable when interest is huge", () => {
    expect(rentalTaxableIncomeIllustrative(100000, 0, 200000).taxable).toBe(0);
  });
});

describe("businessIncomeIllustrative", () => {
  it("regular = receipts - expenses floored at 0", () => {
    expect(
      businessIncomeIllustrative("regular", 10_00_000, 4_00_000, 0, false, 0),
    ).toBe(6_00_000);
    expect(
      businessIncomeIllustrative("regular", 1_00_000, 2_00_000, 0, false, 0),
    ).toBe(0);
  });

  it("44AD uses 6% digital / 8% otherwise", () => {
    expect(businessIncomeIllustrative("44ad", 0, 0, 10_00_000, true, 0)).toBe(
      60_000,
    );
    expect(businessIncomeIllustrative("44ad", 0, 0, 10_00_000, false, 0)).toBe(
      80_000,
    );
    expect(businessIncomeIllustrative("44ad", 0, 0, -10, false, 0)).toBe(0);
  });

  it("44ADA uses 50% of receipts", () => {
    expect(businessIncomeIllustrative("44ada", 0, 0, 0, false, 5_00_000)).toBe(
      2_50_000,
    );
    expect(businessIncomeIllustrative("44ada", 0, 0, 0, false, -1)).toBe(0);
  });
});

describe("pension helpers", () => {
  it("annualizes monthly pension", () => {
    expect(pensionAnnualFromMonthly(10000)).toBe(120000);
    expect(pensionAnnualFromMonthly(0)).toBe(0);
    expect(pensionAnnualFromMonthly(-5)).toBe(0);
  });

  it("commuted exemption by kind", () => {
    expect(commutedPensionExemptIllustrative(90_000, "government")).toBe(
      90_000,
    );
    expect(commutedPensionExemptIllustrative(90_000, "private")).toBe(30_000);
    expect(commutedPensionExemptIllustrative(90_000, "family")).toBe(0);
    expect(commutedPensionExemptIllustrative(-10, "government")).toBe(0);
  });

  it("family pension exempt is min(15k, annual/3)", () => {
    expect(familyPensionExemptAnnual(1000)).toBe(4000); // 12k/3
    expect(familyPensionExemptAnnual(10000)).toBe(15_000); // capped
    expect(familyPensionExemptAnnual(0)).toBe(0);
    expect(familyPensionExemptAnnual(-1)).toBe(0);
  });
});

describe("RSU helpers", () => {
  it("computes vesting income and sale gain", () => {
    expect(rsuVestingIncomeAnnual(100, 500)).toBe(50000);
    expect(rsuVestingIncomeAnnual(-10, 500)).toBe(0);
    expect(rsuVestingIncomeAnnual(10, -5)).toBe(0);

    expect(rsuSaleGain(50, 200, 120)).toBe(4000);
    expect(rsuSaleGain(50, 100, 120)).toBe(0);
    expect(rsuSaleGain(-5, 200, 100)).toBe(0);
  });
});
