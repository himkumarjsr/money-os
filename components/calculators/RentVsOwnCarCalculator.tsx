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

/** Rough owned-car monthly: depreciation + fuel/maintenance. */
function ownedMonthly(km: number, carPrice: number) {
  const depreciation = carPrice / 60;
  const perKm = 4;
  return depreciation + km * perKm;
}

export function RentVsOwnCarCalculator() {
  const [km, setKm] = useClamped(1200, 200, 5000);
  const [cabPerKm, setCabPerKm] = useClamped(12, 6, 25);
  const [price, setPrice] = useClamped(9_00_000, 3_00_000, 40_00_000);

  const cabCost = km * cabPerKm;
  const ownCost = ownedMonthly(km, price);
  const cheaper = cabCost < ownCost ? "cab" : "own";
  const tone: InsightTone =
    Math.abs(cabCost - ownCost) < ownCost * 0.08
      ? "warn"
      : cheaper === "own"
        ? "good"
        : "warn";

  return (
    <div className="space-y-6">
      <SliderField
        label="Monthly km driven"
        value={km}
        min={200}
        max={5000}
        step={50}
        onChange={setKm}
        format={(v) => `${v} km`}
      />
      <SliderField
        label="Cab / ride-hail cost per km"
        value={cabPerKm}
        min={6}
        max={25}
        step={0.5}
        onChange={setCabPerKm}
        format={(v) => `₹${v}/km`}
      />
      <SliderField
        label="Car purchase price"
        value={price}
        min={3_00_000}
        max={40_00_000}
        step={50_000}
        onChange={setPrice}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <p className="text-xs text-slate-500">
        Owned cost uses straight-line depreciation over 5 years plus ~₹4/km for
        fuel &amp; maintenance (illustrative).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultStat
          label="Monthly cab / rental cost"
          value={formatCurrency(Math.round(cabCost), "en-IN", "INR")}
        />
        <ResultStat
          label="Monthly owned-car cost (est.)"
          value={formatCurrency(Math.round(ownCost), "en-IN", "INR")}
        />
      </div>

      <Insight tone={tone}>
        {cheaper === "own"
          ? `Owning looks cheaper at ~${formatCurrency(Math.round(ownCost), "en-IN", "INR")}/mo vs cab — if utilisation stays high and EMIs are manageable.`
          : `Cabs look cheaper at ~${formatCurrency(Math.round(cabCost), "en-IN", "INR")}/mo unless you need daily reliability or outsized km.`}
      </Insight>
    </div>
  );
}
