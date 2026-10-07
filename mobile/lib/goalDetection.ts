/**
 * Deterministic multi-goal detection (same field-inspection style as the
 * form's detectLastStep). Implied goals come straight from data already
 * collected; prompted goals (marriage, baby) only exist once the user opts in
 * after the report. Never an AI guess. Amounts are today's rupees.
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";

export type GoalType =
  | "kid_education"
  | "kid_marriage"
  | "home_purchase"
  | "vehicle_purchase"
  | "debt_free"
  | "parents_eldercare"
  | "retirement"
  | "marriage"
  | "baby";

export type DetectedGoal = {
  /** Stable id, e.g. "kid_education:0", "retirement". */
  id: string;
  type: GoalType;
  label: string;
  source: "implied" | "prompted";
  kidIndex?: number;
  targetAmount: number;
  targetYear: number;
  yearsToGoal: number;
  /** True when the amount is Finkoin's default, not the user's own figure. */
  isDefaultTarget: boolean;
  editable: { amount: boolean; year: boolean };
  /** Retirement can't be removed; debt-free disappears when loans do. */
  removable: boolean;
  /** One line on why this goal was suggested. */
  reason: string;
};

export type PromptedGoalOffer = "marriage" | "baby";

export const GOAL_DEFAULTS = {
  kidEducation: 2_500_000,
  kidEducationAge: 18,
  kidMarriage: 2_000_000,
  kidMarriageAge: 25,
  vehicle: 800_000,
  vehicleYears: 3,
  homeYears: 5,
  homeWithoutRent: 1_500_000,
  /** Downpayment ≈ 20% of a home whose rent yields ~3% a year → 80× rent. */
  homeRentMultiple: 80,
  eldercareYears: 5,
  eldercareMedicalBuffer: 500_000,
  marriage: 1_500_000,
  marriageYears: 2,
  baby: 300_000,
  babyYears: 1,
  retirementAge: 60,
  retirementExpenseMultiple: 25,
} as const;

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const positive = (v: unknown) => (n(v) > 0 ? n(v) : undefined);

function kidCount(p: Partial<FinancialProfile>): number {
  if (p.lifeStage !== "kids") return 0;
  return Math.max(n(p.numberOfKids), p.kidsAges?.length ?? 0);
}

function loansOutstanding(p: Partial<FinancialProfile>) {
  const loans = (p.unifiedLoans ?? []).filter(
    (l) => n(l.monthlyEMI) > 0 && l.loanType !== "credit_card",
  );
  const outstanding = loans.reduce((s, l) => s + n(l.outstandingAmount), 0);
  const months = loans.reduce((m, l) => Math.max(m, n(l.remainingMonths)), 0);
  return { count: loans.length, outstanding, months };
}

function hasLoans(p: Partial<FinancialProfile>): boolean {
  return getUniversalBucketActuals(p as never).loans > 0;
}

/**
 * Bachelor → marriage toggle; married with no kids → baby toggle. Shown until
 * answered. A "no" that isn't in dismissedGoals (stored by builds before "Not
 * now" became hide) has nothing to restore, so it's asked again.
 */
export function promptedGoalOffers(
  p: Partial<FinancialProfile>,
): PromptedGoalOffer[] {
  const dismissed = new Set(p.dismissedGoals ?? []);
  const open = (answer: boolean | undefined, offer: PromptedGoalOffer) =>
    answer === undefined || (answer === false && !dismissed.has(offer));
  const offers: PromptedGoalOffer[] = [];
  if (p.lifeStage === "bachelor" && open(p.planningMarriage, "marriage")) {
    offers.push("marriage");
  }
  if (
    p.lifeStage === "married" &&
    kidCount(p) === 0 &&
    open(p.planningBaby, "baby")
  ) {
    offers.push("baby");
  }
  return offers;
}

