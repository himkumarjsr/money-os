/**
 * Deterministic multi-goal detection (same field-inspection style as the
 * form's detectLastStep). Implied goals come straight from data already
 * collected; prompted goals (marriage, baby) only exist once the user opts in
 * after the report. Never an AI guess. Amounts are today's rupees.
 */
import type { CustomGoal, FinancialProfile } from "@/lib/analyse-form-schema";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";
import { formatIndian } from "@/lib/formatters";

export type GoalType =
  | "kid_education"
  | "kid_marriage"
  | "home_purchase"
  | "vehicle_purchase"
  | "debt_free"
  | "parents_eldercare"
  | "retirement"
  | "marriage"
  | "baby"
  | "custom";

export type DetectedGoal = {
  /** Stable id, e.g. "kid_education:0", "retirement". */
  id: string;
  type: GoalType;
  label: string;
  source: "implied" | "prompted" | "custom";
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
  /** How the target amount is worked out, in plain words. */
  calculation?: string;
  /** Home goal only: the price behind the upfront-cash target. */
  home?: {
    price: number;
    priceIsEstimate: boolean;
    includeInteriors: boolean;
    /** An older single amount: unclear if it's the price or the upfront cash. */
    unclearAmount?: boolean;
  };
};

export type PromptedGoalOffer = "marriage" | "baby";

/** Upfront cash on a home purchase, as shares of its price. */
export const HOME_UPFRONT = {
  downpayment: 0.2,
  registration: 0.1,
  interiors: 0.1,
} as const;

export function homeUpfrontShare(includeInteriors = true): number {
  return (
    HOME_UPFRONT.downpayment +
    HOME_UPFRONT.registration +
    (includeInteriors ? HOME_UPFRONT.interiors : 0)
  );
}

export const GOAL_DEFAULTS = {
  kidEducation: 2_500_000,
  kidEducationAge: 18,
  kidMarriage: 2_000_000,
  kidMarriageAge: 25,
  vehicle: 800_000,
  vehicleYears: 3,
  homeYears: 5,
  /** Home price assumed when there is no rent to go by. */
  homePriceWithoutRent: 7_500_000,
  /** Rent yields ~3% of a home's price a year → price ≈ 400× monthly rent. */
  homePriceRentMultiple: 400,
  /** Medical cash parents should be able to reach, before insurance. */
  eldercareMedicalBuffer: 500_000,
  eldercareMedicalYears: 2,
  marriage: 1_500_000,
  marriageYears: 2,
  baby: 300_000,
  babyYears: 1,
  retirementAge: 60,
  retirementExpenseMultiple: 25,
} as const;

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const positive = (v: unknown) => (n(v) > 0 ? n(v) : undefined);
const rs = (v: number) => `₹${formatIndian(Math.round(v))}`;

function kidCount(p: Partial<FinancialProfile>): number {
  if (p.lifeStage !== "kids") return 0;
  return Math.max(n(p.numberOfKids), p.kidsAges?.length ?? 0);
}

