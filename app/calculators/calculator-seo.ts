import { CATEGORIES } from "./calculator-config";
import { SITE_URL } from "@/lib/seo";

export type CalculatorSeo = {
  title: string;
  description: string;
  keywords: string[];
  faq: Array<{ q: string; a: string }>;
  /** Clean public path, e.g. /calculators/sip */
  path: string;
  appName: string;
};

/** IDs that get dedicated indexable URLs under /calculators/[id]. */
export const INDEXABLE_CALC_IDS = CATEGORIES.flatMap((c) =>
  c.items.map((i) => i.id),
).filter((id) => id !== "tax-regime");

export const SEO_COPY: Record<string, CalculatorSeo> = {
  sip: {
    path: "/calculators/sip",
    appName: "SIP Calculator India",
    title: "SIP Calculator India - Mutual Fund Returns Calculator | Finkoin",
    description:
      "Free Finkoin SIP calculator India to estimate monthly mutual fund returns, total invested amount, and projected wealth over time.",
    keywords: [
      "SIP calculator India",
      "Finkoin SIP calculator",
      "mutual fund calculator",
      "SIP return calculator",
      "SIP calculator online",
    ],
    faq: [
      {
        q: "What is SIP calculator?",
        a: "A SIP calculator estimates future value of monthly mutual fund investments based on amount, rate and tenure.",
      },
      {
        q: "How is SIP return calculated?",
        a: "It uses a compounding formula with periodic monthly investment, expected annual return and investment duration.",
      },
      {
        q: "Is SIP better than FD?",
        a: "SIP may offer higher long-term growth with market risk while FD offers fixed returns with lower risk.",
      },
    ],
  },
  swp: {
    path: "/calculators/swp",
    appName: "SWP Calculator India",
    title: "SWP Calculator India - Systematic Withdrawal Plan | Finkoin",
    description:
      "Free Finkoin SWP calculator to plan systematic withdrawals from a mutual fund corpus. Estimate how long your money lasts.",
    keywords: [
      "SWP calculator India",
      "Finkoin SWP calculator",
      "systematic withdrawal plan calculator",
      "mutual fund withdrawal calculator",
    ],
    faq: [
      {
        q: "What is SWP?",
        a: "A Systematic Withdrawal Plan lets you withdraw a fixed amount regularly from your mutual fund investment.",
      },
      {
        q: "How does an SWP calculator help?",
        a: "It projects remaining corpus over time based on withdrawal amount, expected returns, and tenure.",
      },
      {
        q: "Is SWP good for retirement income?",
        a: "SWP can provide regular cash flow in retirement, but market returns and withdrawal rate affect how long the corpus lasts.",
      },
    ],
  },
  emi: {
    path: "/calculators/emi",
    appName: "EMI Calculator India",
    title: "EMI Calculator - Loan EMI Calculator Online | Finkoin",
    description:
      "Estimate your loan EMI instantly with Finkoin's free EMI calculator. Compare monthly installments, interest outgo, and repayment duration.",
    keywords: [
      "EMI calculator",
      "Finkoin EMI calculator",
      "loan EMI calculator",
      "home loan EMI calculator",
      "EMI calculator India",
    ],
    faq: [
      {
        q: "What is EMI calculator?",
        a: "An EMI calculator estimates monthly loan installments from principal, rate of interest and tenure.",
      },
      {
        q: "How is EMI calculated?",
        a: "EMI is calculated using a reducing-balance formula that factors loan amount, monthly interest rate and months.",
      },
      {
        q: "Can I compare loan options with EMI calculator?",
        a: "Yes, by varying interest rate and tenure you can compare affordability and total interest outgo.",
      },
    ],
  },
  ppf: {
    path: "/calculators/ppf",
    appName: "PPF Calculator India",
    title: "PPF Calculator India - Public Provident Fund Returns | Finkoin",
    description:
      "Free Finkoin PPF calculator to project 15-year Public Provident Fund maturity amount with yearly contributions.",
    keywords: [
      "PPF calculator India",
      "Finkoin PPF calculator",
      "public provident fund calculator",
      "PPF maturity calculator",
    ],
    faq: [
      {
        q: "What is PPF calculator?",
        a: "A PPF calculator estimates maturity value of Public Provident Fund contributions over the 15-year tenure.",
      },
      {
        q: "Is PPF interest fixed?",
        a: "PPF interest is set by the government and can change over time; calculators use an assumed rate for planning.",
      },
    ],
  },
  nsc: {
    path: "/calculators/nsc",
    appName: "NSC Calculator India",
    title: "NSC Calculator India - National Savings Certificate | Finkoin",
    description:
      "Free Finkoin NSC calculator to estimate National Savings Certificate maturity value for a 5-year tenure.",
    keywords: [
      "NSC calculator India",
      "Finkoin NSC calculator",
      "national savings certificate calculator",
    ],
    faq: [
      {
        q: "What is NSC?",
        a: "National Savings Certificate is a fixed-tenure small savings scheme offered through post offices in India.",
      },
    ],
  },
  emergency: {
    path: "/calculators/emergency",
    appName: "Emergency Fund Calculator India",
    title: "Emergency Fund Calculator India | Finkoin",
    description:
      "Free Finkoin emergency fund calculator to find your target corpus by life stage and monthly expenses.",
    keywords: [
      "emergency fund calculator India",
      "Finkoin emergency fund",
      "how much emergency fund India",
    ],
    faq: [
      {
        q: "How much emergency fund do I need?",
        a: "A common rule is 3–12 months of essential expenses depending on income stability and dependents.",
      },
    ],
  },
  fire: {
    path: "/calculators/fire",
    appName: "FIRE Number Calculator India",
    title: "FIRE Number Calculator India - Retire Early Target | Finkoin",
    description:
      "Free Finkoin FIRE calculator to estimate your financial independence number using expenses, loans, and the 25× rule.",
    keywords: [
      "FIRE number calculator India",
      "Finkoin FIRE calculator",
      "financial independence calculator",
      "retire early India",
    ],
    faq: [
      {
        q: "What is FIRE number?",
        a: "Your FIRE number is an estimate of investable wealth needed for financial independence, often around 25× annual expenses.",
      },
    ],
  },
  home: {
    path: "/calculators/home",
    appName: "Home Loan Calculator India",
    title: "Home Loan Calculator India - Affordability & EMI | Finkoin",
    description:
      "Free Finkoin home loan calculator to stress-test property cost, EMI, and income affordability.",
    keywords: [
      "home loan calculator India",
      "Finkoin home loan calculator",
      "home loan EMI calculator",
    ],
    faq: [
      {
        q: "How much home loan can I afford?",
        a: "Affordability depends on income, existing EMIs, interest rate, and tenure. This calculator helps stress-test those inputs.",
      },
    ],
  },
  car: {
    path: "/calculators/car",
    appName: "Car Loan Calculator India",
    title: "Car Loan Calculator India - EMI & Affordability | Finkoin",
    description:
      "Free Finkoin car loan calculator for EMI estimates and simple affordability checks.",
    keywords: [
      "car loan calculator India",
      "Finkoin car loan calculator",
      "car EMI calculator",
    ],
    faq: [
      {
        q: "How is car loan EMI calculated?",
        a: "Car loan EMI uses principal, interest rate, and tenure on a reducing-balance schedule.",
      },
    ],
  },
  rentbuy: {
    path: "/calculators/rentbuy",
    appName: "Rent vs Buy Calculator India",
    title: "Rent vs Buy Calculator India | Finkoin",
    description:
      "Free Finkoin rent vs buy calculator to compare home ownership cash outflows against renting.",
    keywords: [
      "rent vs buy calculator India",
      "Finkoin rent vs buy",
      "should I buy a house India",
    ],
    faq: [
      {
        q: "Is buying always better than renting?",
        a: "Not always — it depends on rent, property price, loan costs, tenure, and opportunity cost of down payment.",
      },
    ],
  },
  rentcar: {
    path: "/calculators/rentcar",
    appName: "Rent vs Own Car Calculator",
    title: "Rent vs Own Car Calculator India | Finkoin",
    description:
      "Compare cab/rent costs versus owning a car with Finkoin's free calculator.",
    keywords: [
      "rent vs own car calculator",
      "Finkoin car ownership calculator",
    ],
    faq: [
      {
        q: "When does owning a car make sense?",
        a: "When frequent travel makes cab costs higher than EMI, fuel, insurance, and maintenance combined.",
      },
    ],
  },
  whencar: {
    path: "/calculators/whencar",
    appName: "When to Buy Car Calculator",
    title: "When to Buy a Car Calculator India | Finkoin",
    description:
      "Plan your car down payment timeline and affordability with Finkoin's free calculator.",
    keywords: ["when to buy car calculator", "car down payment planner India"],
    faq: [
      {
        q: "How much down payment should I keep for a car?",
        a: "A larger down payment lowers EMI stress. This tool helps you plan when savings reach a comfortable down payment.",
      },
    ],
  },
  po: {
    path: "/calculators/po",
    appName: "Post Office Calculator India",
    title: "Post Office Schemes Calculator India | Finkoin",
    description:
      "Explore popular India Post savings schemes with Finkoin's free post office calculator suite.",
    keywords: [
      "post office calculator India",
      "Finkoin post office schemes",
      "India Post savings calculator",
    ],
    faq: [
      {
        q: "Which post office schemes can I compare?",
        a: "Finkoin includes calculators for popular India Post savings products for planning estimates.",
      },
    ],
  },
  "tax-regime": {
    path: "/calculators/tax-regime-2026",
    appName: "Tax Regime Calculator 2026",
    title: "Tax Regime Calculator 2026 — Old vs New Regime | Finkoin",
    description:
      "Free tax regime calculator for FY 2025-26. Compare old and new tax regime with all deductions — 80C, HRA, home loan, NPS, education loan.",
    keywords: [
      "old vs new tax regime 2026",
      "tax regime calculator 2026",
      "income tax calculator India 2026",
      "Finkoin tax calculator",
    ],
    faq: [
      {
        q: "Which tax regime is better for salaried employees in India?",
        a: "It depends on deductions such as 80C, 80D, HRA, and home loan interest. Use the calculator with your actual numbers to compare old vs new regime.",
      },
    ],
  },
  default: {
    path: "/calculators",
    appName: "Finkoin Financial Calculators",
    title: "Free Financial Calculators for India 2026 | Finkoin",
    description:
      "Free calculators for India: Tax regime comparison, SIP returns, SWP, EMI, emergency fund, term insurance, net worth. Updated for FY 2025-26.",
    keywords: [
      "financial calculator India free",
      "tax calculator India 2026",
      "SIP calculator India",
      "EMI calculator India",
      "Finkoin calculators",
    ],
    faq: [
      {
        q: "What calculators are available on Finkoin?",
        a: "Finkoin offers investment, loan, and life-planning calculators including SIP, SWP, EMI, PPF, and tax regime comparison.",
      },
      {
        q: "Are these calculator results exact?",
        a: "They are planning estimates meant for education and comparison, not guaranteed financial advice.",
      },
      {
        q: "Can I use calculators for free?",
        a: "Yes, all calculators are free to use online.",
      },
    ],
  },
};

