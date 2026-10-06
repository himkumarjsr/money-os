import { readFileSync } from "node:fs";
import path from "node:path";

let cached: { regular: string; bold: string } | null | undefined;

/** Noto Sans (includes ₹) for server-rendered PDFs; null if the font files are missing. */
export function loadPdfFonts(): { regular: string; bold: string } | null {
  if (cached !== undefined) return cached;
  try {
    const dir = path.join(process.cwd(), "lib", "fonts");
    cached = {
      regular: readFileSync(path.join(dir, "NotoSans-Regular.ttf")).toString(
        "base64",
      ),
      bold: readFileSync(path.join(dir, "NotoSans-Bold.ttf")).toString(
        "base64",
      ),
    };
  } catch (err) {
    console.error("[pdfFonts] Noto Sans not found; falling back to Helvetica", err);
    cached = null;
  }
  return cached;
}
