"use client";

import { PO_RATES_PERIOD, PO_RATES_SOURCE } from "@/lib/postOfficeSchemes";
import Link from "next/link";
import { useState } from "react";
import { Insight } from "./calculator-ui";
import {
  PO_SCHEME_META,
  PoSchemeCalculator,
  type PoSchemeId,
} from "./postOffice/schemeCalculators";

export function PostOfficeCalculator() {
  const [scheme, setScheme] = useState<PoSchemeId>("td");
  const active = PO_SCHEME_META.find((s) => s.id === scheme)!;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-semibold text-[#5F5E5A]">
          Choose a scheme
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Rates notified for {PO_RATES_PERIOD}. Tap a scheme to open its
          calculator.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PO_SCHEME_META.map((s) => {
            const selected = s.id === scheme;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScheme(s.id)}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-[#534AB7] bg-[#F7F6FC] shadow-sm"
                    : "border-slate-200 bg-white hover:border-[#534AB7]/50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {s.short}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                  {s.name}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#534AB7]">
                  {s.rateLabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">
          {active.name}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Also available at{" "}
          <Link
            href={`/calculators/${active.calcId}`}
            className="font-medium text-[#534AB7] underline-offset-2 hover:underline"
          >
            /calculators/{active.calcId}
          </Link>
        </p>
        <div className="mt-4">
          <PoSchemeCalculator scheme={scheme} />
        </div>
      </div>

      <Insight tone="warn">
        {PO_RATES_SOURCE}. Always confirm the live rate and eligibility at India
        Post before investing.{" "}
        <Link
          href="/calculators/ppf"
          className="font-semibold underline-offset-2 hover:underline"
        >
          PPF calculator
        </Link>{" "}
        is also available (notified {PO_RATES_PERIOD} rate applies when opened
        at a post office).
      </Insight>
    </div>
  );
}

// Re-export scheme calculators for lazy route chunks
export {
  PoKvpCalculator,
  PoMisCalculator,
  PoNscSchemeCalculator,
  PoRecurringDepositCalculator,
  PoSavingsCalculator,
  PoScssCalculator,
  PoSsyCalculator,
  PoTimeDepositCalculator,
} from "./postOffice/schemeCalculators";
