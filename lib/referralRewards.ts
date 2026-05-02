"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { useAuthStore } from "@/store/authStore";

/** Same key everywhere for pending `?ref=` attribution. */
export const REFERRAL_PENDING_STORAGE_KEY = "finkoin_pending_ref";
export const STORAGE_KEY = REFERRAL_PENDING_STORAGE_KEY;

export const FINKOIN_REFERRAL_SUCCESS_KEY = "finkoin_referral_success";

const referralApplyLocks = new Set<string>();

export function consumePendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(REFERRAL_PENDING_STORAGE_KEY);

    if (!stored) return null;

    let code: string | null = null;

    try {
      const parsed = JSON.parse(stored) as { code?: string; expires?: string };

      if (parsed.expires && new Date(parsed.expires) < new Date()) {
        localStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);
        return null;
      }

      code = parsed.code || null;
    } catch {
      code = stored;
    }

    localStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);

    console.log("Referral: consumed code", code);

    return code;
  } catch (err) {
    console.error("consumeReferral error:", err);
    return null;
  }
}

/**
 * Links new user to referrer from localStorage (`finkoin_pending_ref`) and grants FK bonuses.
 * Inserts `public.referrals` when RLS allows. Best-effort on failures.
 */
export async function applyPendingReferralRewards(supabase: SupabaseClient, newUserId: string): Promise<void> {
  console.log("applyPendingReferralRewards: called for user", newUserId);

  if (referralApplyLocks.has(newUserId)) return;
  referralApplyLocks.add(newUserId);

  try {
    const { data: selfPre } = await supabase.from("users").select("id, referred_by").eq("id", newUserId).maybeSingle();
    if (selfPre?.referred_by) {
      console.log("Referral already processed (referred_by set)");
      return;
    }

    const refCode = consumePendingReferralCode();
    console.log("applyPendingReferralRewards: code=", refCode);

    if (!refCode) {
      console.log("applyPendingReferralRewards: no pending referral code");
      return;
    }

    const { data: referrer } = await supabase.from("users").select("id").eq("referral_code", refCode).maybeSingle();
    console.log("applyPendingReferralRewards: referrer found", referrer?.id);

    if (!referrer?.id || referrer.id === newUserId) return;

    await supabase.from("users").update({ referred_by: referrer.id }).eq("id", newUserId);

    const bump = async (userId: string, amount: number) => {
      const { data: row } = await supabase
        .from("gamification")
        .select("fk_balance, total_earned")
        .eq("user_id", userId)
        .maybeSingle();
      if (!row) return;
      await supabase
        .from("gamification")
        .update({
          fk_balance: Number(row.fk_balance ?? 0) + amount,
          total_earned: Number(row.total_earned ?? 0) + amount,
        })
        .eq("user_id", userId);
    };

    await bump(referrer.id, 200);
    await bump(newUserId, 100);

    console.log("applyPendingReferralRewards: FK awarded to both users");

    const { error: refErr } = await supabase.from("referrals").insert({
      referrer_user_id: referrer.id,
      referred_user_id: newUserId,
    });
    if (refErr) console.warn("referrals insert:", refErr.message);

    try {
      localStorage.setItem(
        FINKOIN_REFERRAL_SUCCESS_KEY,
        JSON.stringify({
          fkAwarded: 100,
          showUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }

    await useAuthStore.getState().refreshUser();
  } catch (e) {
    console.warn("applyPendingReferralRewards:", e);
  } finally {
    referralApplyLocks.delete(newUserId);
  }
}
