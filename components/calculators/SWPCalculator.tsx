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

function monthsCorpusLasts(
  corpus: number,
  withdraw: number,
  annualPct: number,
  maxMonths = 600,
): number {
  if (corpus <= 0 || withdraw <= 0) return 0;
  const r = annualPct / 100 / 12;
  let bal = corpus;
  for (let m = 0; m < maxMonths; m += 1) {
    bal = bal * (1 + r) - withdraw;
    if (bal <= 0) return m + 1;
  }
  return maxMonths;
}

/** Withdrawal that keeps balance ≈ flat (interest-only sustainability). */
function sustainableMonthly(corpus: number, annualPct: number) {
  const r = annualPct / 100 / 12;
  if (r <= 0) return 0;
  return corpus * r;
}

export function SWPCalculator() {
  const [corpus, setCorpus] = useClamped(50_00_000, 5_00_000, 5_00_00_000);
  const [withdraw, setWithdraw] = useClamped(40_000, 5_000, 5_00_000);
  const [rate, setRate] = useClamped(8, 3, 15);

  const lasts = monthsCorpusLasts(corpus, withdraw, rate);
  const sustain = sustainableMonthly(corpus, rate);
  const yearsLeft = lasts / 12;

  let tone: InsightTone = "good";
  if (lasts < 120 || withdraw > sustain * 1.1) tone = "bad";
  else if (lasts < 180 || withdraw > sustain) tone = "warn";

  return (
    <div className="space-y-6">
      <SliderField
        label="Corpus"
        value={corpus}
        min={5_00_000}
        max={5_00_00_000}
        step={50_000}
        onChange={setCorpus}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Monthly withdrawal"
        value={withdraw}
        min={5_000}
        max={5_00_000}
        step={1_000}
        onChange={setWithdraw}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Expected return (pre-tax)"
        value={rate}
        min={3}
        max={15}
        step={0.5}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultStat
          label="Corpus lasts"
          value={
            lasts >= 600
              ? "50+ years (at this rate)"
              : `${yearsLeft.toFixed(1)} years (${lasts} months)`
          }
        />
        <ResultStat
          label="Sustainable monthly (interest-only)"
          value={formatCurrency(Math.round(sustain), "en-IN", "INR")}
        />
      </div>

      <Insight tone={tone}>
        {withdraw <= sustain
          ? "Withdrawals are within the corpus’ natural yield — principal can stay intact."
          : lasts >= 600
            ? "Withdrawal pace is very conservative — corpus may outlive the plan."
            : `At this pace the corpus may run out in ~${yearsLeft.toFixed(1)} years. Consider lowering SWP toward ₹${Math.round(sustain).toLocaleString("en-IN")}/mo or growing equity share.`}
      </Insight>
    </div>
  );
}
