/**
 * Answer-style posts for the most searched money questions in India (SIP for
 * ₹1 crore, SIP vs lumpsum, home loan prepayment, HRA, PPF, EMI formula).
 * Every figure is computed from the calculator engines when the module loads,
 * so the posts always agree with the calculators they link to.
 * Imported by lib/blogContent.ts.
 */
import type { BlogArticle } from "@/lib/blogContent";
import { inr, inrShort } from "@/app/calculators/calculator-guides";
import {
  emiFor,
  hraExemption,
  lumpsumFV,
  monthsToRepay,
  sipFV,
  sipForTarget,
} from "@/lib/advisorCalculators";

const PUBLISHED = "2026-10-20";

/** Loan balance after `k` EMIs (reducing balance). */
function outstanding(
  principal: number,
  ratePct: number,
  emi: number,
  k: number,
) {
  const r = ratePct / 100 / 12;
  const f = Math.pow(1 + r, k);
  return principal * f - (emi * (f - 1)) / r;
}

function sipForOneCrore(): BlogArticle {
  const target = 1_00_00_000;
  const spans = [10, 15, 20, 25, 30];
  const rates = [10, 12, 14];
  const sip20 = sipForTarget(target, 12, 240);
  const sip15 = sipForTarget(target, 12, 180);
  const table = [
    `| Years | ${rates.map((r) => `At ${r}%`).join(" | ")} |`,
    `| --- | ${rates.map(() => "---").join(" | ")} |`,
    ...spans.map(
      (y) =>
        `| ${y} | ${rates.map((r) => inr(sipForTarget(target, r, y * 12))).join(" | ")} |`,
    ),
  ].join("\n");
  const delay =
    sipForTarget(target, 12, 15 * 12) / sipForTarget(target, 12, 20 * 12);
  return {
    slug: "how-much-sip-for-1-crore",
    metaTitle: "How Much SIP for ₹1 Crore? Monthly SIP Table | Finkoin",
    title: "How Much SIP Do You Need for ₹1 Crore?",
    description: `At 12% a year you need about ${inr(sip20)} a month for 20 years or ${inr(sip15)} for 15 years to reach ₹1 crore. Full table by years and return.`,
    keywords: [
      "how much SIP for 1 crore",
      "SIP for 1 crore in 10 years",
      "SIP for 1 crore in 15 years",
      "SIP for 1 crore in 20 years",
      "1 crore SIP calculator",
    ],
    publishedAt: PUBLISHED,
    category: "investing",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/goal-sip", label: "Goal SIP calculator" },
      { href: "/calculators/stepup-sip", label: "Step-up SIP calculator" },
      { href: "/analyse", label: "Run the free financial health check" },
    ],
    body: `To build **₹1 crore**, you need a monthly SIP of about **${inr(sip20)} for 20 years** or **${inr(sip15)} for 15 years**, assuming a 12% yearly return. The shorter the time, the steeper the monthly amount.

## Monthly SIP needed for ₹1 crore

${table}

The numbers assume a constant return and a SIP paid at the end of each month. Equity returns are not constant, so treat these as planning figures.

## Time matters more than the amount

Cutting the period from 20 to 15 years makes the SIP about **${delay.toFixed(1)} times** larger. Every five years of delay roughly doubles what you need, which is why starting early beats starting big.

## Make it easier with a step-up SIP

You do not have to start at the full amount. A SIP that begins lower and rises 10% every year, in line with your salary, can reach the same goal. Try it in the [step-up SIP calculator](/calculators/stepup-sip).

## Remember inflation

₹1 crore in 20 years will buy roughly what ₹31 lakh buys today at 6% inflation. If your goal is a lifestyle, size the target in future rupees first with the [inflation calculator](/calculators/inflation), then plan the SIP for that number.

## Plan your own number

Put your target and timeline into the [goal SIP calculator](/calculators/goal-sip). To see whether the SIP fits with your EMIs, insurance and emergency fund, run the [free financial health check](/analyse).`,
    faq: [
      {
        q: "How much SIP is needed for ₹1 crore in 10 years?",
        a: `About ${inr(sipForTarget(target, 12, 120))} a month at a 12% yearly return.`,
      },
      {
        q: "How much SIP is needed for ₹1 crore in 20 years?",
        a: `About ${inr(sip20)} a month at 12%, or ${inr(sipForTarget(target, 10, 240))} at 10%.`,
      },
      {
        q: "Is 12% a realistic SIP return?",
        a: "Diversified equity funds in India have delivered around 10% to 13% over long periods, but nothing is guaranteed. Plan with 10% to 12% and review every year.",
      },
    ],
  };
}

