"use client";

import { trackImpression } from "@/lib/gtag";
import { useEffect, useRef } from "react";

type TrackImpressionProps = {
  /** Stable id for GA4 (snake_case recommended). */
  component_id: string;
  /** Fraction of element visible to count as seen (default 0.35). */
  threshold?: number;
  className?: string;
  children: React.ReactNode;
};

/**
 * Fires `element_impression` once per mount when the wrapper enters the viewport.
 */
export function TrackImpression({
  component_id,
  threshold = 0.35,
  className,
  children,
}: TrackImpressionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || fired.current) return;
        fired.current = true;
        trackImpression(component_id, {
          visibility_ratio: Math.round(entry.intersectionRatio * 100),
        });
        obs.disconnect();
      },
      { threshold: [Math.min(1, Math.max(0.05, threshold))] },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [component_id, threshold]);

  return (
    <div ref={ref} className={className ?? "min-h-0 w-full"}>
      {children}
    </div>
  );
}
