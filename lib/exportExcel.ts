import { formatINR } from "@/lib/formatINR";
import type { AmortisationRow } from "@/lib/amortisation";
import type { CellObject } from "xlsx";

/** Loads xlsx only when the user exports — keeps it out of the main calculator bundle. */
export async function downloadAmortisationExcel(
  rows: AmortisationRow[],
  loanAmount: number,
  rate: number,
  tenure: number,
  emi: number,
  calculatorName: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const safeName = calculatorName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const summaryData = [
    [`Finkoin — ${calculatorName} Schedule`],
    [""],
    ["Loan amount", formatINR(loanAmount)],
    ["Annual interest rate", `${rate}%`],
    ["Tenure", `${tenure} months`],
    ["Monthly EMI", formatINR(emi)],
    [""],
  ];

  const tableHeaders = [
    ["#", "Date", "Opening Balance", "EMI", "Principal", "Interest", "Closing Balance"],
  ];

  const tableData = rows.map((r) => [
    r.month,
    r.date,
    Math.round(r.openingBalance),
    Math.round(r.emi),
    Math.round(r.principal),
    Math.round(r.interest),
    Math.round(r.closingBalance),
  ]);

  const allData = [...summaryData, ...tableHeaders, ...tableData];
  const worksheet = XLSX.utils.aoa_to_sheet(allData);

  worksheet["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];

  const headerRowIndex1Based = summaryData.length + 1;
  for (let c = 0; c < 7; c += 1) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex1Based - 1, c });
    const cell = worksheet[addr];
    if (cell) {
      (cell as CellObject & { s?: unknown }).s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "534AB7" } },
      };
    }
  }

  const firstDataRow0Based = headerRowIndex1Based;
  for (let i = 0; i < tableData.length; i += 1) {
    const row0Based = firstDataRow0Based + i;
    const shaded = i % 2 === 1;
    for (let c = 0; c < 7; c += 1) {
      const addr = XLSX.utils.encode_cell({ r: row0Based, c });
      const cell = worksheet[addr];
      if (!cell) continue;
      const style: Record<string, unknown> = {};
      if (shaded) {
        style.fill = { patternType: "solid", fgColor: { rgb: "FAFAFE" } };
      }
      if (c >= 2) {
        style.numFmt = "₹ #,##,##0";
      }
      (cell as CellObject & { s?: unknown }).s = style;
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, `${calculatorName} Schedule`);
  XLSX.writeFile(workbook, `finkoin-${safeName}.xlsx`);
}
