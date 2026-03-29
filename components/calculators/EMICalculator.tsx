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

export function EMICalculator() {
  const [loan, setLoan] = useClamped(25_00_000, 1_00_000, 2_00_00_000);
  const [rate, setRate] = useClamped(10.5, 6, 18);
  const [tenure, setTenure] = useClamped(60, 12, 360);

  const e = emi(loan, rate, tenure);
  const totalPay = e * tenure;
  const interest = totalPay - loan;

  const interestRatio = loan > 0 ? interest / loan : 0;
  const tone: InsightTone =
    interestRatio < 0.35 ? "good" : interestRatio < 0.55 ? "warn" : "bad";

  return (
    <div className="space-y-6">
      <SliderField
        label="Loan amount"
        value={loan}
        min={1_00_000}
        max={2_00_00_000}
        step={50_000}
        onChange={setLoan}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Interest rate"
        value={rate}
        min={6}
        max={18}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        value={tenure}
        min={12}
        max={360}
        step={1}
        onChange={setTenure}
        format={(v) => `${v} months (${(v / 12).toFixed(1)} yr)`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Monthly EMI"
          value={formatCurrency(Math.round(e), "en-IN", "INR")}
        />
        <ResultStat
          label="Total payment"
          value={formatCurrency(Math.round(totalPay), "en-IN", "INR")}
        />
        <ResultStat
          label="Total interest"
          value={formatCurrency(Math.round(interest), "en-IN", "INR")}
        />
      </div>

      <Insight tone={tone}>
        Interest is about <strong>{(interestRatio * 100).toFixed(0)}%</strong> of
        principal — {interestRatio < 0.45 ? "consider prepayment when possible." : "explore shorter tenure or balance transfer if eligible."}
      </Insight>
    </div>
  );
}
