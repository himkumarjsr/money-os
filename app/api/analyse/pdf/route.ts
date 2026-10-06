import { NextResponse } from "next/server";
import { rateLimit, tooManyRequests, unauthorized } from "@/lib/apiGuard";
import { buildFixPlanPdfData } from "@/lib/fixPlanPdfData";
import { buildFixPlanPdf } from "@/lib/generatePDF";
import { loadPdfFonts } from "@/lib/pdfFonts.server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validTimeZone(tz: unknown): string | undefined {
  if (typeof tz !== "string" || !tz || tz.length > 64) return undefined;
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

/** Server-rendered Fix Plan PDF for the web download (cookie auth) and the native app (Bearer). */
export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return unauthorized();

  const rl = rateLimit(`analyse-pdf:${userId}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return badRequest("Payload too large.");

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return badRequest("Payload too large.");
    body = JSON.parse(raw);
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (!isPlainObject(body)) return badRequest("Invalid request body.");

  const { profile, result, priorityPlan, explanations } = body;
  if (!isPlainObject(profile)) return badRequest("Missing profile.");
  if (!isPlainObject(result)) return badRequest("Missing analysis result.");
  if (!isPlainObject(priorityPlan) || !Array.isArray(priorityPlan.priorities)) {
    return badRequest("Missing priority plan.");
  }
  if (explanations != null && !isPlainObject(explanations)) {
    return badRequest("Invalid explanations.");
  }
  const expl = explanations ?? {};

  try {
    const optimizerData = buildFixPlanPdfData(priorityPlan, expl);
    const { doc, fileName } = buildFixPlanPdf(
      profile,
      result,
      priorityPlan,
      expl,
      optimizerData,
      {
        timeZone: validTimeZone(body.timeZone),
        fonts: loadPdfFonts() ?? undefined,
      },
    );
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[analyse/pdf] build failed", err);
    return NextResponse.json(
      { error: "Could not generate the PDF. Please try again." },
      { status: 500 },
    );
  }
}
