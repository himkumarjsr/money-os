import type {
  BucketProfileInput,
  UniversalBucketKey,
} from "@/lib/universal-buckets";
import { toMonthlyEquivalent } from "@/lib/analyse-form-schema";

/**
 * Line items that sum to each universal bucket (matches {@link getUniversalBucketActuals}).
 */
function n(v: number | undefined): number {
  const x = v ?? 0;
  return Number.isFinite(x) ? x : 0;
}

function healthPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.healthInsurancePremiumMonthly === "number") {
    return n(data.healthInsurancePremiumMonthly);
  }
  if (data.hasHealthInsurance) {
    return n(
      toMonthlyEquivalent(
        data.healthInsurancePremiumInput,
        data.healthInsurancePremiumFrequency,
      ),
    );
  }
  return 0;
}

function termPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.termInsurancePremiumMonthly === "number") {
    return n(data.termInsurancePremiumMonthly);
  }
  if (data.hasTermInsurance) {
    return n(
      toMonthlyEquivalent(
        data.termInsurancePremiumInput,
        data.termInsurancePremiumFrequency,
      ),
    );
  }
  return 0;
}

function carPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.carInsurancePremiumMonthly === "number") {
    return n(data.carInsurancePremiumMonthly);
  }
  return n(
    toMonthlyEquivalent(
      data.carInsurancePremiumInput,
      data.carInsurancePremiumFrequency,
    ),
  );
}

function bikePremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.bikeInsurancePremiumMonthly === "number") {
    return n(data.bikeInsurancePremiumMonthly);
  }
  return n(
    toMonthlyEquivalent(
      data.bikeInsurancePremiumInput,
      data.bikeInsurancePremiumFrequency,
    ),
  );
}

function loanLabel(base: string, lender?: string): string {
  const name = lender?.trim();
  return name ? `${base} (${name})` : base;
}

