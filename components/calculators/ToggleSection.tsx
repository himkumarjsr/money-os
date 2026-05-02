"use client";

import type { ReactNode } from "react";

export function ToggleSection({
  emoji,
  title,
  subtitle,
  isOn,
  onToggle,
  children,
}: {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  isOn: boolean;
  onToggle: (val: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        border: `1.5px solid ${isOn ? "#534AB7" : "#E8E6F0"}`,
        borderRadius: 14,
        marginBottom: 12,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(!isOn)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "16px 18px",
          cursor: "pointer",
          background: isOn ? "#FAFAFE" : "white",
          userSelect: "none",
          border: "none",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: isOn ? "#EEEDFE" : "#F7F7F4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              transition: "background 0.2s",
            }}
          >
            {emoji}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111110" }}>{title}</div>
            <div style={{ fontSize: 12, color: "#9B9A94", marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>

        <div
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: isOn ? "#534AB7" : "#E8E6F0",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
          aria-hidden
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "white",
              position: "absolute",
              top: 3,
              left: isOn ? 23 : 3,
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      </button>

      {isOn ? (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #F0EFF8" }}>
          <div style={{ height: 16 }} />
          {children}
        </div>
      ) : null}
    </div>
  );
}