function sipVsLumpsum(): BlogArticle {
  const total = 6_00_000;
  const years = 10;
  const lump = lumpsumFV(total, 12, years);
  const sip = sipFV(total / (years * 12), 12, years * 12);
  return {
    slug: "sip-vs-lumpsum-which-is-better",
    metaTitle: "SIP vs Lumpsum: Which Is Better? | Finkoin",
    title: "SIP vs Lumpsum: Which Is Better for You?",
    description:
      "SIP vs lumpsum compared with real numbers. Lumpsum wins when money is ready and markets rise; SIP wins on discipline and timing risk.",
    keywords: [
      "SIP vs lumpsum",
      "SIP or lumpsum which is better",
      "lumpsum vs SIP returns",
      "lumpsum investment calculator",
    ],
    publishedAt: PUBLISHED,
    category: "investing",
    readTimeMinutes: 5,
    relatedTools: [
      {
        href: "/calculators/compare",
        label: "Compare SIP and lumpsum side by side",
      },
      { href: "/calculators/lumpsum", label: "Lumpsum calculator" },
      { href: "/calculators/sip", label: "SIP calculator" },
    ],
    body: `If you already have the money, a **lumpsum** usually ends with more, because all of it starts compounding on day one. A **SIP** wins on discipline and on protecting you from investing everything at a market high.

## The same ${inr(total)}, two ways

Assume a 12% yearly return for ${years} years:

| Approach | Invested | Value after ${years} years |
| --- | --- | --- |
| Lumpsum of ${inr(total)} today | ${inr(total)} | ${inr(lump)} |
| SIP of ${inr(total / (years * 12))} a month | ${inr(total)} | ${inr(sip)} |

The lumpsum ends ${inrShort(lump - sip)} ahead, but only if returns are smooth. In real markets, a lumpsum invested just before a fall can take years to recover, while a SIP buys more units when prices are low.

## When a lumpsum makes sense

- You received a bonus, an inheritance or a maturity amount and will not need it for 7 years or more.
- You can stay calm if the value drops 20% to 30% soon after investing.

## When a SIP makes sense

- You invest from your monthly salary, which is how most people build wealth.
- You worry about timing the market.

## The middle path: STP

Park the lumpsum in a liquid or debt fund and move it into equity every month through a Systematic Transfer Plan over 6 to 12 months. You get most of the lumpsum's head start with less timing risk. See the [STP calculator](/calculators/stp).

## Try your own numbers

Put both options side by side in the [compare calculator](/calculators/compare), or use the [lumpsum](/calculators/lumpsum) and [SIP](/calculators/sip) calculators.`,
    faq: [
      {
        q: "Is SIP better than lumpsum?",
        a: "Not always. With money in hand and a long horizon, a lumpsum often ends higher. A SIP is better for investing from income and for reducing timing risk.",
      },
      {
        q: "Can I do both SIP and lumpsum?",
        a: "Yes. Many investors run a monthly SIP and add lumpsums when they get a bonus, or move a lumpsum in gradually through an STP.",
      },
    ],
  };
}

