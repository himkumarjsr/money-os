"use client";

import { fadeIn, fadeUp, scaleIn, slideInLeft, slideInRight } from "@/lib/animations";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const variants = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
} as const;

type VariantName = keyof typeof variants;

export default function AnimateOnScroll({
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
    margin: "-80px 0px",
  });

  return (
    <motion.div
      ref={ref}
      variants={variants[variant]}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
