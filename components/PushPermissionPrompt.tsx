"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import {
  enableWebPush,
  getWebPushPublicKey,
  isWebPushSupported,
} from "@/lib/webPushClient";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";

const DISMISS_KEY = "finkoin_push_prompt_dismissed";
const ENABLED_KEY = "finkoin_push_enabled";

/**
 * One-time prompt after login: ask to allow device notifications.
 * On Allow → browser permission + Web Push subscribe (tips at 8:30 AM).
 */
export default function PushPermissionPrompt() {
  const { isLoggedIn, hasInitialized, user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn || !user?.id) return;
    if (typeof window === "undefined") return;
    if (!isWebPushSupported() || !getWebPushPublicKey()) return;

    // Already enabled on this device
    if (localStorage.getItem(ENABLED_KEY) === "1") return;
    if (Notification.permission === "granted") {
      // Permission already granted — try silent re-subscribe once
      void enableWebPush().then((r) => {
        if (r.ok) localStorage.setItem(ENABLED_KEY, "1");
      });
      return;
    }
    if (Notification.permission === "denied") return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const days =
        (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (days < 14) return;
    }

    const timer = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(timer);
  }, [hasInitialized, isLoggedIn, user?.id]);

  const handleAllow = async () => {
    setBusy(true);
    setError(null);
    const result = await enableWebPush();
    setBusy(false);
    if (!result.ok) {
      setError(
        result.reason === "denied"
          ? "Permission blocked. You can enable it later in Settings."
          : result.reason === "unsupported"
            ? "On iPhone, add Finkoin to Home Screen first, then try again."
            : "Could not enable notifications. Try again from Settings.",
      );
      return;
    }
    localStorage.setItem(ENABLED_KEY, "1");
    localStorage.removeItem(DISMISS_KEY);
    setVisible(false);
  };

  const handleLater = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1100] flex justify-center p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-prompt-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E8E6F0] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEEDFE]">
            <AppIcon name="bell" size={22} color="#534AB7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="push-prompt-title"
              className="text-base font-bold text-[#111110]"
            >
              Get daily money tips on your phone?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5F5E5A]">
              Allow notifications and we’ll send one short finance tip every
              morning at 8:30 AM — even when Finkoin is closed.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-xs font-medium text-[#E24B4A]">{error}</p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleLater}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-xl border border-[#E8E6F0] text-sm font-semibold text-[#5F5E5A] disabled:opacity-60"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void handleAllow()}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-xl bg-[#534AB7] text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Enabling…" : "Allow notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
