"use client";

import { fadeIn, fadeUp, scaleIn, slideInLeft, slideInRight } from "@/lib/animations";
import { motion, useInView } from "framer-motion";
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

export default function AnimateOnScroll({
  children,
  variant = "fadeUp",
  delay = 0,
  className = "",
  /** Hero / first screen: skip opacity-0 initial state so first paint is never blank. */
  aboveFold = false,
}: {
  children: React.ReactNode;
  variant?: VariantName;
  delay?: number;
  className?: string;
  aboveFold?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "0px 0px -12% 0px",
    amount: 0.01,
  });

  // useInView + ref timing can miss the first frame (Framer ref + IO). Re-check after layout
  // and again on the next animation frame so the first paint is not stuck at opacity 0.
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

  // IntersectionObserver can lag on cold navigation; re-check a few times if still in viewport.
  useEffect(() => {
    if (aboveFold) return;
    const tick = () => {
      const el = ref.current;
      if (!el) return;
      if (elementIntersectsViewport(el)) setInViewOnLayout(true);
    };
    const timers = [0, 50, 200, 500, 1200].map((ms) => window.setTimeout(tick, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [aboveFold]);

  const visible = aboveFold || isInView || inViewOnLayout;

  return (
    <motion.div
      ref={ref}
      style={{ position: "relative" }}
      variants={variants[variant]}
      initial={aboveFold ? "visible" : "hidden"}
      animate={visible ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
