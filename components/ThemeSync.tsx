"use client";

import { useEffect, useState } from "react";
import { applyTheme, resolveTheme } from "@/lib/theme";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

/** Keeps `<html data-theme>` in step with the saved Appearance choice. */
export default function ThemeSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => s.hasInitialized);
  const loaded = useThemeStore((s) => s.loaded);
  const preference = useThemeStore((s) => s.preference);
  const unlocked = useThemeStore((s) => s.premium?.unlocked ?? false);
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    useThemeStore.getState().load(userId);
  }, [userId]);

  // Wait for sign-in to settle: refreshing as "signed out" first would drop
  // the cached Premium status and flash Gold back to Dark.
  useEffect(() => {
    if (!authReady) return;
    void useThemeStore.getState().refreshPremium(userId);
  }, [authReady, userId]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // The boot script already painted the saved theme; don't overwrite it with
  // the store's defaults before they've been read.
  useEffect(() => {
    if (!loaded) return;
    applyTheme(resolveTheme(preference, systemDark, unlocked));
  }, [loaded, preference, systemDark, unlocked]);

  return null;
}
