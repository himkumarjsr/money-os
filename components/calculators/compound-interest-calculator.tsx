"use client";

import { CALCULATOR_MONEY_MAX } from "@/components/calculators/calculator-ui";
import { compoundInterest, formatCurrency } from "@/lib/finance";
import { useMemo, useState } from "react";

function clampMoney(n: number) {
  return Math.min(CALCULATOR_MONEY_MAX, Math.max(0, n));
}

function CalculatorNumberField({
  label,
  value,
  onChange,
  min = 0,
  max = CALCULATOR_MONEY_MAX,
  step,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[#5F5E5A]">{label}</label>
      <div
        role="presentation"
        className={`flex min-h-[52px] w-full cursor-text items-center gap-2 rounded-xl border bg-white px-4 py-3 box-border transition-[border-color] ${
          focused ? "border-[#534AB7]" : "border-[#E8E6F0]"
        }`}
        style={{ borderWidth: 1.5 }}
        onClick={(e) => {
          const input = e.currentTarget.querySelector("input");
          input?.focus();
          input?.select();
        }}
      >
        {prefix ? (
          <span className="shrink-0 select-none text-[15px] font-semibold text-[#9B9A94]">{prefix}</span>
        ) : null}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clampMoney(Number(e.target.value)))}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 border-none bg-transparent text-base font-semibold text-[#111110] outline-none"
          style={{ fontSize: 16, MozAppearance: "textfield" }}
        />
      </div>
    </div>
  );
}

export function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(10);

  const result = useMemo(
    () => compoundInterest(principal, rate / 100, years),
    [principal, rate, years],
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-[color:var(--color-text)]">Compound interest</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CalculatorNumberField label="Principal" value={principal} onChange={setPrincipal} prefix="₹" />
        <CalculatorNumberField
          label="Annual rate %"
          value={rate}
          onChange={(n) => setRate(Math.min(100, Math.max(0, n)))}
          max={100}
          step={0.1}
        />
        <CalculatorNumberField
          label="Years"
          value={years}
          onChange={(n) => setYears(Math.min(100, Math.max(0, n)))}
          max={100}
          step={1}
        />
      </div>
      <p className="text-sm text-muted sm:text-base">
        Future value (monthly compounding):{" "}
        <span className="font-semibold text-success">{formatCurrency(result)}</span>
      </p>
    </div>
  );
}