export function detectGoals(
  p: Partial<FinancialProfile>,
  now: Date = new Date(),
): DetectedGoal[] {
  const year = now.getFullYear();
  const dismissed = new Set(p.dismissedGoals ?? []);
  const goals: DetectedGoal[] = [];
  const add = (
    g: Omit<DetectedGoal, "yearsToGoal" | "targetYear"> & {
      targetYear: number;
    },
  ) => {
    if (dismissed.has(g.id)) return;
    const targetYear = Math.max(year + 1, Math.round(g.targetYear));
    goals.push({ ...g, targetYear, yearsToGoal: targetYear - year });
  };

  const kids = kidCount(p);
  for (let i = 0; i < kids; i++) {
    const age = p.kidsAges?.[i];
    if (age == null || !Number.isFinite(age)) continue;
    const childLabel = kids > 1 ? `Child ${i + 1}` : "Your child";

    if (age < GOAL_DEFAULTS.kidEducationAge + 3) {
      const own =
        positive(p.kidsEducationFundTargets?.[i]) ??
        (positive(p.kidsEducationFundTarget)
          ? n(p.kidsEducationFundTarget) / kids
          : undefined);
      add({
        id: `kid_education:${i}`,
        type: "kid_education",
        label: `${childLabel}'s education`,
        source: "implied",
        kidIndex: i,
        targetAmount: Math.round(own ?? GOAL_DEFAULTS.kidEducation),
        targetYear: year + Math.max(1, GOAL_DEFAULTS.kidEducationAge - age),
        isDefaultTarget: own === undefined,
        editable: { amount: true, year: false },
        removable: true,
        reason: `Age ${age} — college around age ${GOAL_DEFAULTS.kidEducationAge}.`,
      });
    }

    if (age < GOAL_DEFAULTS.kidMarriageAge + 3) {
      const own =
        positive(p.kidsMarriageFundTargets?.[i]) ??
        (positive(p.kidsMarriageFundTarget)
          ? n(p.kidsMarriageFundTarget) / kids
          : undefined);
      add({
        id: `kid_marriage:${i}`,
        type: "kid_marriage",
        label: `${childLabel}'s marriage`,
        source: "implied",
        kidIndex: i,
        targetAmount: Math.round(own ?? GOAL_DEFAULTS.kidMarriage),
        targetYear: year + Math.max(1, GOAL_DEFAULTS.kidMarriageAge - age),
        isDefaultTarget: own === undefined,
        editable: { amount: true, year: false },
        removable: true,
        reason: `Age ${age} — planned around age ${GOAL_DEFAULTS.kidMarriageAge}.`,
      });
    }
  }

  if (!p.ownsHome) {
    const rent = n(p.rentAmount);
    const own = positive(p.homePurchaseTarget);
    add({
      id: "home_purchase",
      type: "home_purchase",
      label: "Home purchase (downpayment)",
      source: "implied",
      targetAmount: Math.round(
        own ??
          (rent > 0
            ? rent * GOAL_DEFAULTS.homeRentMultiple
            : GOAL_DEFAULTS.homeWithoutRent),
      ),
      targetYear: positive(p.homePurchaseYear) ?? year + GOAL_DEFAULTS.homeYears,
      isDefaultTarget: own === undefined,
      editable: { amount: true, year: true },
      removable: true,
      reason:
        rent > 0
          ? "You rent today — a downpayment fund gets you to ownership."
          : "You don't own a home yet.",
    });
  }

  if (!p.ownsCar) {
    const own = positive(p.carPurchaseTarget);
    add({
      id: "vehicle_purchase",
      type: "vehicle_purchase",
      label: "Vehicle purchase",
      source: "implied",
      targetAmount: Math.round(own ?? GOAL_DEFAULTS.vehicle),
      targetYear:
        positive(p.carPurchaseYear) ?? year + GOAL_DEFAULTS.vehicleYears,
      isDefaultTarget: own === undefined,
      editable: { amount: true, year: true },
      removable: true,
      reason: "No car on file — buy it with savings, not a loan.",
    });
  }

  if (hasLoans(p)) {
    const { count, outstanding, months } = loansOutstanding(p);
    add({
      id: "debt_free",
      type: "debt_free",
      label: "Become debt-free",
      source: "implied",
      targetAmount: Math.round(outstanding),
      targetYear: year + Math.max(1, Math.ceil(months / 12)),
      isDefaultTarget: false,
      editable: { amount: false, year: false },
      removable: false,
      reason:
        count > 1
          ? `${count} loans on file — clear them, highest interest first.`
          : "You have a loan on file — clearing it frees up your EMI.",
    });
  }

  if (n(p.parentsSupport) > 0) {
    add({
      id: "parents_eldercare",
      type: "parents_eldercare",
      label: "Parents' eldercare fund",
      source: "implied",
      targetAmount: Math.round(
        n(p.parentsSupport) * 12 * GOAL_DEFAULTS.eldercareYears +
          GOAL_DEFAULTS.eldercareMedicalBuffer,
      ),
      targetYear: year + GOAL_DEFAULTS.eldercareYears,
      isDefaultTarget: true,
      editable: { amount: false, year: false },
      removable: true,
      reason: `You support your parents — ${GOAL_DEFAULTS.eldercareYears} years of support plus a medical buffer.`,
    });
  }

  if (p.lifeStage === "bachelor" && p.planningMarriage) {
    const own = positive(p.marriageFundTarget);
    add({
      id: "marriage",
      type: "marriage",
      label: "Wedding fund",
      source: "prompted",
      targetAmount: Math.round(own ?? GOAL_DEFAULTS.marriage),
      targetYear:
        positive(p.marriageFundYear) ?? year + GOAL_DEFAULTS.marriageYears,
      isDefaultTarget: own === undefined,
      editable: { amount: true, year: true },
      removable: true,
      reason: "You told us you're planning to get married.",
    });
  }

  if (p.lifeStage === "married" && kids === 0 && p.planningBaby) {
    const own = positive(p.babyFundTarget);
    add({
      id: "baby",
      type: "baby",
      label: "Baby / childbirth fund",
      source: "prompted",
      targetAmount: Math.round(own ?? GOAL_DEFAULTS.baby),
      targetYear: positive(p.babyFundYear) ?? year + GOAL_DEFAULTS.babyYears,
      isDefaultTarget: own === undefined,
      editable: { amount: true, year: true },
      removable: true,
      reason: "You told us you're planning a baby.",
    });
  }

  const age = n(p.selfAge) || 30;
  const retireAge = n(p.retirementAge) || GOAL_DEFAULTS.retirementAge;
  const ownCorpus = positive(p.retirementTargetCorpus);
  const annualNeeds = getUniversalBucketActuals(p as never).needs * 12;
  goals.push({
    id: "retirement",
    type: "retirement",
    label: "Retirement",
    source: "implied",
    targetAmount: Math.round(
      ownCorpus ?? annualNeeds * GOAL_DEFAULTS.retirementExpenseMultiple,
    ),
    targetYear: year + Math.max(1, retireAge - age),
    yearsToGoal: Math.max(1, retireAge - age),
    isDefaultTarget: ownCorpus === undefined,
    editable: { amount: true, year: true },
    removable: false,
    reason: `Runs for everyone — ${GOAL_DEFAULTS.retirementExpenseMultiple}× your yearly needs by age ${retireAge}.`,
  });

  return goals.sort((a, b) => a.yearsToGoal - b.yearsToGoal);
}