export function getBucketBreakdown(
  category: UniversalBucketKey,
  profile: BucketProfileInput,
): { label: string; value: number }[] {
  const items: { label: string; value: number }[] = [];
  const kids = profile.lifeStage === "kids";

  if (category === "needs") {
    const foodActual =
      n(profile.foodTotal) > 0
        ? n(profile.foodTotal)
        : n(profile.vegetables) + n(profile.grocery) + n(profile.medicine);
    const transportActual =
      n(profile.transportTotal) > 0
        ? n(profile.transportTotal)
        : n(profile.fuel) + n(profile.cabMetro);
    const utilityActual =
      n(profile.utilityTotal) > 0
        ? n(profile.utilityTotal)
        : n(profile.electricity) +
          n(profile.internet) +
          n(profile.gas) +
          n(profile.water);
    const domesticActual =
      n(profile.domesticHelpTotal) > 0
        ? n(profile.domesticHelpTotal)
        : n(profile.houseHelpMonthly) + n(profile.cookHelpMonthly);

    if (n(profile.rentAmount) > 0) {
      items.push({ label: "Rent", value: n(profile.rentAmount) });
      if (n(profile.rentMaintenanceMonthly) > 0) {
        items.push({
          label: "Rent maintenance",
          value: n(profile.rentMaintenanceMonthly),
        });
      }
    }
    if (foodActual > 0) {
      items.push({ label: "Food and daily essentials", value: foodActual });
    }
    if (transportActual > 0) {
      items.push({ label: "Transport", value: transportActual });
    }
    if (utilityActual > 0) {
      items.push({ label: "Utilities", value: utilityActual });
    }
    if (domesticActual > 0) {
      items.push({ label: "Domestic help", value: domesticActual });
    }
    if (kids && n(profile.kidsSchoolFees) > 0) {
      items.push({
        label: "Kids school fees",
        value: n(profile.kidsSchoolFees),
      });
    }
    if (kids && n(profile.kidsActivities) > 0) {
      items.push({
        label: "Kids activities",
        value: n(profile.kidsActivities),
      });
    }
    if (n(profile.parentsSupport) > 0) {
      items.push({
        label: "Parents support",
        value: n(profile.parentsSupport),
      });
    }
  }

  if (category === "wants") {
    const lifestyleActual =
      n(profile.lifestyleTotal) > 0
        ? n(profile.lifestyleTotal)
        : n(profile.entertainment) +
          n(profile.shopping) +
          n(profile.personalCare);
    if (lifestyleActual > 0) {
      if (n(profile.lifestyleTotal) > 0) {
        items.push({
          label: "Lifestyle (shopping, entertainment, personal care)",
          value: lifestyleActual,
        });
      } else {
        if (n(profile.entertainment) > 0) {
          items.push({
            label: "Entertainment",
            value: n(profile.entertainment),
          });
        }
        if (n(profile.shopping) > 0) {
          items.push({ label: "Shopping", value: n(profile.shopping) });
        }
        if (n(profile.personalCare) > 0) {
          items.push({
            label: "Personal care",
            value: n(profile.personalCare),
          });
        }
      }
    }
  }

  if (category === "security") {
    const h = healthPremiumMonthly(profile);
    if (h > 0) items.push({ label: "Health insurance premium", value: h });
    const t = termPremiumMonthly(profile);
    if (t > 0) items.push({ label: "Term insurance premium", value: t });
    const c = carPremiumMonthly(profile);
    if (c > 0) items.push({ label: "Car insurance premium", value: c });
    const b = bikePremiumMonthly(profile);
    if (b > 0) items.push({ label: "Bike insurance premium", value: b });
    if (
      typeof profile.otherInsurancePremiumMonthly === "number" &&
      n(profile.otherInsurancePremiumMonthly) > 0
    ) {
      items.push({
        label: "Other insurance premium",
        value: n(profile.otherInsurancePremiumMonthly),
      });
    } else if (
      profile.hasOtherInsurance &&
      (profile.otherInsurancePremiums?.length ?? 0) > 0
    ) {
      (profile.otherInsurancePremiums ?? []).forEach((p, i) => {
        const amt =
          p.premiumAmount ?? (p as { premiumInput?: number }).premiumInput;
        const v = n(toMonthlyEquivalent(amt, p.frequency));
        if (v > 0) {
          items.push({
            label: p.policyName?.trim()
              ? p.policyName
              : `Other insurance (${i + 1})`,
            value: v,
          });
        }
      });
    }
  }

  if (category === "loans") {
    if (n(profile.homeLoanEMI) > 0) {
      items.push({
        label: loanLabel("Home loan EMI", profile.homeLoanLenderName),
        value: n(profile.homeLoanEMI),
      });
    }
    if (n(profile.secondPropertyEMI) > 0) {
      items.push({
        label: "Second property EMI",
        value: n(profile.secondPropertyEMI),
      });
    }
    if (n(profile.carLoanEMI) > 0) {
      items.push({
        label: loanLabel("Car loan EMI", profile.carLoanLenderName),
        value: n(profile.carLoanEMI),
      });
    }
    if (n(profile.bikeEMI) > 0) {
      items.push({
        label: loanLabel("Bike loan EMI", profile.bikeLoanLenderName),
        value: n(profile.bikeEMI),
      });
    }
    if (n(profile.personalLoanEMI) > 0) {
      items.push({
        label: loanLabel("Personal loan EMI", profile.personalLoanLenderName),
        value: n(profile.personalLoanEMI),
      });
    }
    if (n(profile.creditCardBillMonthly) > 0) {
      items.push({
        label: "Credit card payment",
        value: n(profile.creditCardBillMonthly),
      });
    }
    const deduped = Array.from(
      new Map(
        (profile.additionalObligations ?? [])
          .filter((row) => n(row.monthlyAmount) > 0)
          .map((row) => {
            const key = [
              String(row.type || "other")
                .toLowerCase()
                .trim(),
              String(row.lenderName || "")
                .toLowerCase()
                .trim(),
              Math.round(n(row.monthlyAmount)),
            ].join("|");
            return [key, row] as const;
          }),
      ).values(),
    );
    for (const ob of deduped) {
      const base = ob.type?.trim() ? ob.type : "Other obligation";
      items.push({
        label: loanLabel(base, ob.lenderName),
        value: n(ob.monthlyAmount),
      });
    }
  }

  if (category === "investment") {
    if (n(profile.monthlySIP) > 0) {
      items.push({ label: "Monthly SIP", value: n(profile.monthlySIP) });
    }
    if (n(profile.monthlyRD) > 0) {
      items.push({ label: "Monthly RD", value: n(profile.monthlyRD) });
    }
    if (n(profile.monthlyNPSContribution) > 0) {
      items.push({
        label: "NPS contribution",
        value: n(profile.monthlyNPSContribution),
      });
    }
    if (n(profile.monthlyPPFContribution) > 0) {
      items.push({
        label: "PPF contribution",
        value: n(profile.monthlyPPFContribution),
      });
    }
    if (n(profile.monthlyEPFContribution) > 0) {
      items.push({
        label: "EPF contribution (employee)",
        value: n(profile.monthlyEPFContribution),
      });
    }
    if (n(profile.ssy) > 0) {
      items.push({ label: "SSY contribution", value: n(profile.ssy) });
    }
    for (const row of profile.customInvestments ?? []) {
      const v = n(row.monthlyContribution);
      if (v > 0) {
        items.push({
          label: row.label?.trim() ? row.label : "Other investment",
          value: v,
        });
      }
    }
  }

  return items;
}
