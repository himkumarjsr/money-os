export type TrackerIconName =
  | "home"
  | "cart"
  | "leaf"
  | "milk"
  | "bolt"
  | "droplet"
  | "flame"
  | "wifi"
  | "phone"
  | "graduation"
  | "pill"
  | "hospital"
  | "broom"
  | "fuel"
  | "cab"
  | "auto"
  | "transit"
  | "utensils"
  | "coffee"
  | "snack"
  | "film"
  | "game"
  | "shirt"
  | "device"
  | "sparkle"
  | "dumbbell"
  | "plane"
  | "gift"
  | "music"
  | "package"
  | "cigarette"
  | "drink"
  | "herb"
  | "dice"
  | "card"
  | "car"
  | "wallet"
  | "bike"
  | "calendar"
  | "chart"
  | "bank"
  | "shield"
  | "coin"
  | "briefcase"
  | "laptop"
  | "building"
  | "trending"
  | "alert"
  | "party"
  | "other";

export type TrackerSubcategory = {
  id: string;
  label: string;
  icon: TrackerIconName;
};

export type TrackerBucket = {
  label: string;
  /** Accent for progress / borders — soft brand-aligned */
  color: string;
  icon: TrackerIconName;
  cap: number;
  subcategories: readonly TrackerSubcategory[];
};

/** Brand purple for all tracker icons */
export const TRACKER_ICON_COLOR = "#534AB7";

