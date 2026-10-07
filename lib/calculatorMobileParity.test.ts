import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { generateAmortisationTable } from "@/lib/amortisation";
import {
  amortisationExcelFileName,
  buildAmortisationWorkbook,
} from "@/lib/amortisationExcel";

describe("mobile keeps byte-identical copies of calculator logic", () => {
  const shared = [
    "amortisation.ts",
    "amortisationExcel.ts",
    "calculatorInput.ts",
    "finance.ts",
    "fireCalculator.ts",
    "formatINR.ts",
    "formatters.ts",
    "postOfficeSchemes.ts",
    "taxCalculatorHelpers.ts",
    "taxMissedDeductionAlerts.ts",
    "taxRegimeComparisonFY2026.ts",
    "taxTeachContent.ts",
  ];
  it.each(shared)("%s", (file) => {
    const root = path.resolve(__dirname, "..");
    expect(readFileSync(path.join(root, "mobile/lib", file), "utf8")).toBe(
      readFileSync(path.join(root, "lib", file), "utf8"),
    );
  });
});

describe("amortisation Excel workbook", () => {
  it("has the summary block, header row and one row per month", () => {
    const rows = generateAmortisationTable(500000, 10, 12, 43958, "2026-01-15");
    const wb = buildAmortisationWorkbook(XLSX, {
      rows,
      loanAmount: 500000,
      rate: 10,
      tenure: 12,
      emi: 43958,
      calculatorName: "home-loan",
    });
    expect(wb.SheetNames).toEqual(["home-loan Schedule"]);
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
      header: 1,
      blankrows: true,
    });
    expect(aoa[0]).toEqual(["Finkoin — home-loan Schedule"]);
    expect(aoa[3]).toEqual(["Annual interest rate", "10%"]);
    expect(aoa[7]).toEqual([
      "#",
      "Date",
      "Opening Balance",
      "EMI",
      "Principal",
      "Interest",
      "Closing Balance",
    ]);
    expect(aoa.slice(8)).toHaveLength(12);
    expect(aoa[8][0]).toBe(1);
    expect(aoa[8][2]).toBe(500000);
  });

  it("writes an xlsx the share sheet can open", () => {
    const wb = buildAmortisationWorkbook(XLSX, {
      rows: generateAmortisationTable(100000, 9, 6, 17106),
      loanAmount: 100000,
      rate: 9,
      tenure: 6,
      emi: 17106,
      calculatorName: "emi",
    });
    const bytes = new Uint8Array(
      XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer,
    );
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    expect(amortisationExcelFileName("Car Loan!")).toBe("finkoin-car-loan.xlsx");
  });
});
