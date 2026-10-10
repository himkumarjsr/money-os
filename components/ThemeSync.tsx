"use client";

import { useEffect, useState } from "react";
import { applyTheme, resolveTheme } from "@/lib/theme";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

/** Keeps `<html data-theme>` in step with the saved Appearance choice. */
export default function ThemeSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const preference = useThemeStore((s) => s.preference);
  const unlocked = useThemeStore((s) => s.premium?.unlocked ?? false);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    useThemeStore.getState().load(userId);
    void useThemeStore.getState().refreshPremium(userId);
  }, [userId]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(resolveTheme(preference, systemDark, unlocked));
  }, [preference, systemDark, unlocked]);

  return null;
}
