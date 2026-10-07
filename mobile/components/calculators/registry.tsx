import type { ComponentType } from "react";
import { CarLoanCalculator } from "./CarLoanCalculator";
import { EMICalculator } from "./EMICalculator";
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
};
