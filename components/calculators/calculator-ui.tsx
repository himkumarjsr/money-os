"use client";

import { cn } from "@/lib/cn";
import { formatIndian, formatInWords, formatSliderLabel, parseIndianInput } from "@/lib/formatters";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  unitType?: "money" | "percent" | "years" | "months" | "number";
};

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  unitType,
}: SliderFieldProps) {
  const detectedType: "money" | "percent" | "years" | "months" | "number" =
    unitType ??
    (/interest|rate|return|%/i.test(label)
      ? "percent"
      : /tenure|period|year|age/i.test(label)
        ? "years"
        : /month|months/i.test(label)
          ? "months"
          : "money");

  const leftUnit = detectedType === "money" ? "₹" : "";
  const rightUnit =
    detectedType === "percent"
      ? "%"
      : detectedType === "years"
        ? "yrs"
        : detectedType === "months"
          ? "mo"
            : detectedType === "number"
              ? ""
          : suffix ?? "";
  const effectiveMax = Math.max(max, min, value);

  const [displayValue, setDisplayValue] = useState(() =>
    Number.isFinite(value) ? formatIndian(Math.min(Math.max(value, min), effectiveMax)) : "0",
  );

  useEffect(() => {
    setDisplayValue(formatIndian(Math.min(Math.max(value, min), effectiveMax)));
  }, [effectiveMax, min, value]);

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseIndianInput(e.target.value);
    if (parsed === null) {
      setDisplayValue(formatIndian(value));
      return;
    }
    const clamped = Math.min(effectiveMax, Math.max(min, parsed));
    onChange(clamped);
    setDisplayValue(formatIndian(clamped));
  };

  const words = useMemo(
    () => formatSliderLabel(Math.max(0, value), detectedType),
    [detectedType, value],
  );

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-[#5F5E5A]">{label}</label>
        <div
          className="flex min-w-[155px] items-center gap-1 rounded-lg border border-[#E8E6F8] bg-[#F4F2FC] px-3 py-1.5 sm:min-w-[170px]"
          onClick={(e) => {
            const target = e.currentTarget.querySelector("input");
            if (!(target instanceof HTMLInputElement)) return;
            target.focus();
            target.select();
          }}
        >
          {leftUnit ? (
            <span className="shrink-0 text-[13px] font-semibold text-[#534AB7]">
              {leftUnit}
            </span>
          ) : null}
          <input
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleManualInput}
            onBlur={handleBlur}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(
              "w-full min-w-0 border-none bg-transparent text-right text-base font-semibold text-[#111110] outline-none",
            )}
          />
          {rightUnit ? (
            <span
              className={cn(
                "text-[13px]",
                detectedType === "percent"
                  ? "font-semibold text-[#534AB7]"
                  : "font-medium text-[#888780]",
              )}
            >
              {rightUnit}
            </span>
          ) : null}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={effectiveMax}
        step={step}
        value={Math.min(Math.max(value, min), effectiveMax)}
        onChange={(e) => onChange(Math.min(effectiveMax, Math.max(min, Number(e.target.value))))}
        className="h-2 w-full cursor-pointer accent-[#534AB7]"
      />
      <div className="mt-1.5 text-right text-xs text-[#9B9A94]">{words}</div>
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
  let display = value;
  let words = "";
  if (value.startsWith("₹")) {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(numeric)) {
      const isMonthly = /monthly|\/month|emi/i.test(label);
      const rounded = isMonthly ? numeric : Math.round(numeric);
      const formatted = isMonthly
        ? rounded.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : formatIndian(rounded);
      display = `₹${formatted}`;
      words = formatInWords(Math.floor(rounded));
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
        {display}
      </p>
      {words ? <p className="mt-1 text-xs text-[#9B9A94]">{words}</p> : null}
    </div>
  );
}
