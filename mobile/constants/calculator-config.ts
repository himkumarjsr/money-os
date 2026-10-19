/** Mirrors web app/calculators/calculator-config.ts */
import type { AppIconName } from "@/components/ui/AppIcon";

export type Cat =
  | "investment"
  | "savings"
  | "retirement"
  | "loans"
  | "tax"
  | "protection"
  | "life"
  | "postoffice";

export type CalcItem = {
  id: string;
  title: string;
  blurb: string;
  icon?: AppIconName;
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
      },
      {
        id: "compare",
        title: "Compare calculations",
        blurb:
          "Two or three scenarios side by side: return, tenure, SIP vs FD, loans",
        icon: "trending",
      },
      {
        id: "stepup-sip",
        title: "Step-up SIP",
        blurb: "SIP that grows with your salary every year",
        icon: "trending",
      },
      {
        id: "lumpsum",
        title: "Lumpsum",
        blurb: "One-time investment growth",
        icon: "trending",
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
      },
      {
        id: "sip-delay",
        title: "Cost of delay",
        blurb: "What waiting to start investing costs",
        icon: "trending",
      },
      {
        id: "stp",
        title: "STP",
        blurb: "Move a lumpsum from debt to equity monthly",
        icon: "trending",
      },
      {
        id: "compound",
        title: "Compound interest",
        blurb: "Growth with any compounding frequency",
        icon: "trending",
      },
      {
        id: "cagr",
        title: "CAGR",
        blurb: "Yearly growth rate between two values",
        icon: "trending",
      },
      {
        id: "xirr",
        title: "XIRR",
        blurb: "Real return on SIPs and irregular investments",
        icon: "trending",
      },
      {
        id: "expense-ratio",
        title: "Direct vs regular",
        blurb: "Cost of a fund's expense ratio over time",
        icon: "receipt",
      },
      {
        id: "asset-allocation",
        title: "Asset allocation",
        blurb: "Equity, debt and gold mix for you",
        icon: "wallet",
      },
      {
        id: "inflation",
        title: "Inflation",
        blurb: "Future cost and real return",
        icon: "trending",
      },
      {
        id: "money-double",
        title: "Money doubling",
        blurb: "Years to double, triple or 10× (Rule of 72)",
        icon: "trending",
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
      },
      {
        id: "rd",
        title: "Recurring deposit",
        blurb: "Bank RD maturity",
        icon: "bank",
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
      },
      {
        id: "fire",
        title: "FIRE number",
        blurb: "Financial independence target — 25× expenses + loans",
        icon: "flame",
      },
      {
        id: "nps",
        title: "NPS",
        blurb: "Corpus, lump sum and pension at 60",
        icon: "bank",
      },
      {
        id: "annuity",
        title: "Annuity / pension",
        blurb: "Monthly pension from a corpus",
        icon: "wallet",
      },
      {
        id: "gratuity",
        title: "Gratuity",
        blurb: "Gratuity amount and tax",
        icon: "receipt",
      },
      {
        id: "leave-encashment",
        title: "Leave encashment",
        blurb: "Leave payout and tax exemption",
        icon: "receipt",
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
      },
      {
        id: "prepay-vs-invest",
        title: "Prepay vs invest",
        blurb: "Prepay the loan or invest the money?",
        icon: "bank",
      },
      {
        id: "balance-transfer",
        title: "Balance transfer",
        blurb: "Savings from switching your loan",
        icon: "bank",
      },
      {
        id: "flat-vs-reducing",
        title: "Flat vs reducing rate",
        blurb: "The real interest rate on a flat-rate loan",
        icon: "receipt",
      },
      {
        id: "credit-card",
        title: "Credit card interest",
        blurb: "Cost of paying only the minimum due",
        icon: "wallet",
      },
      {
        id: "debt-payoff",
        title: "Debt payoff plan",
        blurb: "Avalanche vs snowball to become debt-free",
        icon: "wallet",
      },
      {
        id: "education-loan",
        title: "Education loan",
        blurb: "EMI after moratorium + 80E benefit",
        icon: "bank",
      },
      {
        id: "gold-loan",
        title: "Gold loan",
        blurb: "Loan amount on your gold",
        icon: "wallet",
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
      },
      {
        id: "salary",
        title: "Salary (CTC to in-hand)",
        blurb: "Monthly take-home from your CTC",
        icon: "receipt",
      },
      {
        id: "hra",
        title: "HRA exemption",
        blurb: "Tax-free part of your HRA",
        icon: "receipt",
      },
      {
        id: "capital-gains",
        title: "Capital gains tax",
        blurb: "Tax on shares, funds, property, gold",
        icon: "receipt",
      },
      {
        id: "ltcg-harvest",
        title: "LTCG harvesting",
        blurb: "Use the ₹1.25 lakh exemption every year",
        icon: "receipt",
      },
      {
        id: "deductions",
        title: "80C & 80D planner",
        blurb: "Deductions used, room left, tax saved",
        icon: "receipt",
      },
      {
        id: "advance-tax",
        title: "Advance tax",
        blurb: "Instalments and due dates",
        icon: "receipt",
      },
      {
        id: "presumptive-tax",
        title: "Freelancer tax (44ADA/44AD)",
        blurb: "Presumptive tax for freelancers and small business",
        icon: "receipt",
      },
      {
        id: "rental-income",
        title: "Rental income tax",
        blurb: "Tax on rent and net rental yield",
        icon: "home",
      },
      {
        id: "gst",
        title: "GST",
        blurb: "Add or remove GST",
        icon: "receipt",
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
      },
      {
        id: "health-cover",
        title: "Health insurance cover",
        blurb: "Right health cover for your family",
        icon: "flame",
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
      },
      {
        id: "buy-term-invest",
        title: "Term + invest vs endowment",
        blurb: "Buy term and invest the rest",
        icon: "flame",
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
      },
      {
        id: "marriage",
        title: "Marriage",
        blurb: "Save for a wedding",
        icon: "flame",
      },
      {
        id: "down-payment",
        title: "Home down payment",
        blurb: "Save for a home down payment",
        icon: "home",
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
      },
      {
        id: "net-worth",
        title: "Net worth",
        blurb: "What you own minus what you owe",
        icon: "wallet",
      },
      {
        id: "budget",
        title: "Budget (50/30/20)",
        blurb: "Split take-home into needs, wants, savings",
        icon: "wallet",
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

export function findCategoryForCalc(calcId: string): Cat {
  for (const category of CATEGORIES) {
    if (category.items.some((item) => item.id === calcId)) return category.id;
  }
  return CATEGORIES[0].id;
}
