/**
 * One household from two linked Finkoin accounts (household_links, migration
 * 059). Costs the home shares - rent, groceries, bills, help, school fees -
 * count once, at the higher of the two entries, since both partners usually
 * enter the same bill. Each person's own costs, savings, investments, loans
 * and cover add up. Goals, plan settings and ages come from the person
 * viewing; the partner's pay becomes the spouse income.
 * Pure; shared by web and the app (mobile keeps a byte-identical copy).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";

/** Paid once for the whole home: the higher of the two entries. */
export const SHARED_HOME_COSTS = [
  "rentAmount",
  "rentMaintenanceMonthly",
  "homeLoanEMI",
  "secondPropertyEMI",
  "vegetables",
  "grocery",
  "electricity",
  "internet",
  "gas",
  "water",
  "houseHelpMonthly",
  "cookHelpMonthly",
  "foodTotal",
  "utilityTotal",
  "domesticHelpTotal",
  "kidsSchoolFees",
  "kidsActivities",
  "homeMarketValue",
  "homeLoanOutstanding",
] as const;

/** Each partner's own money: added together. */
export const ADDED_UP = [
  "otherIncome",
  "carLoanEMI",
  "bikeEMI",
  "personalLoanEMI",
  "personalLoanOutstanding",
  "bikeOutstanding",
  "creditCardBillMonthly",
  "creditCardEmiMonthly",
  "creditCardCarriedBalance",
  "medicine",
  "fuel",
  "cabMetro",
  "entertainment",
  "shopping",
  "personalCare",
  "transportTotal",
  "lifestyleTotal",
  "travelMonthly",
  "parentsSupport",
  "parentsHealthInsuranceSumInsured",
  "parentsHealthInsurancePremiumMonthly",
  "parentsEmergencyCash",
  "healthInsuranceSumInsured",
  "employerHealthCover",
  "healthInsurancePremiumMonthly",
  "termInsuranceSumAssured",
  "termInsurancePremiumMonthly",
  "carInsurancePremiumMonthly",
  "bikeInsurancePremiumMonthly",
  "otherInsurancePremiumMonthly",
  "licEndowmentPremiumMonthly",
  "lifeInsuranceMaturityAmount",
  "savingsAccountBalance",
  "fdValue",
  "liquidMFValue",
  "emergencyFundCurrent",
  "otherLiquidSavings",
  "mfValue",
  "indianStocksValue",
  "usStocksValueINR",
  "usMFValueINR",
  "rsuValueINR",
  "totalEquityValue",
  "ppfBalance",
  "npsBalance",
  "epfBalance",
  "carMarketValue",
  "carLoanOutstanding",
  "goldValue",
  "otherAssets",
  "monthlySIP",
  "monthlyRD",
  "monthlyPPFContribution",
  "monthlyNPSContribution",
  "monthlyEPFContribution",
  "ssy",
  "nscDepositAmount",
  "medicalEmergencyFund",
  "trackerSipMonthly",
  "odLimit",
  "odUsed",
] as const;

/** Lists that hold one row per loan, policy or scheme: joined. */
const JOINED_LISTS = [
  "unifiedLoans",
  "additionalObligations",
  "otherInsurancePremiums",
  "customInvestments",
  "postOfficeSchemes",
] as const;

/** Yes if either partner has it. */
const EITHER = [
  "hasHealthInsurance",
  "hasTermInsurance",
  "hasOtherInsurance",
  "ownsHome",
  "ownsCar",
  "investsInNsc",
  "hasPostOfficeSchemes",
] as const;

const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};

/** A loan both partners entered (same tracker link, or same lender and EMI). */
function sameLoan(a: Record<string, unknown>, b: Record<string, unknown>) {
  if (a.trackerObligationId && a.trackerObligationId === b.trackerObligationId)
    return true;
  return (
    a.loanType === b.loanType &&
    num(a.monthlyEMI) > 0 &&
    num(a.monthlyEMI) === num(b.monthlyEMI) &&
    String(a.lenderName ?? "")
      .trim()
      .toLowerCase() ===
      String(b.lenderName ?? "")
        .trim()
        .toLowerCase()
  );
}

export function combineHouseholdProfiles(
  mine: FinancialProfile,
  partner: FinancialProfile,
): FinancialProfile {
  const me = mine as unknown as Record<string, unknown>;
  const them = partner as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...me };

  for (const k of SHARED_HOME_COSTS) {
    const v = Math.max(num(me[k]), num(them[k]));
    if (v > 0 || k in me || k in them) out[k] = v;
  }
  for (const k of ADDED_UP) {
    const v = num(me[k]) + num(them[k]);
    if (v > 0 || k in me || k in them) out[k] = v;
  }
  for (const k of JOINED_LISTS) {
    const a = Array.isArray(me[k]) ? (me[k] as Record<string, unknown>[]) : [];
    const b = Array.isArray(them[k])
      ? (them[k] as Record<string, unknown>[])
      : [];
    const extra =
      k === "unifiedLoans"
        ? b.filter((row) => !a.some((mineRow) => sameLoan(mineRow, row)))
        : b;
    if (a.length + extra.length > 0) out[k] = [...a, ...extra];
  }
  for (const k of EITHER) {
    if (me[k] || them[k]) out[k] = true;
  }

  // The partner's pay is the spouse income, whatever was guessed before.
  out.spouseIncome = num(them.monthlySalary);
  if (num(them.selfAge) > 0) out.spouseAge = num(them.selfAge);
  if (out.lifeStage === "bachelor") out.lifeStage = "married";
  // Kids: the larger family entered by either.
  if (num(them.numberOfKids) > num(me.numberOfKids)) {
    out.numberOfKids = them.numberOfKids;
    out.kidsAges = them.kidsAges;
    out.kidsGenders = them.kidsGenders;
    if (me.lifeStage !== "kids" && them.lifeStage === "kids")
      out.lifeStage = "kids";
  }
  // School fees as entered follow whichever entry was counted.
  if (num(them.kidsSchoolFees) > num(me.kidsSchoolFees)) {
    out.kidsSchoolFeesInput = them.kidsSchoolFeesInput;
    out.kidsSchoolFeesFrequency = them.kidsSchoolFeesFrequency;
  }
  // Per-person totals are re-derived from these when present.
  delete out.smartBudget;
  return out as unknown as FinancialProfile;
}

/** One line saying how the two were joined, for the household report. */
export const HOUSEHOLD_RULES_LINE =
  "Shared home costs (rent, groceries, bills, help, school fees, your home) count once, at the higher of your two entries. Each person's own spends, savings, investments, loans and insurance add up. Goals come from your own report.";
