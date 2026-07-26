import { describe, expect, it } from "vitest";
import {
  buildTdsMismatchWarning,
  findMissingCriticalFields,
  mapExtractedToComparisonInputs,
  mapExtractedToTaxCalculatorStorage,
  mergeExtracted,
  normalizeExtractedAliases,
  parseExtractionJson,
} from "./taxExtract";

describe("taxExtract helpers", () => {
  it("parses fenced JSON from model output", () => {
    const raw =
      'Here you go:\n```json\n{"grossSalary": 1200000, "pan": "ABCDE1234F"}\n```';
    expect(parseExtractionJson(raw)).toEqual({
      grossSalary: 1200000,
      pan: "ABCDE1234F",
    });
  });

  it("normalizes TDS aliases and critical fields", () => {
    const data = normalizeExtractedAliases({
      tdsFromForm16: 80000,
      salaryIncome: 1000000,
      employerName: "Acme",
      pan: "ABCDE1234F",
    });
    expect(data.tdsDeducted).toBe(80000);
    expect(data.grossSalary).toBe(1000000);
    expect(findMissingCriticalFields(data)).toEqual([]);
  });

  it("warns on Form16 vs AIS TDS mismatch", () => {
    expect(
      buildTdsMismatchWarning({
        tdsFromForm16: 50000,
        tdsFromAIS: 52000,
      }),
    ).toContain("TDS mismatch");
    expect(
      buildTdsMismatchWarning({
        tdsFromForm16: 50000,
        tdsFromAIS: 50050,
      }),
    ).toBeNull();
  });

  it("merges extracts and maps into tax calculator storage", () => {
    const merged = mergeExtracted(
      { grossSalary: 900000, section80C: 150000 },
      { interestIncome: 12000, tdsFromAIS: 90000 },
    );
    expect(merged.grossSalary).toBe(900000);
    expect(merged.interestIncome).toBe(12000);

    const storage = mapExtractedToTaxCalculatorStorage(merged);
    expect(storage.schemaVersion).toBe(3);
    expect(storage.employment).toBe("salaried");
    expect(storage.secDed80c).toBe(true);

    const inputs = mapExtractedToComparisonInputs(merged);
    expect(inputs.basicMonthly).toBeGreaterThan(0);
    expect(inputs.deductions80C).toBe(150000);
  });
});
