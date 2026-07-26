/**
 * Extract text from a PDF buffer using pdf-parse v1.
 * Loaded via a runtime require so Next.js webpack never bundles pdf.js
 * (static/ESM imports of pdf-parse crash the tax extract route).
 */
type PdfParseFn = (data: Buffer) => Promise<{ text?: string }>;

function loadPdfParse(): PdfParseFn {
  // Function wrapper defeats webpack's static require rewrite.

  const nodeRequire = Function("return require")() as NodeRequire;
  return nodeRequire("pdf-parse/lib/pdf-parse.js") as PdfParseFn;
}

export async function pdfBufferToText(buffer: ArrayBuffer): Promise<string> {
  const pdfParse = loadPdfParse();
  const result = await pdfParse(Buffer.from(buffer));
  return (result?.text || "").trim();
}
