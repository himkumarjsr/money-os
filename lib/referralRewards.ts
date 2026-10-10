"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";

/** Same key everywhere for pending `?ref=` attribution. */
export const REFERRAL_PENDING_STORAGE_KEY = "finkoin_pending_ref";
export const STORAGE_KEY = REFERRAL_PENDING_STORAGE_KEY;

export const FINKOIN_REFERRAL_SUCCESS_KEY = "finkoin_referral_success";

const referralApplyLocks = new Set<string>();

/** Append current page `?ref=` to a `/login...` href so referral survives client navigations. */
export function loginHrefPreserveRef(href: string): string {
  if (typeof window === "undefined") return href;
  const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
  if (!ref) return href;
  try {
    const u = new URL(href, window.location.origin);
    if (!u.searchParams.get("ref")) {
      u.searchParams.set("ref", ref);
    }
    return `${u.pathname}${u.search}`;
  } catch {
    const sep = href.includes("?") ? "&" : "?";
    return `${href}${sep}ref=${encodeURIComponent(ref)}`;
  }
}

/**
 * Read pending referral code without removing it (safe if signup fails before apply succeeds).
 */
export function peekPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY);
    console.log("consumeReferral: stored =", stored);

    if (!stored) {
      console.log("consumeReferral: nothing in localStorage");
      return null;
    }

    let code: string | null = null;

    try {
      const parsed = JSON.parse(stored) as { code?: string; expires?: string };
      console.log("consumeReferral: parsed =", parsed);

      if (parsed.expires && new Date(parsed.expires) < new Date()) {
        console.log("consumeReferral: expired");
        localStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);
        return null;
      }

      code = parsed.code?.trim() || null;
    } catch {
      code = stored.trim() || null;
    }

    return code;
  } catch (err) {
    console.error("consumeReferral error:", err);
    return null;
  }
}

export function consumePendingReferralCode(): string | null {
  const code = peekPendingReferralCode();
  if (code) {
    try {
      localStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);
      console.log("consumeReferral: consumed =", code);
    } catch {
      /* ignore */
    }
  }
  return code;
}

export function clearPendingReferralStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function clearPendingAfterSuccess(): void {
  clearPendingReferralStorage();
}

/**
 * Links the new user to the referrer from localStorage (`finkoin_pending_ref`).
 * The server records the referral and pays both FK bonuses once.
 */
export async function applyPendingReferralRewards(supabase: SupabaseClient, newUserId: string): Promise<void> {
  if (referralApplyLocks.has(newUserId)) return;
  referralApplyLocks.add(newUserId);

  try {
    const code = peekPendingReferralCode();
    if (!code) return;

    // Use the caller's client: right after sign-in its session is the fresh one.
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await apiFetch("/api/referrals/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      // Keep the code so the next sign-in retries.
      console.error("applyReferral: server error", res.status);
      return;
    }
    const result = (await res.json()) as { applied?: boolean; fkAwarded?: number; reason?: string };
    clearPendingAfterSuccess();
    if (!result.applied) {
      console.log("applyReferral: not applied", result.reason);
      return;
    }

    try {
      localStorage.setItem(
        FINKOIN_REFERRAL_SUCCESS_KEY,
        JSON.stringify({
          fkAwarded: result.fkAwarded ?? 100,
          showUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }

    useGamificationStore.setState({ lastFetched: null });
    await useGamificationStore.getState().fetchGamification(newUserId);
    await useAuthStore.getState().refreshUser();
  } catch (err) {
    console.error("applyReferral: ERROR", err);
  } finally {
    referralApplyLocks.delete(newUserId);
  }
}
