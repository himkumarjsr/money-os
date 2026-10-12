/**
 * Pending referral capture, mirroring web `lib/referralRewards.ts`.
 * `?ref=` from a deep link is saved for 7 days and applied after sign-up or
 * the first login (the server links both users; FK is paid after the first
 * expense).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { siteBase } from "@/lib/googleAuth";

export const REFERRAL_PENDING_STORAGE_KEY = "finkoin_pending_ref";

const applyLocks = new Set<string>();

export async function savePendingReferral(
  raw: string | null | undefined,
): Promise<void> {
  const code = raw?.trim().toUpperCase();
  if (!code || code.length > 32) return;
  try {
    await AsyncStorage.setItem(
      REFERRAL_PENDING_STORAGE_KEY,
      JSON.stringify({
        code,
        savedAt: new Date().toISOString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export async function peekPendingReferralCode(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(REFERRAL_PENDING_STORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as { code?: string; expires?: string };
      if (parsed.expires && new Date(parsed.expires) < new Date()) {
        await AsyncStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);
        return null;
      }
      return parsed.code?.trim() || null;
    } catch {
      return stored.trim() || null;
    }
  } catch {
    return null;
  }
}

/** Link the signed-in user to the referrer; keeps the code if it fails. */
export async function applyPendingReferral(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const token = session?.access_token;
    if (!userId || !token || applyLocks.has(userId)) return;
    applyLocks.add(userId);
    try {
      const code = await peekPendingReferralCode();
      if (!code) return;
      const res = await fetch(`${siteBase()}/api/referrals/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return;
      await AsyncStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);
    } finally {
      applyLocks.delete(userId);
    }
  } catch {
    /* best effort */
  }
}
