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

export function CarLoanCalculator() {
  const [price, setPrice] = useClamped(12_00_000, 3_00_000, 50_00_000);
  const [downPct, setDownPct] = useClamped(15, 0, 40);
  const [rate, setRate] = useClamped(9.5, 7, 16);
  const [years, setYears] = useClamped(5, 3, 7);
  const [salary, setSalary] = useClamped(90_000, 25_000, 5_00_000);

  const loan = price * (1 - downPct / 100);
  const months = years * 12;
  const e = emi(loan, rate, months);
  const pctOfIncome = salary > 0 ? (e / salary) * 100 : 0;
  const breachEmi = pctOfIncome > 40;
  const affordCap = 6 * salary;
  const breachCar = price > affordCap;

  const tone: InsightTone =
    breachEmi || breachCar ? "bad" : pctOfIncome > 30 || price > affordCap * 0.85
      ? "warn"
      : "good";

  return (
    <div className="space-y-6">
      <SliderField
        label="On-road / ex-showroom price"
        value={price}
        min={3_00_000}
        max={50_00_000}
        step={50_000}
        onChange={setPrice}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Down payment"
        value={downPct}
        min={0}
        max={40}
        step={1}
        onChange={setDownPct}
        format={(v) => `${v}%`}
      />
      <SliderField
        label="Interest rate"
        value={rate}
        min={7}
        max={16}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        value={years}
        min={3}
        max={7}
        step={1}
        onChange={setYears}
        format={(v) => `${v} years`}
      />
      <SliderField
        label="Monthly salary"
        value={salary}
        min={25_000}
        max={5_00_000}
        step={5_000}
        onChange={setSalary}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Loan amount"
          value={formatCurrency(Math.round(loan), "en-IN", "INR")}
        />
        <ResultStat
          label="Monthly EMI"
          value={formatCurrency(Math.round(e), "en-IN", "INR")}
        />
        <ResultStat
          label="EMI % of salary"
          value={`${pctOfIncome.toFixed(1)}%`}
        />
      </div>

      <p className="text-sm text-slate-600">
        Affordability rule of thumb: car value ≤{" "}
        <strong>6×</strong> monthly salary (≈{" "}
        {formatCurrency(Math.round(affordCap), "en-IN", "INR")} for you).
      </p>

      <Insight tone={tone}>
        {breachCar
          ? "Car price exceeds 6× monthly salary — stretch target or add down payment."
          : breachEmi
            ? "EMI is above 40% of salary — consider a cheaper segment or longer tenure cautiously."
            : "Looks within typical affordability bands."}
      </Insight>
    </div>
  );
}
