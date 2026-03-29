"use client";

import { compoundInterest, formatCurrency } from "@/lib/finance";
import { useMemo, useState } from "react";

export function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(10);

  const result = useMemo(
    () => compoundInterest(principal, rate / 100, years),
    [principal, rate, years],
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-[color:var(--color-text)]">
        Compound interest
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Principal</span>
          <input
            type="number"
            min={0}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-surface-alt px-3 text-[color:var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--ring-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Annual rate %</span>
          <input
            type="number"
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-surface-alt px-3 text-[color:var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--ring-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Years</span>
          <input
            type="number"
            min={0}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-border bg-surface-alt px-3 text-[color:var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--ring-primary)]"
          />
        </label>
      </div>
      <p className="text-sm text-muted sm:text-base">
        Future value (monthly compounding):{" "}
        <span className="font-semibold text-success">
          {formatCurrency(result)}
        </span>
      </p>
    </div>
  );
}
