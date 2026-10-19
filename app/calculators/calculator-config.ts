export type Cat =
  | "investment"
  | "savings"
  | "retirement"
  | "loans"
  | "tax"
  | "protection"
  | "life"
  | "postoffice";

export type Item = {
  id: string;
  title: string;
  blurb: string;
  /** AppIcon name from components/ui/AppIcon — purple theme icons only. */
  icon?: "flame" | "receipt" | "trending" | "home" | "bank" | "wallet";
  keywords?: string[];
  isPremium?: boolean;
};

export const CATEGORIES: { id: Cat; label: string; items: Item[] }[] = [
  {
    id: "investment",
    label: "Investment",
    items: [
      {
        id: "sip",
        title: "SIP",
        blurb: "Monthly mutual fund SIP projections",
        icon: "trending",
      },
      {
        id: "compare",
        title: "Compare calculations",
        blurb:
          "Two or three scenarios side by side: return, tenure, SIP vs FD, loans",
        icon: "trending",
        keywords: [
          "compare SIP returns",
          "SIP vs FD vs PPF calculator",
          "compare loan tenure EMI",
          "compare investment options India",
        ],
      },
      {
        id: "stepup-sip",
        title: "Step-up SIP",
        blurb: "SIP that grows with your salary every year",
        icon: "trending",
        keywords: ["step up SIP calculator", "top up SIP calculator India"],
      },
      {
        id: "lumpsum",
        title: "Lumpsum",
        blurb: "One-time investment growth",
        icon: "trending",
        keywords: [
          "lumpsum calculator",
          "mutual fund lumpsum calculator India",
        ],
      },
      {
        id: "swp",
        title: "SWP",
        blurb: "Withdrawals from a fixed corpus",
        icon: "wallet",
      },
      {
        id: "goal-sip",
        title: "Goal SIP",
        blurb: "Monthly SIP needed for any goal",
        icon: "flame",
        keywords: ["goal SIP calculator", "SIP needed for goal"],
      },
      {
        id: "sip-delay",
        title: "Cost of delay",
        blurb: "What waiting to start investing costs",
        icon: "trending",
        keywords: ["cost of delay calculator", "SIP delay calculator"],
      },
      {
        id: "stp",
        title: "STP",
        blurb: "Move a lumpsum from debt to equity monthly",
        icon: "trending",
        keywords: ["STP calculator", "systematic transfer plan calculator"],
      },
      {
        id: "compound",
        title: "Compound interest",
        blurb: "Growth with any compounding frequency",
        icon: "trending",
        keywords: ["compound interest calculator India"],
      },
      {
        id: "cagr",
        title: "CAGR",
        blurb: "Yearly growth rate between two values",
        icon: "trending",
        keywords: ["CAGR calculator", "annualised return calculator"],
      },
      {
        id: "xirr",
        title: "XIRR",
        blurb: "Real return on SIPs and irregular investments",
        icon: "trending",
        keywords: ["XIRR calculator", "mutual fund XIRR calculator"],
      },
      {
        id: "expense-ratio",
        title: "Direct vs regular",
        blurb: "Cost of a fund's expense ratio over time",
        icon: "receipt",
        keywords: [
          "direct vs regular mutual fund calculator",
          "expense ratio calculator",
        ],
      },
      {
        id: "asset-allocation",
        title: "Asset allocation",
        blurb: "Equity, debt and gold mix for you",
        icon: "wallet",
        keywords: [
          "asset allocation calculator India",
          "portfolio rebalancing calculator",
        ],
      },
      {
        id: "inflation",
        title: "Inflation",
        blurb: "Future cost and real return",
        icon: "trending",
        keywords: ["inflation calculator India", "real return calculator"],
      },
      {
        id: "money-double",
        title: "Money doubling",
        blurb: "Years to double, triple or 10× (Rule of 72)",
        icon: "trending",
        keywords: ["rule of 72 calculator", "money double calculator"],
      },
    ],
  },
  {
    id: "savings",
    label: "Savings",
    items: [
      {
        id: "fd",
        title: "Fixed deposit",
        blurb: "Bank FD maturity with TDS and tax",
        icon: "bank",
        keywords: ["FD calculator", "fixed deposit calculator India"],
      },
      {
        id: "rd",
        title: "Recurring deposit",
        blurb: "Bank RD maturity",
        icon: "bank",
        keywords: ["RD calculator", "recurring deposit calculator"],
      },
      {
        id: "ppf",
        title: "PPF",
        blurb: "15-year Public Provident Fund",
        icon: "bank",
      },
      {
        id: "epf",
        title: "PF (EPF)",
        blurb: "Employee Provident Fund value at 60",
        icon: "bank",
      },
      {
        id: "gold",
        title: "Gold",
        blurb: "SGB vs gold ETF vs jewellery",
        icon: "wallet",
        keywords: ["gold investment calculator", "SGB vs gold ETF"],
      },
    ],
  },
  {
    id: "retirement",
    label: "Retirement",
    items: [
      {
        id: "retirement",
        title: "Retirement corpus",
        blurb: "How much to retire and the SIP to get there",
        icon: "flame",
        keywords: [
          "retirement calculator India",
          "retirement corpus calculator",
        ],
      },
      {
        id: "fire",
        title: "FIRE number",
        blurb: "Financial independence target — 25× expenses + loans",
        icon: "flame",
        keywords: [
          "FIRE number calculator India",
          "financial independence calculator",
          "retire early India",
          "4 percent rule India",
          "how much to retire India",
        ],
      },
      {
        id: "nps",
        title: "NPS",
        blurb: "Corpus, lump sum and pension at 60",
        icon: "bank",
        keywords: ["NPS calculator", "national pension scheme calculator"],
      },
      {
        id: "annuity",
        title: "Annuity / pension",
        blurb: "Monthly pension from a corpus",
        icon: "wallet",
        keywords: ["annuity calculator India", "pension calculator"],
      },
      {
        id: "gratuity",
        title: "Gratuity",
        blurb: "Gratuity amount and tax",
        icon: "receipt",
        keywords: ["gratuity calculator", "gratuity calculator India"],
      },
      {
        id: "leave-encashment",
        title: "Leave encashment",
        blurb: "Leave payout and tax exemption",
        icon: "receipt",
        keywords: ["leave encashment calculator", "leave encashment tax"],
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
      },
      {
        id: "home",
        title: "Home loan",
        blurb: "Property + income stress test",
        icon: "home",
      },
      {
        id: "car",
        title: "Car loan",
        blurb: "EMI + 6× salary rule",
        icon: "wallet",
      },
      {
        id: "loan-eligibility",
        title: "Loan eligibility",
        blurb: "How much you can borrow",
        icon: "bank",
        keywords: [
          "home loan eligibility calculator",
          "loan eligibility calculator",
        ],
      },
      {
        id: "prepay-vs-invest",
        title: "Prepay vs invest",
        blurb: "Prepay the loan or invest the money?",
        icon: "bank",
        keywords: [
          "prepay home loan or invest calculator",
          "loan prepayment calculator",
        ],
      },
      {
        id: "balance-transfer",
        title: "Balance transfer",
        blurb: "Savings from switching your loan",
        icon: "bank",
        keywords: ["home loan balance transfer calculator"],
      },
      {
        id: "flat-vs-reducing",
        title: "Flat vs reducing rate",
        blurb: "The real interest rate on a flat-rate loan",
        icon: "receipt",
        keywords: ["flat rate to reducing rate calculator"],
      },
      {
        id: "credit-card",
        title: "Credit card interest",
        blurb: "Cost of paying only the minimum due",
        icon: "wallet",
        keywords: ["credit card interest calculator", "minimum due calculator"],
      },
      {
        id: "debt-payoff",
        title: "Debt payoff plan",
        blurb: "Avalanche vs snowball to become debt-free",
        icon: "wallet",
        keywords: ["debt payoff calculator", "debt snowball calculator"],
      },
      {
        id: "education-loan",
        title: "Education loan",
        blurb: "EMI after moratorium + 80E benefit",
        icon: "bank",
        keywords: ["education loan EMI calculator"],
      },
      {
        id: "gold-loan",
        title: "Gold loan",
        blurb: "Loan amount on your gold",
        icon: "wallet",
        keywords: ["gold loan calculator"],
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
        isPremium: false,
        keywords: [
          "tax regime 2026",
          "old vs new tax regime",
          "income tax calculator India",
          "tax saving India",
          "which tax regime is better",
        ],
      },
      {
        id: "salary",
        title: "Salary (CTC to in-hand)",
        blurb: "Monthly take-home from your CTC",
        icon: "receipt",
        keywords: ["salary calculator India", "CTC to in-hand calculator"],
      },
      {
        id: "hra",
        title: "HRA exemption",
        blurb: "Tax-free part of your HRA",
        icon: "receipt",
        keywords: ["HRA calculator", "HRA exemption calculator"],
      },
      {
        id: "capital-gains",
        title: "Capital gains tax",
        blurb: "Tax on shares, funds, property, gold",
        icon: "receipt",
        keywords: ["capital gains tax calculator India", "LTCG calculator"],
      },
      {
        id: "ltcg-harvest",
        title: "LTCG harvesting",
        blurb: "Use the ₹1.25 lakh exemption every year",
        icon: "receipt",
        keywords: ["tax harvesting calculator", "LTCG harvesting"],
      },
      {
        id: "deductions",
        title: "80C & 80D planner",
        blurb: "Deductions used, room left, tax saved",
        icon: "receipt",
        keywords: ["80C calculator", "80D calculator"],
      },
      {
        id: "advance-tax",
        title: "Advance tax",
        blurb: "Instalments and due dates",
        icon: "receipt",
        keywords: ["advance tax calculator"],
      },
      {
        id: "presumptive-tax",
        title: "Freelancer tax (44ADA/44AD)",
        blurb: "Presumptive tax for freelancers and small business",
        icon: "receipt",
        keywords: ["44ADA calculator", "freelancer tax calculator India"],
      },
      {
        id: "rental-income",
        title: "Rental income tax",
        blurb: "Tax on rent and net rental yield",
        icon: "home",
        keywords: ["rental income tax calculator"],
      },
      {
        id: "gst",
        title: "GST",
        blurb: "Add or remove GST",
        icon: "receipt",
        keywords: ["GST calculator"],
      },
    ],
  },
  {
    id: "protection",
    label: "Insurance",
    items: [
      {
        id: "term-cover",
        title: "Term insurance cover",
        blurb: "How much life cover you need",
        icon: "flame",
        keywords: ["term insurance calculator", "life cover calculator"],
      },
      {
        id: "health-cover",
        title: "Health insurance cover",
        blurb: "Right health cover for your family",
        icon: "flame",
        keywords: ["health insurance cover calculator"],
      },
      {
        id: "emergency",
        title: "Emergency fund",
        blurb: "Target vs gap by life stage",
        icon: "wallet",
      },
      {
        id: "policy-return",
        title: "Policy returns (IRR)",
        blurb: "Real return of an endowment / money-back plan",
        icon: "receipt",
        keywords: ["LIC policy return calculator", "endowment plan IRR"],
      },
      {
        id: "buy-term-invest",
        title: "Term + invest vs endowment",
        blurb: "Buy term and invest the rest",
        icon: "flame",
        keywords: ["buy term invest the rest calculator"],
      },
    ],
  },
  {
    id: "life",
    label: "Goals & life",
    items: [
      {
        id: "child-education",
        title: "Child education",
        blurb: "Plan for your child's college",
        icon: "flame",
        keywords: ["child education calculator"],
      },
      {
        id: "marriage",
        title: "Marriage",
        blurb: "Save for a wedding",
        icon: "flame",
        keywords: ["marriage planning calculator"],
      },
      {
        id: "down-payment",
        title: "Home down payment",
        blurb: "Save for a home down payment",
        icon: "home",
        keywords: ["down payment calculator"],
      },
      {
        id: "rentbuy",
        title: "Rent vs buy",
        blurb: "Home: cash-outflow comparison",
        icon: "home",
      },
      {
        id: "rentcar",
        title: "Rent vs own car",
        blurb: "Cab cost vs ownership estimate",
        icon: "wallet",
      },
      {
        id: "whencar",
        title: "When to buy car",
        blurb: "Down payment timeline & afford rule",
        icon: "wallet",
      },
      {
        id: "salary-hike",
        title: "Salary hike",
        blurb: "Hike %, real hike and extra in-hand",
        icon: "receipt",
        keywords: ["salary hike calculator"],
      },
      {
        id: "net-worth",
        title: "Net worth",
        blurb: "What you own minus what you owe",
        icon: "wallet",
        keywords: ["net worth calculator India"],
      },
      {
        id: "budget",
        title: "Budget (50/30/20)",
        blurb: "Split take-home into needs, wants, savings",
        icon: "wallet",
        keywords: ["50 30 20 budget calculator"],
      },
    ],
  },
  {
    id: "postoffice",
    label: "Post Office",
    items: [
      {
        id: "po",
        title: "All schemes",
        blurb: "Hub for every India Post calculator",
        icon: "bank",
      },
      {
        id: "po-savings",
        title: "Savings Account",
        blurb: "POSA interest at 4% p.a.",
        icon: "bank",
      },
      {
        id: "po-td",
        title: "Time Deposit",
        blurb: "1–5 year PO FD maturity",
        icon: "bank",
      },
      {
        id: "po-rd",
        title: "Recurring Deposit",
        blurb: "5-year monthly RD maturity",
        icon: "bank",
      },
      {
        id: "nsc",
        title: "NSC",
        blurb: "5-year National Savings Certificate",
        icon: "bank",
      },
      {
        id: "po-kvp",
        title: "Kisan Vikas Patra",
        blurb: "Doubles in 115 months",
        icon: "bank",
      },
      {
        id: "po-mis",
        title: "Monthly Income (MIS)",
        blurb: "Monthly payout calculator",
        icon: "bank",
      },
      {
        id: "po-scss",
        title: "Senior Citizen (SCSS)",
        blurb: "Quarterly interest for 60+",
        icon: "bank",
      },
      {
        id: "po-ssy",
        title: "Sukanya Samriddhi",
        blurb: "Girl child SSY maturity",
        icon: "bank",
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
