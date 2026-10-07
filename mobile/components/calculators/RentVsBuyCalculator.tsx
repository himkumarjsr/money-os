import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { formatCurrency } from "@/lib/finance";
import {
  B,
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

function emi(principal: number, annualPct: number, months: number) {
  if (months <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r <= 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export function RentVsBuyCalculator() {
  const [value, setValue] = useClamped(1_00_00_000, 30_00_000, 5_00_00_000);
  const [rent, setRent] = useClamped(28_000, 8_000, 2_00_000);
  const [rate, setRate] = useClamped(8.5, 7, 12);
  const [years, setYears] = useClamped(10, 2, 25);

  const downPct = 20;
  const down = value * (downPct / 100);
  const loan = value - down;
  const months = years * 12;
  const e = emi(loan, rate, months);
  const buyOutflow = down + e * months;
  const rentOutflow = rent * 12 * years;
  const buyHigher = buyOutflow > rentOutflow;
  const verdict = buyHigher
    ? "Over this window, total rent paid looks lower than down payment + EMIs (excludes property price change & tax perks)."
    : "Buying’s cash-outflow can be lower than renting if you hold the full period — still model maintenance & registration.";

  const tone: InsightTone = buyHigher ? "warn" : "good";

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Property price"
        unitType="money"
        value={value}
        min={30_00_000}
        max={CALCULATOR_MONEY_MAX}
        step={10_00_000}
        onChange={setValue}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Comparable monthly rent"
        unitType="money"
        value={rent}
        min={8_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setRent}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Home loan rate"
        unitType="percent"
        value={rate}
        min={7}
        max={12}
        step={0.05}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Years you plan to stay"
        unitType="years"
        value={years}
        min={2}
        max={25}
        step={1}
        onChange={setYears}
        format={(v) => `${v} years`}
      />

      <Text style={calcStyles.muted}>
        Illustration assumes {downPct}% down, rest financed for the full stay.
      </Text>

      <ResultGrid>
        <ResultStat
          label="EMI vs rent (monthly)"
          value={`${formatCurrency(Math.round(e), "en-IN", "INR")} vs ${formatCurrency(rent, "en-IN", "INR")}`}
        />
        <ResultStat
          label="Total paid (buy vs rent)"
          value={`${formatCurrency(Math.round(buyOutflow), "en-IN", "INR")} vs ${formatCurrency(Math.round(rentOutflow), "en-IN", "INR")}`}
        />
      </ResultGrid>

      <Insight tone={tone}>
        <B>Verdict:</B> {verdict}
      </Insight>
    </View>
  );
}
