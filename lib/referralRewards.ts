"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";

/** Same key everywhere for pending `?ref=` attribution. */
export const REFERRAL_PENDING_STORAGE_KEY = "finkoin_pending_ref";
export const STORAGE_KEY = REFERRAL_PENDING_STORAGE_KEY;

export const FINKOIN_REFERRAL_SUCCESS_KEY = "finkoin_referral_success";

const referralApplyLocks = new Set<string>();

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
 * Links new user to referrer from localStorage (`finkoin_pending_ref`) and grants FK bonuses.
 * Uses `referrals` columns: referrer_id, referred_id, signed_up_at, tokens_awarded.
 */
export async function applyPendingReferralRewards(supabase: SupabaseClient, newUserId: string): Promise<void> {
  console.log("applyReferral: called for", newUserId);

  if (referralApplyLocks.has(newUserId)) return;
  referralApplyLocks.add(newUserId);

  try {
    const code = peekPendingReferralCode();
    console.log("applyReferral: code =", code);

    if (!code) {
      console.log("applyReferral: no code, skipping");
      return;
    }

    const { data: referrer, error: findErr } = await supabase
      .from("users")
      .select("id, name")
      .eq("referral_code", code.toUpperCase())
      .maybeSingle();

    console.log("applyReferral: referrer =", referrer, findErr);

    if (findErr || !referrer?.id) {
      console.log("applyReferral: referrer not found");
      return;
    }

    if (referrer.id === newUserId) {
      console.log("applyReferral: self referral, skip");
      return;
    }

    const { data: existing, error: existingErr } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_id", newUserId)
      .maybeSingle();

    if (existingErr) {
      console.warn("applyReferral: existing check error", existingErr);
    }

    if (existing) {
      console.log("applyReferral: already processed");
      clearPendingAfterSuccess();
      return;
    }

    const { error: insertErr } = await supabase.from("referrals").insert({
      referrer_id: referrer.id,
      referred_id: newUserId,
      signed_up_at: new Date().toISOString(),
      tokens_awarded: false,
    });

    if (insertErr) {
      console.error("applyReferral: insert error", insertErr);
      return;
    }

    console.log("applyReferral: referral recorded");
    clearPendingAfterSuccess();

    const bumpGamification = async (userId: string, delta: number) => {
      const { data: row } = await supabase
        .from("gamification")
        .select("fk_balance, total_earned, streak_days, badges")
        .eq("user_id", userId)
        .maybeSingle();

      const fk = (Number(row?.fk_balance) || 0) + delta;
      const total = (Number(row?.total_earned) || 0) + delta;

      const { error: upErr } = await supabase.from("gamification").upsert(
        {
          user_id: userId,
          fk_balance: fk,
          total_earned: total,
          streak_days: Number(row?.streak_days ?? 0),
          badges: Array.isArray(row?.badges) ? row.badges : [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (upErr) {
        throw upErr;
      }
    };

    await bumpGamification(referrer.id, 200);
    await bumpGamification(newUserId, 100);

    const { error: userUpFullErr } = await supabase
      .from("users")
      .update({
        referred_by: referrer.id,
        referral_reward_given: true,
      })
      .eq("id", newUserId);

    if (userUpFullErr) {
      console.warn("applyReferral: users update with referral_reward_given failed, retrying referred_by only", userUpFullErr);
      await supabase.from("users").update({ referred_by: referrer.id }).eq("id", newUserId);
    }

    const { error: tokErr } = await supabase
      .from("referrals")
      .update({ tokens_awarded: true })
      .eq("referred_id", newUserId);

    if (tokErr) {
      console.error("applyReferral: tokens_awarded update error", tokErr);
    }

    const { error: txnErr } = await supabase.from("fk_transactions").insert([
      {
        user_id: referrer.id,
        amount: 200,
        reason: "referral_reward_referrer",
        reference_id: newUserId,
      },
      {
        user_id: newUserId,
        amount: 100,
        reason: "referral_reward_new_user",
        reference_id: referrer.id,
      },
    ]);

    if (txnErr) {
      console.error("applyReferral: fk_transactions insert error", txnErr);
    }

    console.log("applyReferral: SUCCESS", "referrer +200 FK,", "new user +100 FK");

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

    useGamificationStore.setState({ lastFetched: null });
    await useGamificationStore.getState().fetchGamification(newUserId);
    await useAuthStore.getState().refreshUser();
  } catch (err) {
    console.error("applyReferral: ERROR", err);
  } finally {
    referralApplyLocks.delete(newUserId);
  }
}