function loansOutstanding(p: Partial<FinancialProfile>) {
  const loans = (p.unifiedLoans ?? []).filter(
    (l) => n(l.monthlyEMI) > 0 && l.loanType !== "credit_card",
  );
  const outstanding = loans.reduce((s, l) => s + n(l.outstandingAmount), 0);
  // A balance smaller than one month of all EMIs can be paid off at once, so
  // its own (often long) tenure doesn't set the debt-free year.
  const totalEmi = loans.reduce((s, l) => s + n(l.monthlyEMI), 0);
  const small = loans.filter(
    (l) => n(l.outstandingAmount) > 0 && n(l.outstandingAmount) <= totalEmi,
  );
  const months = loans
    .filter((l) => !small.includes(l))
    .reduce((m, l) => Math.max(m, n(l.remainingMonths)), small.length ? 1 : 0);
  const smallNames = small.map((l) => l.lenderName?.trim()).filter(Boolean);
  return { count: loans.length, outstanding, months, smallNames };
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
        reason: `Age ${age} - college around age ${GOAL_DEFAULTS.kidEducationAge}.`,
        calculation:
          own !== undefined
            ? `Your own figure, in today's rupees.`
            : `Finkoin's default of ${rs(GOAL_DEFAULTS.kidEducation)} for college in today's rupees - tap Edit to set your own.`,
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
        reason: `Age ${age} - planned around age ${GOAL_DEFAULTS.kidMarriageAge}.`,
        calculation:
          own !== undefined
            ? `Your own figure, in today's rupees.`
            : `Finkoin's default of ${rs(GOAL_DEFAULTS.kidMarriage)} in today's rupees - tap Edit to set your own.`,
      });
    }
  }

  if (!p.ownsHome) {
    const rent = n(p.rentAmount);
    const ownPrice = positive(p.homePurchasePrice);
    // Older profiles stored a raw downpayment amount instead of a price.
    const legacyAmount = ownPrice ? undefined : positive(p.homePurchaseTarget);
    const includeInteriors = p.homeIncludeInteriors !== false;
    const price =
      ownPrice ??
      (rent > 0
        ? rent * GOAL_DEFAULTS.homePriceRentMultiple
        : GOAL_DEFAULTS.homePriceWithoutRent);
    const split = `20% downpayment + 10% stamp duty and registration${includeInteriors ? " + 10% interiors" : ""}`;
    add({
      id: "home_purchase",
      type: "home_purchase",
      label: "Home purchase (upfront cash)",
      source: "implied",
      targetAmount: Math.round(
        legacyAmount ?? price * homeUpfrontShare(includeInteriors),
      ),
      targetYear:
        positive(p.homePurchaseYear) ?? year + GOAL_DEFAULTS.homeYears,
      isDefaultTarget: ownPrice === undefined && legacyAmount === undefined,
      editable: { amount: true, year: true },
      removable: true,
      reason:
        rent > 0
          ? "You rent today - this is the cash you need upfront to buy."
          : "You don't own a home yet - this is the cash you need upfront.",
      calculation: legacyAmount
        ? "Your own downpayment figure - tap Edit to set the home price instead."
        : `${rs(price)} home × ${Math.round(homeUpfrontShare(includeInteriors) * 100)}% (${split}) = ${rs(price * homeUpfrontShare(includeInteriors))}.` +
          (ownPrice
            ? ""
            : rent > 0
              ? ` Home price estimated as 400 × your ${rs(rent)} rent (rent is ~3% of a home's price a year) - tap Edit to set your price.`
              : " Home price is an estimate - tap Edit to set your price."),
      home: {
        price: Math.round(price),
        priceIsEstimate: ownPrice === undefined,
        includeInteriors,
        ...(legacyAmount ? { unclearAmount: true } : {}),
      },
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
      reason: "No car on file - buy it with savings, not a loan.",
      calculation:
        own !== undefined
          ? "Your own figure, in today's rupees."
          : `Finkoin's default of ${rs(GOAL_DEFAULTS.vehicle)} - tap Edit to set your own.`,
    });
  }

  if (hasLoans(p)) {
    const { count, outstanding, months, smallNames } = loansOutstanding(p);
    const payNow = smallNames.length
      ? ` Pay off ${smallNames.join(", ")} in one go.`
      : "";
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
        (count > 1
          ? `${count} loans on file - clear them, highest interest first.`
          : "You have a loan on file - clearing it frees up your EMI.") +
        payNow,
      calculation: `Total outstanding on your loans, ${rs(outstanding)}. Year = when the longest loan ends.`,
    });
  }

  // Monthly support is already paid from income (Needs), so only the
  // medical shortfall their insurance and set-aside cash don't cover is a goal.
  const parentsMedicalGap =
    GOAL_DEFAULTS.eldercareMedicalBuffer -
    n(p.parentsHealthInsuranceSumInsured) -
    n(p.parentsEmergencyCash);
  if (n(p.parentsSupport) > 0 && parentsMedicalGap > 0) {
    add({
      id: "parents_eldercare",
      type: "parents_eldercare",
      label: "Parents' medical fund",
      source: "implied",
      targetAmount: Math.round(parentsMedicalGap),
      targetYear: year + GOAL_DEFAULTS.eldercareMedicalYears,
      isDefaultTarget: true,
      editable: { amount: false, year: false },
      removable: true,
      reason:
        "Your parents' health cover and set-aside cash fall short of a ₹5L medical buffer - this fills the gap.",
      calculation: `${rs(GOAL_DEFAULTS.eldercareMedicalBuffer)} medical buffer − ${rs(n(p.parentsHealthInsuranceSumInsured))} parents' health cover − ${rs(n(p.parentsEmergencyCash))} cash set aside = ${rs(parentsMedicalGap)}. Monthly support is already in your expenses, so it is not saved again here.`,
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
      calculation:
        own !== undefined
          ? "Your own figure, in today's rupees."
          : `Finkoin's default of ${rs(GOAL_DEFAULTS.marriage)} - tap Edit to set your own.`,
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
      calculation:
        own !== undefined
          ? "Your own figure, in today's rupees."
          : `Finkoin's default of ${rs(GOAL_DEFAULTS.baby)} - tap Edit to set your own.`,
    });
  }

  for (const c of p.customGoals ?? []) {
    const label = String(c?.label ?? "").trim();
    const amount = positive(c?.targetAmount);
    if (!c?.id || !label || amount === undefined) continue;
    add({
      id: `custom:${c.id}`,
      type: "custom",
      label: label.slice(0, 60),
      source: "custom",
      targetAmount: Math.round(amount),
      targetYear: n(c.targetYear) || year + 1,
      isDefaultTarget: false,
      editable: { amount: true, year: true },
      removable: true,
      reason: "You added this goal.",
      calculation: "Your own figure, in today's rupees.",
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
    reason: `Runs for everyone - ${GOAL_DEFAULTS.retirementExpenseMultiple}× your yearly needs by age ${retireAge}.`,
    calculation:
      ownCorpus !== undefined
        ? "Your own corpus figure, in today's rupees."
        : `${rs(annualNeeds / 12)} monthly needs × 12 × ${GOAL_DEFAULTS.retirementExpenseMultiple} years = ${rs(annualNeeds * GOAL_DEFAULTS.retirementExpenseMultiple)} (lets you withdraw ~4% a year).`,
  });

  return goals.sort((a, b) => a.yearsToGoal - b.yearsToGoal);
}

