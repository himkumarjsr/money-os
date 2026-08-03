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
    title: "SIP Calculator India — Monthly SIP Returns Calculator | Finkoin",
    description:
      "Free SIP calculator India. Calculate monthly SIP returns, final corpus and wealth created. Compare SIP amounts and durations. Best SIP calculator India 2026.",
    keywords: [
      "SIP calculator India",
      "SIP returns calculator",
      "monthly SIP calculator",
      "mutual fund SIP calculator",
      "SIP investment calculator India",
      "how much SIP to become crorepati",
      "SIP calculator online free",
      "Finkoin SIP calculator",
      "SIP wealth calculator",
      "best SIP calculator India 2026",
    ],
    faq: [
      {
        q: "What is a SIP calculator?",
        a: "A SIP calculator estimates the future value of monthly mutual fund investments based on amount, expected return rate, and tenure.",
      },
      {
        q: "How is SIP return calculated?",
        a: "It uses a compounding formula with periodic monthly investment, expected annual return, and investment duration.",
      },
      {
        q: "Is SIP better than FD?",
        a: "SIP may offer higher long-term growth with market risk, while FD offers fixed returns with lower risk. Use both for different goals.",
      },
      {
        q: "How much SIP do I need to become a crorepati?",
        a: "It depends on return rate and years. At ~12% for 20 years, roughly ₹10,000–12,000 per month can approach ₹1 crore. Use the calculator with your numbers.",
      },
    ],
  },
  swp: {
    path: "/calculators/swp",
    appName: "SWP Calculator India",
    title: "SWP Calculator India — Systematic Withdrawal Plan | Finkoin",
    description:
      "Free SWP calculator India. Plan systematic withdrawals from mutual funds, estimate how long your corpus lasts, and model retirement cash flow.",
    keywords: [
      "SWP calculator India",
      "systematic withdrawal plan calculator",
      "mutual fund withdrawal calculator",
      "SWP vs SIP",
      "retirement withdrawal calculator India",
      "Finkoin SWP calculator",
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
    title: "EMI Calculator India — Loan EMI Calculator Online | Finkoin",
    description:
      "Free EMI calculator India. Estimate monthly loan EMI, total interest, and repayment for home, car, or personal loans. Instant and accurate.",
    keywords: [
      "EMI calculator",
      "EMI calculator India",
      "loan EMI calculator",
      "home loan EMI calculator",
      "personal loan EMI calculator",
      "car loan EMI calculator",
      "Finkoin EMI calculator",
      "EMI calculator online free",
      "reducing balance EMI calculator",
    ],
    faq: [
      {
        q: "What is an EMI calculator?",
        a: "An EMI calculator estimates monthly loan installments from principal, interest rate, and tenure.",
      },
      {
        q: "How is EMI calculated?",
        a: "EMI uses a reducing-balance formula with loan amount, monthly interest rate, and number of months.",
      },
      {
        q: "Can I compare loan options with an EMI calculator?",
        a: "Yes — vary interest rate and tenure to compare affordability and total interest outgo.",
      },
      {
        q: "Does a lower EMI always mean a cheaper loan?",
        a: "Not always. A longer tenure lowers EMI but can increase total interest. Compare total interest, not only EMI.",
      },
    ],
  },
  ppf: {
    path: "/calculators/ppf",
    appName: "PPF Calculator India",
    title: "PPF Calculator India — Public Provident Fund Maturity | Finkoin",
    description:
      "Free PPF calculator India. Project 15-year Public Provident Fund maturity with yearly contributions. Plan 80C tax-saving with PPF.",
    keywords: [
      "PPF calculator India",
      "public provident fund calculator",
      "PPF maturity calculator",
      "PPF interest calculator",
      "PPF 15 year calculator",
      "Finkoin PPF calculator",
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
    title: "NSC Calculator India — 7.7% National Savings Certificate | Finkoin",
    description:
      "Free NSC calculator India. Estimate 5-year National Savings Certificate maturity at the notified 7.7% p.a. rate (Jul–Sep 2026).",
    keywords: [
      "NSC calculator India",
      "Finkoin NSC calculator",
      "national savings certificate calculator",
      "NSC interest rate 2026",
      "NSC maturity calculator",
    ],
    faq: [
      {
        q: "What is NSC?",
        a: "National Savings Certificate is a 5-year small savings scheme offered through post offices in India. Interest is compounded annually.",
      },
      {
        q: "What is the current NSC interest rate?",
        a: "For Jul–Sep 2026 the notified NSC rate is 7.7% p.a. Rates are reviewed every quarter by the government.",
      },
    ],
  },
  emergency: {
    path: "/calculators/emergency",
    appName: "Emergency Fund Calculator India",
    title: "Emergency Fund Calculator India — How Much Do You Need? | Finkoin",
    description:
      "Free emergency fund calculator India. Find your target corpus by life stage and monthly expenses. Know how much safety buffer to keep liquid.",
    keywords: [
      "emergency fund calculator India",
      "how much emergency fund India",
      "emergency corpus calculator",
      "liquid fund for emergency India",
      "Finkoin emergency fund",
      "6 month emergency fund calculator",
    ],
    faq: [
      {
        q: "How much emergency fund do I need in India?",
        a: "Common guidance: 6 months of expenses if single, 9 months if married, 12 months with kids — adjusted for job stability.",
      },
      {
        q: "Where should I keep my emergency fund?",
        a: "Prefer liquid or overnight mutual funds and a savings buffer — not equity SIPs or locked FDs for the core emergency amount.",
      },
    ],
  },
  fire: {
    path: "/calculators/fire",
    appName: "FIRE Number Calculator India",
    title:
      "FIRE Number Calculator India — When Can You Retire Early? | Finkoin",
    description:
      "Free FIRE number calculator India. Estimate corpus to retire early using expenses, loans, and the 25× rule adapted for Indian inflation.",
    keywords: [
      "FIRE number calculator India",
      "FIRE calculator India",
      "how much money to retire India",
      "retire early India",
      "financial independence India",
      "Finkoin FIRE calculator",
      "4 percent rule India",
    ],
    faq: [
      {
        q: "What is a FIRE number?",
        a: "Your FIRE number estimates investable wealth needed for financial independence — often around 25× annual expenses (4% rule), adjusted for Indian costs and loans.",
      },
      {
        q: "Does a home loan change my FIRE number?",
        a: "Yes. Outstanding loans increase the corpus you need or extend your timeline. Include EMIs and liabilities when calculating FIRE in India.",
      },
    ],
  },
  home: {
    path: "/calculators/home",
    appName: "Home Loan Calculator India",
    title: "Home Loan EMI Calculator 2026 — Affordability & Planning | Finkoin",
    description:
      "Free home loan EMI calculator India. Calculate monthly EMI, affordability, and planning stress-tests for property cost and income. Best home loan calculator 2026.",
    keywords: [
      "home loan EMI calculator",
      "home loan calculator India 2026",
      "home loan EMI calculator with prepayment",
      "housing loan calculator",
      "home loan tax benefit calculator",
      "Section 24B calculator",
      "Finkoin home loan calculator",
      "how much home loan can I afford",
    ],
    faq: [
      {
        q: "How much home loan can I afford?",
        a: "Affordability depends on income, existing EMIs, interest rate, and tenure. This calculator helps stress-test those inputs.",
      },
      {
        q: "What tax benefits apply on a home loan?",
        a: "Under the old regime, principal can qualify under 80C (within overall limit) and interest under Section 24B (up to ₹2 lakh for self-occupied, subject to rules).",
      },
      {
        q: "Should I prepay my home loan or invest?",
        a: "Compare loan interest vs expected investment returns after tax. Prepaying reduces risk; investing may grow wealth faster if returns beat the loan rate.",
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
    title: "Post Office Schemes Calculator India — All Rates 2026 | Finkoin",
    description:
      "Free India Post calculators for Savings Account, TD, RD, NSC, KVP, MIS, SCSS and Sukanya Samriddhi with Jul–Sep 2026 notified rates.",
    keywords: [
      "post office calculator India",
      "Finkoin post office schemes",
      "India Post savings calculator",
      "post office interest rates 2026",
      "small savings schemes calculator",
    ],
    faq: [
      {
        q: "Which post office schemes can I calculate?",
        a: "Finkoin covers POSA, Time Deposit, RD, NSC, KVP, MIS, SCSS and Sukanya Samriddhi with dedicated maturity or income calculators.",
      },
      {
        q: "Are the interest rates up to date?",
        a: "Defaults use MoF/DoP notified rates for Jul–Sep 2026. Always confirm the live circular before investing — rates can change quarterly.",
      },
    ],
  },
  "po-savings": {
    path: "/calculators/po-savings",
    appName: "Post Office Savings Account Calculator",
    title: "Post Office Savings Account Calculator — 4% Interest | Finkoin",
    description:
      "Estimate yearly and monthly interest on a Post Office Savings Account at the notified 4% p.a. rate.",
    keywords: [
      "post office savings account calculator",
      "POSA interest calculator",
      "post office savings rate 4%",
    ],
    faq: [
      {
        q: "What is the Post Office Savings Account interest rate?",
        a: "The notified rate for Jul–Sep 2026 is 4% p.a. Interest is taxable subject to §80TTA/80TTB limits.",
      },
    ],
  },
  "po-td": {
    path: "/calculators/po-td",
    appName: "Post Office Time Deposit Calculator",
    title: "Post Office TD / FD Calculator India — 1 to 5 Year | Finkoin",
    description:
      "Calculate Post Office Time Deposit maturity for 1, 2, 3 or 5 years at notified rates (6.9%–7.5% for Jul–Sep 2026).",
    keywords: [
      "post office TD calculator",
      "post office FD calculator",
      "post office time deposit interest rate",
      "PO FD maturity calculator",
    ],
    faq: [
      {
        q: "What are current Post Office TD rates?",
        a: "For Jul–Sep 2026: 1-year 6.9%, 2-year 7.0%, 3-year 7.1%, 5-year 7.5% — compounded quarterly.",
      },
    ],
  },
  "po-rd": {
    path: "/calculators/po-rd",
    appName: "Post Office RD Calculator",
    title: "Post Office RD Calculator India — 6.7% Recurring Deposit | Finkoin",
    description:
      "Free Post Office Recurring Deposit calculator. Estimate 5-year RD maturity at the notified 6.7% p.a. rate.",
    keywords: [
      "post office RD calculator",
      "recurring deposit calculator India Post",
      "PO RD maturity calculator",
    ],
    faq: [
      {
        q: "What is the Post Office RD interest rate?",
        a: "The 5-year National Savings Recurring Deposit rate for Jul–Sep 2026 is 6.7% p.a.",
      },
    ],
  },
  "po-kvp": {
    path: "/calculators/po-kvp",
    appName: "Kisan Vikas Patra Calculator",
    title: "KVP Calculator India — Doubles in 115 Months | Finkoin",
    description:
      "Free Kisan Vikas Patra calculator. See when your money doubles at 7.5% p.a. (115 months as of Jul–Sep 2026).",
    keywords: [
      "KVP calculator",
      "kisan vikas patra calculator",
      "KVP maturity calculator",
      "KVP interest rate 2026",
    ],
    faq: [
      {
        q: "How long does KVP take to double?",
        a: "At the Jul–Sep 2026 notified 7.5% rate, KVP doubles in 115 months.",
      },
    ],
  },
  "po-mis": {
    path: "/calculators/po-mis",
    appName: "Post Office MIS Calculator",
    title: "Post Office MIS Calculator — Monthly Income Scheme 7.4% | Finkoin",
    description:
      "Calculate monthly income from Post Office Monthly Income Scheme (MIS) at 7.4% p.a. Max ₹9L single / ₹15L joint.",
    keywords: [
      "post office MIS calculator",
      "POMIS calculator",
      "monthly income scheme calculator",
      "post office monthly income",
    ],
    faq: [
      {
        q: "How much monthly income does MIS give?",
        a: "At 7.4% p.a., ₹10,000 deposit pays about ₹62 per month. Principal returns after 5 years.",
      },
    ],
  },
  "po-scss": {
    path: "/calculators/po-scss",
    appName: "SCSS Calculator India",
    title: "SCSS Calculator India — Senior Citizen Savings 8.2% | Finkoin",
    description:
      "Free Senior Citizen Savings Scheme calculator. Estimate quarterly interest at 8.2% p.a. (age 60+, max ₹30 lakh).",
    keywords: [
      "SCSS calculator",
      "senior citizen savings scheme calculator",
      "SCSS interest rate 2026",
      "post office SCSS calculator",
    ],
    faq: [
      {
        q: "Who can invest in SCSS?",
        a: "Generally individuals aged 60 or above (with limited early-retirement exceptions). Maximum deposit is ₹30 lakh.",
      },
    ],
  },
  "po-ssy": {
    path: "/calculators/po-ssy",
    appName: "Sukanya Samriddhi Calculator",
    title: "Sukanya Samriddhi Yojana Calculator — 8.2% SSY | Finkoin",
    description:
      "Free Sukanya Samriddhi (SSY) calculator. Project girl-child account maturity at 8.2% p.a. with 15 years of deposits.",
    keywords: [
      "sukanya samriddhi calculator",
      "SSY calculator India",
      "sukanya samriddhi yojana interest rate",
      "SSY maturity calculator",
    ],
    faq: [
      {
        q: "What is the SSY interest rate?",
        a: "For Jul–Sep 2026 the notified Sukanya Samriddhi rate is 8.2% p.a. Interest is EEE (tax-free) under current rules.",
      },
    ],
  },
  "tax-regime": {
    path: "/calculators/tax-regime-2026",
    appName: "Tax Regime Calculator 2025-26",
    title:
      "Old vs New Tax Regime Calculator 2025-26 — Which Saves More? | Finkoin",
    description:
      "Free tax regime calculator for FY 2025-26. Compare old vs new tax regime with all deductions — 80C, HRA, NPS, home loan. Find which regime saves you more tax instantly.",
    keywords: [
      "old vs new tax regime calculator",
      "tax regime calculator 2025-26",
      "income tax calculator India 2026",
      "which tax regime is better",
      "tax saving calculator India",
      "80C deduction calculator",
      "HRA exemption calculator",
      "new tax regime slabs 2026",
      "87A rebate calculator",
      "salary tax calculator 2025-26",
      "ITR tax calculator India",
      "Finkoin tax calculator",
    ],
    faq: [
      {
        q: "Which tax regime is better for salaried employees in 2025-26?",
        a: "For FY 2025-26, the new tax regime is often better if your deductions (80C + HRA + home loan interest) are less than about ₹3.75 lakh. If deductions exceed that, the old regime may save more. Use Finkoin's calculator for your exact numbers.",
      },
      {
        q: "What is the standard deduction in new tax regime 2025-26?",
        a: "The standard deduction in the new tax regime for FY 2025-26 is ₹75,000 for salaried employees (increased from ₹50,000 in Budget 2024).",
      },
      {
        q: "Can I switch between old and new tax regime every year?",
        a: "Salaried employees can switch every financial year when filing ITR. Business owners face restrictions on switching back. Inform your employer at the start of the year for TDS.",
      },
      {
        q: "What deductions are available in old tax regime?",
        a: "Old regime allows Section 80C (₹1.5 lakh), 80D health insurance, HRA exemption, Section 24B home loan interest (up to ₹2 lakh for self-occupied), NPS 80CCD(1B) (₹50,000 extra), and more.",
      },
    ],
  },
  default: {
    path: "/calculators",
    appName: "Finkoin Financial Calculators",
    title: "Free Financial Calculators for India 2026 | Finkoin",
    description:
      "Free calculators for India: tax regime comparison, SIP returns, SWP, EMI, emergency fund, FIRE number, home loan. Know it. Fix it. Grow it. Updated for FY 2025-26.",
    keywords: [
      "financial calculator India free",
      "tax calculator India 2026",
      "SIP calculator India",
      "EMI calculator India",
      "home loan calculator India",
      "FIRE calculator India",
      "Finkoin calculators",
      "personal finance calculators India",
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

/**
 * Dedicated 1200×630 share banners under public/og.
 * Related tools share a banner so every calculator has a tagged OG image.
 */
const CALC_OG_IMAGE: Record<string, string> = {
  sip: "/og/og-sip.png",
  swp: "/og/og-swp.png",
  "tax-regime": "/og/og-tax-calculator.png",
  emi: "/og/og-emi.png",
  home: "/og/og-emi.png",
  car: "/og/og-emi.png",
  rentbuy: "/og/og-emi.png",
  rentcar: "/og/og-emi.png",
  whencar: "/og/og-emi.png",
  ppf: "/og/og-ppf.png",
  nsc: "/og/og-po.png",
  po: "/og/og-po.png",
  "po-savings": "/og/og-po.png",
  "po-td": "/og/og-po.png",
  "po-rd": "/og/og-po.png",
  "po-kvp": "/og/og-po.png",
  "po-mis": "/og/og-po.png",
  "po-scss": "/og/og-po.png",
  "po-ssy": "/og/og-po.png",
  emergency: "/og/og-emergency.png",
  fire: "/og/og-fire.png",
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
        "@type": "WebApplication",
        name: seo.appName,
        description: seo.description,
        url: pageUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
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
        featureList: seo.faq.map((f) => f.q),
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

/** Related internal links for calculator SEO pages. */
export function getRelatedLinksForCalc(calcId: string) {
  const common = [
    {
      href: "/analyse",
      title: "Financial Health Check",
      desc: "Know it. Fix it. Grow it. — free score",
    },
  ];
  if (calcId === "sip") {
    return [
      {
        href: "/calculators/swp",
        title: "SWP Calculator",
        desc: "Plan systematic withdrawals",
      },
      {
        href: "/calculators/tax-regime-2026",
        title: "Tax Regime Calculator",
        desc: "Old vs new regime for FY 2025-26",
      },
      {
        href: "/learn/sip-vs-lumpsum-when-to-use-which",
        title: "SIP vs lump sum guide",
        desc: "When to use which",
      },
      ...common,
    ];
  }
  if (calcId === "home" || calcId === "emi") {
    return [
      {
        href: "/calculators/home",
        title: "Home Loan Calculator",
        desc: "EMI & affordability",
      },
      {
        href: "/calculators/tax-regime-2026",
        title: "Tax Regime Calculator",
        desc: "Include 24B & 80C benefits",
      },
      {
        href: "/learn/how-home-loan-tax-benefits-work-80c-24b",
        title: "Home loan tax benefits",
        desc: "80C + 24B explained",
      },
      ...common,
    ];
  }
  if (
    calcId === "po" ||
    calcId.startsWith("po-") ||
    calcId === "nsc" ||
    calcId === "ppf"
  ) {
    return [
      {
        href: "/calculators/po",
        title: "All Post Office schemes",
        desc: "Compare TD, RD, NSC, KVP, MIS, SCSS, SSY",
      },
      {
        href: "/calculators/po-td",
        title: "Post Office TD",
        desc: "1–5 year time deposit maturity",
      },
      {
        href: "/calculators/po-scss",
        title: "SCSS Calculator",
        desc: "8.2% senior citizen income",
      },
      {
        href: "/calculators/ppf",
        title: "PPF Calculator",
        desc: "15-year EEE tax-free corpus",
      },
      ...common,
    ];
  }
  return [
    {
      href: "/calculators/sip",
      title: "SIP Calculator",
      desc: "Plan monthly investments",
    },
    {
      href: "/calculators/tax-regime-2026",
      title: "Tax Regime Calculator",
      desc: "Old vs new — which saves more",
    },
    {
      href: "/learn/section-80c-limits-and-beyond",
      title: "80C and beyond",
      desc: "Deductions explained",
    },
    ...common,
  ];
}
