"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function CalculatorSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500"
    >
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#534AB7] border-t-transparent" />
      <span>Loading calculator…</span>
    </div>
  );
}

const dyn = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading: CalculatorSkeleton, ssr: false });

/** One dynamic chunk per calculator — only the active tool is downloaded. */
export const lazyCalculatorsById: Record<string, ComponentType> = {
  sip: dyn(() => import("./SIPCalculator").then((m) => ({ default: m.SIPCalculator }))),
  swp: dyn(() => import("./SWPCalculator").then((m) => ({ default: m.SWPCalculator }))),
  ppf: dyn(() => import("./PPFCalculator").then((m) => ({ default: m.PPFCalculator }))),
  nsc: dyn(() => import("./NSCCalculator").then((m) => ({ default: m.NSCCalculator }))),
  emergency: dyn(() =>
    import("./EmergencyFundCalculator").then((m) => ({ default: m.EmergencyFundCalculator })),
  ),
  fire: dyn(() => import("./FIRECalculator").then((m) => ({ default: m.FIRECalculator }))),
  emi: dyn(() => import("./EMICalculator").then((m) => ({ default: m.EMICalculator }))),
  home: dyn(() => import("./HomeLoanCalculator").then((m) => ({ default: m.HomeLoanCalculator }))),
  car: dyn(() => import("./CarLoanCalculator").then((m) => ({ default: m.CarLoanCalculator }))),
  rentbuy: dyn(() => import("./RentVsBuyCalculator").then((m) => ({ default: m.RentVsBuyCalculator }))),
  rentcar: dyn(() =>
    import("./RentVsOwnCarCalculator").then((m) => ({ default: m.RentVsOwnCarCalculator })),
  ),
  whencar: dyn(() =>
    import("./WhenToBuyCarCalculator").then((m) => ({ default: m.WhenToBuyCarCalculator })),
  ),
  po: dyn(() => import("./PostOfficeCalculator").then((m) => ({ default: m.PostOfficeCalculator }))),
  "tax-regime": dyn(() =>
    import("./TaxRegimeCalculator").then((m) => ({ default: m.TaxRegimeCalculator })),
  ),
};
