"use client";

import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { applyPersistedAuthBootstrap, useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Runs persisted auth hydration + Supabase init in the background.
 * Persist is applied in useLayoutEffect (before paint) so PWA feels logged-in
 * without diverging SSR HTML (which caused hydration errors).
 */
export default function AppInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const initStartedRef = useRef(false);
  const gamificationUnsubRef = useRef<(() => void) | null>(null);
  const userId = useAuthStore((s) => s.user?.id);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);

  useLayoutEffect(() => {
    applyPersistedAuthBootstrap();
  }, []);

  useEffect(() => {
    // Guard against StrictMode double-invocation in development.
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;

    const init = async () => {
      try {
        await useAuthStore.persist.rehydrate();
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

  useEffect(() => {
    if (!hasInitialized) return;

    if (!isLoggedIn || !userId) {
      if (gamificationUnsubRef.current) {
        gamificationUnsubRef.current();
        gamificationUnsubRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const initGamification = async () => {
      const { fetchGamification, updateLoginStreak, subscribeToRealtime } =
        useGamificationStore.getState();
      await fetchGamification(userId);
      await updateLoginStreak(userId);
      if (cancelled) return;
      if (gamificationUnsubRef.current) gamificationUnsubRef.current();
      gamificationUnsubRef.current = subscribeToRealtime(userId);
    };

    void initGamification();

    return () => {
      cancelled = true;
    };
  }, [hasInitialized, isLoggedIn, userId]);

  return (
    <>
      {children}
      <PWAInstallPrompt />
    </>
  );
}
