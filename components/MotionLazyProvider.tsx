"use client";

import { LazyMotion, domMax } from "framer-motion";

/**
 * Lazy-loads Framer Motion DOM features + forces `m` components so the main bundle
 * avoids the heavy `motion` proxy until features hydrate (cuts parse/eval vs default motion).
 */
export function MotionLazyProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
