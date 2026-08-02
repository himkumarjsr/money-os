"use client";

import { formatIndian } from "@/lib/formatters";
import { useMemo, useState } from "react";
import LearnToolEmbed from "./LearnToolEmbed";

/** Simple reducing-balance EMI. */
function emi(principal: number, annualPct: number, months: number) {
  const r = annualPct / 100 / 12;
  if (months <= 0) return 0;
  if (r <= 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * r * pow) / (pow - 1);
}

function totalInterest(
  principal: number,
  annualPct: number,
  months: number,
  monthlyEmi: number,
) {
  return Math.max(0, monthlyEmi * months - principal);
}

/**
 * After a lump-sum prepayment, either keep tenure and cut EMI,
 * or keep EMI and cut tenure.
 */
function comparePrepay(input: {
  outstanding: number;
  annualPct: number;
  remainingMonths: number;
  prepay: number;
}) {
  const { outstanding, annualPct, remainingMonths, prepay } = input;
  const principal = Math.max(0, outstanding - prepay);
  const currentEmi = emi(outstanding, annualPct, remainingMonths);

  const emiAfter = emi(principal, annualPct, remainingMonths);
  const interestCutEmi = totalInterest(
    principal,
    annualPct,
    remainingMonths,
    emiAfter,
  );

  // Binary search months for same EMI
  let lo = 1;
  let hi = remainingMonths;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (emi(principal, annualPct, mid) > currentEmi) lo = mid + 1;
    else hi = mid;
  }
  const monthsCutTenure = lo;
  const interestCutTenure = totalInterest(
    principal,
    annualPct,
    monthsCutTenure,
    currentEmi,
  );

  const interestNoPrepay = totalInterest(
    outstanding,
    annualPct,
    remainingMonths,
    currentEmi,
  );

  return {
    currentEmi,
    emiAfter,
    monthsCutTenure,
    interestSavedEmi: interestNoPrepay - interestCutEmi,
    interestSavedTenure: interestNoPrepay - interestCutTenure,
  };
}

export default function HomeLoanPrepayEmbed() {
  const [outstanding, setOutstanding] = useState(45_00_000);
  const [rate, setRate] = useState(8.5);
  const [yearsLeft, setYearsLeft] = useState(15);
  const [prepay, setPrepay] = useState(5_00_000);

  const result = useMemo(
    () =>
      comparePrepay({
        outstanding,
        annualPct: rate,
        remainingMonths: yearsLeft * 12,
        prepay: Math.min(prepay, outstanding - 1),
      }),
    [outstanding, rate, yearsLeft, prepay],
  );

  const tenureWins = result.interestSavedTenure >= result.interestSavedEmi;

  return (
    <LearnToolEmbed
      title="Home loan prepayment calculator"
      subtitle="Should you reduce EMI or tenure? Target: home loan prepayment calculator."
      fullToolHref="/calculators/emi"
      fullToolLabel="Open EMI calculator →"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#5F5E5A]">
          Outstanding principal (₹)
          <input
            type="number"
            value={outstanding}
            onChange={(e) => setOutstanding(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#E8E6F0] px-3 py-2 text-sm font-bold text-[#111110]"
          />
        </label>
        <label className="text-xs font-semibold text-[#5F5E5A]">
          Prepayment amount (₹)
          <input
            type="number"
            value={prepay}
            onChange={(e) => setPrepay(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#E8E6F0] px-3 py-2 text-sm font-bold text-[#111110]"
          />
        </label>
        <label className="text-xs font-semibold text-[#5F5E5A]">
          Interest rate (% p.a.)
          <input
            type="number"
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#E8E6F0] px-3 py-2 text-sm font-bold text-[#111110]"
          />
        </label>
        <label className="text-xs font-semibold text-[#5F5E5A]">
          Years left
          <input
            type="number"
            value={yearsLeft}
            onChange={(e) => setYearsLeft(Number(e.target.value) || 1)}
            className="mt-1 w-full rounded-lg border border-[#E8E6F0] px-3 py-2 text-sm font-bold text-[#111110]"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-xl border px-3 py-3 ${
            !tenureWins
              ? "border-[#534AB7] bg-[#EEEDFE]"
              : "border-[#E8E6F0] bg-white"
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#9B9A94]">
            Option A — reduce EMI
          </div>
          <div className="mt-2 text-sm font-semibold text-[#111110]">
            New EMI ≈ ₹{formatIndian(Math.round(result.emiAfter))}
          </div>
          <div className="mt-1 text-xs text-[#5F5E5A]">
            Interest saved ≈ ₹
            {formatIndian(Math.round(result.interestSavedEmi))}
          </div>
        </div>
        <div
          className={`rounded-xl border px-3 py-3 ${
            tenureWins
              ? "border-[#534AB7] bg-[#EEEDFE]"
              : "border-[#E8E6F0] bg-white"
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#9B9A94]">
            Option B — cut tenure
          </div>
          <div className="mt-2 text-sm font-semibold text-[#111110]">
            Tenure ≈ {result.monthsCutTenure} months (
            {(result.monthsCutTenure / 12).toFixed(1)} yrs)
          </div>
          <div className="mt-1 text-xs text-[#5F5E5A]">
            Interest saved ≈ ₹
            {formatIndian(Math.round(result.interestSavedTenure))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-[#534AB7]">
        {tenureWins
          ? "Usually better: keep EMI, cut tenure — if cashflow allows."
          : "Reduce EMI if you need monthly breathing room."}
      </p>
    </LearnToolEmbed>
  );
}
