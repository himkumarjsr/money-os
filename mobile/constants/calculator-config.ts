/** Mirrors web app/calculators/calculator-config.ts */
import type { AppIconName } from "@/components/ui/AppIcon";

export type Cat = "investment" | "loans" | "life" | "postoffice" | "tax";

export type CalcItem = {
  id: string;
  title: string;
  blurb: string;
  icon?: AppIconName;
  /** Implemented tool screen (else shows placeholder) */
  implemented?: boolean;
};

export const CATEGORIES: { id: Cat; label: string; items: CalcItem[] }[] = [
  {
    id: "investment",
    label: "Investment",
    items: [
      {
        id: "sip",
        title: "SIP",
        blurb: "Monthly mutual fund SIP projections",
        icon: "trending",
        implemented: true,
      },
      {
        id: "swp",
        title: "SWP",
        blurb: "Withdrawals from a fixed corpus",
        icon: "wallet",
        implemented: true,
      },
      {
        id: "ppf",
        title: "PPF",
        blurb: "15-year Public Provident Fund",
        icon: "bank",
        implemented: true,
      },
      {
        id: "emergency",
        title: "Emergency fund",
        blurb: "Target vs gap by life stage",
        icon: "wallet",
        implemented: true,
      },
      {
        id: "fire",
        title: "FIRE number",
        blurb: "Financial independence target — 25× expenses + loans",
        icon: "flame",
        implemented: true,
      },
    ],
  },
  {
    id: "loans",
    label: "Loans",
    items: [
      {
        id: "emi",
        title: "EMI",
        blurb: "Any reducing-balance loan",
        icon: "bank",
        implemented: true,
      },
      {
        id: "home",
        title: "Home loan",
        blurb: "Property + income stress test",
        icon: "home",
        implemented: true,
      },
      {
        id: "car",
        title: "Car loan",
        blurb: "EMI + 6× salary rule",
        icon: "wallet",
        implemented: true,
      },
    ],
  },
  {
    id: "life",
    label: "Life decisions",
    items: [
      {
        id: "rentbuy",
        title: "Rent vs buy",
        blurb: "Home: cash-outflow comparison",
        icon: "home",
        implemented: true,
      },
      {
        id: "rentcar",
        title: "Rent vs own car",
        blurb: "Cab cost vs ownership estimate",
        icon: "wallet",
        implemented: true,
      },
      {
        id: "whencar",
        title: "When to buy car",
        blurb: "Down payment timeline & afford rule",
        icon: "wallet",
        implemented: true,
      },
    ],
  },
  {
    id: "postoffice",
    label: "Post Office",
    items: [
      {
        id: "po-savings",
        title: "Savings Account",
        blurb: "POSA interest at 4% p.a.",
        icon: "bank",
        implemented: true,
      },
      {
        id: "po-td",
        title: "Time Deposit",
        blurb: "1–5 year PO FD maturity",
        icon: "bank",
        implemented: true,
      },
      {
        id: "po-rd",
        title: "Recurring Deposit",
        blurb: "5-year monthly RD maturity",
        icon: "bank",
        implemented: true,
      },
      {
        id: "nsc",
        title: "NSC",
        blurb: "5-year National Savings Certificate",
        icon: "bank",
        implemented: true,
      },
      {
        id: "po-kvp",
        title: "Kisan Vikas Patra",
        blurb: "Doubles in 115 months",
        icon: "bank",
        implemented: true,
      },
      {
        id: "po-mis",
        title: "Monthly Income (MIS)",
        blurb: "Monthly payout calculator",
        icon: "bank",
        implemented: true,
      },
      {
        id: "po-scss",
        title: "Senior Citizen (SCSS)",
        blurb: "Quarterly interest for 60+",
        icon: "bank",
        implemented: true,
      },
      {
        id: "po-ssy",
        title: "Sukanya Samriddhi",
        blurb: "Girl child SSY maturity",
        icon: "bank",
        implemented: true,
      },
    ],
  },
  {
    id: "tax",
    label: "Tax",
    items: [
      {
        id: "tax-regime",
        title: "Tax Regime Comparison",
        blurb: "Old vs New regime — which saves more tax in 2026",
        icon: "receipt",
        implemented: true,
      },
    ],
  },
];

export function findCategoryForCalc(calcId: string): Cat {
  for (const category of CATEGORIES) {
    if (category.items.some((item) => item.id === calcId)) return category.id;
  }
  return CATEGORIES[0].id;
}

export function getItemById(id?: string) {
  if (!id) return CATEGORIES[0].items[0];
  for (const category of CATEGORIES) {
    const found = category.items.find((item) => item.id === id);
    if (found) return found;
  }
  return CATEGORIES[0].items[0];
}
