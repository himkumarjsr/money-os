"use client";

type BrandPageLoaderProps = {
  /** Full viewport overlay (refresh / route transition). Default true. */
  fullScreen?: boolean;
  label?: string;
};

/**
 * Theme-matched Finkoin loader — primary purple ring + brand mark.
 */
export default function BrandPageLoader({
  fullScreen = true,
  label = "Loading…",
}: BrandPageLoaderProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
      }}
    >
      <div aria-hidden style={{ position: "relative", width: 56, height: 56 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid var(--color-border, #E2DFF0)",
            borderTopColor: "var(--color-primary, #534AB7)",
            animation: "spin 0.75s linear infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: 12,
            background: "var(--color-primary, #534AB7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          FK
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: "var(--color-muted, #6B6680)",
        }}
      >
        {label}
      </p>
    </div>
  );

  if (!fullScreen) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
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