export function getSeoForCalc(calcId?: string): CalculatorSeo {
  if (!calcId) return SEO_COPY.default;
  return SEO_COPY[calcId] ?? SEO_COPY.default;
}

/** Map URL segment → internal calc id used by CalculatorsClient. */
export function resolveCalcIdFromPathSegment(segment: string): string | null {
  if (segment === "tax-regime-2026" || segment === "tax-regime") {
    return "tax-regime";
  }
  if (INDEXABLE_CALC_IDS.includes(segment) || segment in SEO_COPY) {
    return segment === "default" ? null : segment;
  }
  // Allow any known config id
  for (const cat of CATEGORIES) {
    if (cat.items.some((i) => i.id === segment)) return segment;
  }
  return null;
}

export function absoluteCalcUrl(path: string) {
  return `${SITE_URL}${path}`;
}

/** Dedicated share banners; others fall back to site home OG. */
const CALC_OG_IMAGE: Record<string, string> = {
  sip: "/og/og-sip.png",
  swp: "/og/og-swp.png",
  "tax-regime": "/og/og-tax-calculator.png",
};

export function getOgImagePathForCalc(calcId: string): string {
  return CALC_OG_IMAGE[calcId] ?? "/og/og-home.png";
}

export function buildCalculatorJsonLd(seo: CalculatorSeo) {
  const pageUrl = absoluteCalcUrl(seo.path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: seo.appName,
        description: seo.description,
        url: pageUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
        provider: {
          "@type": "Organization",
          name: "Finkoin",
          url: SITE_URL,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: seo.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      },
    ],
  };
}
