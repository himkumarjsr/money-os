/**
 * Analyse → My Policies. Every policy the user entered in Analyse (term,
 * health, parents' health, car, bike, other) becomes a `user_policies` row
 * with the fields Analyse knows; insurer, renewal date, etc. are left for the
 * user to fill in. Pure helpers; `lib/userPolicies.ts` does the I/O.
 */
import {
  financialProfileToFormValues,
  type FinancialProfile,
} from "@/lib/analyse-form-schema";
import type { PolicyType, PremiumFrequency } from "@/lib/userPolicies";

export type AnalysePolicyCandidate = {
  /** Stable id of the Analyse entry: "term", "health", "other:<row id>", ... */
  sourceKey: string;
  policyType: PolicyType;
  planName: string | null;
  coverAmount: number;
  premiumAmount: number;
  premiumFrequency: PremiumFrequency;
  renewalDate: string | null;
};

/** The parts of a stored policy the import compares against. */
export type ExistingPolicyLike = {
  id: string;
  policyType: PolicyType;
  planName: string | null;
  coverAmount: number;
  premiumAmount: number;
  premiumFrequency: PremiumFrequency;
  analyseSourceKey: string | null;
};

export type PolicyImportPlan = {
  inserts: AnalysePolicyCandidate[];
  /** Existing manual policies that are the same as an Analyse entry. */
  links: Array<{ policyId: string; sourceKey: string }>;
};

