import type { AmortisationRow } from "@/lib/amortisation";
import {
  amortisationExcelFileName,
  buildAmortisationWorkbook,
} from "@/lib/amortisationExcel";

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
  const workbook = buildAmortisationWorkbook(XLSX, {
    rows,
    loanAmount,
    rate,
    tenure,
    emi,
    calculatorName,
  });
  XLSX.writeFile(workbook, amortisationExcelFileName(calculatorName));
}
