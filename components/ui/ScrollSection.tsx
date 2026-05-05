"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function ScrollSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Opacity was 0 while scrollYProgress stayed near 0 (sections below the fold),
  // so most of the homepage stayed invisible until the user scrolled — looked
  // like a broken first paint. Keep sections readable; light motion only.
  const y = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [28, 0, 0, -28]);

  return (
    <m.div ref={ref} style={{ y, position: "relative" }}>
      {children}
    </m.div>
  );
}
