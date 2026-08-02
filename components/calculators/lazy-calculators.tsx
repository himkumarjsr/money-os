"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import BrandPageLoader from "@/components/ui/BrandPageLoader";

function CalculatorSkeleton() {
  return (
    <BrandPageLoader
      fullScreen={false}
      size="sm"
      minHeight={220}
      label="Loading…"
    />
  );
}

const dyn = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading: CalculatorSkeleton, ssr: false });

/** One dynamic chunk per calculator — only the active tool is downloaded. */
export const lazyCalculatorsById: Record<string, ComponentType> = {
  sip: dyn(() =>
    import("./SIPCalculator").then((m) => ({ default: m.SIPCalculator })),
  ),
  swp: dyn(() =>
    import("./SWPCalculator").then((m) => ({ default: m.SWPCalculator })),
  ),
  ppf: dyn(() =>
    import("./PPFCalculator").then((m) => ({ default: m.PPFCalculator })),
  ),
  nsc: dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoNscSchemeCalculator,
    })),
  ),
  emergency: dyn(() =>
    import("./EmergencyFundCalculator").then((m) => ({
      default: m.EmergencyFundCalculator,
    })),
  ),
  fire: dyn(() =>
    import("./FIRECalculator").then((m) => ({ default: m.FIRECalculator })),
  ),
  emi: dyn(() =>
    import("./EMICalculator").then((m) => ({ default: m.EMICalculator })),
  ),
  home: dyn(() =>
    import("./HomeLoanCalculator").then((m) => ({
      default: m.HomeLoanCalculator,
    })),
  ),
  car: dyn(() =>
    import("./CarLoanCalculator").then((m) => ({
      default: m.CarLoanCalculator,
    })),
  ),
  rentbuy: dyn(() =>
    import("./RentVsBuyCalculator").then((m) => ({
      default: m.RentVsBuyCalculator,
    })),
  ),
  rentcar: dyn(() =>
    import("./RentVsOwnCarCalculator").then((m) => ({
      default: m.RentVsOwnCarCalculator,
    })),
  ),
  whencar: dyn(() =>
    import("./WhenToBuyCarCalculator").then((m) => ({
      default: m.WhenToBuyCarCalculator,
    })),
  ),
  po: dyn(() =>
    import("./PostOfficeCalculator").then((m) => ({
      default: m.PostOfficeCalculator,
    })),
  ),
  "po-savings": dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoSavingsCalculator,
    })),
  ),
  "po-td": dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoTimeDepositCalculator,
    })),
  ),
  "po-rd": dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoRecurringDepositCalculator,
    })),
  ),
  "po-kvp": dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoKvpCalculator,
    })),
  ),
  "po-mis": dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoMisCalculator,
    })),
  ),
  "po-scss": dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoScssCalculator,
    })),
  ),
  "po-ssy": dyn(() =>
    import("./postOffice/schemeCalculators").then((m) => ({
      default: m.PoSsyCalculator,
    })),
  ),
  "tax-regime": dyn(() =>
    import("./TaxRegimeCalculator").then((m) => ({
      default: m.TaxRegimeCalculator,
    })),
  ),
};
