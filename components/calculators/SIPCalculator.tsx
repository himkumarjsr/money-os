"use client";

import { formatCurrency } from "@/lib/finance";
import { useCallback, useState } from "react";
import { Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

function sipMaturity(monthly: number, annualPct: number, years: number) {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  if (r <= 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

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

export function SIPCalculator() {
  const [monthly, setMonthly] = useClamped(10_000, 500, 100_000);
  const [rate, setRate] = useClamped(12, 6, 20);
  const [years, setYears] = useClamped(15, 1, 30);

  const fv = sipMaturity(monthly, rate, years);
  const invested = monthly * years * 12;
  const gain = fv - invested;
  const mult = invested > 0 ? fv / invested : 0;
  const insightTone: InsightTone =
    mult >= 2.5 ? "good" : mult >= 1.8 ? "warn" : "bad";

  return (
    <div className="space-y-6">
      <SliderField
        label="Monthly SIP"
        value={monthly}
        min={500}
        max={100_000}
        step={500}
        onChange={setMonthly}
        format={(val) => formatCurrency(val, "en-IN", "INR")}
      />
      <SliderField
        label="Expected annual return"
        value={rate}
        min={6}
        max={20}
        step={0.5}
        onChange={setRate}
        format={(val) => `${val}% p.a.`}
      />
      <SliderField
        label="Investment period"
        value={years}
        min={1}
        max={30}
        step={1}
        onChange={setYears}
        format={(val) => `${val} years`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Maturity value"
          value={formatCurrency(Math.round(fv), "en-IN", "INR")}
        />
        <ResultStat
          label="Invested"
          value={formatCurrency(invested, "en-IN", "INR")}
        />
        <ResultStat
          label="Total gain"
          value={formatCurrency(Math.round(gain), "en-IN", "INR")}
        />
      </div>

      <Insight tone={insightTone}>
        Your money grows <strong>{mult.toFixed(1)}×</strong> — roughly ₹
        {mult.toFixed(1)} for every ₹1 put in (at {rate}% p.a.).
      </Insight>
    </div>
  );
}
