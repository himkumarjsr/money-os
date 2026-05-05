"use client";

import { fadeIn, fadeUp, scaleIn, slideInLeft, slideInRight } from "@/lib/animations";
import { m, useInView } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const variants = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
} as const;

type VariantName = keyof typeof variants;

function elementIntersectsViewport(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  if (r.width === 0 && r.height === 0) return false;
  return r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0;
}

/** Below-fold only: uses IO + occasional geometry reads when IO is slow (no synchronous layout on hero). */
function AnimateOnScrollDeferred({
  children,
  variant = "fadeUp",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  variant?: VariantName;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "0px 0px -12% 0px",
    amount: 0.01,
  });

  const [inViewOnLayout, setInViewOnLayout] = useState(false);
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    if (elementIntersectsViewport(el)) setInViewOnLayout(true);
  };

  useLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      const el = ref.current;
      if (!el) return;
      if (elementIntersectsViewport(el)) setInViewOnLayout(true);
    };
    const timers = [0, 50, 200, 500, 1200].map((ms) => window.setTimeout(tick, ms));
    return () => timers.forEach((tid) => window.clearTimeout(tid));
  }, []);

  const visible = isInView || inViewOnLayout;

  return (
    <m.div
      ref={ref}
      style={{ position: "relative" }}
      variants={variants[variant]}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export default function AnimateOnScroll({
  children,
  variant = "fadeUp",
  delay = 0,
  className = "",
  /** Hero / first screen: no observers or geometry reads — avoids forced reflow on LCP path. */
  aboveFold = false,
}: {
  children: React.ReactNode;
  variant?: VariantName;
  delay?: number;
  className?: string;
  aboveFold?: boolean;
}) {
  if (aboveFold) {
    return (
      <m.div
        style={{ position: "relative" }}
        variants={variants[variant]}
        initial="visible"
        animate="visible"
        transition={{ delay }}
        className={className}
      >
        {children}
      </m.div>
    );
  }

  return (
    <AnimateOnScrollDeferred variant={variant} delay={delay} className={className}>
      {children}
    </AnimateOnScrollDeferred>
  );
}
