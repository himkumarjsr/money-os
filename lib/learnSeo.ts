/** Extra SEO overrides for Learn articles (title / description / keywords). */
export type LearnSeoOverride = {
  title: string;
  description: string;
  keywords: string[];
};

export const LEARN_SEO_OVERRIDES: Record<string, LearnSeoOverride> = {
  "sip-calculator-1-crore-10-15-20-years": {
    title:
      "SIP Calculator 1 Crore — How Much SIP for ₹1 Crore in 10/15/20 Years | Finkoin",
    description:
      "Free sip calculator 1 crore tool. See monthly SIP needed for ₹1 crore in 10, 15, or 20 years at different returns. Live calculator + examples for India.",
    keywords: [
      "sip calculator 1 crore",
      "how much SIP for 1 crore",
      "SIP to become crorepati",
      "monthly SIP for 1 crore in 15 years",
      "SIP calculator India 1 crore",
      "1 crore SIP calculator",
    ],
  },
  "form-16-what-to-verify": {
    title:
      "Free ITR Filing 2025-26 — Form 16 Checklist & Tax Regime Prep | Finkoin",
    description:
      "Free ITR filing 2025-26 prep: verify Form 16, reconcile AIS/26AS, compare old vs new tax regime free on Finkoin, then file with confidence.",
    keywords: [
      "free ITR filing 2025-26",
      "ITR filing Form 16",
      "Form 16 ITR India",
      "free income tax filing India",
      "ITR-1 Form 16",
      "e-filing FY 2025-26",
    ],
  },
  "prepayment-vs-tenure-reduction-home-loan": {
    title: "Home Loan Prepayment Calculator — Reduce EMI or Tenure? | Finkoin",
    description:
      "Home loan prepayment calculator India: should you reduce EMI or cut tenure? Live comparison + illustrative math. Save more interest the smart way.",
    keywords: [
      "home loan prepayment calculator",
      "prepay home loan reduce EMI or tenure",
      "home loan part payment calculator",
      "should I prepay home loan",
      "tenure reduction vs EMI reduction",
    ],
  },
  "how-your-cibil-credit-score-is-calculated": {
    title: "How CIBIL Score Is Calculated — Complete Guide 2026 | Finkoin",
    description:
      "Learn exactly how CIBIL credit score is calculated. Payment history (35%), credit utilisation (30%), credit mix (25%), new credit (10%). Tips to improve score fast.",
    keywords: [
      "CIBIL score calculation",
      "how to improve CIBIL score",
      "credit score India",
      "CIBIL score 750",
      "CIBIL score factors",
      "how credit score works India",
    ],
  },
  "sip-vs-lumpsum-when-to-use-which": {
    title: "SIP vs Lump Sum Investment — When to Use Which? | Finkoin",
    description:
      "SIP or lump sum — which is better for you? Complete comparison with real Indian market examples. When market is at high vs low. Which gives more returns.",
    keywords: [
      "SIP vs lumpsum",
      "SIP or lumpsum which is better",
      "SIP vs lumpsum investment India",
      "lumpsum vs SIP returns",
      "when to invest lumpsum India",
    ],
  },
  "what-is-the-50-30-20-budgeting-rule": {
    title:
      "Why 50-30-20 Rule Fails Indians — Better 40-20-10-30 Framework | Finkoin",
    description:
      "The 50-30-20 budgeting rule was designed for USA. Finkoin's 40-20-10-30 framework works better for Indians with 5-6% inflation and no social security.",
    keywords: [
      "50 30 20 rule India",
      "budgeting rules India",
      "how to budget salary India",
      "40 20 rule India",
      "salary budget India",
    ],
  },
  "what-is-an-index-fund-and-why-it-beats-most-mutual-funds": {
    title: "What Is Index Fund & Why It Beats 81% of Active Funds | Finkoin",
    description:
      "Index funds beat 81.5% of active mutual funds over 5 years (SPIVA 2024). Learn what index funds are, how they work, and why expense ratio matters for wealth creation.",
    keywords: [
      "what is index fund India",
      "index fund vs active fund India",
      "best index fund India 2026",
      "Nifty 50 index fund",
      "passive investing India",
    ],
  },
  "emergency-fund-how-much-where-to-keep-it": {
    title: "Emergency Fund Calculator India — How Much Do I Need? | Finkoin",
    description:
      "Emergency fund calculator India: how many months of expenses you need, where to keep it liquid, plus a free interactive calculator for your exact target.",
    keywords: [
      "emergency fund calculator India",
      "how much emergency fund do I need",
      "emergency fund India",
      "where to keep emergency fund India",
      "liquid fund emergency corpus",
      "6 month emergency fund calculator",
    ],
  },
  "how-home-loan-tax-benefits-work-80c-24b": {
    title: "Home Loan Tax Benefits — Section 80C & 24B Explained | Finkoin",
    description:
      "How home loan principal (80C) and interest (24B) tax benefits work in India. Limits, self-occupied vs let-out, and old vs new regime impact.",
    keywords: [
      "home loan tax benefit",
      "section 24B",
      "80C home loan principal",
      "housing loan tax deduction India",
    ],
  },
  "section-80c-limits-and-beyond": {
    title: "Section 80C Limits & Beyond — Tax Saving Guide India | Finkoin",
    description:
      "Complete Section 80C guide: ₹1.5 lakh limit, ELSS, PPF, EPF, life insurance, and what to do after you max 80C.",
    keywords: [
      "section 80C limit",
      "80C tax saving options",
      "ELSS vs PPF",
      "tax saving investments India",
    ],
  },
  "ppf-vs-elss-which-is-better-for-tax-saving": {
    title: "PPF vs ELSS — Which Is Better for Tax Saving? | Finkoin",
    description:
      "PPF vs ELSS comparison for Indian tax savers: lock-in, returns, risk, and who should choose which under Section 80C.",
    keywords: [
      "PPF vs ELSS",
      "ELSS or PPF which is better",
      "80C PPF vs mutual fund",
    ],
  },
  "old-vs-new-tax-regime-which-saves-you-more-money": {
    title:
      "Old vs New Tax Regime 2025-26 — Complete Comparison with Examples | Finkoin",
    description:
      "Old vs new tax regime 2026 complete guide with salary examples, 80C/HRA/24B checklist, and a free embedded tax regime calculator for FY 2025-26.",
    keywords: [
      "old new tax regime 2026",
      "old vs new tax regime 2025-26",
      "old vs new tax regime calculator",
      "which tax regime is better 2026",
      "new tax regime India 2025-26",
      "tax regime comparison with examples",
    ],
  },
};

export function getLearnSeoOverride(id: string): LearnSeoOverride | null {
  return LEARN_SEO_OVERRIDES[id] ?? null;
}
