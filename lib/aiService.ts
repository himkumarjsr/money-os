import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import {
  formatAiRateLimitNotice,
  formatAiTimeoutNotice,
  parseGroqRetryInText,
} from "@/lib/aiProviderMessages";
import {
  buildFallbackFinkoinPlan,
  isValidFinkoinAIPlan,
  type FinkoinAIPlan,
} from "@/lib/finkoinAiPlan";

export type { FinkoinAIPlan };
/** @deprecated Use FinkoinAIPlan — kept for imports that still say AIFixPlan */
export type AIFixPlan = FinkoinAIPlan;

export type AiCalculatedNumbers = {
  income?: number;
  monthlySurplus?: number;
  totalYearlyPremiums?: number;
  totalLiquidAssets?: number;
  weightedEmergencyCorpus?: number;
};

export type GetAIFixPlanResult = {
  plan: FinkoinAIPlan;
  /** Shown when AI was skipped (rate limit, timeout, or error). */
  notice: string | null;
  calculatedNumbers?: AiCalculatedNumbers;
};

export function generateFallbackPlan(profile: unknown, analysis: unknown): FinkoinAIPlan {
  return buildFallbackFinkoinPlan(profile as FinancialProfile, analysis as AnalysisResult);
}

function shouldLogAiClient(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_AI === "true";
}

const DEFAULT_AI_TIMEOUT_MS = 120_000;
const MIN_AI_TIMEOUT_MS = 10_000;

type ApiErrorJson = {
  error?: string;
  code?: string;
  retryIn?: string | null;
};

function pickCalculated(
  raw: Record<string, unknown> | undefined,
): AiCalculatedNumbers | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw.calculatedNumbers as Record<string, unknown> | undefined;
  if (!c) return undefined;
  return {
    income: typeof c.income === "number" ? c.income : Number(c.income) || undefined,
    monthlySurplus:
      typeof c.monthlySurplus === "number" ? c.monthlySurplus : Number(c.monthlySurplus) || undefined,
    totalYearlyPremiums:
      typeof c.totalYearlyPremiums === "number"
        ? c.totalYearlyPremiums
        : Number(c.totalYearlyPremiums) || undefined,
    totalLiquidAssets:
      typeof c.totalLiquidAssets === "number"
        ? c.totalLiquidAssets
        : Number(c.totalLiquidAssets) || undefined,
    weightedEmergencyCorpus:
      typeof c.weightedEmergencyCorpus === "number"
        ? c.weightedEmergencyCorpus
        : Number(c.weightedEmergencyCorpus) || undefined,
  };
}

/**
 * Calls Groq via `/api/ai/analyse` with the real profile + analysis result.
 * Falls back to {@link buildFallbackFinkoinPlan} on error, timeout, or invalid JSON.
 */
export async function getAIFixPlan(
  profile: FinancialProfile,
  analysis: AnalysisResult,
): Promise<GetAIFixPlanResult> {
  const fallback = buildFallbackFinkoinPlan(profile, analysis);

  const envParsed =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_AI_TIMEOUT_MS !== undefined
      ? Number(process.env.NEXT_PUBLIC_AI_TIMEOUT_MS)
      : NaN;
  const timeoutMs =
    Number.isFinite(envParsed) && envParsed >= MIN_AI_TIMEOUT_MS ? envParsed : DEFAULT_AI_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId =
    typeof window !== "undefined"
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    if (shouldLogAiClient()) {
      console.log("[getAIFixPlan] POST /api/ai/analyse", {
        profileKeys: profile ? Object.keys(profile) : [],
        issues: analysis?.issues?.length,
      });
    }

    const response = await fetch("/api/ai/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, analysis }),
      signal: controller.signal,
    });

    const rawText = await response.text().catch(() => "");
    let data: Record<string, unknown> = {};
    try {
      data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (shouldLogAiClient()) {
        console.warn("[getAIFixPlan] API error", response.status, rawText.slice(0, 500));
      } else {
        console.warn("AI API returned", response.status, "— using fallback plan");
      }

      const err = data as ApiErrorJson;
      let notice: string | null =
        "The AI service had a problem. You’re seeing a built‑in plan below.";
      if (response.status === 429 || err.code === "rate_limit_exceeded") {
        const hint =
          (typeof err.retryIn === "string" && err.retryIn) ||
          parseGroqRetryInText(err.error ?? "") ||
          parseGroqRetryInText(rawText);
        notice = formatAiRateLimitNotice(hint);
      }
      return { plan: fallback, notice, calculatedNumbers: pickCalculated(data) };
    }

    if (!data.plan || !isValidFinkoinAIPlan(data.plan)) {
      if (shouldLogAiClient()) {
        console.warn("[getAIFixPlan] invalid or missing plan", data);
      } else {
        console.warn("Invalid AI plan shape — using fallback", data.error);
      }
      return {
        plan: fallback,
        notice: "The AI answer wasn’t usable. You’re seeing a built‑in plan below.",
        calculatedNumbers: pickCalculated(data),
      };
    }

    if (shouldLogAiClient()) {
      const plan = data.plan as FinkoinAIPlan;
      console.log("[getAIFixPlan] plan OK", plan.oneLiner?.slice(0, 80));
    }

    return {
      plan: data.plan as FinkoinAIPlan,
      notice: null,
      calculatedNumbers: pickCalculated(data),
    };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (shouldLogAiClient()) console.warn("[getAIFixPlan] aborted (timeout)");
      return { plan: fallback, notice: formatAiTimeoutNotice(timeoutMs / 1000) };
    }
    console.error("getAIFixPlan error:", error);
    return {
      plan: fallback,
      notice: "We couldn’t reach the AI service. You’re seeing a built‑in plan below.",
    };
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}
