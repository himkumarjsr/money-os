/** Illustrative helpers for tax calculator UI — not filing advice. */

export type GratuityEmployer = "government" | "private";

export function gratuityTaxableExempt(
  received: number,
  employer: GratuityEmployer,
  lastSalaryAnnual: number,
  yearsOfService: number,
): { exempt: number; taxable: number } {
  const r = Math.max(0, received);
  if (employer === "government") {
    return { exempt: r, taxable: 0 };
  }
  const cap20L = 20_00_000;
  const formula = (Math.max(0, lastSalaryAnnual) / 26) * 15 * Math.max(0, yearsOfService);
  const exempt = Math.min(r, formula, cap20L);
  return { exempt, taxable: Math.max(0, r - exempt) };
}

export type LeaveEncashTiming = "retirement" | "during_service";
export type LeaveEncashEmployer = "government" | "private";

/** Highly simplified illustration — verify with employer / CA. */
export function leaveEncashmentTaxableExemptIllustrative(
  received: number,
  timing: LeaveEncashTiming,
  employer: LeaveEncashEmployer,
  avgMonthlySalary10: number,
  _yearsOfService: number,
  leaveDays: number,
): { exempt: number; taxable: number } {
  const amt = Math.max(0, received);
  if (timing === "retirement" && employer === "government") {
    return { exempt: amt, taxable: 0 };
  }
  const salary = Math.max(0, avgMonthlySalary10);
  const days = Math.max(0, leaveDays);
  const cap25L = 25_00_000;
  const salaryLinkedExempt = days > 0 ? Math.min((salary * days) / 30, amt) : 0;
  if (timing === "retirement" && employer === "private") {
    const exempt = Math.min(amt, cap25L, salaryLinkedExempt || amt);
    return { exempt, taxable: Math.max(0, amt - exempt) };
  }
  const exemptDuring = Math.min(amt, salaryLinkedExempt);
  return { exempt: exemptDuring, taxable: Math.max(0, amt - exemptDuring) };
}

export function ltaSplit(ltaReceivedAnnual: number, claiming: boolean, travelCost: number): { exempt: number; taxable: number } {
  const recv = Math.max(0, ltaReceivedAnnual);
  if (!claiming || recv <= 0) return { exempt: 0, taxable: recv };
  const ex = Math.min(recv, Math.max(0, travelCost));
  return { exempt: ex, taxable: Math.max(0, recv - ex) };
}

export function rentalTaxableIncomeIllustrative(
  annualRent: number,
  municipalTaxes: number,
  homeLoanInterestLetOut: number,
): { grossRent: number; lessMunicipal: number; nav: number; less30: number; lessInterest: number; taxable: number } {
  const gross = Math.max(0, annualRent);
  const mun = Math.max(0, municipalTaxes);
  const nav = Math.max(0, gross - mun);
  const std30 = nav * 0.3;
  const interest = Math.max(0, homeLoanInterestLetOut);
  const taxable = Math.max(0, nav - std30 - interest);
  return {
    grossRent: gross,
    lessMunicipal: mun,
    nav,
    less30: std30,
    lessInterest: interest,
    taxable,
  };
}

export type BusinessMode = "regular" | "44ad" | "44ada";

export function businessIncomeIllustrative(
  mode: BusinessMode,
  grossReceipts: number,
  expenses: number,
  turnover44AD: number,
  digitalShare44AD: boolean,
  receipts44ADA: number,
): number {
  switch (mode) {
    case "regular":
      return Math.max(0, grossReceipts - expenses);
    case "44ad": {
      const t = Math.max(0, turnover44AD);
      return t * (digitalShare44AD ? 0.06 : 0.08);
    }
    case "44ada":
      return Math.max(0, receipts44ADA) * 0.5;
    default:
      return 0;
  }
}

export type PensionKind = "government" | "private" | "family";

export function pensionAnnualFromMonthly(monthly: number): number {
  return Math.max(0, monthly) * 12;
}

/** Commuted pension exemption illustration — verify with Form 16. */
export function commutedPensionExemptIllustrative(amount: number, kind: PensionKind): number {
  const a = Math.max(0, amount);
  if (kind === "government") return a;
  if (kind === "private") return (a * 1) / 3;
  return 0;
}

export function familyPensionExemptAnnual(monthlyFamilyPension: number): number {
  const annual = Math.max(0, monthlyFamilyPension) * 12;
  return Math.min(15_000, annual / 3);
}

export type RsuListing = "india" | "us" | "other";

export function rsuVestingIncomeAnnual(units: number, fmvPerUnit: number): number {
  return Math.max(0, units) * Math.max(0, fmvPerUnit);
}

export function rsuSaleGain(unitsSold: number, salePerUnit: number, costPerUnit: number): number {
  const u = Math.max(0, unitsSold);
  return u * Math.max(0, salePerUnit - costPerUnit);
}
