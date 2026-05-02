export type Cat = "investment" | "loans" | "life" | "postoffice" | "tax";

export type Item = {
  id: string;
  title: string;
  blurb: string;
  icon?: string;
  keywords?: string[];
  isPremium?: boolean;
};

export const CATEGORIES: { id: Cat; label: string; items: Item[] }[] = [
  {
    id: "investment",
    label: "Investment",
    items: [
      { id: "sip", title: "SIP", blurb: "Monthly mutual fund SIP projections" },
      { id: "swp", title: "SWP", blurb: "Withdrawals from a fixed corpus" },
      { id: "ppf", title: "PPF", blurb: "15-year Public Provident Fund" },
      { id: "nsc", title: "NSC", blurb: "5-year National Savings Certificate" },
      { id: "emergency", title: "Emergency fund", blurb: "Target vs gap by life stage" },
    ],
  },
  {
    id: "loans",
    label: "Loans",
    items: [
      { id: "emi", title: "EMI", blurb: "Any reducing-balance loan" },
      { id: "home", title: "Home loan", blurb: "Property + income stress test" },
      { id: "car", title: "Car loan", blurb: "EMI + 6× salary rule" },
    ],
  },
  {
    id: "life",
    label: "Life decisions",
    items: [
      { id: "rentbuy", title: "Rent vs buy", blurb: "Home: cash-outflow comparison" },
      { id: "rentcar", title: "Rent vs own car", blurb: "Cab cost vs ownership estimate" },
      { id: "whencar", title: "When to buy car", blurb: "Down payment timeline & afford rule" },
    ],
  },
  {
    id: "postoffice",
    label: "Post Office",
    items: [{ id: "po", title: "Post Office suite", blurb: "Seven popular schemes" }],
  },
  {
    id: "tax",
    label: "Tax",
    items: [
      {
        id: "tax-regime",
        title: "Tax Regime Comparison",
        blurb: "Old vs New regime — which saves more tax in 2026",
        icon: "🧾",
        isPremium: false,
        keywords: [
          "tax regime 2026",
          "old vs new tax regime",
          "income tax calculator India",
          "tax saving India",
          "which tax regime is better",
        ],
      },
    ],
  },
];

export function getItemById(id?: string) {
  if (!id) return CATEGORIES[0].items[0];
  for (const category of CATEGORIES) {
    const found = category.items.find((item) => item.id === id);
    if (found) return found;
  }
  return CATEGORIES[0].items[0];
}

