"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export const STORAGE_KEY = "finkoin_pending_ref";

/** Read + consume pending ref from localStorage (JSON with expiry or legacy plain string). */
export function consumePendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    let code: string | null = null;

    try {
      const parsed = JSON.parse(stored) as { code?: string; expires?: string };
      if (parsed.expires && new Date(parsed.expires) < new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      code = typeof parsed.code === "string" ? parsed.code.trim() || null : null;
    } catch {
      code = stored.trim() || null;
    }

    localStorage.removeItem(STORAGE_KEY);
    return code;
  } catch {
    return null;
  }
}

/** Persist `?ref=` from URL until signup completes (localStorage, 7-day TTL). */
export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const ref = searchParams.get("ref")?.trim();
      if (ref) {
        const data = {
          code: ref,
          capturedAt: new Date().toISOString(),
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log("ReferralCapture: stored", ref);
      }
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  return null;
}

export default ReferralCapture;
