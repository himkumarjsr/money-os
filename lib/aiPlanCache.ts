/**
 * Fix Plan AI cache shared by web (localStorage) and mobile (syncKv).
 * Holds up to AI_CACHE_MAX_ENTRIES plans keyed by profile hash, most recently used first.
 */

export const AI_CACHE_KEY = "finkoin_ai_cache";
export const AI_CACHE_MAX_AGE_DAYS = 30;
export const AI_CACHE_MAX_ENTRIES = 5;
const FORCED_REFRESH_KEY = "finkoin_ai_forced_refresh_at";
/** Manual refreshes are limited client-side so the server's 10/hour AI limit is not burned. */
export const FORCED_REFRESH_MIN_INTERVAL_MS = 2 * 60 * 1000;

export const FIX_PLAN_REFRESH_UP_TO_DATE = "Your plan is already up to date.";
export const FIX_PLAN_RATE_LIMIT_MESSAGE =
  "You've hit the refresh limit for now. Your current plan is still accurate — try again in about an hour.";

export interface CachedPlan {
  profileHash: string;
  aiPlan: any;
  projection: any;
  generatedAt: string;
  /** Fingerprint of engine priorities when this AI plan was generated. */
  engineFingerprint?: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
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
    (g: {
      goalType?: string;
      goalId?: string;
      targetAmount?: number;
      monthlyAllocated?: number;
      allocation?: { slices?: Array<{ key?: string; pct?: number }> };
    }) => ({
      goalType: g.goalId ?? g.goalType,
      target: Math.round(Number(g.targetAmount || 0)),
      monthly: Math.round(Number(g.monthlyAllocated || 0)),
      split: (g.allocation?.slices || []).map((s) => `${s.key}:${s.pct}`),
    }),
  );
  return djb2Hash(
    stableStringify({
      v: 3,
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

function isFresh(entry: CachedPlan, now: number): boolean {
  const ageDays =
    (now - new Date(entry.generatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Number.isFinite(ageDays) && ageDays <= AI_CACHE_MAX_AGE_DAYS;
}

function isEntry(value: unknown): value is CachedPlan {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as CachedPlan).profileHash === "string"
  );
}

/** Reads both the current list format and the old single-plan format. */
export function parseCacheEntries(raw: string | null): CachedPlan[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.entries)) return parsed.entries.filter(isEntry);
    return isEntry(parsed) ? [parsed] : [];
  } catch {
    return [];
  }
}

export function canForceRefresh(
  lastForcedAt: number | null,
  now: number = Date.now(),
): boolean {
  return (
    lastForcedAt === null || now - lastForcedAt >= FORCED_REFRESH_MIN_INTERVAL_MS
  );
}

export function createAiPlanCache(getStorage: () => KeyValueStorage | null) {
  function readEntries(): CachedPlan[] {
    try {
      return parseCacheEntries(getStorage()?.getItem(AI_CACHE_KEY) ?? null);
    } catch {
      return [];
    }
  }

  function writeEntries(entries: CachedPlan[]) {
    try {
      getStorage()?.setItem(
        AI_CACHE_KEY,
        JSON.stringify({ v: 2, entries: entries.slice(0, AI_CACHE_MAX_ENTRIES) }),
      );
    } catch {
      // ignore full / unavailable storage
    }
  }

  function getCachedPlan(profileHash: string): CachedPlan | null {
    const now = Date.now();
    const entries = readEntries();
    const hit = entries.find((e) => e.profileHash === profileHash);
    if (!hit || !isFresh(hit, now)) return null;
    if (entries[0] !== hit) {
      writeEntries([hit, ...entries.filter((e) => e !== hit)]);
    }
    return hit;
  }

  function setCachedPlan(
    profileHash: string,
    aiPlan: any,
    projection: any,
    engineFingerprint?: string,
  ): void {
    const now = Date.now();
    const entry: CachedPlan = {
      profileHash,
      aiPlan,
      projection,
      generatedAt: new Date(now).toISOString(),
      engineFingerprint,
    };
    const rest = readEntries().filter(
      (e) => e.profileHash !== profileHash && isFresh(e, now),
    );
    writeEntries([entry, ...rest]);
  }

  function clearCache(): void {
    try {
      getStorage()?.removeItem(AI_CACHE_KEY);
    } catch {
      // ignore
    }
  }

  function lastForcedRefreshAt(): number | null {
    try {
      const n = Number(getStorage()?.getItem(FORCED_REFRESH_KEY));
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  /** True (and records the attempt) when a manual refresh may hit the API now. */
  function tryStartForcedRefresh(now: number = Date.now()): boolean {
    if (!canForceRefresh(lastForcedRefreshAt(), now)) return false;
    try {
      getStorage()?.setItem(FORCED_REFRESH_KEY, String(now));
    } catch {
      // ignore
    }
    return true;
  }

  return {
    getCachedPlan,
    setCachedPlan,
    clearCache,
    lastForcedRefreshAt,
    tryStartForcedRefresh,
  };
}