function homeLoanPrepayment(): BlogArticle {
  const loan = 50_00_000;
  const rate = 8.5;
  const months = 240;
  const emi = emiFor(loan, rate, months);
  const paid = 24;
  const prepay = 5_00_000;
  const balance = outstanding(loan, rate, emi, paid);
  const afterPrepay = balance - prepay;
  const remaining = months - paid;
  const baseInterest = emi * months - loan;
  // Option A: keep the EMI, shorten the tenure.
  const newMonths = monthsToRepay(afterPrepay, rate, emi);
  const interestA = emi * (paid + newMonths) + prepay - loan;
  // Option B: keep the tenure, lower the EMI.
  const newEmi = emiFor(afterPrepay, rate, remaining);
  const interestB = emi * paid + newEmi * remaining + prepay - loan;
  const yearsCut = (remaining - newMonths) / 12;
  return {
    slug: "home-loan-prepayment-reduce-emi-or-tenure",
    metaTitle: "Home Loan Prepayment: Reduce EMI or Tenure? | Finkoin",
    title: "Home Loan Prepayment: Should You Reduce the EMI or the Tenure?",
    description: `A ${inrShort(prepay)} prepayment on a ${inrShort(loan)} home loan saves about ${inrShort(baseInterest - interestA)} if you keep the EMI and cut the tenure, versus ${inrShort(baseInterest - interestB)} if you lower the EMI.`,
    keywords: [
      "home loan prepayment",
      "reduce EMI or tenure",
      "home loan part payment calculator",
      "prepay home loan or invest",
    ],
    publishedAt: PUBLISHED,
    category: "loans",
    readTimeMinutes: 6,
    relatedTools: [
      {
        href: "/calculators/prepay-vs-invest",
        label: "Prepay vs invest calculator",
      },
      { href: "/calculators/home", label: "Home loan EMI calculator" },
      {
        href: "/calculators/balance-transfer",
        label: "Balance transfer calculator",
      },
    ],
    body: `When you prepay a home loan, **keeping the EMI and cutting the tenure saves far more interest** than keeping the tenure and lowering the EMI. Choose a lower EMI only if your monthly budget is tight.

## A worked example

Take a ${inrShort(loan)} home loan at ${rate}% for 20 years. The EMI is **${inr(emi)}** and the total interest over the loan is **${inrShort(baseInterest)}**.

After 2 years you still owe about ${inrShort(balance)}. You prepay ${inrShort(prepay)}.

| Option | New EMI | Loan ends | Total interest | Interest saved |
| --- | --- | --- | --- | --- |
| No prepayment | ${inr(emi)} | 20 years | ${inrShort(baseInterest)} | - |
| Keep EMI, cut tenure | ${inr(emi)} | ${((paid + newMonths) / 12).toFixed(1)} years | ${inrShort(interestA)} | ${inrShort(baseInterest - interestA)} |
| Keep tenure, cut EMI | ${inr(newEmi)} | 20 years | ${inrShort(interestB)} | ${inrShort(baseInterest - interestB)} |

Cutting the tenure takes about **${yearsCut.toFixed(1)} years** off the loan.

## Why early prepayments save the most

In the first years, most of each EMI is interest. Money you prepay early removes principal that would otherwise collect interest for almost the whole term.

## Prepay or invest?

If your loan costs ${rate}% and you expect 11% to 12% from equity over the long term, investing can end ahead, but with risk. Prepaying is a guaranteed return equal to your loan rate. Many people split surplus money between the two. Compare both in the [prepay vs invest calculator](/calculators/prepay-vs-invest).

## Before you prepay

- Keep an emergency fund of 6 months of expenses first.
- Floating-rate home loans to individuals carry no prepayment penalty in India; check your sanction letter for fixed-rate loans.
- Under the old tax regime, you lose part of the interest deduction (up to ₹2 lakh a year on a self-occupied home) as interest falls, so factor that in.`,
    faq: [
      {
        q: "Is it better to reduce EMI or tenure after prepayment?",
        a: "Reducing the tenure saves much more interest. Reduce the EMI only if you need the monthly cash flow.",
      },
      {
        q: "Is there a penalty for prepaying a home loan?",
        a: "Banks cannot charge a prepayment penalty on floating-rate home loans to individual borrowers. Fixed-rate loans may carry one; check your loan terms.",
      },
    ],
  };
}

