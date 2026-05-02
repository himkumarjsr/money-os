"use client";

import { useEffect } from "react";

const STORAGE_KEY = "finkoin_pending_ref";

/** Persist `?ref=` from any landing URL until signup completes (see auth callback / SIGNED_IN). */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref")?.trim();
      if (ref) {
        const data = {
          code: ref,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as { code?: string; expires?: string };

    if (data.expires && new Date(data.expires) < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    localStorage.removeItem(STORAGE_KEY);
    const raw = data.code;
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
