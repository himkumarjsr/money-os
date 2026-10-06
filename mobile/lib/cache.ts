/**
 * Port of web lib/cache.ts — single-slot AI fix-plan cache.
 * Same key, TTL and hashes as web; `localStorage` is replaced by `syncKv`
 * (in-memory, mirrored to AsyncStorage) so the API stays synchronous.
 * Callers that run right after app start should `await hydrateSyncKv()` first
 * so a plan cached in an earlier session is visible.
 */
import { syncKv } from "@/lib/syncKv";

const CACHE_KEY = "finkoin_ai_cache";
const CACHE_MAX_AGE_DAYS = 30;

export interface CachedPlan {
  profileHash: string;
  aiPlan: any;
  projection: any;
  generatedAt: string;
  /** Fingerprint of engine priorities when this AI plan was generated. */
  engineFingerprint?: string;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function djb2Hash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Hash of analyse inputs. Any material profile/analysis change must change this
 * so the fix-plan AI cache misses and regenerates.
 */
export function hashProfile(profile: any, analysis?: any): string {
  const relevant = {
    v: 3,
    profile: profile ?? {},
    analysis: analysis
      ? {
          overallScore: analysis.overallScore,
          scores: analysis.scores,
          termInsuranceNeeded: analysis.termInsuranceNeeded,
          realEmergencyFundTotal: analysis.realEmergencyFund?.total,
          issueCodes: (analysis.issues || []).map(
            (i: { code?: string }) => i.code,
          ),
        }
      : undefined,
  };
  return djb2Hash(stableStringify(relevant));
}

/** Compact fingerprint of engine gaps — detects stale AI text after rule/engine fixes. */
export function enginePlanFingerprint(plan: any): string {
  const rows = (plan?.priorities || []).map(
    (p: {
      id?: string;
      gap?: number;
      monthlyContribution?: number;
      status?: string;
      title?: string;
    }) => ({
      id: p.id,
      title: p.title,
      gap: Math.round(Number(p.gap || 0)),
      monthly: Math.round(Number(p.monthlyContribution || 0)),
      status: p.status,
    }),
  );
  const goals = (plan?.goals || []).map(
    (g: { goalType?: string; targetAmount?: number }) => ({
      goalType: g.goalType,
      target: Math.round(Number(g.targetAmount || 0)),
    }),
  );
  return djb2Hash(
    stableStringify({
      v: 1,
      surplus: Math.round(Number(plan?.monthlySurplus || 0)),
      rows,
      goals,
    }),
  );
}

/** True when cached AI was built for a different engine outcome (must re-call AI). */
export function isCachedAiStale(
  cached: CachedPlan | null,
  currentFingerprint: string,
): boolean {
  if (!cached) return true;
  if (!cached.engineFingerprint) return true;
  return cached.engineFingerprint !== currentFingerprint;
}

export function getCachedPlan(profileHash: string): CachedPlan | null {
  try {
    const stored = syncKv.getItem(CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored) as CachedPlan;
    if (cached.profileHash !== profileHash) return null;

    const generatedAt = new Date(cached.generatedAt);
    const daysSince =
      (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > CACHE_MAX_AGE_DAYS) return null;

    return cached;
  } catch {
    return null;
  }
}

export function setCachedPlan(
  profileHash: string,
  aiPlan: any,
  projection: any,
  engineFingerprint?: string,
): void {
  try {
    const cache: CachedPlan = {
      profileHash,
      aiPlan,
      projection,
      generatedAt: new Date().toISOString(),
      engineFingerprint,
    };
    syncKv.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage failures
  }
}

export function clearCache(): void {
  syncKv.removeItem(CACHE_KEY);
}

export async function saveToSupabase(
  userId: string,
  supabase: any,
  profileHash: string,
  profile: any,
  analysisResult: any,
  aiPlan: any,
): Promise<void> {
  if (!supabase || !userId) return;
  try {
    await supabase.from("user_analysis").upsert(
      {
        user_id: userId,
        profile_hash: profileHash,
        profile,
        analysis_result: analysisResult,
        ai_fix_plan: aiPlan,
        ai_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch (err) {
    console.warn("Supabase save failed:", err);
  }
}

export async function loadFromSupabase(
  userId: string,
  supabase: any,
): Promise<{
  profileHash: string;
  profile: any;
  analysisResult: any;
  aiPlan: any;
} | null> {
  if (!supabase || !userId) return null;
  try {
    const { data } = await supabase
      .from("user_analysis")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (!data) return null;
    return {
      profileHash: data.profile_hash,
      profile: data.profile,
      analysisResult: data.analysis_result,
      aiPlan: data.ai_fix_plan,
    };
  } catch {
    return null;
  }
}
