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