export type GoalEdit = { targetAmount?: number; targetYear?: number };

/** Write a goal-card edit back into the profile fields it came from. */
export function applyGoalEdit(
  p: FinancialProfile,
  goalId: string,
  edit: GoalEdit,
  now: Date = new Date(),
): FinancialProfile {
  const [type, idx] = goalId.split(":") as [GoalType, string | undefined];
  const amount = edit.targetAmount != null ? Math.max(0, Math.round(edit.targetAmount)) : undefined;
  const yr = edit.targetYear != null ? Math.round(edit.targetYear) : undefined;
  const next: FinancialProfile = { ...p };
  const setKid = (key: "kidsEducationFundTargets" | "kidsMarriageFundTargets") => {
    if (amount == null || idx == null) return;
    const arr = [...(p[key] ?? [])];
    const i = Number(idx);
    while (arr.length <= i) arr.push(0);
    arr[i] = amount;
    next[key] = arr;
  };
  switch (type) {
    case "kid_education":
      setKid("kidsEducationFundTargets");
      break;
    case "kid_marriage":
      setKid("kidsMarriageFundTargets");
      break;
    case "home_purchase":
      if (amount != null) next.homePurchaseTarget = amount;
      if (yr != null) next.homePurchaseYear = yr;
      break;
    case "vehicle_purchase":
      if (amount != null) next.carPurchaseTarget = amount;
      if (yr != null) next.carPurchaseYear = yr;
      break;
    case "marriage":
      if (amount != null) next.marriageFundTarget = amount;
      if (yr != null) next.marriageFundYear = yr;
      break;
    case "baby":
      if (amount != null) next.babyFundTarget = amount;
      if (yr != null) next.babyFundYear = yr;
      break;
    case "retirement":
      if (amount != null) next.retirementTargetCorpus = amount;
      if (yr != null) {
        const age = n(p.selfAge) || 30;
        next.retirementAge = Math.max(age + 1, age + (yr - now.getFullYear()));
      }
      break;
    default:
      break;
  }
  return next;
}

export function dismissGoal(p: FinancialProfile, goalId: string): FinancialProfile {
  if (goalId === "retirement" || goalId === "debt_free") return p;
  const set = new Set(p.dismissedGoals ?? []);
  set.add(goalId);
  const next: FinancialProfile = { ...p, dismissedGoals: Array.from(set) };
  if (goalId === "marriage") next.planningMarriage = false;
  if (goalId === "baby") next.planningBaby = false;
  return next;
}

/** Un-hide everything; a removed wedding/baby goal goes back to an open question. */
export function restoreDismissedGoals(p: FinancialProfile): FinancialProfile {
  const dismissed = new Set(p.dismissedGoals ?? []);
  const next: FinancialProfile = { ...p, dismissedGoals: [] };
  if (dismissed.has("marriage")) next.planningMarriage = undefined;
  if (dismissed.has("baby")) next.planningBaby = undefined;
  return next;
}

/**
 * Answer to a prompted toggle ("Planning to get married?" / "Planning a baby?").
 * "Not now" is "yes, then hide": the goal sits under "Show N hidden goals" and
 * restoring it asks the question again.
 */
export function answerPromptedGoal(
  p: FinancialProfile,
  offer: PromptedGoalOffer,
  yes: boolean,
): FinancialProfile {
  const dismissed = (p.dismissedGoals ?? []).filter((id) => id !== offer);
  const added: FinancialProfile =
    offer === "marriage"
      ? { ...p, planningMarriage: true, dismissedGoals: dismissed }
      : { ...p, planningBaby: true, dismissedGoals: dismissed };
  return yes ? added : dismissGoal(added, offer);
}
