import {
  getAuthedUser,
  rateLimit,
  tooManyRequests,
  unauthorized,
} from "@/lib/apiGuard";
import { encrypt, hashData } from "@/lib/encryption";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  buildExtractionPrompt,
  buildTdsMismatchWarning,
  findMissingCriticalFields,
  mergeExtracted,
  normalizeExtractedAliases,
  parseExtractionJson,
  type ExtractedTaxData,
} from "@/lib/taxExtract";
import {
  isSpreadsheetFile,
  spreadsheetBufferToText,
} from "@/lib/taxSpreadsheet";
import { pdfBufferToText } from "@/lib/pdfText";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Text-only model (Form 16 PDF text, spreadsheet CSV). */
const TEXT_MODEL =
  process.env.GROQ_TAX_TEXT_MODEL?.trim() || "openai/gpt-oss-120b";
/**
 * Vision model for JPG/PNG — only used when GROQ_TAX_VISION_MODEL is set.
 * (Groq retired Llama 4 Scout in Jul 2026; no default vision model.)
 */
const VISION_MODEL = process.env.GROQ_TAX_VISION_MODEL?.trim() || "";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 90_000;

function isImageFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return (
    t.startsWith("image/") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".png") ||
    n.endsWith(".webp")
  );
}

function isPdfFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return t === "application/pdf" || n.endsWith(".pdf");
}

function isAllowedUpload(file: File): boolean {
  return isSpreadsheetFile(file) || isPdfFile(file) || isImageFile(file);
}

async function groqExtractJson(
  groq: Groq,
  opts: {
    model: string;
    prompt: string;
    /** Optional image data-URL for vision models */
    imageDataUrl?: string;
    maxTokens?: number;
  },
): Promise<string> {
  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: opts.prompt }];

  if (opts.imageDataUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: opts.imageDataUrl },
    });
  }

  const completion = await groq.chat.completions.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2500,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You extract Indian tax document fields. Return ONLY valid JSON. No markdown fences. No commentary.",
      },
      {
        role: "user",
        content: opts.imageDataUrl ? userContent : opts.prompt,
      },
    ],
  });

  return completion.choices[0]?.message?.content || "{}";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser(req);
    if (!user) return unauthorized();

    const limit = rateLimit(`tax-extract:${user.id}`, 10, 60 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (!groqKey) {
      return NextResponse.json(
        { error: "Tax document extraction is not configured (GROQ_API_KEY)" },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files");
    const documentTypes = formData.getAll("types");

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 documents per request" },
        { status: 400 },
      );
    }

    const groq = new Groq({ apiKey: groqKey });
    let extractedData: ExtractedTaxData = {};
    const warnings: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (!(entry instanceof File)) {
        warnings.push("Skipped non-file upload entry");
        continue;
      }
      const file = entry;
      let docType = String(documentTypes[i] || "unknown");

      if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
        warnings.push(`${file.name || "file"}: size must be 1 byte–10MB`);
        continue;
      }
      if (!isAllowedUpload(file)) {
        warnings.push(
          `${file.name}: unsupported type ${file.type || "(unknown)"}`,
        );
        continue;
      }

      const prompt = buildExtractionPrompt(docType);
      const buffer = await file.arrayBuffer();

      try {
        let raw = "{}";

        if (isSpreadsheetFile(file)) {
          if (docType === "unknown" || docType === "form16") {
            docType = "capital_gains";
          }
          const sheetText = spreadsheetBufferToText(
            buffer,
            file.name || "workbook",
          );
          raw = await groqExtractJson(groq, {
            model: TEXT_MODEL,
            prompt: `${buildExtractionPrompt(docType)}\n\nSpreadsheet contents (CSV per sheet):\n\n${sheetText.slice(0, MAX_TEXT_CHARS)}`,
          });
        } else if (isPdfFile(file)) {
          const pdfText = await pdfBufferToText(buffer);
          if (pdfText.length < 40) {
            warnings.push(
              `${file.name}: little/no text in PDF (likely a scan). Re-upload as JPG/PNG for OCR.`,
            );
            continue;
          }
          raw = await groqExtractJson(groq, {
            model: TEXT_MODEL,
            prompt: `${prompt}\n\nPDF text content:\n\n${pdfText.slice(0, MAX_TEXT_CHARS)}`,
          });
        } else if (isImageFile(file)) {
          // Groq retired Llama 4 Scout (vision) in Jul 2026. Only attempt
          // multimodal when an explicit vision model is configured.
          const visionConfigured = Boolean(
            process.env.GROQ_TAX_VISION_MODEL?.trim(),
          );
          if (!visionConfigured) {
            warnings.push(
              `${file.name}: image OCR is unavailable (set GROQ_TAX_VISION_MODEL when Groq offers vision again). Use a text PDF or .xlsx.`,
            );
            continue;
          }
          const mime =
            file.type && file.type.startsWith("image/")
              ? file.type
              : "image/jpeg";
          const base64 = Buffer.from(buffer).toString("base64");
          const dataUrl = `data:${mime};base64,${base64}`;
          raw = await groqExtractJson(groq, {
            model: VISION_MODEL,
            prompt,
            imageDataUrl: dataUrl,
          });
        }

        try {
          const extracted = parseExtractionJson(raw);
          extractedData = mergeExtracted(extractedData, extracted);
        } catch {
          warnings.push(`Could not parse ${docType} from ${file.name}`);
        }
      } catch (fileErr: unknown) {
        const msg =
          fileErr instanceof Error ? fileErr.message : "processing failed";
        console.error("tax extract file error:", file.name, msg);
        warnings.push(`${file.name}: ${msg}`);
      }
      // buffers go out of scope — never logged / never stored
    }

    extractedData = normalizeExtractedAliases(extractedData);
    const missingFields = findMissingCriticalFields(extractedData);
    const tdsWarn = buildTdsMismatchWarning(extractedData);
    if (tdsWarn) warnings.push(tdsWarn);

    try {
      const encrypted = encrypt(extractedData);
      const hash = hashData(extractedData);
      // Admin client: works when auth was via Bearer (no cookie session for RLS).
      const { error } = await getSupabaseAdmin()
        .from("user_tax_extract")
        .upsert(
          {
            user_id: user.id,
            encrypted_data: encrypted.encryptedData,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            encryption_version: encrypted.version,
            data_hash: hash,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) {
        console.error("user_tax_extract upsert:", error.message);
        warnings.push(
          "Numbers extracted but encrypted save failed — run migration 038.",
        );
      }
    } catch (encErr) {
      console.error(
        "tax extract encrypt/save:",
        encErr instanceof Error ? encErr.message : "encrypt failed",
      );
      warnings.push(
        "Numbers extracted but could not encrypt/save (check ENCRYPTION_KEY).",
      );
    }

    return NextResponse.json({
      success: true,
      extracted: extractedData,
      missingFields,
      warnings,
      message:
        "Documents read and discarded. Only numbers extracted and encrypted.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    console.error("Tax extract error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
