"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Example = {
  salary: number;
  notes: string;
  oldLikelyBetterWhen: string[];
  newLikelyBetterWhen: string[];
};

const EXAMPLES: Example[] = [
  {
    salary: 500000,
    notes: "Near rebate thresholds, the final tax can flip with small deduction changes. Always compare after cess.",
    oldLikelyBetterWhen: ["You claim meaningful 80C/80D/HRA", "Your taxable income stays within rebate limits under old regime rules"],
    newLikelyBetterWhen: ["You claim few deductions", "You prefer simpler compliance with fewer proofs"],
  },
  {
    salary: 1000000,
    notes: "For many salaried employees, the decision depends on how much you legitimately claim in 80C, 80D, HRA, NPS, and home loan interest.",
    oldLikelyBetterWhen: ["You have rent + HRA and claim it properly", "You max 80C + 80D", "You claim home loan interest under 24(b)"],
    newLikelyBetterWhen: ["Deductions are low", "You do not claim HRA / home loan benefits", "You want fewer moving parts"],
  },
  {
    salary: 1500000,
    notes: "At higher incomes, surcharge bands and deduction caps matter. Compare full computation (not only slab rates).",
    oldLikelyBetterWhen: ["You have big eligible deductions/exemptions", "You have home loan interest + NPS and you can claim both"],
    newLikelyBetterWhen: ["Your eligible deductions are limited", "You want predictable TDS without last-minute proof collection"],
  },
  {
    salary: 2500000,
    notes: "At this level, always review surcharge and marginal relief. Any capital gains should be computed separately from salary slabs.",
    oldLikelyBetterWhen: ["You have substantial eligible deductions (within caps)", "You can document claims cleanly (rent receipts, loan certificates, etc.)"],
    newLikelyBetterWhen: ["You prefer fewer deductions and simpler filing", "Your income is mostly salary without large exemption proofs"],
  },
];

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function TaxRegimeToggle() {
  const [salary, setSalary] = useState(EXAMPLES[1].salary);

  const ex = useMemo(() => EXAMPLES.find((e) => e.salary === salary) ?? EXAMPLES[0], [salary]);

  return (
    <section aria-labelledby="regime-toggle" className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="regime-toggle" className="text-xl font-semibold text-slate-900">
            Old vs New regime — quick decision helper (FY 2025-26)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            This is an educational guide. For the exact tax number, use the calculator and verify with current Finance Act rules.
          </p>
        </div>
        <Link
          href="/calculators?calc=tax-regime"
          className="inline-flex w-fit shrink-0 rounded-xl bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
        >
          Open tax regime calculator →
        </Link>
      </div>

      <div className="mt-5">
        <div className="text-sm font-semibold text-slate-900">Pick a salary example</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e.salary}
              type="button"
              onClick={() => setSalary(e.salary)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                e.salary === salary
                  ? "border-[#534AB7]/30 bg-[#534AB7]/10 text-[#534AB7]"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {formatINR(e.salary)}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong className="font-semibold">Note:</strong> {ex.notes}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Old regime is often better if…</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {ex.oldLikelyBetterWhen.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">New regime is often better if…</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {ex.newLikelyBetterWhen.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 text-sm text-slate-600">
        Want the full, detailed guide?{" "}
        <Link href="/learn/old-vs-new-tax-regime-which-saves-you-more-money" className="font-semibold text-[#534AB7] hover:underline">
          Read “Old vs new tax regime” →
        </Link>
      </div>
    </section>
  );
}