export const TRACKER_CATEGORIES = {
  needs: {
    /** Essentials you must pay (rent, groceries, bills). Internal id stays `needs`. */
    label: "Mandatory expenses",
    color: "#534AB7",
    icon: "home" as const,
    cap: 30,
    subcategories: [
      { id: "rent", label: "Rent", icon: "home" as const },
      { id: "groceries", label: "Groceries", icon: "cart" as const },
      { id: "vegetables", label: "Vegetables & fruits", icon: "leaf" as const },
      { id: "milk", label: "Milk & dairy", icon: "milk" as const },
      { id: "electricity", label: "Electricity bill", icon: "bolt" as const },
      { id: "water", label: "Water bill", icon: "droplet" as const },
      { id: "gas", label: "Gas / LPG", icon: "flame" as const },
      { id: "internet", label: "Internet / broadband", icon: "wifi" as const },
      { id: "mobile", label: "Mobile recharge", icon: "phone" as const },
      {
        id: "school_fees",
        label: "School / college fees",
        icon: "graduation" as const,
      },
      { id: "medicine", label: "Medicine", icon: "pill" as const },
      { id: "doctor", label: "Doctor / hospital", icon: "hospital" as const },
      {
        id: "domestic_help",
        label: "Maid / cook / driver",
        icon: "broom" as const,
      },
      { id: "fuel", label: "Fuel / petrol / diesel", icon: "fuel" as const },
      { id: "cab", label: "Cab / taxi", icon: "cab" as const },
      { id: "auto", label: "Auto rickshaw", icon: "auto" as const },
      { id: "metro_bus", label: "Metro / bus", icon: "transit" as const },
      /** Legacy combined transport — kept so old entries still resolve */
      {
        id: "transport_essential",
        label: "Transport to work / fuel",
        icon: "transit" as const,
      },
      { id: "others", label: "Others", icon: "other" as const },
    ],
  },
  wants: {
    /** Lifestyle / discretionary — can be cut first. Internal id stays `wants`. */
    label: "Non-mandatory expenses",
    color: "#6B63C9",
    icon: "party" as const,
    cap: 5,
    subcategories: [
      {
        id: "dining",
        label: "Dining out / restaurant",
        icon: "utensils" as const,
      },
      { id: "coffee", label: "Tea / coffee / chai", icon: "coffee" as const },
      { id: "snacks", label: "Snacks / outside food", icon: "snack" as const },
      { id: "movies", label: "Movies / OTT", icon: "film" as const },
      { id: "entertainment", label: "Entertainment", icon: "game" as const },
      { id: "shopping", label: "Clothes / shoes", icon: "shirt" as const },
      {
        id: "electronics",
        label: "Electronics / gadgets",
        icon: "device" as const,
      },
      { id: "beauty", label: "Salon / grooming", icon: "sparkle" as const },
      { id: "gym", label: "Gym / fitness", icon: "dumbbell" as const },
      {
        id: "travel_leisure",
        label: "Travel / holiday",
        icon: "plane" as const,
      },
      { id: "gifts", label: "Gifts", icon: "gift" as const },
      {
        id: "subscriptions",
        label: "Subscriptions (Spotify etc)",
        icon: "music" as const,
      },
      {
        id: "online_shopping",
        label: "Amazon / Flipkart shopping",
        icon: "package" as const,
      },
      { id: "others", label: "Others", icon: "other" as const },
    ],
  },
  habits: {
    label: "Habit expenses",
    color: "#7A72D4",
    icon: "alert" as const,
    cap: 0,
    subcategories: [
      {
        id: "cigarettes",
        label: "Cigarettes / tobacco",
        icon: "cigarette" as const,
      },
      { id: "alcohol", label: "Alcohol / drinks", icon: "drink" as const },
      { id: "gutka", label: "Gutka / pan masala", icon: "herb" as const },
      { id: "gambling", label: "Gambling / lottery", icon: "dice" as const },
      { id: "paan", label: "Paan / supari", icon: "herb" as const },
      { id: "others", label: "Others", icon: "other" as const },
    ],
  },
  loans: {
    label: "Loans & Credit",
    color: "#5B54B0",
    icon: "card" as const,
    cap: 40,
    subcategories: [
      { id: "home_loan_emi", label: "Home loan EMI", icon: "home" as const },
      { id: "car_loan_emi", label: "Car loan EMI", icon: "car" as const },
      {
        id: "personal_loan",
        label: "Personal loan EMI",
        icon: "wallet" as const,
      },
      {
        id: "credit_card",
        label: "Credit card payment",
        icon: "card" as const,
      },
      {
        id: "education_loan",
        label: "Education loan EMI",
        icon: "graduation" as const,
      },
      { id: "bike_loan", label: "Bike loan EMI", icon: "bike" as const },
      {
        id: "bnpl",
        label: "Buy now pay later (EMI)",
        icon: "calendar" as const,
      },
      { id: "other_loan", label: "Other EMI", icon: "other" as const },
      { id: "others", label: "Others", icon: "other" as const },
    ],
  },
  investment: {
    label: "Investments",
    color: "#4F48A8",
    icon: "trending" as const,
    cap: 20,
    subcategories: [
      {
        id: "savings_account",
        label: "Savings account / cash",
        icon: "wallet" as const,
      },
      { id: "sip", label: "SIP / Mutual fund", icon: "trending" as const },
      { id: "ppf", label: "PPF", icon: "bank" as const },
      { id: "epf", label: "EPF / PF", icon: "bank" as const },
      { id: "nps", label: "NPS", icon: "shield" as const },
      { id: "stocks", label: "Stocks / equity", icon: "chart" as const },
      { id: "fd", label: "Fixed deposit", icon: "bank" as const },
      { id: "gold", label: "Gold / SGB", icon: "coin" as const },
      {
        id: "insurance_premium",
        label: "Insurance premium",
        icon: "shield" as const,
      },
      { id: "rd", label: "Recurring deposit", icon: "calendar" as const },
      { id: "crypto", label: "Crypto", icon: "coin" as const },
      { id: "others", label: "Others", icon: "other" as const },
    ],
  },
  income: {
    label: "Income",
    color: "#534AB7",
    icon: "wallet" as const,
    cap: 0,
    subcategories: [
      { id: "salary", label: "Salary", icon: "briefcase" as const },
      { id: "freelance", label: "Freelance income", icon: "laptop" as const },
      { id: "rental", label: "Rental income", icon: "building" as const },
      { id: "dividend", label: "Dividend / interest", icon: "chart" as const },
      { id: "bonus", label: "Bonus", icon: "gift" as const },
      { id: "other_income", label: "Other income", icon: "other" as const },
      { id: "others", label: "Others", icon: "other" as const },
    ],
  },
} as const satisfies Record<string, TrackerBucket>;

export type BucketType = keyof typeof TRACKER_CATEGORIES;

/**
 * Subcategories that must never affect tracker maths (spent, caps, Safety Pulse, MoM).
 * Kept as an exclusion set so any legacy rows still display but don't skew totals.
 */
export const TRACKER_TOTAL_EXCLUDED_SUBCATEGORIES = new Set([
  "loan_prepayment",
]);

export function countsTowardTrackerTotals(txn: {
  category?: string | null;
  subcategory?: string | null;
}): boolean {
  const sub = txn.subcategory || txn.category;
  if (sub && TRACKER_TOTAL_EXCLUDED_SUBCATEGORIES.has(sub)) return false;
  return true;
}

/** Subcategories shown in the add-expense picker (hides legacy combined transport). */
export function pickerSubcategories(bucket: BucketType) {
  return TRACKER_CATEGORIES[bucket].subcategories.filter(
    (s) => s.id !== "transport_essential",
  );
}

export function findSubcategory(
  bucket: BucketType,
  subId: string | null | undefined,
) {
  const list = TRACKER_CATEGORIES[bucket].subcategories;
  return list.find((s) => s.id === subId) ?? null;
}
