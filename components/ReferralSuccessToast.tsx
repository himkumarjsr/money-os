"use client";

import { FINKOIN_REFERRAL_SUCCESS_KEY } from "@/lib/referralRewards";
import { useGamificationStore } from "@/store/gamificationStore";
import { useEffect } from "react";

/** Shows one-shot toast after referral FK bonus (set by `applyPendingReferralRewards`). */
export function ReferralSuccessToast() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(FINKOIN_REFERRAL_SUCCESS_KEY);
      if (!stored) return;

      const data = JSON.parse(stored) as { fkAwarded?: number; showUntil?: string };
      if (data.showUntil && new Date(data.showUntil) > new Date()) {
        const fk = Number(data.fkAwarded ?? 100);
        useGamificationStore.setState({
          toastMessage: `Referral bonus: +${fk} FK earned!`,
        });
      }
      localStorage.removeItem(FINKOIN_REFERRAL_SUCCESS_KEY);
    } catch {
      localStorage.removeItem(FINKOIN_REFERRAL_SUCCESS_KEY);
    }
  }, []);

  return null;
}
