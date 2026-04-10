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

export function NSCCalculator() {
  const [principal, setPrincipal] = useClamped(1_00_000, 1_000, 10_00_000);
  const [rate, setRate] = useClamped(7.7, 6, 9);

  const maturity = principal * Math.pow(1 + rate / 100, 5);
  const interest = maturity - principal;
  const tone: InsightTone = interest > principal * 0.35 ? "good" : "warn";

  return (
    <div className="space-y-6">
      <SliderField
        label="One-time investment"
        unitType="money"
        value={principal}
        min={1_000}
        max={10_00_000}
        step={5_000}
        onChange={setPrincipal}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Assumed annual rate"
        unitType="percent"
        value={rate}
        min={6}
        max={9}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="5-year maturity"
          value={formatCurrency(Math.round(maturity), "en-IN", "INR")}
        />
        <ResultStat
          label="Principal"
          value={formatCurrency(principal, "en-IN", "INR")}
        />
        <ResultStat
          label="Interest earned"
          value={formatCurrency(Math.round(interest), "en-IN", "INR")}
        />
      </div>

      <Insight tone={tone}>
        NSC interest is taxable as per your slab — still useful for guaranteed
        5-year lock-in vs volatile markets.
      </Insight>
    </div>
  );
}
