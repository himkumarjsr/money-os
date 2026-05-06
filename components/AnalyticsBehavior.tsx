"use client";

import { GA_MEASUREMENT_ID, trackScrollDepth } from "@/lib/gtag";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const MILESTONES = [25, 50, 75, 90] as const;

function scrollPercent(): number {
  const el = document.documentElement;
  const sh = el.scrollHeight - el.clientHeight;
  if (sh <= 0) return 100;
  return Math.min(100, Math.round((el.scrollTop / sh) * 100));
}

/**
 * Scroll-depth milestones per pathname per browser tab session (sessionStorage).
 */
export function AnalyticsBehavior() {
  const pathname = usePathname() ?? "";
  const ticking = useRef(false);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;

    const pathKey = pathname || "/";

    const flush = () => {
      ticking.current = false;
      const pct = scrollPercent();
      for (const m of MILESTONES) {
        if (pct < m) continue;
        const storageKey = `ga_scroll_${pathKey}_${m}`;
        try {
          if (sessionStorage.getItem(storageKey)) continue;
          sessionStorage.setItem(storageKey, "1");
        } catch {
          continue;
        }
        trackScrollDepth(m, pathKey);
      }
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(flush);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    flush();

    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
