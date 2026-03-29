"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type InsightTone = "good" | "warn" | "bad";

const insightStyles: Record<InsightTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-900",
};

export function Insight({
  tone,
  children,
}: {
  tone: InsightTone;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-4 rounded-xl border px-4 py-3 text-sm font-medium leading-relaxed",
        insightStyles[tone],
      )}
    >
      {children}
    </div>
  );
}

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  format?: (v: number) => string;
};

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  prefix,
  format,
}: SliderFieldProps) {
  const display = format
    ? format(value)
    : `${prefix ?? ""}${value.toLocaleString("en-IN")}${suffix ?? ""}`;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-semibold tabular-nums text-[#534AB7]">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[#534AB7]"
      />
    </div>
  );
}

export function ResultStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
