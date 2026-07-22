"use client";

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
  md: {
    ring: 56,
    inset: 10,
    radius: 12,
    font: 12,
    gap: 16,
    border: 3,
    pad: 24,
  },
  sm: {
    ring: 40,
    inset: 8,
    radius: 10,
    font: 10,
    gap: 12,
    border: 2.5,
    pad: 16,
  },
  xs: { ring: 20, inset: 4, radius: 5, font: 7, gap: 8, border: 2, pad: 4 },
} as const;

/**
 * Single app-wide Finkoin loader — purple ring + FK mark.
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
      <div
        aria-hidden
        style={{
          position: "relative",
          width: s.ring,
          height: s.ring,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `${s.border}px solid var(--color-border, #E2DFF0)`,
            borderTopColor: "var(--color-primary, #534AB7)",
            animation: "spin 0.75s linear infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: s.inset,
            borderRadius: s.radius,
            background: "var(--color-primary, #534AB7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: s.font,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          FK
        </div>
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
        background:
          "linear-gradient(160deg, #F4F3F8 0%, #FFFFFF 45%, #EEEDFE 100%)",
      }}
    >
      {content}
    </div>
  );
}
