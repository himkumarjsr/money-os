/**
 * Fix Plan AI cache backed by `syncKv` (in-memory, mirrored to AsyncStorage) so
 * the API stays synchronous like web's localStorage. Logic lives in lib/aiPlanCache.ts.
 * Callers that run right after app start should `await hydrateSyncKv()` first
 * so a plan cached in an earlier session is visible.
 */
import { createAiPlanCache } from "@/lib/aiPlanCache";
import { syncKv } from "@/lib/syncKv";

export {
  AI_CACHE_MAX_ENTRIES,
  FIX_PLAN_RATE_LIMIT_MESSAGE,
  FIX_PLAN_REFRESH_UP_TO_DATE,
  enginePlanFingerprint,
  hashProfile,
  isCachedAiStale,
  type CachedPlan,
} from "@/lib/aiPlanCache";

const cache = createAiPlanCache(() => syncKv);

export const {
  getCachedPlan,
  setCachedPlan,
  clearCache,
  tryStartForcedRefresh,
} = cache;

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
