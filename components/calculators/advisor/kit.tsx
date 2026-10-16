"use client";

import { cn } from "@/lib/cn";
import {
  formatIndian,
  formatInWords,
  parseIndianInput,
} from "@/lib/formatters";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export {
  Insight,
  ResultStat,
  SliderField,
  DateField,
  todayInputValue,
} from "../calculator-ui";
export type { InsightTone } from "../calculator-ui";

/** Number state for a calculator field. */
export function useNum(initial: number) {
  const [v, setV] = useState(initial);
  const set = useCallback((n: number) => setV(Number.isFinite(n) ? n : 0), []);
  return [v, set] as const;
}

/** ₹ with Indian grouping, no paise. */
export function inr(n: number) {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n);
  return `${r < 0 ? "−" : ""}₹${formatIndian(Math.abs(r))}`;
}

export function pct(n: number | null, digits = 2) {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function duration(months: number) {
  if (!Number.isFinite(months)) return "Never";
  const m = Math.max(0, Math.round(months));
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return `${rem} mo`;
  return rem === 0
    ? `${y} yr${y === 1 ? "" : "s"}`
    : `${y} yr${y === 1 ? "" : "s"} ${rem} mo`;
}

/** Wraps inputs: one column on phones, two on wider screens. */
export function Inputs({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 1 | 2;
}) {
  return (
    <div className={cn("grid gap-x-5", cols === 2 && "sm:grid-cols-2")}>
      {children}
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

export type Option<T extends string> = { value: T; label: string };

/** Pill toggle for 2–5 choices. Large tap targets, wraps on narrow screens. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#5F5E5A]">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-2"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition",
                active
                  ? "border-[#534AB7] bg-[#534AB7] text-white"
                  : "border-[#E8E6F0] bg-white text-slate-700 hover:border-[#534AB7]/40",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Yes / no switch built on Segmented. */
export function YesNo({
  label,
  value,
  onChange,
  yes = "Yes",
  no = "No",
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  yes?: string;
  no?: string;
}) {
  return (
    <Segmented
      label={label}
      value={value ? "y" : "n"}
      options={[
        { value: "y", label: yes },
        { value: "n", label: no },
      ]}
      onChange={(v) => onChange(v === "y")}
    />
  );
}

/** Slab picker used by every tax-aware calculator. */
export function SlabField({
  value,
  onChange,
  label = "Your income tax slab",
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <Segmented
      label={label}
      value={String(value)}
      options={["0", "5", "10", "20", "30"].map((v) => ({
        value: v,
        label: `${v}%`,
      }))}
      onChange={(v) => onChange(Number(v))}
    />
  );
}

/**
 * Compact ₹ field without a slider — for lists (net worth, debts, cash flows).
 * Accepts shorthand like 5L, 2.5cr, 40k.
 */
export function MoneyField({
  label,
  value,
  onChange,
  allowNegative = false,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  allowNegative?: boolean;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value ? formatIndian(value) : "");
  useEffect(() => {
    if (!focused) setText(value ? formatIndian(value) : "");
  }, [focused, value]);

  const commit = (raw: string) => {
    const parsed = parseIndianInput(raw);
    const n = parsed === null ? 0 : allowNegative ? parsed : Math.abs(parsed);
    onChange(Math.round(n));
  };

  return (
    <label className="mb-3 flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#5F5E5A]">{label}</span>
      <span
        className={cn(
          "flex min-h-[48px] items-center gap-2 rounded-xl border bg-white px-3.5",
          focused ? "border-[#534AB7]" : "border-[#E8E6F0]",
        )}
        style={{ borderWidth: 1.5 }}
      >
        <span className="select-none text-[15px] font-semibold text-[#9B9A94]">
          ₹
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={hint ?? "0"}
          value={text}
          onFocus={(e) => {
            setFocused(true);
            setText(value ? String(value) : "");
            const el = e.currentTarget;
            queueMicrotask(() => el.select());
          }}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          className="min-w-0 flex-1 border-none bg-transparent font-semibold text-[#111110] outline-none placeholder:text-slate-400"
          style={{ fontSize: 16 }}
        />
      </span>
      {value ? (
        <span className="text-xs text-[#9B9A94]">₹{formatInWords(value)}</span>
      ) : null}
    </label>
  );
}

/** The one number the calculator exists to answer. */
export function Hero({
  label,
  value,
  sub,
  words = true,
}: {
  label: string;
  value: number | string;
  sub?: ReactNode;
  words?: boolean;
}) {
  const isNum = typeof value === "number";
  return (
    <div className="rounded-2xl border border-[#534AB7]/20 bg-[#EEEDFE] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
        {label}
      </p>
      <p className="mt-1 break-words text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
        {isNum ? inr(value) : value}
      </p>
      {isNum && words && Math.abs(value) >= 1 ? (
        <p className="mt-0.5 text-xs text-[#5F5E5A]">
          ₹{formatInWords(Math.round(Math.abs(value)))}
        </p>
      ) : null}
      {sub ? <p className="mt-2 text-sm text-slate-700">{sub}</p> : null}
    </div>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

/** Plain stat tile (non-currency values, or currency without words). */
export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[#9B9A94]">{sub}</p> : null}
    </div>
  );
}

/** Label/value breakdown, e.g. a tax computation. */
export function Rows({
  title,
  rows,
}: {
  title?: string;
  rows: Array<{ label: ReactNode; value: string; strong?: boolean }>;
}) {
  return (
    <div className="rounded-xl border border-[#F0EFF8] bg-white p-4">
      {title ? (
        <p className="mb-2 text-sm font-semibold text-slate-900">{title}</p>
      ) : null}
      <dl className="divide-y divide-[#F0EFF8]">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-4 py-2"
          >
            <dt
              className={cn(
                "min-w-0 text-sm",
                r.strong ? "font-semibold text-slate-900" : "text-slate-600",
              )}
            >
              {r.label}
            </dt>
            <dd
              className={cn(
                "shrink-0 text-right text-sm tabular-nums",
                r.strong
                  ? "font-bold text-slate-900"
                  : "font-medium text-slate-800",
              )}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Horizontal bars comparing a few amounts — light, no chart library. */
export function Bars({
  title,
  items,
  format = inr,
}: {
  title?: string;
  items: Array<{ label: string; value: number; highlight?: boolean }>;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="rounded-xl border border-[#F0EFF8] bg-white p-4">
      {title ? (
        <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span
                className={cn(
                  "min-w-0",
                  i.highlight
                    ? "font-semibold text-slate-900"
                    : "text-slate-600",
                )}
              >
                {i.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                {format(i.value)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  i.highlight ? "bg-[#534AB7]" : "bg-[#534AB7]/40",
                )}
                style={{
                  width: `${Math.max(2, (Math.abs(i.value) / max) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-slate-500">{children}</p>;
}
