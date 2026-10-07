import { NextResponse } from "next/server";
import { rateLimit, tooManyRequests, unauthorized } from "@/lib/apiGuard";
import { buildFixPlanPdfData } from "@/lib/fixPlanPdfData";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { buildFixPlanPdf } from "@/lib/generatePDF";
import { loanDrift, type LoanDriftItem } from "@/lib/loanObligationSync";
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

function validIsoDate(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length > 40) return undefined;
  const t = Date.parse(v);
  return Number.isFinite(t) && t <= Date.now() + 86_400_000
    ? new Date(t).toISOString()
    : undefined;
}

function metaName(meta: Record<string, unknown> | undefined): string | undefined {
  for (const key of ["name", "full_name"]) {
    const v = meta?.[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Server-rendered Fix Plan PDF for the web download (cookie auth) and the native app (Bearer). */
export async function POST(req: Request) {
  let userId: string | null = null;
  let userName: string | undefined;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null =
    null;
  try {
    supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (user) {
      let rowName: string | undefined;
      try {
        const { data: row } = await supabase
          .from("users")
          .select("name")
          .eq("id", user.id)
          .maybeSingle();
        if (typeof row?.name === "string" && row.name.trim()) {
          rowName = row.name.trim();
        }
      } catch {
        rowName = undefined;
      }
      userName =
        rowName || metaName(user.user_metadata) || user.email?.split("@")[0];
    }
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

  let drift: LoanDriftItem[] = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from("financial_obligations")
        .select("id, title, category, amount, due_day, is_active")
        .eq("user_id", userId)
        .eq("category", "loan_emi");
      drift = loanDrift(
        profile as unknown as FinancialProfile,
        ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
          id: String(r.id),
          title: String(r.title ?? ""),
          category: String(r.category ?? ""),
          amount: Number(r.amount ?? 0),
          due_day: r.due_day == null ? null : Number(r.due_day),
          is_active: r.is_active !== false,
        })),
      );
    } catch {
      drift = [];
    }
  }

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
        userName,
        dataAsOf: validIsoDate(body.dataAsOf),
        loanDrift: drift,
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
