import * as XLSX from "xlsx";

const MAX_SHEETS = 8;
const MAX_ROWS_PER_SHEET = 400;
const MAX_CHARS = 80_000;

function isSpreadsheetName(name: string): boolean {
  const n = name.toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv");
}

export function isSpreadsheetFile(file: {
  name?: string;
  type?: string;
}): boolean {
  const t = (file.type || "").toLowerCase();
  if (
    t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    t === "application/vnd.ms-excel" ||
    t === "application/excel" ||
    t === "text/csv" ||
    t === "application/csv"
  ) {
    return true;
  }
  return isSpreadsheetName(file.name || "");
}

/**
 * Convert an in-memory spreadsheet buffer to plain text for LLM extraction.
 * Never writes to disk. Truncates large books to stay within model context.
 */
export function spreadsheetBufferToText(
  buffer: ArrayBuffer,
  fileName = "workbook",
): string {
  const workbook = XLSX.read(Buffer.from(buffer), {
    type: "buffer",
    cellDates: true,
  });

  const parts: string[] = [`File: ${fileName}`];
  const sheetNames = workbook.SheetNames.slice(0, MAX_SHEETS);

  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const lines = csv.split("\n").slice(0, MAX_ROWS_PER_SHEET);
    parts.push(`\n--- Sheet: ${name} ---\n${lines.join("\n")}`);
  }

  if (workbook.SheetNames.length > MAX_SHEETS) {
    parts.push(
      `\n(… ${workbook.SheetNames.length - MAX_SHEETS} more sheet(s) omitted)`,
    );
  }

  let text = parts.join("\n");
  if (text.length > MAX_CHARS) {
    text =
      text.slice(0, MAX_CHARS) +
      "\n\n(… truncated for size — prefer a capital-gains-only export)";
  }
  return text;
}
