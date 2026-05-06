"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function ToggleSection({
  emoji,
  title,
  subtitle,
  oneLiner,
  isOn,
  onToggle,
  children,
}: {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  /** Extra grey helper line under the subtitle (desktop: full; phone: clamped — tap ? inside row for detail). */
  oneLiner?: string;
  isOn: boolean;
  onToggle: (val: boolean) => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isOn) setExpanded(false);
  }, [isOn]);

  return (
    <div
      className="mb-3 overflow-hidden rounded-[14px] transition-[border-color] duration-200 sm:mb-[12px]"
      style={{
        border: `1.5px solid ${isOn ? "#534AB7" : "#E8E6F0"}`,
      }}
    >
      <div
        className={cn(
          "flex w-full items-start gap-2 border-none bg-white px-3 py-3 text-left sm:items-center sm:gap-3 sm:px-[18px] sm:py-4",
          isOn && "bg-[#FAFAFE]",
        )}
        style={{ userSelect: "none" }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
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
            className="mt-0.5 shrink-0 sm:mt-0"
          >
            {emoji}
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <div className="text-sm font-semibold leading-snug text-[#111110] sm:text-[15px]">{title}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-[#9B9A94] sm:text-xs">{subtitle}</div>
            {oneLiner ? (
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#B0AFA8] sm:mt-1 sm:line-clamp-none sm:text-[11px] sm:leading-[1.35]">
                {oneLiner}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-1 flex shrink-0 items-center gap-2 sm:mt-0">
          <button
            type="button"
            onClick={() => onToggle(!isOn)}
            className="rounded-full p-1 transition hover:bg-slate-100"
            aria-label={isOn ? "Disable section" : "Enable section"}
            title={isOn ? "Disable section" : "Enable section"}
          >
            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: isOn ? "#534AB7" : "#E8E6F0",
                position: "relative",
                transition: "background 0.2s",
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
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5F5E5A] transition hover:bg-slate-100"
              aria-label={expanded ? "Collapse section" : "Expand section"}
              title={expanded ? "Collapse section" : "Expand section"}
            >
              <span className={cn("text-lg leading-none transition-transform", expanded ? "rotate-180" : "")}>
                ⌄
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {isOn && expanded ? (
        <div className="border-t border-[#F0EFF8] px-3 pb-4 pt-0 sm:px-[18px] sm:pb-[18px]">
          <div className="h-3 sm:h-4" />
          {children}
        </div>
      ) : null}
    </div>
  );
}
