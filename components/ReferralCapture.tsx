"use client";

import { STORAGE_KEY } from "@/lib/referralRewards";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Persist `?ref=` from URL until signup completes (localStorage, 7-day TTL). */
export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const ref = searchParams?.get("ref")?.trim();
      if (ref) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            code: ref,
            savedAt: new Date().toISOString(),
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        );
        console.log("ReferralCapture: stored", ref);
      }
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  return null;
}

export default ReferralCapture;