export type GoalEdit = {
  targetAmount?: number;
  targetYear?: number;
  /** Home goal: price of the home (sets the upfront-cash target). */
  homePrice?: number;
  homeIncludeInteriors?: boolean;
};

/** Write a goal-card edit back into the profile fields it came from. */
export function applyGoalEdit(
  p: FinancialProfile,
  goalId: string,
  edit: GoalEdit,
  now: Date = new Date(),
): FinancialProfile {
  const [type, idx] = goalId.split(":") as [GoalType, string | undefined];
  const amount =
    edit.targetAmount != null
      ? Math.max(0, Math.round(edit.targetAmount))
      : undefined;
  const yr = edit.targetYear != null ? Math.round(edit.targetYear) : undefined;
  const next: FinancialProfile = { ...p };
  const setKid = (
    key: "kidsEducationFundTargets" | "kidsMarriageFundTargets",
  ) => {
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
      if (edit.homePrice != null && edit.homePrice > 0) {
        next.homePurchasePrice = Math.round(edit.homePrice);
        next.homePurchaseTarget = undefined;
      } else if (amount != null) {
        next.homePurchaseTarget = amount;
      }
      if (edit.homeIncludeInteriors != null) {
        next.homeIncludeInteriors = edit.homeIncludeInteriors;
      }
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
    case "custom":
      next.customGoals = (p.customGoals ?? []).map((c) =>
        c.id === idx
          ? {
              ...c,
              ...(amount ? { targetAmount: amount } : {}),
              ...(yr != null ? { targetYear: yr } : {}),
            }
          : c,
      );
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

export function dismissGoal(
  p: FinancialProfile,
  goalId: string,
): FinancialProfile {
  if (goalId === "retirement" || goalId === "debt_free") return p;
  // A goal the user added is deleted, not hidden.
  if (goalId.startsWith("custom:")) {
    const id = goalId.slice("custom:".length);
    return {
      ...p,
      customGoals: (p.customGoals ?? []).filter((c) => c.id !== id),
    };
  }
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

/** Starting points for "Add a goal"; every field stays editable. */
export const CUSTOM_GOAL_PRESETS: {
  key: string;
  label: string;
  emoji: string;
  targetAmount: number;
  years: number;
}[] = [
  {
    key: "travel",
    label: "Dream vacation",
    emoji: "✈️",
    targetAmount: 300_000,
    years: 2,
  },
  {
    key: "studies",
    label: "Higher studies",
    emoji: "📚",
    targetAmount: 1_500_000,
    years: 3,
  },
  {
    key: "business",
    label: "Start a business",
    emoji: "🚀",
    targetAmount: 1_000_000,
    years: 5,
  },
  {
    key: "gadget",
    label: "Gadget or upgrade",
    emoji: "💻",
    targetAmount: 150_000,
    years: 1,
  },
  {
    key: "sabbatical",
    label: "Career break",
    emoji: "🌴",
    targetAmount: 600_000,
    years: 3,
  },
  {
    key: "other",
    label: "Something else",
    emoji: "🎯",
    targetAmount: 500_000,
    years: 3,
  },
];

export const MAX_CUSTOM_GOALS = 12;

/** Add a user-defined goal. Returns the profile unchanged when the input is unusable or the list is full. */
export function addCustomGoal(
  p: FinancialProfile,
  goal: Omit<CustomGoal, "id">,
  id: string = Math.random().toString(36).slice(2, 10),
): FinancialProfile {
  const label = goal.label.trim().slice(0, 60);
  const list = p.customGoals ?? [];
  if (!label || !(goal.targetAmount > 0) || list.length >= MAX_CUSTOM_GOALS) {
    return p;
  }
  return {
    ...p,
    customGoals: [
      ...list,
      {
        id,
        label,
        targetAmount: Math.round(goal.targetAmount),
        targetYear: Math.round(goal.targetYear),
      },
    ],
  };
}

/** Goal-card answers and edits that live only on the report, not in the form. */
type GoalCardFields = Pick<
  FinancialProfile,
  | "planningMarriage"
  | "marriageFundTarget"
  | "marriageFundYear"
  | "planningBaby"
  | "babyFundTarget"
  | "babyFundYear"
  | "dismissedGoals"
  | "kidsEducationFundTargets"
  | "kidsMarriageFundTargets"
  | "homeIncludeInteriors"
  | "wantsTermTopUp"
>;

/**
 * Retaking the health check starts the goal list over: hidden goals come
 * back, the wedding/baby questions are asked again and card-only amounts go
 * back to Finkoin's defaults. Goals the user added on the Goals page stay.
 */
export function resetGoalCardEdits<T extends GoalCardFields>(v: T): T {
  return {
    ...v,
    planningMarriage: undefined,
    marriageFundTarget: undefined,
    marriageFundYear: undefined,
    planningBaby: undefined,
    babyFundTarget: undefined,
    babyFundYear: undefined,
    dismissedGoals: [],
    kidsEducationFundTargets: undefined,
    kidsMarriageFundTargets: undefined,
    homeIncludeInteriors: undefined,
    wantsTermTopUp: undefined,
  };
}
