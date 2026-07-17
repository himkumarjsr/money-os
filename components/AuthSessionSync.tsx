"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

/**
 * Cross-tab + visibility sync: when auth cookies/local persist change in another tab
 * or the user returns to this tab, refresh profile + FK from Supabase.
 *
 * Wait until initAuth has finished so a PWA cold-open visibility event cannot
 * race and briefly clear a valid persisted login.
 */
export function AuthSessionSync() {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);

  useEffect(() => {
    if (!hasInitialized) return;

    const handleStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "finkoin-auth" || e.key.startsWith("sb-")) {
        void useAuthStore
          .getState()
          .refreshUser({ clearOnMissingSession: false });
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Soft refresh — do not log the user out on a transient cookie miss.
        void useAuthStore
          .getState()
          .refreshUser({ clearOnMissingSession: false });
      }
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hasInitialized]);

  return null;
}