function hraCalculation(): BlogArticle {
  const basic = 50_000;
  const hra = 20_000;
  const rent = 22_000;
  const metro = hraExemption({
    basicMonthly: basic,
    hraMonthly: hra,
    rentMonthly: rent,
    metro: true,
  });
  const nonMetro = hraExemption({
    basicMonthly: 30_000,
    hraMonthly: 12_000,
    rentMonthly: 15_000,
    metro: false,
  });
  return {
    slug: "hra-exemption-calculation-with-examples",
    metaTitle: "HRA Exemption Calculation with Examples | Finkoin",
    title: "HRA Exemption Calculation: Rules and Worked Examples",
    description:
      "How HRA exemption is calculated: the lowest of actual HRA, rent minus 10% of basic, and 50% or 40% of basic. Two worked examples.",
    keywords: [
      "HRA exemption calculation",
      "HRA calculation formula",
      "HRA exemption rules",
      "how to calculate HRA",
      "HRA calculator",
    ],
    publishedAt: PUBLISHED,
    category: "tax",
    readTimeMinutes: 6,
    relatedTools: [
      { href: "/calculators/hra", label: "HRA exemption calculator" },
      {
        href: "/calculators/tax-regime-2026",
        label: "Old vs new regime calculator",
      },
      { href: "/calculators/salary", label: "Salary in-hand calculator" },
    ],
    body: `Your tax-free HRA is the **lowest of three amounts**:

1. The HRA you actually receive.
2. Rent paid minus 10% of your basic salary.
3. 50% of basic salary if you live in a metro city, or 40% elsewhere.

Whatever is left of your HRA after that is taxable. Use yearly figures for all three. The exemption is available only in the **old tax regime**.

## Example 1: metro city

Basic ${inr(basic)} a month, HRA ${inr(hra)} a month, rent ${inr(rent)} a month.

| Test | Yearly amount |
| --- | --- |
| Actual HRA | ${inr(metro.tests.actualHra)} |
| Rent minus 10% of basic | ${inr(metro.tests.rentMinus10)} |
| 50% of basic | ${inr(metro.tests.pctOfBasic)} |
| **Exempt HRA (lowest)** | **${inr(metro.exempt)}** |

Taxable HRA = ${inr(metro.taxable)} a year.

## Example 2: non-metro city

Basic ₹30,000, HRA ₹12,000 and rent ₹15,000 a month.

| Test | Yearly amount |
| --- | --- |
| Actual HRA | ${inr(nonMetro.tests.actualHra)} |
| Rent minus 10% of basic | ${inr(nonMetro.tests.rentMinus10)} |
| 40% of basic | ${inr(nonMetro.tests.pctOfBasic)} |
| **Exempt HRA (lowest)** | **${inr(nonMetro.exempt)}** |

Taxable HRA = ${inr(nonMetro.taxable)} a year.

## Rules that trip people up

- **Basic salary** here means basic plus dearness allowance where DA counts for retirement benefits.
- **Landlord's PAN** is needed by your employer if your yearly rent is above ₹1 lakh.
- **Paying rent to parents** is allowed if they own the house and show the rent as their income. Rent to a spouse is not accepted.
- **No HRA in salary?** Section 80GG may allow a smaller deduction in the old regime.
- **Home loan and HRA together** are possible, for example if your own house is in another city.

## Does HRA change your regime choice?

A large HRA exemption is one of the main reasons the old regime still wins for some salaried people. Put your exemption into the [old vs new regime calculator](/calculators/tax-regime-2026) to check. Work out the exempt amount first with the [HRA calculator](/calculators/hra).`,
    faq: [
      {
        q: "How is HRA exemption calculated?",
        a: "It is the lowest of actual HRA received, rent paid minus 10% of basic salary, and 50% of basic (metro) or 40% (non-metro), all on a yearly basis.",
      },
      {
        q: "Can I claim HRA in the new tax regime?",
        a: "No. The HRA exemption is available only if you choose the old regime.",
      },
      {
        q: "Can I claim HRA if I pay rent to my parents?",
        a: "Yes, if they own the house, you actually pay the rent, and they declare it as income in their return.",
      },
    ],
  };
}

