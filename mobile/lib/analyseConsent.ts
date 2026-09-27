import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { appStorage } from "@/lib/storage";

export function analyseConsentStorageKey(userId: string) {
  return `finkoin_analyse_consent_v2_${userId}`;
}

/** True if local cache or `users.data_consent_given` says consent was given. */
export async function hasAnalyseConsent(userId: string): Promise<boolean> {
  try {
    const cached = await appStorage.getItem(analyseConsentStorageKey(userId));
    if (cached === "true") return true;
  } catch {
    /* ignore */
  }

  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("users")
      .select("data_consent_given")
      .eq("id", userId)
      .maybeSingle();
    if (data?.data_consent_given) {
      await appStorage.setItem(analyseConsentStorageKey(userId), "true");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function acceptAnalyseConsent(userId: string): Promise<void> {
  await appStorage.setItem(analyseConsentStorageKey(userId), "true");
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("users")
      .update({
        data_consent_given: true,
        data_consent_at: new Date().toISOString(),
        data_consent_version: "v2",
      })
      .eq("id", userId);
    if (error) console.warn("users data_consent update:", error.message);
  } catch (e) {
    console.warn("users data_consent update:", e);
  }
}
