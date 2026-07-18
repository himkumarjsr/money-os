"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect, useRef } from "react";

/**
 * Cross-tab + visibility sync: when auth cookies/local persist change in another tab
 * or the user returns to this tab, refresh profile + FK from Supabase.
 *
 * Wait until initAuth has finished so a PWA cold-open visibility event cannot
 * race and briefly clear a valid persisted login.
 *
 * Debounced + single-flight so idle resume does not pile up auth/DB calls
 * (which used to freeze Add expense after a few minutes in background).
 */
export function AuthSessionSync() {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const inFlight = useRef(false);
  const lastRefreshAt = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasInitialized) return;

    const softRefresh = () => {
      const now = Date.now();
      // Skip if we refreshed very recently (e.g. visibility + storage both fire).
      if (now - lastRefreshAt.current < 4000) return;
      if (inFlight.current) return;
      inFlight.current = true;
      lastRefreshAt.current = now;
      void useAuthStore
        .getState()
        .refreshUser({ clearOnMissingSession: false })
        .finally(() => {
          inFlight.current = false;
        });
    };

    const scheduleSoftRefresh = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(softRefresh, 350);
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "finkoin-auth" || e.key.startsWith("sb-")) {
        scheduleSoftRefresh();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleSoftRefresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [hasInitialized]);

  return null;
}
