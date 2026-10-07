import type { AnalyseFormValues, FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import type { FinkoinAIPlan } from "@/lib/finkoinAiPlan";
import { isValidFinkoinAIPlan } from "@/lib/finkoinAiPlan";
import { supabase } from "@/lib/supabaseClient";

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
 * One row per user: full profile + engine result (+ optional AI plan) after final submit only.
 */
export async function upsertUserAnalyseSnapshot(
  userId: string,
  payload: UserAnalyseSnapshotPayload,
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error("Supabase not configured") };
  }
  const { error } = await supabase.from("user_analyse_snapshots").upsert(
    {
      user_id: userId,
      payload: payload as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return { error: error ? new Error(error.message) : null };
}

/** Supports legacy payloads that used `lastSubmission` instead of `profile`. */
export async function fetchUserAnalyseSnapshot(
  userId: string,
): Promise<FetchedUserAnalyseSnapshot | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_analyse_snapshots")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.payload) return null;

  const raw = data.payload as Record<string, unknown>;
  const lastSubmission = (raw.profile ?? raw.lastSubmission) as FinancialProfile | undefined;
  if (!lastSubmission) return null;

  const result = (raw.result ?? null) as AnalysisResult | null;
  const analysis = (raw.analysis ?? null) as Partial<AnalyseFormValues> | null;
  const aiPlan = parseAiPlan(raw.aiPlan);

  const submittedAt =
    typeof raw.submittedAt === "string" ? raw.submittedAt : null;

  return { lastSubmission, result, analysis, aiPlan, submittedAt };
}
