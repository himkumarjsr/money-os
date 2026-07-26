"use client";

import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import type { ReactNode } from "react";

/**
 * Accordion panel that expands/collapses in-place (no scrollIntoView)
 * so the page scroll position stays stable.
 */
export default function CollapsiblePanel({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  children,
  headerRight,
  defaultBorder = true,
}: {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  headerRight?: ReactNode;
  defaultBorder?: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 14,
        border: defaultBorder ? "1px solid #E8E6F0" : "none",
        background: "white",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          border: "none",
          background: open ? "#F7F5FF" : "white",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "#EEEDFE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AppIcon name={icon} size={16} color="#534AB7" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#111110",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 12,
                color: "#9B9A94",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {headerRight}
        <AppIcon
          name={open ? "chevronDown" : "chevronRight"}
          size={18}
          color="#534AB7"
        />
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 180ms ease",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div style={{ padding: open ? "0 12px 12px" : "0 12px" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
