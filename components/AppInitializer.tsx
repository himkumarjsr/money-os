"use client";

import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

/**
 * Runs persisted auth hydration + Supabase init in the background.
 * Never blocks paint — the previous full-screen gate caused SSR and first paint to be only
 * a spinner, destroying LCP (hero never appeared in HTML until JS finished).
 */
export default function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await useAuthStore.persist.rehydrate();

        if (!useAuthStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = useAuthStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
            setTimeout(resolve, 1000);
          });
        }

        if (cancelled) return;
        await useAuthStore.getState().initAuth();
      } catch (err) {
        console.error("AppInitializer error:", err);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {children}
      <PWAInstallPrompt />
    </>
  );
}