function ppfMaturity(): BlogArticle {
  const rate = 7.1;
  const ppf = (yearly: number, years: number) => {
    const i = rate / 100;
    return yearly * ((Math.pow(1 + i, years) - 1) / i) * (1 + i);
  };
  const max15 = ppf(1_50_000, 15);
  const rows = [12_500, 50_000, 1_00_000, 1_50_000]
    .map(
      (y) =>
        `| ${inr(y)} | ${inrShort(ppf(y, 15))} | ${inrShort(ppf(y, 20))} | ${inrShort(ppf(y, 25))} |`,
    )
    .join("\n");
  return {
    slug: "ppf-maturity-amount-15-years",
    metaTitle: "PPF Maturity Amount After 15 Years: Table | Finkoin",
    title: "PPF Maturity Amount After 15, 20 and 25 Years",
    description: `₹1.5 lakh a year in PPF grows to about ${inrShort(max15)} in 15 years at 7.1%, all tax-free. Maturity table, extension rules and tips.`,
    keywords: [
      "PPF maturity amount",
      "PPF calculator 15 years",
      "1.5 lakh PPF for 15 years",
      "PPF extension 5 years",
      "PPF interest rate",
    ],
    publishedAt: PUBLISHED,
    category: "savings",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/ppf", label: "PPF calculator" },
      { href: "/calculators/compare", label: "Compare PPF with SIP or FD" },
      {
        href: "/calculators/tax-regime-2026",
        label: "Old vs new regime calculator",
      },
    ],
    body: `If you deposit the maximum **₹1.5 lakh every year**, your PPF account grows to about **${inrShort(max15)} after 15 years** at 7.1%. You invest ₹22.5 lakh, and the interest of about ${inrShort(max15 - 22_50_000)} is completely tax-free.

## PPF maturity table at 7.1%

| Yearly deposit | 15 years | 20 years | 25 years |
| --- | --- | --- | --- |
${rows}

The table assumes you deposit at the start of each financial year and that the rate stays at 7.1%. The government reviews the PPF rate every quarter, so check the current rate before you plan.

## Why the extension years are worth it

After 15 years you can extend the account in blocks of 5 years, with or without new deposits. Because compounding speeds up over time, the 5 years after maturity add more than any earlier 5 years. Extending with deposits to 25 years takes ₹1.5 lakh a year to about ${inrShort(ppf(1_50_000, 25))}.

## Rules to know

- Deposit between ₹500 and ₹1.5 lakh in a financial year.
- Interest is worked out on the lowest balance between the 5th and the end of each month, so deposit before the 5th.
- Partial withdrawals are allowed from the 7th year; loans from the 3rd to the 6th year.
- Deposits count under Section 80C in the old regime; interest and maturity are tax-free in both regimes.

## Is PPF enough?

PPF is a safe, tax-free anchor, but at around 7% it barely beats inflation over long periods. Most long-term plans pair it with equity. Compare PPF with a SIP or FD in the [compare calculator](/calculators/compare), or run your own numbers in the [PPF calculator](/calculators/ppf).`,
    faq: [
      {
        q: "What is the maturity amount of ₹1.5 lakh a year in PPF for 15 years?",
        a: `About ${inrShort(max15)} at 7.1%, of which ₹22.5 lakh is your deposit and the rest is tax-free interest.`,
      },
      {
        q: "Can I continue PPF after 15 years?",
        a: "Yes. You can extend it in blocks of 5 years, with or without fresh deposits, by informing your bank or post office within a year of maturity.",
      },
    ],
  };
}

