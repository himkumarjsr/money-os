"use client";

import { formatCurrency } from "@/lib/finance";
import { useCallback, useState } from "react";
import { Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() =>
    Math.min(max, Math.max(min, initial)),
  );
  const set = useCallback(
    (nv: number) => setV(Math.min(max, Math.max(min, nv))),
    [min, max],
  );
  return [v, set] as const;
}

function emi(principal: number, annualPct: number, months: number) {
  if (months <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r <= 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export function HomeLoanCalculator() {
  const [value, setValue] = useClamped(80_00_000, 10_00_000, 5_00_00_000);
  const [downPct, setDownPct] = useClamped(20, 10, 50);
  const [rate, setRate] = useClamped(8.5, 7, 12);
  const [years, setYears] = useClamped(20, 5, 30);
  const [income, setIncome] = useClamped(1_50_000, 25_000, 10_00_000);

  const loan = value * (1 - downPct / 100);
  const months = years * 12;
  const e = emi(loan, rate, months);
  const pctOfIncome = income > 0 ? (e / income) * 100 : 0;
  const breach = pctOfIncome > 40;

  const tone: InsightTone = breach ? "bad" : pctOfIncome > 32 ? "warn" : "good";

  return (
    <div className="space-y-6">
      <SliderField
        label="Property value"
        value={value}
        min={10_00_000}
        max={5_00_00_000}
        step={5_00_000}
        onChange={setValue}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Down payment"
        value={downPct}
        min={10}
        max={50}
        step={1}
        onChange={setDownPct}
        format={(v) => `${v}%`}
      />
      <SliderField
        label="Interest rate"
        value={rate}
        min={7}
        max={12}
        step={0.05}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        value={years}
        min={5}
        max={30}
        step={1}
        onChange={setYears}
        format={(v) => `${v} years`}
      />
      <SliderField
        label="Monthly take-home (household)"
        value={income}
        min={25_000}
        max={10_00_000}
        step={5_000}
        onChange={setIncome}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Loan amount"
          value={formatCurrency(Math.round(loan), "en-IN", "INR")}
        />
        <ResultStat
          label="Monthly EMI"
          value={formatCurrency(Math.round(e), "en-IN", "INR")}
        />
        <ResultStat
          label="EMI % of income"
          value={`${pctOfIncome.toFixed(1)}%`}
        />
      </div>

      <Insight tone={tone}>
        {breach
          ? "EMI is above 40% of stated income — high strain. Increase down payment, stretch tenure, or revisit budget."
          : pctOfIncome > 32
            ? "EMI is workable but leaves limited buffer — keep 6-month EMI in liquid savings."
            : "EMI is within a healthy slice of income."}
      </Insight>
    </div>
  );
}
