"use client";

import { cn } from "@/lib/cn";
import {
  QUICK_CALC_KEYS,
  emptyQuickCalc,
  evaluateQuickCalc,
  formatQuickCalcExpr,
  formatQuickCalcNumber,
  pressQuickCalcKey,
  type QuickCalcKey,
} from "@/lib/quickCalc";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A small calculator bubble that floats over every page, like the iPhone
 * assistive-touch button: drag it anywhere, it snaps to the nearest side,
 * and a tap opens a pocket calculator next to it. The mobile app has the same
 * bubble (mobile/components/FloatingCalculator.tsx).
 */

const SIZE = 52;
const EDGE = 8;
const PANEL_W = 248;
const PANEL_H = 344;
const POS_KEY = "finkoin_quick_calc_pos";
/** Moving less than this is a tap, not a drag. */
const TAP_SLOP = 6;

type Pos = { x: number; y: number };
type Saved = { side: "left" | "right"; yRatio: number };

function hiddenOn(path: string): boolean {
  return (
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path.startsWith("/auth") ||
    path.startsWith("/admin") ||
    path === "/analyse/form" ||
    path === "/analyse/consent"
  );
}

function clampY(y: number): number {
  const top = 72;
  const bottom = window.innerHeight - SIZE - 96;
  return Math.min(Math.max(y, top), Math.max(top, bottom));
}

function sideX(side: Saved["side"]): number {
  return side === "left" ? EDGE : window.innerWidth - SIZE - EDGE;
}

function readSaved(): Saved {
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if ((s.side === "left" || s.side === "right") && s.yRatio >= 0) return s;
    }
  } catch {
    /* storage blocked - use the default spot */
  }
  return { side: "right", yRatio: 0.62 };
}

function save(s: Saved) {
  try {
    window.localStorage.setItem(POS_KEY, JSON.stringify(s));
  } catch {
    /* not saved; the bubble still works */
  }
}

const KEY_FROM_KEYBOARD: Record<string, QuickCalcKey> = {
  "+": "+",
  "-": "−",
  "*": "×",
  x: "×",
  "/": "÷",
  "%": "%",
  ".": ".",
  ",": ".",
  Enter: "=",
  "=": "=",
  Backspace: "⌫",
  Delete: "C",
};