function num(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

function freq(v: unknown): PremiumFrequency {
  return v === "yearly" ? "yearly" : "monthly";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Next renewal (today or later) for a month/day from Analyse, as YYYY-MM-DD.
 * Null unless both are given; the day is clamped to the month's length.
 */
export function nextRenewalDate(
  month: unknown,
  day: unknown,
  today: Date = new Date(),
): string | null {
  const m = Math.trunc(num(month));
  const d = Math.trunc(num(day));
  if (m < 1 || m > 12 || d < 1) return null;
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
    const dd = Math.min(d, new Date(year, m, 0).getDate());
    if (new Date(year, m - 1, dd) >= start)
      return `${year}-${pad(m)}-${pad(dd)}`;
  }
  return null;
}

/** Policies the user entered in Analyse, in form order. */
export function analysePolicyCandidates(
  profile: FinancialProfile,
  today: Date = new Date(),
): AnalysePolicyCandidate[] {
  const f = financialProfileToFormValues(profile);
  const out: AnalysePolicyCandidate[] = [];
  const push = (
    sourceKey: string,
    policyType: PolicyType,
    planName: string | null,
    cover: unknown,
    premium: unknown,
    frequency: unknown,
    renewalMonth: unknown,
    renewalDay: unknown,
  ) => {
    const coverAmount = num(cover);
    const premiumAmount = num(premium);
    if (coverAmount <= 0 && premiumAmount <= 0) return;
    out.push({
      sourceKey,
      policyType,
      planName: planName?.trim() || null,
      coverAmount,
      premiumAmount,
      premiumFrequency: freq(frequency),
      renewalDate: nextRenewalDate(renewalMonth, renewalDay, today),
    });
  };

  if (f.hasTermInsurance) {
    push(
      "term",
      "term_life",
      null,
      f.termInsuranceSumAssured,
      f.termInsurancePremiumInput,
      f.termInsurancePremiumFrequency,
      f.termInsuranceRenewalMonth,
      f.termInsuranceRenewalDay,
    );
  }
  if (f.hasHealthInsurance) {
    push(
      "health",
      "health",
      null,
      f.healthInsuranceSumInsured,
      f.healthInsurancePremiumInput,
      f.healthInsurancePremiumFrequency,
      f.healthInsuranceRenewalMonth,
      f.healthInsuranceRenewalDay,
    );
  }
  push(
    "parents_health",
    "health",
    "Parents' health cover",
    f.parentsHealthInsuranceSumInsured,
    0,
    "yearly",
    undefined,
    undefined,
  );
  push(
    "car",
    "car",
    null,
    0,
    f.carInsurancePremiumInput,
    f.carInsurancePremiumFrequency,
    f.carInsuranceRenewalMonth,
    f.carInsuranceRenewalDay,
  );
  push(
    "bike",
    "bike",
    null,
    0,
    f.bikeInsurancePremiumInput,
    f.bikeInsurancePremiumFrequency,
    f.bikeInsuranceRenewalMonth,
    f.bikeInsuranceRenewalDay,
  );

  if (f.hasOtherInsurance) {
    // Row ids come from the stored profile; a row saved without one falls
    // back to its position so the key stays stable across loads.
    const rawRows = (profile.otherInsurancePremiums ??
      (profile as { otherInsurancePolicies?: Array<{ id?: string }> })
        .otherInsurancePolicies ??
      []) as Array<{ id?: string }>;
    const rows = f.otherInsurancePremiums ?? [];
    rows.forEach((row, i) => {
      const id = rawRows[i]?.id;
      push(
        id ? `other:${id}` : `other:#${i}`,
        "other",
        row.policyName ?? null,
        0,
        row.premiumAmount,
        row.frequency,
        row.renewalMonth,
        row.renewalDay,
      );
    });
    if (rows.length === 0) {
      push(
        "other",
        "other",
        null,
        0,
        f.otherInsurancePremiumInput,
        f.otherInsurancePremiumFrequency,
        undefined,
        undefined,
      );
    }
  }
  return out;
}

function monthlyPremium(amount: number, frequency: PremiumFrequency): number {
  return frequency === "yearly" ? amount / 12 : amount;
}

function sameName(a: string | null, b: string | null): boolean {
  const x = a?.trim().toLowerCase();
  return !!x && x === b?.trim().toLowerCase();
}

/** A policy the user added by hand that is this Analyse entry. */
function looksLikeSamePolicy(
  c: AnalysePolicyCandidate,
  p: ExistingPolicyLike,
): boolean {
  // Analyse has no "travel"/"term vs endowment" split for other policies, so
  // an "other" entry may have been added by hand under any life-style type.
  const typeOk =
    p.policyType === c.policyType ||
    (c.policyType === "other" &&
      (p.policyType === "term_life" || p.policyType === "travel"));
  if (!typeOk) return false;
  if (sameName(c.planName, p.planName)) return true;
  if (
    c.premiumAmount > 0 &&
    Math.abs(
      monthlyPremium(c.premiumAmount, c.premiumFrequency) -
        monthlyPremium(p.premiumAmount, p.premiumFrequency),
    ) < 1
  ) {
    return true;
  }
  return c.coverAmount > 0 && Math.abs(c.coverAmount - p.coverAmount) < 1;
}

/**
 * Which Analyse entries to add to My Policies. An entry already imported, or
 * deleted by the user after import (`dismissedKeys`), is skipped; an entry the
 * user already added by hand is linked to that policy instead of duplicated.
 */
export function planAnalysePolicyImport(
  candidates: AnalysePolicyCandidate[],
  existing: ExistingPolicyLike[],
  dismissedKeys: Iterable<string> = [],
): PolicyImportPlan {
  const done = new Set<string>(dismissedKeys);
  for (const p of existing)
    if (p.analyseSourceKey) done.add(p.analyseSourceKey);
  const claimed = new Set<string>();
  const plan: PolicyImportPlan = { inserts: [], links: [] };
  for (const c of candidates) {
    if (done.has(c.sourceKey)) continue;
    done.add(c.sourceKey);
    const match = existing.find(
      (p) =>
        !p.analyseSourceKey && !claimed.has(p.id) && looksLikeSamePolicy(c, p),
    );
    if (match) {
      claimed.add(match.id);
      plan.links.push({ policyId: match.id, sourceKey: c.sourceKey });
    } else {
      plan.inserts.push(c);
    }
  }
  return plan;
}

export type MissingPolicyField =
  | "insurer"
  | "renewal date"
  | "cover"
  | "premium";

/** Fields a policy still needs before it is complete (empty when complete). */
export function missingPolicyFields(p: {
  insurerName: string;
  renewalDate: string | null;
  coverAmount: number;
  premiumAmount: number;
}): MissingPolicyField[] {
  const out: MissingPolicyField[] = [];
  if (!p.insurerName.trim()) out.push("insurer");
  if (!p.renewalDate) out.push("renewal date");
  if (!(p.coverAmount > 0)) out.push("cover");
  if (!(p.premiumAmount > 0)) out.push("premium");
  return out;
}
