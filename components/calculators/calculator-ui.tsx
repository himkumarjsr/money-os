"use client";

import { cn } from "@/lib/cn";
import {
  CALCULATOR_MONEY_MAX,
  clampCalculatorValue,
  formatCalculatorFieldValue,
} from "@/lib/calculatorInput";
import {
  formatIndian,
  formatInWords,
  formatSliderLabel,
  parseIndianInput,
} from "@/lib/formatters";
import { useEffect, useMemo, useState, type ReactNode } from "react";

export { CALCULATOR_MONEY_MAX };

function formatFieldValue(
  value: number,
  type: "money" | "percent" | "years" | "months" | "number",
  step: number,
): string {
  return formatCalculatorFieldValue(value, type, step, formatIndian);
}

export function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  step: stepProp,
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

  const isMoney = detectedType === "money";
  const isPercent = detectedType === "percent";
  /** Interest / return fields default to 0.1 so decimals work on the slider. */
  const step = stepProp ?? (isPercent ? 0.1 : 1);
  const inputMax = isMoney ? Math.min(max, CALCULATOR_MONEY_MAX) : max;
  const sliderMax = Math.min(Math.max(max, min), inputMax);

  const leftUnit = isMoney ? "₹" : "";
  const rightUnit =
    detectedType === "percent"
      ? "%"
      : detectedType === "years"
        ? "yrs"
        : detectedType === "months"
          ? "mo"
          : detectedType === "number"
            ? ""
            : (suffix ?? "");

  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(() =>
    formatFieldValue(
      Math.min(Math.max(value, min), inputMax),
      detectedType,
      step,
    ),
  );

  useEffect(() => {
    if (focused) return;
    setDisplayValue(
      formatFieldValue(
        Math.min(Math.max(value, min), inputMax),
        detectedType,
        step,
      ),
    );
  }, [detectedType, focused, inputMax, min, step, value]);

  const commitValue = (raw: number) => {
    const clamped = clampCalculatorValue(raw, min, inputMax, step);
    onChange(clamped);
    return clamped;
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow typing decimals (e.g. "7.", "7.5") without fighting the field.
    if (isPercent || detectedType === "number") {
      if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw.replace(/,/g, ""))) return;
    }
    setDisplayValue(raw);

    // Live-sync rate slider while a complete number is typed (not trailing ".").
    if (!isPercent) return;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "-" || trimmed.endsWith(".")) return;
    const parsed = parseIndianInput(trimmed);
    if (parsed === null) return;
    const clamped = clampCalculatorValue(parsed, min, inputMax, step);
    if (clamped !== value) onChange(clamped);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    const parsed = parseIndianInput(e.target.value);
    if (parsed === null) {
      setDisplayValue(formatFieldValue(value, detectedType, step));
      return;
    }
    const clamped = commitValue(parsed);
    setDisplayValue(formatFieldValue(clamped, detectedType, step));
  };

  const words = useMemo(
    () => formatSliderLabel(Math.max(0, value), detectedType, step),
    [detectedType, step, value],
  );

  const sliderValue = Math.min(Math.max(value, min), sliderMax);

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[#5F5E5A]">
        {label}
      </label>

      <div
        role="presentation"
        className={cn(
          "flex w-full min-h-[52px] cursor-text items-center gap-2 rounded-xl border bg-white px-4 py-3 transition-[border-color] box-border",
          focused ? "border-[#534AB7]" : "border-[#E8E6F0]",
        )}
        style={{ borderWidth: focused ? 1.5 : 1.5 }}
        onClick={(e) => {
          const target = e.currentTarget.querySelector("input");
          if (!(target instanceof HTMLInputElement)) return;
          target.focus();
          target.select();
        }}
      >
        {leftUnit ? (
          <span className="shrink-0 select-none text-[15px] font-semibold text-[#9B9A94]">
            {leftUnit}
          </span>
        ) : null}
        <input
          type="text"
          inputMode={
            isPercent || detectedType === "number" ? "decimal" : "numeric"
          }
          value={displayValue}
          onChange={handleManualInput}
          onBlur={handleBlur}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          className="min-w-0 flex-1 border-none bg-transparent text-base font-semibold text-[#111110] outline-none"
          style={{ fontSize: 16 }}
        />
        {rightUnit ? (
          <span
            className={cn(
              "shrink-0 select-none text-[13px]",
              detectedType === "percent"
                ? "font-semibold text-[#534AB7]"
                : "font-medium text-[#888780]",
            )}
          >
            {rightUnit}
          </span>
        ) : null}
      </div>

      <input
        type="range"
        min={min}
        max={sliderMax}
        step={step}
        value={sliderValue}
        onChange={(e) => commitValue(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[#534AB7]"
      />
      <div className="text-right text-xs text-[#9B9A94]">{words}</div>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[#5F5E5A]">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "box-border min-h-[52px] w-full rounded-xl border bg-white px-4 py-3 text-base font-semibold text-[#111110] outline-none transition-[border-color]",
          focused ? "border-[#534AB7]" : "border-[#E8E6F0]",
        )}
        style={{ borderWidth: 1.5 }}
      />
    </div>
  );
}

export function ResultStat({ label, value }: { label: string; value: string }) {
  let display = value;
  let words = "";
  if (value.startsWith("₹")) {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(numeric)) {
      const isMonthly = /monthly|\/month|emi/i.test(label);
      const rounded = isMonthly ? numeric : Math.round(numeric);
      const formatted = isMonthly
        ? rounded.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
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
