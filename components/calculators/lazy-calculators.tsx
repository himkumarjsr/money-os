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
  epf: dyn(() =>
    import("./EPFCalculator").then((m) => ({ default: m.EPFCalculator })),
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
  compound: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.CompoundInterestCalculator,
    })),
  ),
  "stepup-sip": dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.StepUpSipCalculator as ComponentType,
    })),
  ),
  lumpsum: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.LumpsumCalculator as ComponentType,
    })),
  ),
  "goal-sip": dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.GoalPlannerCalculator as ComponentType,
    })),
  ),
  "sip-delay": dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.SipDelayCalculator as ComponentType,
    })),
  ),
  stp: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.StpCalculator as ComponentType,
    })),
  ),
  cagr: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.CagrCalculator as ComponentType,
    })),
  ),
  xirr: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.XirrCalculator as ComponentType,
    })),
  ),
  "expense-ratio": dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.ExpenseRatioCalculator as ComponentType,
    })),
  ),
  "asset-allocation": dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.AssetAllocationCalculator as ComponentType,
    })),
  ),
  inflation: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.InflationCalculator as ComponentType,
    })),
  ),
  "money-double": dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.MoneyDoubleCalculator as ComponentType,
    })),
  ),
  fd: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.FdCalculator as ComponentType,
    })),
  ),
  rd: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.RdCalculator as ComponentType,
    })),
  ),
  gold: dyn(() =>
    import("./advisor/InvestingCalculators").then((m) => ({
      default: m.GoldCalculator as ComponentType,
    })),
  ),
  retirement: dyn(() =>
    import("./advisor/RetirementCalculators").then((m) => ({
      default: m.RetirementCalculator as ComponentType,
    })),
  ),
  nps: dyn(() =>
    import("./advisor/RetirementCalculators").then((m) => ({
      default: m.NpsCalculator as ComponentType,
    })),
  ),
  annuity: dyn(() =>
    import("./advisor/RetirementCalculators").then((m) => ({
      default: m.AnnuityCalculator as ComponentType,
    })),
  ),
  gratuity: dyn(() =>
    import("./advisor/RetirementCalculators").then((m) => ({
      default: m.GratuityCalculator as ComponentType,
    })),
  ),
  "leave-encashment": dyn(() =>
    import("./advisor/RetirementCalculators").then((m) => ({
      default: m.LeaveEncashmentCalculator as ComponentType,
    })),
  ),
  "loan-eligibility": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.LoanEligibilityCalculator as ComponentType,
    })),
  ),
  "prepay-vs-invest": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.PrepayVsInvestCalculator as ComponentType,
    })),
  ),
  "balance-transfer": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.BalanceTransferCalculator as ComponentType,
    })),
  ),
  "flat-vs-reducing": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.FlatVsReducingCalculator as ComponentType,
    })),
  ),
  "credit-card": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.CreditCardCalculator as ComponentType,
    })),
  ),
  "debt-payoff": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.DebtPayoffCalculator as ComponentType,
    })),
  ),
  "education-loan": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.EducationLoanCalculator as ComponentType,
    })),
  ),
  "gold-loan": dyn(() =>
    import("./advisor/LoanCalculators").then((m) => ({
      default: m.GoldLoanCalculator as ComponentType,
    })),
  ),
  salary: dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.SalaryCalculator as ComponentType,
    })),
  ),
  hra: dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.HraCalculator as ComponentType,
    })),
  ),
  "capital-gains": dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.CapitalGainsCalculator as ComponentType,
    })),
  ),
  "ltcg-harvest": dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.LtcgHarvestCalculator as ComponentType,
    })),
  ),
  deductions: dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.DeductionsCalculator as ComponentType,
    })),
  ),
  "advance-tax": dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.AdvanceTaxCalculator as ComponentType,
    })),
  ),
  "presumptive-tax": dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.PresumptiveTaxCalculator as ComponentType,
    })),
  ),
  "rental-income": dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.RentalIncomeCalculator as ComponentType,
    })),
  ),
  gst: dyn(() =>
    import("./advisor/TaxCalculators").then((m) => ({
      default: m.GstCalculator as ComponentType,
    })),
  ),
  "term-cover": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.TermCoverCalculator as ComponentType,
    })),
  ),
  "health-cover": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.HealthCoverCalculator as ComponentType,
    })),
  ),
  "policy-return": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.PolicyReturnCalculator as ComponentType,
    })),
  ),
  "buy-term-invest": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.BuyTermInvestRestCalculator as ComponentType,
    })),
  ),
  "child-education": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.ChildEducationCalculator as ComponentType,
    })),
  ),
  marriage: dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.MarriageCalculator as ComponentType,
    })),
  ),
  "down-payment": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.DownPaymentCalculator as ComponentType,
    })),
  ),
  "salary-hike": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.SalaryHikeCalculator as ComponentType,
    })),
  ),
  "net-worth": dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.NetWorthCalculator as ComponentType,
    })),
  ),
  budget: dyn(() =>
    import("./advisor/ProtectionGoalCalculators").then((m) => ({
      default: m.BudgetCalculator as ComponentType,
    })),
  ),
};
