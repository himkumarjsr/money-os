"use client";

import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useEffect, useRef } from "react";

/**
 * Financial Zustand state is persisted per Supabase user id (guests use `__guest__`).
 * When auth loads or the user changes, re-read the correct localStorage bucket so
 * we never show another account's draft or a stale pre-login guest blob after login.
 */
export function FinancialStoreAuthSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const prev = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prev.current === userId && prev.current !== undefined) return;
    prev.current = userId;
    void useFinancialStore.persist.rehydrate();
  }, [userId]);

  return null;
}
