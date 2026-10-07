import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { AmortisationRow } from "@/lib/amortisation";
import {
  amortisationExcelFileName,
  buildAmortisationWorkbook,
} from "@/lib/amortisationExcel";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Build the amortisation workbook (same as web) and open the share sheet. */
export async function shareAmortisationExcel(
  rows: AmortisationRow[],
  loanAmount: number,
  rate: number,
  tenure: number,
  emi: number,
  calculatorName: string,
): Promise<{ error?: string }> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { error: "Sharing isn't available on this device." };
    }
    const XLSX = await import("xlsx");
    const workbook = buildAmortisationWorkbook(XLSX, {
      rows,
      loanAmount,
      rate,
      tenure,
      emi,
      calculatorName,
    });
    const bytes = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    }) as ArrayBuffer;

    const file = new File(Paths.cache, amortisationExcelFileName(calculatorName));
    file.create({ overwrite: true });
    file.write(new Uint8Array(bytes));

    await Sharing.shareAsync(file.uri, {
      mimeType: XLSX_MIME,
      UTI: "org.openxmlformats.spreadsheetml.sheet",
      dialogTitle: "Loan schedule (Excel)",
    });
    return {};
  } catch {
    return { error: "Couldn't create the Excel file. Please try again." };
  }
}
