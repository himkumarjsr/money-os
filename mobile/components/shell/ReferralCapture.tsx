/**
 * Root-level referral wiring (web ReferralCapture + ReferralSuccessToast):
 * capture `?ref=` from the launch URL or any deep link, apply it once the user
 * is signed in, and show the one-shot success toast.
 */
import { useEffect } from "react";
import * as Linking from "expo-linking";
import {
  applyPendingReferral,
  captureReferralFromUrl,
  showPendingReferralToast,
} from "@/lib/referral";
import { hydrateSyncKv } from "@/lib/syncKv";
import { supabase } from "@/lib/supabase";
import { uniqueChannelName } from "@/lib/realtimeChannel";
import { useChromeStore } from "@/store/chromeStore";
import { useAuthStore } from "@/store/authStore";

export function ReferralCapture() {
  const userId = useAuthStore((s) => (s.isLoggedIn ? s.user?.id : undefined));

  useEffect(() => {
    void hydrateSyncKv().then(async () => {
      captureReferralFromUrl(await Linking.getInitialURL());
      showPendingReferralToast();
    });
    const sub = Linking.addEventListener("url", (e) =>
      captureReferralFromUrl(e.url),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!userId) return;
    void hydrateSyncKv().then(() => applyPendingReferral(userId));
  }, [userId]);

  return null;
}

/**
 * Web shows `+{amount} FK earned!` through the gamification store. Mobile has
 * no such store, so watch the user's `gamification` row and toast on any gain.
 */
export function FkToastWatcher() {
  const userId = useAuthStore((s) => (s.isLoggedIn ? s.user?.id : undefined));

  useEffect(() => {
    if (!userId) return;
    let last: number | null = null;
    let cancelled = false;
    void supabase
      .from("gamification")
      .select("fk_balance")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) last = Number(data.fk_balance ?? 0);
      });
    const channel = supabase
      .channel(uniqueChannelName(`fk-toast:${userId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gamification",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = Number(
            (payload.new as { fk_balance?: number } | null)?.fk_balance ?? NaN,
          );
          if (!Number.isFinite(next)) return;
          if (last !== null && next > last) {
            useChromeStore
              .getState()
              .showToast(`+${next - last} FK earned! 🎉`);
          }
          last = next;
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
