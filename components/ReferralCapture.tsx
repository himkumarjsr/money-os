"use client";

import { useEffect } from "react";

const STORAGE_KEY = "finkoin_pending_ref";

/** Persist `?ref=` from any landing URL until signup completes (see auth callback). */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref")?.trim();
      if (ref) {
        sessionStorage.setItem(STORAGE_KEY, ref);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}

export function consumePendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const code = sessionStorage.getItem(STORAGE_KEY)?.trim();
    if (code) sessionStorage.removeItem(STORAGE_KEY);
    return code || null;
  } catch {
    return null;
  }
}
