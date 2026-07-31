"use client";

import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";
import AnalyseAppClient from "./AnalyseAppClient";

/**
 * Logged-out / crawlers: SSR marketing landing (children).
 * Logged-in: analyse app (consent + form).
 */
export default function AnalyseEntryClient({
  children,
}: {
  children: ReactNode;
}) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  // Persist may already know the user before init finishes — open the app.
  if (isLoggedIn && user?.id) {
    return <AnalyseAppClient />;
  }

  // Logged out (or still booting without a session): keep marketing visible.
  return <>{children}</>;
}
