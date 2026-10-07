import type { AnalyseFormValues, FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import type { FinkoinAIPlan } from "@/lib/finkoinAiPlan";
import { isValidFinkoinAIPlan } from "@/lib/finkoinAiPlan";
import { supabase } from "@/lib/supabaseClient";

/**
 * Bump when the payload shape changes. 1.1 adds per-child goal targets,
 * prompted marriage/baby goals and dismissedGoals (all optional, so 1.0
 * payloads still read fine).
 */
export const ANALYSE_SNAPSHOT_VERSION = "1.1";

/** Stored inside `user_analyse_snapshots.payload` (current shape). */
export type UserAnalyseSnapshotPayload = {
  profile: FinancialProfile;
  result: AnalysisResult;
  submittedAt: string;
  version: string;
  aiPlan?: FinkoinAIPlan | null;
  analysis?: Partial<AnalyseFormValues>;
};

export type FetchedUserAnalyseSnapshot = {
  lastSubmission: FinancialProfile;
  result: AnalysisResult | null;
  analysis: Partial<AnalyseFormValues> | null;
  aiPlan: FinkoinAIPlan | null;
  submittedAt: string | null;
};

function parseAiPlan(raw: unknown): FinkoinAIPlan | null {
  if (raw && isValidFinkoinAIPlan(raw)) return raw;
  return null;
}

/**
 * Writes are queued per user and reads wait for queued writes, so a read that
 * starts right after a submit (e.g. the result page's loan sync) never sees
 * the previous submission and writes it back over the new one.
 */
const pendingWrites = new Map<string, Promise<unknown>>();

function enqueueWrite<T>(userId: string, write: () => Promise<T>): Promise<T> {
  const prev = pendingWrites.get(userId) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(write);
  pendingWrites.set(userId, next);
  void next
    .finally(() => {
      if (pendingWrites.get(userId) === next) pendingWrites.delete(userId);
    })
    .catch(() => undefined);
  return next;
}

async function writePayload(
  userId: string,
  payload: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase not configured") };
  }
  const { error } = await supabase.from("user_analyse_snapshots").upsert(
    {
      user_id: userId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return { error: error ? new Error(error.message) : null };
}

async function readPayload(
  userId: string,
): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_analyse_snapshots")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.payload) return null;
  return data.payload as Record<string, unknown>;
}

/**
 * One row per user: full profile + engine result (+ optional AI plan) after final submit only.
 */
export function upsertUserAnalyseSnapshot(
  userId: string,
  payload: UserAnalyseSnapshotPayload,
): Promise<{ error: Error | null }> {
  return enqueueWrite(userId, () =>
    writePayload(userId, payload as unknown as Record<string, unknown>),
  );
}

/** Attach an AI plan to whatever snapshot is stored now, without touching the profile. */
export function saveUserAnalyseSnapshotAiPlan(
  userId: string,
  aiPlan: FinkoinAIPlan | null,
): Promise<{ error: Error | null }> {
  return enqueueWrite(userId, async () => {
    const raw = await readPayload(userId);
    if (!raw) return { error: null };
    return writePayload(userId, { ...raw, aiPlan });
  });
}

/** Supports legacy payloads that used `lastSubmission` instead of `profile`. */
export async function fetchUserAnalyseSnapshot(
  userId: string,
): Promise<FetchedUserAnalyseSnapshot | null> {
  await pendingWrites.get(userId)?.catch(() => undefined);
  const raw = await readPayload(userId);
  if (!raw) return null;

  const lastSubmission = (raw.profile ?? raw.lastSubmission) as FinancialProfile | undefined;
  if (!lastSubmission) return null;

  const result = (raw.result ?? null) as AnalysisResult | null;
  const analysis = (raw.analysis ?? null) as Partial<AnalyseFormValues> | null;
  const aiPlan = parseAiPlan(raw.aiPlan);

  const submittedAt =
    typeof raw.submittedAt === "string" ? raw.submittedAt : null;

  return { lastSubmission, result, analysis, aiPlan, submittedAt };
}
