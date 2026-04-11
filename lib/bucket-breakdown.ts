import type { BucketProfileInput, UniversalBucketKey } from "@/lib/universal-buckets";
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
      toMonthlyEquivalent(data.healthInsurancePremiumInput, data.healthInsurancePremiumFrequency),
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
      toMonthlyEquivalent(data.termInsurancePremiumInput, data.termInsurancePremiumFrequency),
    );
  }
  return 0;
}

function carPremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.carInsurancePremiumMonthly === "number") {
    return n(data.carInsurancePremiumMonthly);
  }
  return n(
    toMonthlyEquivalent(data.carInsurancePremiumInput, data.carInsurancePremiumFrequency),
  );
}

function bikePremiumMonthly(data: BucketProfileInput): number {
  if (typeof data.bikeInsurancePremiumMonthly === "number") {
    return n(data.bikeInsurancePremiumMonthly);
  }
  return n(
    toMonthlyEquivalent(data.bikeInsurancePremiumInput, data.bikeInsurancePremiumFrequency),
  );
}

export function getBucketBreakdown(
  category: UniversalBucketKey,
  profile: BucketProfileInput,
): { label: string; value: number }[] {
  const items: { label: string; value: number }[] = [];

  if (category === "needs") {
    if (n(profile.rentAmount) > 0) items.push({ label: "Rent", value: n(profile.rentAmount) });
    if (n(profile.rentMaintenanceMonthly) > 0) {
      items.push({ label: "Rent maintenance", value: n(profile.rentMaintenanceMonthly) });
    }
    if (n(profile.homeLoanEMI) > 0) {
      items.push({ label: "Home loan EMI", value: n(profile.homeLoanEMI) });
    }
    if (n(profile.secondPropertyEMI) > 0) {
      items.push({ label: "Second property EMI", value: n(profile.secondPropertyEMI) });
    }
    if (n(profile.vegetables) > 0) {
      items.push({ label: "Vegetables", value: n(profile.vegetables) });
    }
    if (n(profile.grocery) > 0) {
      items.push({ label: "Groceries", value: n(profile.grocery) });
    }
    if (n(profile.medicine) > 0) {
      items.push({ label: "Medicine", value: n(profile.medicine) });
    }
    if (n(profile.electricity) > 0) {
      items.push({ label: "Electricity", value: n(profile.electricity) });
    }
    if (n(profile.internet) > 0) {
      items.push({ label: "Internet and mobile", value: n(profile.internet) });
    }
    if (n(profile.gas) > 0) items.push({ label: "Gas", value: n(profile.gas) });
    if (n(profile.water) > 0) items.push({ label: "Water", value: n(profile.water) });
    if (n(profile.fuel) > 0) items.push({ label: "Fuel", value: n(profile.fuel) });
    if (n(profile.cabMetro) > 0) {
      items.push({ label: "Cab / metro", value: n(profile.cabMetro) });
    }
    if (n(profile.entertainment) > 0) {
      items.push({ label: "Entertainment", value: n(profile.entertainment) });
    }
    if (n(profile.kidsSchoolFees) > 0) {
      items.push({ label: "Kids school fees", value: n(profile.kidsSchoolFees) });
    }
    if (n(profile.parentsSupport) > 0) {
      items.push({ label: "Parents support", value: n(profile.parentsSupport) });
    }
    if (n(profile.personalCare) > 0) {
      items.push({ label: "Personal care", value: n(profile.personalCare) });
    }
    if (n(profile.kidsActivities) > 0) {
      items.push({ label: "Kids activities", value: n(profile.kidsActivities) });
    }
    if (n(profile.houseHelpMonthly) > 0) {
      items.push({ label: "House help", value: n(profile.houseHelpMonthly) });
    }
    if (n(profile.cookHelpMonthly) > 0) {
      items.push({ label: "Cook help", value: n(profile.cookHelpMonthly) });
    }
  }

  if (category === "wants") {
    if (n(profile.shopping) > 0) {
      items.push({ label: "Shopping", value: n(profile.shopping) });
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
    } else if (profile.hasOtherInsurance && (profile.otherInsurancePremiums?.length ?? 0) > 0) {
      (profile.otherInsurancePremiums ?? []).forEach((p, i) => {
        const amt = p.premiumAmount ?? (p as { premiumInput?: number }).premiumInput;
        const v = n(toMonthlyEquivalent(amt, p.frequency));
        if (v > 0) {
          items.push({
            label: p.policyName?.trim() ? p.policyName : `Other insurance (${i + 1})`,
            value: v,
          });
        }
      });
    }
    if (n(profile.ssy) > 0) items.push({ label: "SSY contribution", value: n(profile.ssy) });
  }

  if (category === "loans") {
    if (n(profile.carLoanEMI) > 0) {
      items.push({ label: "Car loan EMI", value: n(profile.carLoanEMI) });
    }
    if (n(profile.bikeEMI) > 0) {
      items.push({ label: "Bike loan EMI", value: n(profile.bikeEMI) });
    }
    if (n(profile.personalLoanEMI) > 0) {
      items.push({ label: "Personal loan EMI", value: n(profile.personalLoanEMI) });
    }
    if (n(profile.creditCardBillMonthly) > 0) {
      items.push({ label: "Credit card payment", value: n(profile.creditCardBillMonthly) });
    }
    for (const ob of profile.additionalObligations ?? []) {
      if (n(ob.monthlyAmount) > 0) {
        const label = ob.type?.trim() ? `${ob.type}` : "Other obligation";
        items.push({ label, value: n(ob.monthlyAmount) });
      }
    }
  }

  if (category === "investment") {
    if (n(profile.monthlySIP) > 0) items.push({ label: "Monthly SIP", value: n(profile.monthlySIP) });
    if (n(profile.monthlyRD) > 0) items.push({ label: "Monthly RD", value: n(profile.monthlyRD) });
    if (n(profile.monthlyNPSContribution) > 0) {
      items.push({ label: "NPS contribution", value: n(profile.monthlyNPSContribution) });
    }
  }

  return items;
}
