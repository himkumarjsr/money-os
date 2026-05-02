"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";

/**
 * Waits for persisted auth to rehydrate, then runs `initAuth()` so consumers
 * never read a stale `user` snapshot before Supabase session is validated.
 */
export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await useAuthStore.persist.rehydrate();

      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      if (cancelled) return;

      await useAuthStore.getState().initAuth();

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFA]">
        <div
          className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm font-medium text-[#9B9A94]">Loading Finkoin...</p>
      </div>
    );
  }

  return <>{children}</>;
}
