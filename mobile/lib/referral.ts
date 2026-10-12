/**
 * Native port of web lib/referralRewards.ts + components/ReferralCapture.tsx:
 * keep a `?ref=` code from a deep link until the user is signed in, then link
 * them to the referrer through the web API and show the success toast.
 */
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { siteBase } from "@/lib/splitApi";
import { syncKv } from "@/lib/syncKv";
import { useAuthStore } from "@/store/authStore";
import { useChromeStore } from "@/store/chromeStore";

export const REFERRAL_PENDING_KEY = "finkoin_pending_ref";
export const REFERRAL_SUCCESS_KEY = "finkoin_referral_success";

const applyLocks = new Set<string>();

/** Persist a `ref` query param from a URL (7-day TTL, upper-cased like web). */
export function captureReferralFromUrl(url: string | null | undefined): void {
  if (!url) return;
  try {
    const parsed = Linking.parse(url);
    const raw = parsed.queryParams?.ref;
    const ref = (Array.isArray(raw) ? raw[0] : raw)?.toString().trim();
    if (!ref) return;
    syncKv.setItem(
      REFERRAL_PENDING_KEY,
      JSON.stringify({
        code: ref.toUpperCase(),
        savedAt: new Date().toISOString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function peekPendingReferralCode(): string | null {
  const stored = syncKv.getItem(REFERRAL_PENDING_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { code?: string; expires?: string };
    if (parsed.expires && new Date(parsed.expires) < new Date()) {
      syncKv.removeItem(REFERRAL_PENDING_KEY);
      return null;
    }
    return parsed.code?.trim() || null;
  } catch {
    return stored.trim() || null;
  }
}

/** Links the signed-in user to the referrer; the server pays FK later. */
export async function applyPendingReferral(userId: string): Promise<void> {
  if (applyLocks.has(userId)) return;
  const code = peekPendingReferralCode();
  if (!code) return;
  applyLocks.add(userId);
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`${siteBase()}/api/referrals/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code }),
    });
    // Keep the code on a server error so the next sign-in retries.
    if (!res.ok) return;
    const result = (await res.json()) as {
      applied?: boolean;
      fkAwarded?: number;
    };
    syncKv.removeItem(REFERRAL_PENDING_KEY);
    if (!result.applied) return;
    syncKv.setItem(
      REFERRAL_SUCCESS_KEY,
      JSON.stringify({
        fkAwarded: result.fkAwarded ?? 0,
        showUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }),
    );
    showPendingReferralToast();
    void useAuthStore.getState().refreshUser?.();
  } catch {
    /* retry on next sign-in */
  } finally {
    applyLocks.delete(userId);
  }
}

/** Web ReferralSuccessToast: one-shot toast after a referral was applied. */
export function showPendingReferralToast(): void {
  const stored = syncKv.getItem(REFERRAL_SUCCESS_KEY);
  if (!stored) return;
  try {
    const data = JSON.parse(stored) as { fkAwarded?: number; showUntil?: string };
    if (data.showUntil && new Date(data.showUntil) > new Date()) {
      const fk = Number(data.fkAwarded ?? 0);
      useChromeStore
        .getState()
        .showToast(
          fk > 0
            ? `Referral bonus: +${fk} FK earned!`
            : "Referral applied: add your first expense to unlock 100 FK",
        );
    }
  } finally {
    syncKv.removeItem(REFERRAL_SUCCESS_KEY);
  }
}
