"use client";

import BrandCoin from "@/components/ui/BrandCoin";

type BrandPageLoaderProps = {
  /** Full viewport overlay (refresh / route transition). Default true. */
  fullScreen?: boolean;
  label?: string;
  /** `md` = page; `sm` = section; `xs` = button / inline strip. */
  size?: "md" | "sm" | "xs";
  /** Override embedded min-height (ignored when fullScreen). */
  minHeight?: string | number;
  /** Put label beside the ring (soft-refresh strips, buttons). */
  inline?: boolean;
  /** Render only the ring+label (no outer centering wrapper) — for buttons. */
  bare?: boolean;
  className?: string;
};

const SIZES = {
  md: { ring: 56, gap: 16, pad: 24 },
  sm: { ring: 40, gap: 12, pad: 16 },
  xs: { ring: 20, gap: 8, pad: 4 },
} as const;

/**
 * Single app-wide Finkoin loader: the FK coin turning on its edge.
 * Use this for every loading state in the repo (page, Suspense, section, button).
 */
export default function BrandPageLoader({
  fullScreen = true,
  label = "Loading…",
  size = "md",
  minHeight = "60vh",
  inline = false,
  bare = false,
  className,
}: BrandPageLoaderProps) {
  const s = SIZES[size];

  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className}
      style={{
        display: "flex",
        flexDirection: inline ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        padding: bare || inline ? 0 : s.pad,
      }}
    >
      <div aria-hidden style={{ perspective: 600, flexShrink: 0 }}>
        <BrandCoin size={s.ring} spinning decorative />
      </div>
      {label ? (
        <p
          style={{
            margin: 0,
            fontSize: size === "xs" ? 12 : size === "sm" ? 13 : 14,
            fontWeight: 600,
            color: bare ? "currentColor" : "var(--color-muted, #6B6680)",
          }}
        >
          {label}
        </p>
      ) : null}
    </div>
  );

  if (bare) return content;

  if (!fullScreen) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: minHeight === "auto" ? undefined : minHeight,
          width: "100%",
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Dark and Premium define --fk-bg; light keeps its soft wash.
        background:
          "var(--fk-bg, linear-gradient(160deg, #F4F3F8 0%, #FFFFFF 45%, #EEEDFE 100%))",
      }}
    >
      {content}
    </div>
  );
}
