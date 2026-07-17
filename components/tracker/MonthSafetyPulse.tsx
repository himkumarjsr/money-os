"use client";

import type { SafetyPulseResult, SafetyStatus } from "@/lib/trackerSafetyPulse";
import { useState } from "react";

const STATUS_STYLE: Record<
  SafetyStatus,
  { bg: string; border: string; badgeBg: string; badgeText: string }
> = {
  safe: {
    bg: "#F3F1FC",
    border: "#D4D2F5",
    badgeBg: "#E8E6F8",
    badgeText: "#3C3489",
  },
  tight: {
    bg: "#F7F4FF",
    border: "#C9C2F0",
    badgeBg: "#EEE9FF",
    badgeText: "#534AB7",
  },
  over: {
    bg: "#FBF5F5",
    border: "#F0D4D4",
    badgeBg: "#FDEDED",
    badgeText: "#991B1B",
  },
  unknown: {
    bg: "#F7F7F4",
    border: "#E8E6F0",
    badgeBg: "#EEEDFE",
    badgeText: "#534AB7",
  },
};

function maskOrShow(n: number, visible: boolean, signed = false): string {
  if (!visible) return "₹••••••";
  const prefix = signed && n > 0 ? "+" : "";
  const sign = n < 0 ? "-" : "";
  return `${prefix}${sign}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

export default function MonthSafetyPulse({
  pulse,
  previousMonthLabel,
  forceVisible = false,
}: {
  pulse: SafetyPulseResult;
  previousMonthLabel?: string | null;
  /** When true (master "Show all"), amounts are revealed regardless of local eye. */
  forceVisible?: boolean;
}) {
  /** Independent of tracker summary eye — hidden by default. */
  const [localVisible, setLocalVisible] = useState(false);
  const amountsVisible = localVisible || forceVisible;
  const setAmountsVisible = setLocalVisible;
  const style = STATUS_STYLE[pulse.status];
  const showComparison =
    pulse.previous != null &&
    (pulse.previous.totalSpent > 0 || pulse.previous.income > 0);

  return (
    <section
      aria-label="Month safety pulse"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 16,
        padding: "16px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#534AB7",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            Month safety pulse
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#111110",
              lineHeight: 1.35,
            }}
          >
            {pulse.headline}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: "6px 10px",
              borderRadius: 999,
              background: style.badgeBg,
              color: style.badgeText,
            }}
          >
            {pulse.statusLabel}
          </span>
          <button
            type="button"
            onClick={() => setAmountsVisible((v) => !v)}
            aria-label={
              amountsVisible
                ? "Hide safety pulse amounts"
                : "Show safety pulse amounts"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #D4D2F5",
              background: "white",
              color: "#534AB7",
              cursor: "pointer",
              flexShrink: 0,
              padding: 0,
            }}
          >
            <EyeIcon open={amountsVisible} />
          </button>
        </div>
      </div>

      {pulse.reasons.length > 0 ? (
        <ul
          style={{
            margin: "0 0 12px",
            paddingLeft: 18,
            color: "#3C3489",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {pulse.reasons.map((r) => (
            <li key={r} style={{ marginBottom: 4 }}>
              {amountsVisible ? r : r.replace(/₹[\d,]+/g, "₹••••••")}
            </li>
          ))}
        </ul>
      ) : null}

      {pulse.action ? (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "12px 14px",
            border: "1px solid #E8E6F0",
            marginBottom: showComparison ? 12 : 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#534AB7",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            Do this
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#111110",
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            {amountsVisible
              ? pulse.action
              : pulse.action.replace(/₹[\d,]+/g, "₹••••••")}
          </div>
        </div>
      ) : null}

      {showComparison ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.72)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#534AB7",
                marginBottom: 4,
              }}
            >
              This month spent
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>
              {maskOrShow(pulse.current.totalSpent, amountsVisible)}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.72)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#534AB7",
                marginBottom: 4,
              }}
            >
              {previousMonthLabel
                ? `${previousMonthLabel} spent`
                : "Last month spent"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>
              {maskOrShow(pulse.previous!.totalSpent, amountsVisible)}
            </div>
            {pulse.spentDelta != null && Math.abs(pulse.spentDelta) >= 1 ? (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 4,
                  color: pulse.spentDelta > 0 ? "#991B1B" : "#1B7A4E",
                }}
              >
                {maskOrShow(pulse.spentDelta, amountsVisible, true)}
                {amountsVisible && pulse.spentDeltaPct != null
                  ? ` (${pulse.spentDeltaPct > 0 ? "+" : ""}${pulse.spentDeltaPct.toFixed(0)}%)`
                  : ""}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {pulse.movers.length > 0 && amountsVisible ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#534AB7",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Biggest movers
          </div>
          {pulse.movers.map((m) => (
            <div
              key={`${m.bucket}:${m.subId}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 12,
                color: "#111110",
                marginBottom: 4,
              }}
            >
              <span style={{ fontWeight: 600 }}>{m.label}</span>
              <span
                style={{
                  fontWeight: 700,
                  color: m.delta > 0 ? "#991B1B" : "#1B7A4E",
                  whiteSpace: "nowrap",
                }}
              >
                {m.delta > 0 ? "+" : "-"}₹
                {Math.round(Math.abs(m.delta)).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {pulse.isCurrentCalendarMonth &&
      pulse.dailySafeSpend != null &&
      pulse.daysLeftInMonth != null &&
      pulse.daysLeftInMonth > 0 &&
      pulse.status !== "unknown" ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "#3C3489",
            lineHeight: 1.45,
          }}
        >
          {pulse.daysLeftInMonth} day
          {pulse.daysLeftInMonth === 1 ? "" : "s"} left · safe daily spend ≈{" "}
          <strong style={{ color: "#111110" }}>
            {maskOrShow(pulse.dailySafeSpend, amountsVisible)}
          </strong>
        </div>
      ) : null}
    </section>
  );
}
