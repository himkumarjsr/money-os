import oldVsNewTaxRoi2026 from "./data/blog-old-vs-new-tax-roi-2026";

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  publishedAt: string;
  category: string;
  body: string;
  faq?: { q: string; a: string }[];
};

export const BLOG_ARTICLES: BlogArticle[] = [
  oldVsNewTaxRoi2026 as BlogArticle,
  {
    slug: "know-taxation-in-india",
    title: "Know Taxation in India: Old vs New Slabs, Interest & ITR Forms",
    description:
      "Beginner-friendly India taxation guide: old vs new tax regime slabs, Section 87A, cess/surcharge, 234A/234B/234C interest, and ITR form selection.",
    keywords: [
      "know taxation in India",
      "old vs new tax regime slabs India",
      "234A 234B 234C interest",
      "which ITR form to file India",
    ],
    publishedAt: "2026-05-06",
    category: "tax",
    body: `If you are confused by tax language, start here. This page gives you a practical map of Indian personal taxation.

## 1) Tax regime choice: old vs new

- **Old regime**: wider deduction usage (for eligible users), useful when your deductible stack is strong.
- **New regime**: cleaner slabs and simpler filing for many salaried users.
- The right choice is always your **final tax payable**, not social media rules.

## 2) Slab-wise tax rates (quick view)

### Old regime (illustrative non-senior slab structure)
- Up to ₹2.5L: 0%
- ₹2.5L–₹5L: 5%
- ₹5L–₹10L: 20%
- Above ₹10L: 30%

### New regime (illustrative FY 2025-26 model)
- Up to ₹4L: 0%
- ₹4L–₹8L: 5%
- ₹8L–₹12L: 10%
- ₹12L–₹16L: 15%
- ₹16L–₹20L: 20%
- ₹20L–₹24L: 25%
- Above ₹24L: 30%

> Always compare after rebate, surcharge, and cess.

## 3) Section 87A in one line

87A is a **rebate on tax**, not an investment section like 80C.
It can reduce slab tax significantly if taxable income is within notified limits.

## 4) Cess and surcharge

- Health and education cess is generally **4%** on tax + surcharge.
- Surcharge applies only beyond higher income thresholds.
- Effective tax can jump when surcharge bands trigger.

## 5) Interest under income-tax (not FD/loan interest)

These are filing/compliance interests, commonly at **1% per month** under applicable conditions:

- **234A**: delay in filing return
- **234B**: shortfall in advance tax
- **234C**: deferment of advance-tax installments

## 6) Which ITR form is usually used?

- **ITR-1**: simple eligible salaried/pension profiles
- **ITR-2**: capital gains/foreign complexity without business income
- **ITR-3**: business or professional income
- **ITR-4**: eligible presumptive business/profession cases

Always validate final eligibility for your year before filing.

## 7) Practical checklist before filing

- Form 16
- AIS and 26AS reconciliation
- Interest certificates
- Capital gains statement
- Rent / loan / deduction proofs

Need a practical comparison with your numbers? Use the [Tax Regime Calculator](/calculators/tax-regime-2026).`,
    faq: [
      {
        q: "Is new regime always better up to ₹15–20 lakh?",
        a: "Often yes for many salaried users, but not always. Strong HRA/home-loan/deduction stacks can still make old regime better. Compare both using actual data.",
      },
      {
        q: "Is 87A the same as 80C?",
        a: "No. 87A is a rebate on computed tax. 80C is a deduction section that can reduce taxable income in eligible cases.",
      },
      {
        q: "Can wrong ITR form create notices?",
        a: "Yes. Wrong form selection and AIS mismatch are common reasons for post-filing issues. Validate form eligibility before submit.",
      },
    ],
  },
  {
    slug: "old-vs-new-tax-regime-2026",
    title: "Old vs New Tax Regime 2026: Which Saves More Money?",
    description:
      "Complete guide to choosing between old and new tax regime in FY 2025-26. Includes calculator and examples for different salary levels.",
    keywords: ["old vs new tax regime 2026", "tax regime calculator 2026", "income tax India 2026"],
    publishedAt: "2026-05-01",
    category: "tax",
    body: `Choosing between India's old and new tax regime is not about "which is popular" — it is about **your** deductions and income mix.

## Quick rule of thumb

- If you use large deductions (80C, 80D, HRA, home loan interest, NPS beyond standard), the **old regime** often wins.
- If you keep finances simple and deductions are small, the **new regime** can win thanks to slabs and rebate mechanics.

## What to do next

Use Finkoin's [free tax regime calculator](/calculators/tax-regime-2026) with your actual salary, rent, and Chapter VI-A numbers — then compare side by side.

For a deeper dive on 80C picks, read our [80C deductions guide](/blog/80c-deductions-guide-2026).

Ready for a full picture? Run the [financial health check](/analyse) to see emergency fund, insurance gap, and debt load in one place.`,
  },
  {
    slug: "term-insurance-calculator-india",
    title: "How Much Term Insurance Do You Really Need in India?",
    description:
      "Simple formula to calculate exact term insurance coverage needed. Based on income, loans, dependents and goals.",
    keywords: [
      "term insurance calculator India",
      "how much term insurance India",
      "life insurance calculator India",
    ],
    publishedAt: "2026-05-02",
    category: "insurance",
    body: `Term insurance is the **cheapest way** to transfer large financial risk. The mistake most Indians make is buying a random ₹1 crore cover because it "sounds big".

## A practical coverage stack

1. **Income replacement**: multiply annual income by 10–15× depending on age and dependents.
2. **Loans**: add outstanding home loan, education loan, and other big liabilities.
3. **Goals**: add non-negotiable goals (children's education timeline) you want funded even if you are not around.

## Use calculators, not guesses

- [Financial health check](/analyse) — surfaces insurance gap vs income and dependents.
- [Tax regime calculator](/calculators/tax-regime-2026) — if you are optimising take-home and benefits together.

## Related reading

- [Emergency fund guide](/blog/emergency-fund-calculator-india) — liquidity first, insurance next.`,
  },
  {
    slug: "emergency-fund-calculator-india",
    title: "Emergency Fund: Exactly How Much Should You Save in India?",
    description:
      "Calculate your ideal emergency fund based on your expenses, family size, and job stability. Free calculator included.",
    keywords: [
      "emergency fund calculator India",
      "emergency fund how much India",
      "emergency savings India",
    ],
    publishedAt: "2026-05-03",
    category: "savings",
    body: `An emergency fund is boring — until life is not. In India, medical shocks, job changes, and family responsibilities show up without warning.

## Start with monthly expenses

A common baseline:

- **Single, stable job**: 6 months of non-discretionary expenses.
- **Married / one income**: 9 months.
- **Kids or self-employed**: 9–12+ months.

## Where to park it

Think **liquidity first**: savings account + liquid fund / short duration debt. Not equities.

## Tie it to the rest of your plan

Run the [financial health check](/analyse) to see how your emergency fund fits next to loans and insurance.

Then explore [free calculators](/calculators) for SIP planning once the buffer exists.`,
  },
  {
    slug: "80c-deductions-guide-2026",
    title: "Section 80C Deductions 2026: Save ₹46,800 in Tax",
    description:
      "Complete list of 80C investments and deductions for FY 2025-26. ELSS vs PPF vs FD — which is best for your goals?",
    keywords: ["80C deductions 2026", "section 80C limit 2026", "tax saving investment India 2026"],
    publishedAt: "2026-05-04",
    category: "tax",
    body: `Section **80C** is the most famous tax-saving bucket in India — and also the most mis-sold.

## What counts under 80C

Common instruments include EPF (employee contribution), PPF, ELSS, life insurance premium (not ULIP hype), NSC, tuition fees, principal repayment on home loan (within conditions), and more.

## ELSS vs PPF vs FD (simple framing)

- **ELSS**: market-linked, 3-year lock-in, potential higher long-term returns with volatility.
- **PPF**: long horizon, government-backed flavour, illiquid but steady.
- **Tax-saving FD**: predictable, locked-in, lower return — but easy to understand.

## Do not optimise 80C in isolation

Use the [old vs new regime article](/blog/old-vs-new-tax-regime-2026) and the [tax regime calculator](/calculators/tax-regime-2026) — 80C matters only if the old regime wins for your profile.`,
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
