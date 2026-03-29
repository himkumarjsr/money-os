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

/** Year-end deposits, annual compounding — 15 equal contributions. */
function ppfv(yearly: number, annualPct: number) {
  const r = annualPct / 100;
  if (r <= 0) return yearly * 15;
  return yearly * ((Math.pow(1 + r, 15) - 1) / r) * (1 + r);
}

export function PPFCalculator() {
  const [yearly, setYearly] = useClamped(1_50_000, 500, 1_50_000);
  const [rate, setRate] = useClamped(7.1, 6, 9);

  const fv = ppfv(yearly, rate);
  const invested = yearly * 15;
  const gain = fv - invested;
  const tone: InsightTone = gain / Math.max(invested, 1) > 0.85 ? "good" : "warn";

  return (
    <div className="space-y-6">
      <SliderField
        label="Yearly deposit"
        value={yearly}
        min={500}
        max={1_50_000}
        step={500}
        onChange={setYearly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Assumed rate (illustrative)"
        value={rate}
        min={6}
        max={9}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="15-year maturity (approx)"
          value={formatCurrency(Math.round(fv), "en-IN", "INR")}
        />
        <ResultStat
          label="Total invested"
          value={formatCurrency(invested, "en-IN", "INR")}
        />
        <ResultStat
          label="Tax-free gain (EEE)"
          value={formatCurrency(Math.round(gain), "en-IN", "INR")}
        />
      </div>

      <Insight tone={tone}>
        PPF is EEE for qualifying contributions — extend beyond 15y in blocks
        of 5y if you still need tax-free debt-free compounding.
      </Insight>
    </div>
  );
}
