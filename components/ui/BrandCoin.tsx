"use client";

import { useId } from "react";

type Props = {
  size?: number;
  className?: string;
  /** Turn on its edge (the loader). */
  spinning?: boolean;
  /** Decorative next to a visible "Finkoin" label. */
  decorative?: boolean;
};

/**
 * The Finkoin mark: "FK" struck on a coin with a milled rim. Its colours come
 * from `--fk-coin-*` in globals.css: Violet Satin in light and dark, 24K
 * mirror gold in Premium. Matches the app's `mobile/components/ui/BrandCoin.tsx`.
 */
export default function BrandCoin({
  size = 32,
  className,
  spinning = false,
  decorative = false,
}: Props) {
  const id = useId().replace(/:/g, "");
  const face = `fk-coin-face-${id}`;
  const rim = `fk-coin-rim-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Finkoin"}
      className={[spinning ? "fk-coin-spin" : "", className ?? ""]
        .join(" ")
        .trim()}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={face} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--fk-coin-1)" }} />
          <stop offset="40%" style={{ stopColor: "var(--fk-coin-2)" }} />
          <stop offset="60%" style={{ stopColor: "var(--fk-coin-3)" }} />
          <stop offset="100%" style={{ stopColor: "var(--fk-coin-4)" }} />
        </linearGradient>
        <linearGradient id={rim} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--fk-coin-rim)" }} />
          <stop offset="50%" style={{ stopColor: "var(--fk-coin-rim-hi)" }} />
          <stop offset="100%" style={{ stopColor: "var(--fk-coin-rim)" }} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${rim})`} />
      <circle cx="32" cy="32" r="29" fill={`url(#${face})`} />
      <circle
        cx="32"
        cy="32"
        r="25"
        fill="none"
        strokeWidth="2"
        strokeDasharray="1.6 2.4"
        opacity="0.6"
        style={{ stroke: "var(--fk-coin-ring)" }}
      />
      <circle
        cx="32"
        cy="32"
        r="21"
        fill="none"
        strokeWidth="1.2"
        opacity="0.4"
        style={{ stroke: "var(--fk-coin-ring)" }}
      />
      <text
        x="32"
        y="38.5"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="18"
        letterSpacing="-0.5"
        style={{ fill: "var(--fk-coin-mark)" }}
      >
        FK
      </text>
    </svg>
  );
}
