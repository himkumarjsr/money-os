"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

function EyeGlyph({ open, size = 16 }: { open: boolean; size?: number }) {
  if (open) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Privacy-aware amount. Hidden by default; an eye button reveals the value.
 * When there's no data (value is 0 / not finite) the eye is omitted and the
 * placeholder text is shown as-is (so empty states never expose a toggle).
 */
export default function PrivateAmount({
  value,
  children,
  masked = "₹••••••",
  valueClassName,
  valueStyle,
  eyeColor = "#534AB7",
  eyeSize = 16,
  gap = 6,
  label = "amount",
  align = "center",
}: {
  /** The numeric value used to decide whether there's data to protect. */
  value: number;
  /** The formatted, visible representation (e.g. "₹50,000"). */
  children: ReactNode;
  masked?: string;
  valueClassName?: string;
  valueStyle?: CSSProperties;
  eyeColor?: string;
  eyeSize?: number;
  gap?: number;
  label?: string;
  align?: CSSProperties["alignItems"];
}) {
  const [visible, setVisible] = useState(false);
  const hasData = Number.isFinite(value) && Math.abs(value) > 0;

  if (!hasData) {
    return (
      <span className={valueClassName} style={valueStyle}>
        {children}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: align,
        gap,
        minWidth: 0,
      }}
    >
      <span
        className={valueClassName}
        style={{
          ...valueStyle,
          letterSpacing: visible ? valueStyle?.letterSpacing : "0.06em",
        }}
      >
        {visible ? children : masked}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVisible((v) => !v);
        }}
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        title={visible ? "Hide" : "Show"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: eyeSize + 14,
          height: eyeSize + 14,
          borderRadius: 8,
          border: "1px solid #E8E6F0",
          background: "#F9F9FC",
          color: eyeColor,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <EyeGlyph open={visible} size={eyeSize} />
      </button>
    </span>
  );
}
