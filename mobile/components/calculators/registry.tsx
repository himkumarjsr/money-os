import type { ComponentType } from "react";
import {
  AssetAllocationCalculator,
  CompoundInterestCalculator,
  CagrCalculator,
  ExpenseRatioCalculator,
  FdCalculator,
  GoalPlannerCalculator,
  GoldCalculator,
  InflationCalculator,
  LumpsumCalculator,
  MoneyDoubleCalculator,
  RdCalculator,
  SipDelayCalculator,
  StepUpSipCalculator,
  StpCalculator,
  XirrCalculator,
} from "./advisor/InvestingCalculators";
import {
  AnnuityCalculator,
  GratuityCalculator,
  LeaveEncashmentCalculator,
  NpsCalculator,
  RetirementCalculator,
} from "./advisor/RetirementCalculators";
import {
  BalanceTransferCalculator,
  CreditCardCalculator,
  DebtPayoffCalculator,
  EducationLoanCalculator,
  FlatVsReducingCalculator,
  GoldLoanCalculator,
  LoanEligibilityCalculator,
  PrepayVsInvestCalculator,
} from "./advisor/LoanCalculators";
import {
  AdvanceTaxCalculator,
  CapitalGainsCalculator,
  DeductionsCalculator,
  GstCalculator,
  HraCalculator,
  LtcgHarvestCalculator,
  PresumptiveTaxCalculator,
  RentalIncomeCalculator,
  SalaryCalculator,
} from "./advisor/TaxCalculators";
import {
  BudgetCalculator,
  BuyTermInvestRestCalculator,
  ChildEducationCalculator,
  DownPaymentCalculator,
  HealthCoverCalculator,
  MarriageCalculator,
  NetWorthCalculator,
  PolicyReturnCalculator,
  SalaryHikeCalculator,
  TermCoverCalculator,
} from "./advisor/ProtectionGoalCalculators";
import { CarLoanCalculator } from "./CarLoanCalculator";
import { EMICalculator } from "./EMICalculator";
import { EPFCalculator } from "./EPFCalculator";
import { EmergencyFundCalculator } from "./EmergencyFundCalculator";
import { FIRECalculator } from "./FIRECalculator";
import { HomeLoanCalculator } from "./HomeLoanCalculator";
import { PPFCalculator } from "./PPFCalculator";
import { PostOfficeCalculator } from "./PostOfficeCalculator";
import { RentVsBuyCalculator } from "./RentVsBuyCalculator";
import { RentVsOwnCarCalculator } from "./RentVsOwnCarCalculator";
import { SIPCalculator } from "./SIPCalculator";
import { SWPCalculator } from "./SWPCalculator";
import { TaxRegimeCalculator } from "./TaxRegimeCalculator";
import { WhenToBuyCarCalculator } from "./WhenToBuyCarCalculator";
import {
  PoKvpCalculator,
  PoMisCalculator,
  PoNscSchemeCalculator,
  PoRecurringDepositCalculator,
  PoSavingsCalculator,
  PoScssCalculator,
  PoSsyCalculator,
  PoTimeDepositCalculator,
} from "./postOffice/schemeCalculators";

/** Calculator id (from constants/calculator-config) → native calculator body. Mirrors web lazy-calculators. */
export const calculatorsById: Record<string, ComponentType> = {
  sip: SIPCalculator,
  swp: SWPCalculator,
  ppf: PPFCalculator,
  epf: EPFCalculator,
  nsc: PoNscSchemeCalculator,
  emergency: EmergencyFundCalculator,
  fire: FIRECalculator,
  emi: EMICalculator,
  home: HomeLoanCalculator,
  car: CarLoanCalculator,
  rentbuy: RentVsBuyCalculator,
  rentcar: RentVsOwnCarCalculator,
  whencar: WhenToBuyCarCalculator,
  po: PostOfficeCalculator,
  "po-savings": PoSavingsCalculator,
  "po-td": PoTimeDepositCalculator,
  "po-rd": PoRecurringDepositCalculator,
  "po-kvp": PoKvpCalculator,
  "po-mis": PoMisCalculator,
  "po-scss": PoScssCalculator,
  "po-ssy": PoSsyCalculator,
  "tax-regime": TaxRegimeCalculator,
  compound: CompoundInterestCalculator,
  "stepup-sip": StepUpSipCalculator as ComponentType,
  lumpsum: LumpsumCalculator as ComponentType,
  "goal-sip": GoalPlannerCalculator as ComponentType,
  "sip-delay": SipDelayCalculator as ComponentType,
  stp: StpCalculator as ComponentType,
  cagr: CagrCalculator as ComponentType,
  xirr: XirrCalculator as ComponentType,
  "expense-ratio": ExpenseRatioCalculator as ComponentType,
  "asset-allocation": AssetAllocationCalculator as ComponentType,
  inflation: InflationCalculator as ComponentType,
  "money-double": MoneyDoubleCalculator as ComponentType,
  fd: FdCalculator as ComponentType,
  rd: RdCalculator as ComponentType,
  gold: GoldCalculator as ComponentType,
  retirement: RetirementCalculator as ComponentType,
  nps: NpsCalculator as ComponentType,
  annuity: AnnuityCalculator as ComponentType,
  gratuity: GratuityCalculator as ComponentType,
  "leave-encashment": LeaveEncashmentCalculator as ComponentType,
  "loan-eligibility": LoanEligibilityCalculator as ComponentType,
  "prepay-vs-invest": PrepayVsInvestCalculator as ComponentType,
  "balance-transfer": BalanceTransferCalculator as ComponentType,
  "flat-vs-reducing": FlatVsReducingCalculator as ComponentType,
  "credit-card": CreditCardCalculator as ComponentType,
  "debt-payoff": DebtPayoffCalculator as ComponentType,
  "education-loan": EducationLoanCalculator as ComponentType,
  "gold-loan": GoldLoanCalculator as ComponentType,
  salary: SalaryCalculator as ComponentType,
  hra: HraCalculator as ComponentType,
  "capital-gains": CapitalGainsCalculator as ComponentType,
  "ltcg-harvest": LtcgHarvestCalculator as ComponentType,
  deductions: DeductionsCalculator as ComponentType,
  "advance-tax": AdvanceTaxCalculator as ComponentType,
  "presumptive-tax": PresumptiveTaxCalculator as ComponentType,
  "rental-income": RentalIncomeCalculator as ComponentType,
  gst: GstCalculator as ComponentType,
  "term-cover": TermCoverCalculator as ComponentType,
  "health-cover": HealthCoverCalculator as ComponentType,
  "policy-return": PolicyReturnCalculator as ComponentType,
  "buy-term-invest": BuyTermInvestRestCalculator as ComponentType,
  "child-education": ChildEducationCalculator as ComponentType,
  marriage: MarriageCalculator as ComponentType,
  "down-payment": DownPaymentCalculator as ComponentType,
  "salary-hike": SalaryHikeCalculator as ComponentType,
  "net-worth": NetWorthCalculator as ComponentType,
  budget: BudgetCalculator as ComponentType,
};
