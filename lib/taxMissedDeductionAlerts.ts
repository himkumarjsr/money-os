import type { ComparisonInputs } from "@/lib/taxRegimeComparisonFY2026";
import { sumOrdinaryGross } from "@/lib/taxRegimeComparisonFY2026";

function fmt(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function buildMissedDeductionAlerts(
  i: ComparisonInputs,
  opts?: { encourageDeductionInvestment?: boolean },
): string[] {
  const alerts: string[] = [];
  const gross = sumOrdinaryGross(i);
  const encourageDeductionInvestment = opts?.encourageDeductionInvestment ?? true;

  if (encourageDeductionInvestment) {
    const room80C = Math.max(0, 150_000 - Math.min(i.deductions80C, 150_000));
    if (gross > 2_50_000 && room80C >= 25_000) {
      alerts.push(
        `About ${fmt(room80C)} of your ₹1.5L 80C bucket may still be unused — ELSS, PPF, EPF/VPF, principal repayment if eligible.`,
      );
    }

    const selfCap = i.age >= 60 ? 50_000 : 25_000;
    const parentCap = i.parentsSenior ? 50_000 : 25_000;
    const roomSelf = Math.max(0, selfCap - Math.min(i.deductions80DSelf, selfCap));
    const roomPar = Math.max(0, parentCap - Math.min(i.deductions80DParents, parentCap));

    if (gross > 3_00_000 && i.deductions80DSelf <= 0 && i.deductions80DParents <= 0 && !i.flags.nri) {
      alerts.push(
        "No 80D premiums entered — if you pay health insurance for self/family or parents, premiums may be deductible within separate caps.",
      );
    } else {
      if (roomSelf >= 3_000 && i.deductions80DSelf > 0) {
        alerts.push(`You may still have room under 80D self/family (about ${fmt(roomSelf)} at your age band).`);
      }
      if (roomPar >= 3_000 && i.deductions80DParents > 0) {
        alerts.push(
          `Parents’ premium bucket may still have about ${fmt(roomPar)} — confirm senior vs non-senior parent toggle.`,
        );
      }
    }

    if (!i.hasHRA && i.rentPaidNoHra > 0 && (i.employment === "salaried" || i.employment === "freelancer")) {
      alerts.push(
        "Rent without HRA — old regime may allow 80GG (auto-calculated). Keep rent receipts and Form 10BA-style documentation.",
      );
    }

    const ttaHint =
      i.interestSavingsPortion > 0 ? i.interestSavingsPortion : i.interestIncome;
    if (ttaHint > 0 && i.age < 60 && i.deduction80TTA <= 0) {
      alerts.push(
        `₹${fmt(ttaHint)} interest-type income — savings account interest may qualify for 80TTA (₹10k cap for non-seniors).`,
      );
    }
    if (i.interestIncome > 0 && i.age >= 60 && i.deduction80TTB <= 0) {
      alerts.push(
        "Senior with interest income — review 80TTB (₹50k on qualifying interest) with your CA.",
      );
    }

    if (i.flags.disabledSelf && i.deduction80U <= 0) {
      alerts.push("Self-disability flagged but 80U is ₹0 — confirm severity bands (₹75k / ₹1.25L) with certificates.");
    }

    if (
      i.homeLoanInterest24b <= 0 &&
      i.deduction80EEA <= 0 &&
      i.rentalIncome <= 0 &&
      gross > 5_00_000
    ) {
      alerts.push(
        "No home-loan interest under 24(b)/80EEA — if you pay self-occupied loan interest, lender certificates may belong on the old regime.",
      );
    }

    if (i.employment === "salaried" && i.professionalTax <= 0 && gross > 2_00_000) {
      alerts.push("Professional tax deducted by employer is often allowable — add if applicable.");
    }
  }

  if (sumEquityAlerts(i)) {
    alerts.push(
      "Equity STCG/LTCG uses flat illustrative rates — real tax may differ with grandfathering, surcharge, and grandfathered exemptions.",
    );
  }

  if (i.flags.nri) {
    alerts.push(
      "NRI residency / DTAA can override this comparison — treat output as illustrative only.",
    );
  }

  if (i.agriculturalIncome > 0 && !i.excludeAgriculturalFromTax) {
    alerts.push(
      "Agricultural income included in ordinary gross — many structures are exempt or partially exempt; confirm treatment.",
    );
  }

  return alerts.slice(0, 6);
}

function sumEquityAlerts(i: ComparisonInputs): boolean {
  return (
    i.rsuSaleStcg + i.rsuSaleLtcg + i.otherStcg + i.otherLtcg > 0
  );
}
