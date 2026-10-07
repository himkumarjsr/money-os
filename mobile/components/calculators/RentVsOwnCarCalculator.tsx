import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { formatCurrency } from "@/lib/finance";
import {
  CALCULATOR_MONEY_MAX,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  type InsightTone,
} from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
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
    <View style={calcStyles.stack}>
      <SliderField
        label="Monthly km driven"
        unitType="number"
        value={km}
        min={200}
        max={5000}
        step={50}
        onChange={setKm}
        format={(v) => `${v} km`}
      />
      <SliderField
        label="Cab / ride-hail cost per km"
        unitType="money"
        value={cabPerKm}
        min={6}
        max={CALCULATOR_MONEY_MAX}
        step={0.5}
        onChange={setCabPerKm}
        format={(v) => `₹${v}/km`}
      />
      <SliderField
        label="Car purchase price"
        unitType="money"
        value={price}
        min={3_00_000}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setPrice}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <Text style={calcStyles.muted}>
        Owned cost uses straight-line depreciation over 5 years plus ~₹4/km for
        fuel & maintenance (illustrative).
      </Text>

      <ResultGrid>
        <ResultStat
          label="Monthly cab / rental cost"
          value={formatCurrency(Math.round(cabCost), "en-IN", "INR")}
        />
        <ResultStat
          label="Monthly owned-car cost (est.)"
          value={formatCurrency(Math.round(ownCost), "en-IN", "INR")}
        />
      </ResultGrid>

      <Insight tone={tone}>
        {cheaper === "own"
          ? `Owning looks cheaper at ~${formatCurrency(Math.round(ownCost), "en-IN", "INR")}/mo vs cab — if utilisation stays high and EMIs are manageable.`
          : `Cabs look cheaper at ~${formatCurrency(Math.round(cabCost), "en-IN", "INR")}/mo unless you need daily reliability or outsized km.`}
      </Insight>
    </View>
  );
}
