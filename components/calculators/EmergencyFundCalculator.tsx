"use client";

import type { LifeStage } from "@/lib/analyse-form-schema";
import { formatCurrency } from "@/lib/finance";
import { useCallback, useState } from "react";
import { Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

const MONTHS: Record<LifeStage, number> = {
  single_bachelor: 3,
  married_no_kids: 6,
  married_with_kids: 9,
  pre_retirement_50_plus: 12,
};

const LABELS: Record<LifeStage, string> = {
  single_bachelor: "Single / bachelor",
  married_no_kids: "Married, no kids",
  married_with_kids: "Married with kids",
  pre_retirement_50_plus: "Pre-retirement (50+)",
};

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

export function EmergencyFundCalculator() {
  const [expenses, setExpenses] = useClamped(60_000, 15_000, 3_00_000);
  const [stage, setStage] = useState<LifeStage>("married_no_kids");
  const [current, setCurrent] = useClamped(2_00_000, 0, 50_00_000);
  const [saveMonthly, setSaveMonthly] = useClamped(15_000, 1_000, 2_00_000);

  const monthsNeeded = MONTHS[stage];
  const target = expenses * monthsNeeded;
  const gap = Math.max(0, target - current);
  const monthsToFill = saveMonthly > 0 ? gap / saveMonthly : Infinity;

  let tone: InsightTone = "good";
  if (gap > target * 0.5) tone = "bad";
  else if (gap > 0) tone = "warn";

  return (
    <div className="space-y-6">
      <SliderField
        label="Monthly expenses (must-cover)"
        value={expenses}
        min={15_000}
        max={3_00_000}
        step={1_000}
        onChange={setExpenses}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Life stage</label>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as LifeStage)}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#534AB7]/25"
        >
          {(Object.keys(MONTHS) as LifeStage[]).map((k) => (
            <option key={k} value={k}>
              {LABELS[k]} ({MONTHS[k]} mo target)
            </option>
          ))}
        </select>
      </div>

      <SliderField
        label="Current emergency fund"
        value={current}
        min={0}
        max={50_00_000}
        step={25_000}
        onChange={setCurrent}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Monthly amount you can add"
        value={saveMonthly}
        min={1_000}
        max={2_00_000}
        step={1_000}
        onChange={setSaveMonthly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Target fund"
          value={formatCurrency(Math.round(target), "en-IN", "INR")}
        />
        <ResultStat
          label="Gap"
          value={formatCurrency(Math.round(gap), "en-IN", "INR")}
        />
        <ResultStat
          label="Months to close gap"
          value={
            monthsToFill === Infinity
              ? "—"
              : `${Math.ceil(monthsToFill)} months`
          }
        />
      </div>

      <Insight tone={tone}>
        {gap <= expenses * 0.5
          ? "You are close to a sensible cushion — top up toward the full target."
          : `Aim for ${monthsNeeded} months of expenses (${LABELS[stage]}) in liquid/low-risk funds.`}
      </Insight>
    </div>
  );
}