function emiFormula(): BlogArticle {
  const loan = 10_00_000;
  const rate = 10;
  const months = 60;
  const emi = emiFor(loan, rate, months);
  const r = rate / 100 / 12;
  const firstInterest = loan * r;
  return {
    slug: "how-emi-is-calculated-formula-examples",
    metaTitle: "How EMI Is Calculated: Formula and Examples | Finkoin",
    title: "How EMI Is Calculated: Formula, Example and Breakup",
    description: `The EMI formula explained step by step. A ${inrShort(loan)} loan at ${rate}% for 5 years has an EMI of ${inr(emi)}; see how much of each EMI is interest.`,
    keywords: [
      "how EMI is calculated",
      "EMI calculation formula",
      "EMI formula with example",
      "loan EMI calculation",
    ],
    publishedAt: PUBLISHED,
    category: "loans",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/emi", label: "EMI calculator" },
      { href: "/calculators/home", label: "Home loan EMI calculator" },
      {
        href: "/calculators/flat-vs-reducing",
        label: "Flat vs reducing rate calculator",
      },
    ],
    body: `Banks in India calculate EMI with the **reducing-balance formula**:

**EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)**

- **P** is the loan amount.
- **r** is the monthly interest rate: the yearly rate ÷ 12 ÷ 100.
- **n** is the number of monthly instalments.

## Step-by-step example

A ${inr(loan)} loan at ${rate}% for 5 years:

1. r = ${rate} ÷ 12 ÷ 100 = ${r.toFixed(5)}.
2. n = 5 × 12 = ${months}.
3. (1 + r)^n = ${Math.pow(1 + r, months).toFixed(4)}.
4. EMI = ${inr(loan)} × ${r.toFixed(5)} × ${Math.pow(1 + r, months).toFixed(4)} ÷ ${(Math.pow(1 + r, months) - 1).toFixed(4)} = **${inr(emi)}**.

Over 5 years you repay ${inr(emi * months)}, so the total interest is **${inr(emi * months - loan)}**.

## Where each EMI goes

In month 1, interest is ${inr(loan)} × ${r.toFixed(5)} = ${inr(firstInterest)}, so only ${inr(emi - firstInterest)} of the EMI repays principal. As the balance falls, the interest part shrinks and the principal part grows. That is why prepaying early saves the most.

## Flat rate is not the same

Some lenders quote a flat rate, charged on the full loan for the whole term. A 10% flat rate costs much more than 10% reducing. Convert it with the [flat vs reducing calculator](/calculators/flat-vs-reducing).

## Skip the maths

The [EMI calculator](/calculators/emi) does this instantly and shows the full year-by-year breakup. For a home loan, use the [home loan EMI calculator](/calculators/home). To see how prepaying changes the picture, read [home loan prepayment: reduce EMI or tenure](/blog/home-loan-prepayment-reduce-emi-or-tenure).`,
    faq: [
      {
        q: "What is the formula for EMI?",
        a: "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1), where P is the loan, r the monthly rate and n the number of months.",
      },
      {
        q: "Why is most of my early EMI interest?",
        a: "Interest is charged on the outstanding balance, which is highest at the start. As you repay principal, the interest portion falls.",
      },
    ],
  };
}

export const BLOG_ARTICLES_CALCULATOR_GUIDES: BlogArticle[] = [
  sipForOneCrore(),
  sipVsLumpsum(),
  homeLoanPrepayment(),
  hraCalculation(),
  ppfMaturity(),
  emiFormula(),
];
