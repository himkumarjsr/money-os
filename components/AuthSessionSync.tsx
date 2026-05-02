"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

/**
 * Cross-tab + visibility sync: when auth cookies/local persist change in another tab
 * or the user returns to this tab, refresh profile + FK from Supabase.
 */
export function AuthSessionSync() {
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "finkoin-auth" || e.key.startsWith("sb-")) {
        void useAuthStore.getState().refreshUser();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void useAuthStore.getState().refreshUser();
      }
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
