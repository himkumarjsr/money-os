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

type Scheme = {
  id: string;
  name: string;
  rate: string;
  tenure: string;
  tax: string;
  note: string;
  recommended: (age: number) => boolean;
};

const SCHEMES: Scheme[] = [
  {
    id: "posa",
    name: "Post Office Savings Account",
    rate: "~4.0% p.a. (floating)",
    tenure: "On demand",
    tax: "Interest taxable",
    note: "Parking cash with PO banking access.",
    recommended: (a) => a >= 18 && a < 35,
  },
  {
    id: "td",
    name: "Post Office Time Deposit (5-yr)",
    rate: "~6.9% p.a. (illustrative)",
    tenure: "1–5 year buckets",
    tax: "Interest taxable",
    note: "FD ladder for known goals.",
    recommended: (a) => a >= 30 && a < 55,
  },
  {
    id: "rd",
    name: "National Savings Recurring Deposit",
    rate: "~6.7% p.a. (illustrative)",
    tenure: "5 years",
    tax: "Interest taxable",
    note: "Forced monthly discipline.",
    recommended: (a) => a >= 22 && a < 45,
  },
  {
    id: "nsc",
    name: "National Savings Certificate (VIII)",
    rate: "~7.7% p.a. (illustrative)",
    tenure: "5 years (compounded annually)",
    tax: "Interest taxable (deemed reinvested)",
    note: "Fixed return for mid-term lock-in.",
    recommended: (a) => a >= 25 && a < 60,
  },
  {
    id: "kvp",
    name: "Kisan Vikas Patra",
    rate: "~7.5% p.a. (illustrative)",
    tenure: "~115 months to double (changes with rate)",
    tax: "Interest taxable",
    note: "Lump-sum, transferable certificate.",
    recommended: (a) => a >= 30 && a < 58,
  },
  {
    id: "mis",
    name: "Monthly Income Scheme",
    rate: "~7.4% p.a. (illustrative)",
    tenure: "5 years; monthly payout",
    tax: "Interest taxable",
    note: "Supplement pension-like cash flow.",
    recommended: (a) => a >= 45,
  },
  {
    id: "scss",
    name: "Senior Citizen Savings Scheme",
    rate: "8.2% p.a. (illustrative cap)",
    tenure: "5 years (extendable)",
    tax: "Interest taxable; 80TTB may help seniors",
    note: "Only if age ≥ 60 (or eligible rules).",
    recommended: (a) => a >= 60,
  },
];

export function PostOfficeCalculator() {
  const [age, setAge] = useClamped(35, 18, 85);
  const [amount, setAmount] = useClamped(2_00_000, 10_000, 50_00_000);

  const tone: InsightTone = age >= 60 ? "good" : age < 30 ? "warn" : "good";

  return (
    <div className="space-y-6">
      <SliderField
        label="Your age"
        value={age}
        min={18}
        max={85}
        step={1}
        onChange={setAge}
        format={(v) => `${v} years`}
      />
      <SliderField
        label="Lump sum to deploy"
        value={amount}
        min={10_000}
        max={50_00_000}
        step={10_000}
        onChange={setAmount}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <ResultStat
        label="Illustrative cheque size"
        value={formatCurrency(amount, "en-IN", "INR")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCHEMES.map((s) => {
          const rec = s.recommended(age);
          const disabled = s.id === "scss" && age < 60;
          return (
            <div
              key={s.id}
              className={`relative rounded-2xl border p-4 text-sm shadow-sm ${
                disabled
                  ? "border-slate-100 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white"
              }`}
            >
              {rec && !disabled ? (
                <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Recommended
                </span>
              ) : null}
              <p className="font-semibold text-slate-900">{s.name}</p>
              <p className="mt-2 text-slate-600">
                <span className="font-medium text-[#534AB7]">Rate:</span>{" "}
                {s.rate}
              </p>
              <p className="mt-1 text-slate-600">
                <span className="font-medium text-[#534AB7]">Tenure:</span>{" "}
                {s.tenure}
              </p>
              <p className="mt-1 text-slate-600">
                <span className="font-medium text-[#534AB7]">Tax:</span> {s.tax}
              </p>
              <p className="mt-3 text-xs text-slate-500">{s.note}</p>
              {disabled ? (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Not eligible by age — shown for awareness only.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <Insight tone={tone}>
        Rates/tenures change with government notifications — confirm on India
        Post or RBI circulars before investing. PPF (outside this PO grid) often
        competes for long horizons; here we focus on classic PO instruments.
      </Insight>
    </div>
  );
}