export default function FloatingCalculator() {
  const pathname = usePathname() ?? "";
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [calc, setCalc] = useState(emptyQuickCalc);
  const drag = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLButtonElement | null>(null);

  const place = useCallback(() => {
    const s = readSaved();
    setPos({ x: sideX(s.side), y: clampY(s.yRatio * window.innerHeight) });
  }, []);

  useEffect(() => {
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [place]);

  const press = useCallback((key: QuickCalcKey) => {
    setCalc((s) => pressQuickCalcKey(s, key));
  }, []);

  // Typing works too while it's open (desktop).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const key = /^[0-9]$/.test(e.key)
        ? (e.key as QuickCalcKey)
        : KEY_FROM_KEYBOARD[e.key];
      if (!key) return;
      e.preventDefault();
      press(key);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || bubbleRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, press]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!pos || hiddenOn(pathname)) return null;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      setOpen(false);
    }
    setPos({
      x: Math.min(Math.max(d.originX + dx, 0), window.innerWidth - SIZE),
      y: Math.min(Math.max(d.originY + dy, 0), window.innerHeight - SIZE),
    });
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setOpen((o) => !o);
      return;
    }
    setDragging(false);
    // Snap to the nearer side, like the iPhone bubble.
    setPos((p) => {
      if (!p) return p;
      const side: Saved["side"] =
        p.x + SIZE / 2 < window.innerWidth / 2 ? "left" : "right";
      const y = clampY(p.y);
      save({ side, yRatio: y / window.innerHeight });
      return { x: sideX(side), y };
    });
  };

  const onLeft = pos.x + SIZE / 2 < window.innerWidth / 2;
  const panelTop = Math.min(
    Math.max(pos.y + SIZE / 2 - PANEL_H / 2, 12),
    window.innerHeight - PANEL_H - 12,
  );
  const panelLeft = onLeft
    ? Math.min(pos.x + SIZE + 8, window.innerWidth - PANEL_W - 8)
    : Math.max(pos.x - PANEL_W - 8, 8);
  // On a narrow phone the panel can't sit beside the bubble without
  // covering it, so it sits above or below instead.
  const besideFits = window.innerWidth >= SIZE + PANEL_W + 32;
  const stackedTop =
    pos.y > window.innerHeight / 2
      ? Math.max(pos.y - PANEL_H - 10, 12)
      : Math.min(pos.y + SIZE + 10, window.innerHeight - PANEL_H - 12);

  const preview =
    !calc.justEvaluated && /[+−×÷%]/.test(calc.expr.replace(/^−/, ""))
      ? evaluateQuickCalc(calc.expr)
      : null;
  const shown = calc.expr ? formatQuickCalcExpr(calc.expr) : "0";

  return (
    <>
      <button
        ref={bubbleRef}
        type="button"
        aria-label={open ? "Close calculator" : "Open calculator"}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "fixed z-[1100] flex touch-none select-none items-center justify-center rounded-full text-white shadow-lg print:hidden",
          !dragging && "transition-[left,top,opacity] duration-300 ease-out",
          open || dragging ? "opacity-100" : "opacity-80",
        )}
        style={{
          left: pos.x,
          top: pos.y,
          width: SIZE,
          height: SIZE,
          background: "rgba(60, 52, 137, 0.88)",
          boxShadow: "0 6px 20px rgba(20, 16, 60, 0.35)",
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <rect
              x="5"
              y="3"
              width="14"
              height="18"
              rx="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <rect x="8" y="6" width="8" height="3" rx="1" fill="currentColor" />
            <circle cx="9" cy="13" r="1.1" fill="currentColor" />
            <circle cx="12" cy="13" r="1.1" fill="currentColor" />
            <circle cx="15" cy="13" r="1.1" fill="currentColor" />
            <circle cx="9" cy="17" r="1.1" fill="currentColor" />
            <circle cx="12" cy="17" r="1.1" fill="currentColor" />
            <circle cx="15" cy="17" r="1.1" fill="currentColor" />
          </svg>
        )}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Calculator"
          className="fixed z-[1100] rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl print:hidden"
          style={{
            width: PANEL_W,
            left: besideFits ? panelLeft : (window.innerWidth - PANEL_W) / 2,
            top: besideFits ? panelTop : stackedTop,
          }}
        >
          <div
            className="mb-3 rounded-2xl bg-slate-100 px-3 py-2 text-right"
            aria-live="polite"
          >
            <p className="h-4 truncate text-xs text-slate-500">
              {calc.last ? `${formatQuickCalcExpr(calc.last)} =` : ""}
            </p>
            <p
              className={cn(
                "truncate font-semibold tabular-nums text-slate-900",
                shown.length > 14 ? "text-lg" : "text-2xl",
              )}
            >
              {shown}
            </p>
            <p className="h-4 truncate text-xs tabular-nums text-slate-500">
              {preview !== null ? `= ${formatQuickCalcNumber(preview)}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_CALC_KEYS.flat().map((key) => {
              const op = "+−×÷".includes(key);
              const fn = key === "C" || key === "⌫" || key === "%";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => press(key)}
                  aria-label={
                    key === "⌫" ? "Delete" : key === "C" ? "Clear" : key
                  }
                  className={cn(
                    "h-11 rounded-2xl text-lg font-semibold transition active:scale-95",
                    key === "="
                      ? "col-span-2 bg-[#534AB7] text-white"
                      : op
                        ? "bg-[#EEEDFE] text-[#534AB7]"
                        : fn
                          ? "bg-slate-100 text-slate-700"
                          : "border border-slate-200 bg-white text-slate-900",
                  )}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
