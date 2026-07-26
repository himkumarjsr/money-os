import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { isSpreadsheetFile, spreadsheetBufferToText } from "./taxSpreadsheet";

describe("taxSpreadsheet", () => {
  it("detects xlsx / csv by name or mime", () => {
    expect(
      isSpreadsheetFile({
        name: "cg.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBe(true);
    expect(isSpreadsheetFile({ name: "gains.CSV", type: "" })).toBe(true);
    expect(
      isSpreadsheetFile({ name: "form16.pdf", type: "application/pdf" }),
    ).toBe(false);
  });

  it("converts workbook buffer to text without writing disk", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Security", "Buy", "Sell", "Gain"],
      ["RELIANCE", 1000, 1200, 200],
      ["TCS", 500, 450, -50],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "FY2526");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
    const text = spreadsheetBufferToText(ab, "cg.xlsx");
    expect(text).toContain("File: cg.xlsx");
    expect(text).toContain("FY2526");
    expect(text).toContain("RELIANCE");
    expect(text).toContain("-50");
  });
});
