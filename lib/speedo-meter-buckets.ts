import type { AnalyseFormValues, FinancialProfile } from "@/lib/analyse-form-schema";
import { monthlyTotalIncome } from "@/lib/financialEngine";
import {
  type BucketProfileInput,
  getInsurancePremiumsMonthly,
  hasHomeLoan,
} from "@/lib/universal-buckets";

export interface SpeedoMeterProps {
  income: number;
  needs: number;
  wants: number;
  loans: number;
  investment: number;
}

/**
 * Bucket split for speedometers (per product spec):
 * needs = housing EMIs + food + transport + utilities + school fees;
 * wants = discretionary; loans = vehicle/personal/card/additional EMIs (not home loan);
 * investment = SIP/RD/PPF/EPF/NPS + all insurance premiums + parents support + SSY/NSC.
 */
export function buildSpeedoMeterProps(
  data: Partial<AnalyseFormValues> | FinancialProfile,
): SpeedoMeterProps & { hasHomeLoan: boolean } {
  const n = (v?: number) => v ?? 0;
  const row = data as BucketProfileInput;

  const needs =
    n(data.rentAmount) +
    n(data.rentMaintenanceMonthly) +
    n(data.homeLoanEMI) +
    n(data.secondPropertyEMI) +
    n(data.vegetables) +
    n(data.grocery) +
    n(data.medicine) +
    n(data.fuel) +
    n(data.cabMetro) +
    n(data.electricity) +
    n(data.internet) +
    n(data.gas) +
    n(data.water) +
    n(data.kidsSchoolFees);

  const wants = n(data.entertainment) + n(data.shopping) + n(data.personalCare);

  const addOb = (data.additionalObligations ?? []).reduce((s, o) => s + n(o.monthlyAmount), 0);
  const loans =
    n(data.carLoanEMI) +
    n(data.bikeEMI) +
    n(data.personalLoanEMI) +
    n(data.creditCardBillMonthly) +
    addOb;

  const investment =
    n(data.monthlySIP) +
    n(data.monthlyRD) +
    n(data.monthlyPPFContribution) +
    n(data.monthlyEPFContribution) +
    n(data.monthlyNPSContribution) +
    getInsurancePremiumsMonthly(row) +
    n(data.parentsSupport) +
    n(data.ssy) +
    n(data.nscMonthly);

  const income = monthlyTotalIncome(data as FinancialProfile);

  return {
    income,
    needs,
    wants,
    loans,
    investment,
    hasHomeLoan: hasHomeLoan(row),
  };
}
