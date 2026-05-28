"use client";

import { formatCurrency } from "@/lib/finance";
import { useCallback, useState } from "react";
import { CALCULATOR_MONEY_MAX, Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() =>
    Math.min(max, Math.max(min, initial)),
  );
  const set = useCallback(
    (nv: number) => setV(Math.max(min, nv)),
    [min],
  );
  return [v, set] as const;
}

export function WhenToBuyCarCalculator() {
  const [income, setIncome] = useClamped(1_00_000, 30_000, 5_00_000);
  const [car, setCar] = useClamped(10_00_000, 4_00_000, 45_00_000);
  const [save, setSave] = useClamped(20_000, 5_000, 1_50_000);

  const downTarget = car * 0.2;
  const months = save > 0 ? Math.ceil(downTarget / save) : Infinity;
  const maxPrice = income * 6;
  const affordable = car <= maxPrice;
  const saveOk = months <= 36;

  let tone: InsightTone = "good";
  if (!affordable || !saveOk) tone = "bad";
  else if (months > 24) tone = "warn";

  return (
    <div className="space-y-6">
      <SliderField
        label="Monthly take-home"
        unitType="money"
        value={income}
        min={30_000}
        max={CALCULATOR_MONEY_MAX}
        step={5_000}
        onChange={setIncome}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Target car price"
        unitType="money"
        value={car}
        min={4_00_000}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setCar}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Monthly savings toward down payment"
        unitType="money"
        value={save}
        min={5_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setSave}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultStat
          label="20% down payment target"
          value={formatCurrency(Math.round(downTarget), "en-IN", "INR")}
        />
        <ResultStat
          label="Months to save 20% down"
          value={months === Infinity ? "—" : `${months} months`}
        />
      </div>

      <Insight tone={tone}>
        {!affordable
          ? `Car price exceeds 6× salary (₹${Math.round(maxPrice).toLocaleString("en-IN")} cap) — downsize target.`
          : !saveOk
            ? "At this savings pace, 20% down takes over 3 years — increase SIP or pick a lower segment."
            : `Looks workable: ${months} months to 20% down while staying under the 6× salary guardrail.`}
      </Insight>
    </div>
  );
}
