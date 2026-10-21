/**
 * Second batch of answer-style posts for high-volume Indian money questions
 * (step-up SIP, SIP delay, SWP corpus, gratuity, health cover, car loan vs
 * cash, rent vs buy, credit card minimum due, flat vs reducing rate, SSY,
 * SCSS/MIS income, CTC to in-hand). Every figure is computed from the
 * calculator engines when the module loads, so the posts always agree with
 * the calculators they link to. Imported by lib/blogContent.ts.
 */
import type { BlogArticle } from "@/lib/blogContent";
import { inr, inrShort } from "@/app/calculators/guides/shared";
import {
  cagr,
  corpusForExpenses,
  corpusForPension,
  creditCardPayoff,
  emiFor,
  flatToReducing,
  gratuity,
  healthCover,
  leaveEncashment,
  inflate,
  loanForEmi,
  lumpsumFV,
  monthsToRepay,
  salaryBreakup,
  sipDelayCost,
  sipFV,
  stepUpSip,
  type CityTier,
} from "@/lib/advisorCalculators";
import { FIRE_MULTIPLIER } from "@/lib/fireCalculator";
import {
  PO_RATES,
  PO_RATES_PERIOD,
  poMisMonthly,
  poScssQuarterly,
  poSsyMaturity,
} from "@/lib/postOfficeSchemes";

const PUBLISHED = "2026-10-21";

/** Markdown pipe table from a header row and body rows. */
function table(head: string[], rows: string[][]): string {
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

/** Years and months, e.g. "7 years 4 months". */
function yearsMonths(totalMonths: number): string {
  const y = Math.floor(totalMonths / 12);
  const m = Math.round(totalMonths % 12);
  const ys = y === 1 ? "1 year" : `${y} years`;
  if (y === 0) return `${m} month${m === 1 ? "" : "s"}`;
  if (m === 0) return ys;
  return `${ys} ${m} month${m === 1 ? "" : "s"}`;
}

function stepUpVsNormalSip(): BlogArticle {
  const monthly = 10_000;
  const rate = 12;
  const years = 20;
  const base = stepUpSip(monthly, 10, rate, years);
  const extraPct = (base.value / base.flatValue - 1) * 100;
  const stepRows = [0, 5, 10, 15].map((s) => {
    const r = stepUpSip(monthly, s, rate, years);
    return [
      s === 0 ? "Normal SIP (no step-up)" : `${s}% a year`,
      inr(r.rows[years - 1].monthly),
      inrShort(r.invested),
      inrShort(r.value),
    ];
  });
  const spanRows = [10, 15, 20, 25].map((y) => {
    const r = stepUpSip(monthly, 10, rate, y);
    return [
      `${y}`,
      inrShort(r.flatValue),
      inrShort(r.value),
      `${(r.value / r.flatValue).toFixed(2)}×`,
    ];
  });
  // Starting SIP that, stepped up 10% a year, matches the normal SIP's corpus.
  const sameCorpusStart = base.flatValue / stepUpSip(1, 10, rate, years).value;
  // A flat SIP that invests the same total as the 10% step-up SIP.
  const equalFlat = base.invested / (years * 12);
  const equalFlatValue = sipFV(equalFlat, rate, years * 12);
  const firstYears = base.rows
    .slice(0, 5)
    .map((r) => inr(r.monthly))
    .join(", ");
  return {
    slug: "step-up-sip-vs-normal-sip",
    metaTitle: "Step-up SIP vs Normal SIP: How Much More? | Finkoin",
    title: "Step-up SIP vs Normal SIP: How Much More You Get",
    description: `₹10,000 a month for 20 years at 12% grows to ${inrShort(base.flatValue)}. Raise it 10% a year and it grows to ${inrShort(base.value)}. Full tables inside.`,
    keywords: [
      "step up SIP vs normal SIP",
      "step up SIP calculator",
      "top up SIP returns",
      "10% step up SIP",
      "annual increase SIP",
    ],
    publishedAt: PUBLISHED,
    category: "investing",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/stepup-sip", label: "Step-up SIP calculator" },
      { href: "/calculators/sip", label: "SIP calculator" },
      { href: "/calculators/goal-sip", label: "Goal SIP calculator" },
    ],
    body: `A normal SIP of ${inr(monthly)} a month for ${years} years at 12% grows to about **${inrShort(base.flatValue)}**. If you raise the same SIP by 10% every year, it grows to about **${inrShort(base.value)}**, roughly ${Math.round(extraPct)}% more.

## What a step-up SIP is

A step-up SIP (also called a top-up SIP) raises your monthly amount by a fixed percentage once a year. Most people match it to their salary hike. You invest more in total, and the extra money also compounds.

## ${inr(monthly)} a month for ${years} years at ${rate}%

${table(["Yearly step-up", "SIP in year " + years, "Total invested", "Value after " + years + " years"], stepRows)}

With a 10% step-up, your SIP reaches ${inr(base.rows[years - 1].monthly)} a month in the final year. You invest ${inrShort(base.invested)} in total, against ${inrShort(base.flatInvested)} in the normal SIP.

## How the amount rises

With a 10% step-up, the monthly SIP for years 1 to 5 is ${firstYears}. Each year's amount is 10% more than the year before. The amount stays the same for the 12 months of that year.

## The gap widens with time

Here is a ${inr(monthly)} SIP with and without a 10% yearly step-up, at ${rate}%:

${table(["Years", "Normal SIP", "10% step-up", "Step-up ÷ normal"], spanRows)}

The longer you stay invested, the more the step-up matters. The bigger instalments of later years still get time to grow.

## Start smaller, reach the same goal

A step-up also lets you start lower. To match the normal SIP's ${inrShort(base.flatValue)} in ${years} years, a 10% step-up SIP can start at about **${inr(sameCorpusStart)}** a month. That helps if your budget is tight today but your income will grow.

## Step-up or a bigger flat SIP?

If you can afford it, a bigger SIP from day one beats a step-up. A flat SIP of ${inr(equalFlat)} invests the same ${inrShort(base.invested)} over ${years} years as the 10% step-up. It grows to about ${inrShort(equalFlatValue)}, against ${inrShort(base.value)} for the step-up. Money invested early has longer to compound. A step-up is the practical choice when your budget grows over time.

## Is the extra money real?

Part of the gain is simply more money invested. The rest is compounding on that extra money. Both are worth having. But a step-up only works if your income actually rises. If a hike does not come, pause the step-up for that year rather than stopping the SIP.

## Try your own numbers

Compare a flat and a stepped-up SIP in the [step-up SIP calculator](/calculators/stepup-sip). For a fixed target, start with the [goal SIP calculator](/calculators/goal-sip). For a plain monthly SIP, use the [SIP calculator](/calculators/sip). To see what a ₹1 crore target needs, read [how much SIP for ₹1 crore](/blog/how-much-sip-for-1-crore).

The figures assume a steady ${rate}% yearly return with monthly compounding. Real equity returns vary from year to year.`,
    faq: [
      {
        q: "How much more does a 10% step-up SIP give?",
        a: `For ${inr(monthly)} a month over ${years} years at ${rate}%, about ${inrShort(base.value)} against ${inrShort(base.flatValue)} for a normal SIP.`,
      },
      {
        q: "What step-up percentage should I choose?",
        a: "Pick a rate you can keep up, usually close to your expected yearly salary hike. Many people use 5% to 10%.",
      },
      {
        q: "Can I change or stop the step-up later?",
        a: "Yes. You can stop the step-up or start a fresh SIP with a different amount. Check the options your fund house or platform offers.",
      },
    ],
  };
}

function costOfDelayingSip(): BlogArticle {
  const monthly = 10_000;
  const rate = 12;
  const years = 30;
  const d5 = sipDelayCost(monthly, rate, years, 5);
  const delays = [1, 2, 3, 5, 10];
  const rows = delays.map((d) => {
    const c = sipDelayCost(monthly, rate, years, d);
    return [
      d === 1 ? "1 year" : `${d} years`,
      inrShort(c.later),
      inrShort(c.loss),
      inr(c.sipToCatchUp),
    ];
  });
  // Retiring at 60: starting at 25 versus 30.
  const at25 = sipDelayCost(monthly, rate, 35, 5);
  const at40 = sipDelayCost(monthly, rate, 20, 5);
  const lossPct = (d5.loss / d5.now) * 100;
  const rateRows = [8, 10, 12].map((r) => {
    const c = sipDelayCost(monthly, r, years, 5);
    return [
      `${r}%`,
      inrShort(c.now),
      inrShort(c.later),
      `${Math.round((c.loss / c.now) * 100)}%`,
    ];
  });
  return {
    slug: "cost-of-delaying-sip-by-5-years",
    metaTitle: "Cost of Delaying a SIP by 5 Years | Finkoin",
    title: "What Does Delaying Your SIP by 5 Years Cost?",
    description: `Waiting 5 years to start a ₹10,000 SIP cuts a 30-year corpus from ${inrShort(d5.now)} to ${inrShort(d5.later)} at 12%. See the catch-up SIP you would need.`,
    keywords: [
      "cost of delaying SIP",
      "SIP delay calculator",
      "start SIP early or late",
      "cost of delay investing",
    ],
    publishedAt: PUBLISHED,
    category: "investing",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/sip-delay", label: "Cost of delay calculator" },
      { href: "/calculators/sip", label: "SIP calculator" },
      { href: "/calculators/stepup-sip", label: "Step-up SIP calculator" },
    ],
    body: `Delaying a ${inr(monthly)} monthly SIP by 5 years shrinks a ${years}-year corpus from **${inrShort(d5.now)} to ${inrShort(d5.later)}** at a 12% yearly return. You lose **${inrShort(d5.loss)}**, about ${Math.round(lossPct)}% of the final amount, while investing only ${inrShort(monthly * 12 * 5)} less.

## Why five years cost so much

Compounding adds the most money in the final years. A delay does not cut your first five years. It cuts your last five, when the corpus is largest. That is why the loss is many times the money you skipped.

## The cost of every year you wait

Target date fixed at ${years} years from today, ${inr(monthly)} a month, ${rate}% return:

${table(["Delay", "Corpus at the target date", "Corpus lost", "SIP needed to catch up"], rows)}

The last column is the monthly SIP you would need after the delay to still reach ${inrShort(d5.now)} on the same date.

## The loss at different returns

A 5-year delay on a ${inr(monthly)} SIP, ${years}-year target date:

${table(["Yearly return", "Start today", "Start in 5 years", "Share of corpus lost"], rateRows)}

The higher the return, the bigger the share you give up. Even at 8%, a 5-year delay costs a large slice of the final amount.

## Starting at 25 versus 30

Say you want to stop at 60. A ${inr(monthly)} SIP from age 25 grows to about **${inrShort(at25.now)}** at ${rate}%. Start at 30 and you reach about **${inrShort(at25.later)}**. To close that gap from 30, you would need about ${inr(at25.sipToCatchUp)} a month.

## It matters at 40 too

A delay hurts at every age. Say you are 40 and plan to invest until 60. ${inr(monthly)} a month from today grows to about ${inrShort(at40.now)} at ${rate}%. Wait until 45 and you reach about ${inrShort(at40.later)}, roughly half. With a shorter runway, each lost year is a bigger share of the total.

## Why people wait, and why it rarely pays

Common reasons are waiting for a market fall, a pay rise or a "better" fund. Markets can stay high for years, and a fall is only known in hindsight. A SIP already buys more units when prices are low. Starting small and adding later almost always beats waiting to start big.

## If you have already waited

- **Start now with what you can.** A small SIP today beats a bigger one next year.
- **Add a yearly step-up.** Raising the SIP 10% a year recovers much of the lost time. Test it in the [step-up SIP calculator](/calculators/stepup-sip).
- **Invest lumpsums.** Put bonuses and windfalls to work instead of waiting for a "better" month.
- **Do not chase higher returns to catch up.** Taking more risk than you can handle often ends worse.

## Check your own delay

The [cost of delay calculator](/calculators/sip-delay) shows the loss and the catch-up SIP for your numbers. The [SIP calculator](/calculators/sip) shows the corpus for any amount and period.

All figures assume a steady ${rate}% yearly return, compounded monthly. Real returns vary, but the pattern holds: earlier is cheaper.`,
    faq: [
      {
        q: "How much do I lose by delaying a SIP by 5 years?",
        a: `For ${inr(monthly)} a month over ${years} years at ${rate}%, about ${inrShort(d5.loss)}. The corpus falls from ${inrShort(d5.now)} to ${inrShort(d5.later)}.`,
      },
      {
        q: "How much more SIP do I need if I start 5 years late?",
        a: `About ${inr(d5.sipToCatchUp)} a month instead of ${inr(monthly)} to reach the same ${years}-year target at ${rate}%.`,
      },
    ],
  };
}

function swpFor50kMonthly(): BlogArticle {
  const withdraw = 50_000;
  const rate = 8;
  const corpus25 = loanForEmi(withdraw, rate, 25 * 12);
  const forever = corpusForPension(withdraw, rate);
  const rates = [7, 8, 9];
  const spans = [20, 25, 30];
  const rows: string[][] = [
    ...spans.map((y) => [
      `${y} years`,
      ...rates.map((r) => inrShort(loanForEmi(withdraw, r, y * 12))),
    ]),
    [
      "Never runs out (interest only)",
      ...rates.map((r) => inrShort(corpusForPension(withdraw, r))),
    ],
  ];
  const inflation = 6;
  const indexed = corpusForExpenses(withdraw * 12, 25, rate, inflation);
  const fourPct = withdraw * 12 * FIRE_MULTIPLIER;
  const balanceRows = [0, 5, 10, 15, 20, 25].map((k) => [
    `After ${k} years`,
    inrShort(k >= 25 ? 0 : loanForEmi(withdraw, rate, (25 - k) * 12)),
  ]);
  balanceRows[0][0] = "Start";
  const fiftyLakh = 50_00_000;
  const lasts = monthsToRepay(fiftyLakh, rate, withdraw);
  return {
    slug: "swp-corpus-for-50000-monthly-income",
    metaTitle: "SWP: Corpus for ₹50,000 a Month Income | Finkoin",
    title: "SWP for Retirement: How Much Corpus for ₹50,000 a Month?",
    description: `To withdraw ₹50,000 a month for 25 years at 8%, you need about ${inrShort(corpus25)}. Table by return and years, plus the inflation-adjusted number.`,
    keywords: [
      "SWP for monthly income",
      "corpus for 50000 monthly income",
      "SWP calculator retirement",
      "systematic withdrawal plan",
      "how much corpus to retire",
    ],
    publishedAt: PUBLISHED,
    category: "retirement",
    readTimeMinutes: 6,
    relatedTools: [
      { href: "/calculators/swp", label: "SWP calculator" },
      { href: "/calculators/retirement", label: "Retirement calculator" },
      { href: "/calculators/fire", label: "FIRE calculator" },
    ],
    body: `To withdraw **₹50,000 a month for 25 years**, you need a corpus of about **${inrShort(corpus25)}**, if it earns 8% a year. For the money to never run out at 8%, you need about **${inrShort(forever)}**.

## How an SWP works

A Systematic Withdrawal Plan pays you a fixed amount every month from a mutual fund. The rest of the money stays invested and keeps earning. If returns cover your withdrawals, the corpus lasts. If not, it shrinks to zero.

## Corpus needed for ₹50,000 a month

${table(["Withdrawal period", ...rates.map((r) => `At ${r}%`)], rows)}

These assume a fixed ₹50,000 withdrawn at the end of each month and a steady return. The "never runs out" row is ₹6 lakh a year divided by the return.

## How the balance runs down

Here is the ${inrShort(corpus25)} corpus at ${rate}%, paying ₹50,000 every month:

${table(["Point in time", "Balance left"], balanceRows)}

In the early years, returns pay for most of each withdrawal, so the balance falls slowly. Later, the balance falls fast.

## How long does ₹50 lakh last?

At ${rate}%, a ${inrShort(fiftyLakh)} corpus pays ₹50,000 a month for about **${yearsMonths(lasts)}**. Then it is gone. That may be enough at 75, but it is risky at 55.

## Which return should you assume?

A retirement corpus usually sits in a mix of equity and debt, so its return is lower than pure equity. A lower assumed return gives a bigger, safer corpus. Test your plan at 7% as well as 9%. If it only works at the higher rate, it is fragile.

## The catch: inflation

₹50,000 will not buy the same things in 15 years. If you raise the withdrawal by ${inflation}% a year, the corpus has to be much larger. Starting at ₹6 lakh a year and rising ${inflation}% yearly for 25 years, at ${rate}% returns, needs about **${inrShort(indexed)}**.

The 4% rule used by FIRE planners lands in the same range. It says ₹6 lakh a year needs ${FIRE_MULTIPLIER} times that, or ${inrShort(fourPct)}. See [what your FIRE number is](/blog/your-fire-number-when-can-you-actually-retire-in-india).

## Make an SWP safer

- **Keep 1 to 2 years of withdrawals in a liquid or short-term debt fund.** You will not have to sell equity in a crash.
- **Start with a lower withdrawal rate.** The closer you are to the "never runs out" figure, the safer you are.
- **Review every year.** If markets fell, cut back for a year instead of selling more units.
- **Mind the tax.** Each withdrawal is part capital and part gain, and only the gain is taxed.

## Plan your own withdrawal

Test any corpus, withdrawal and return in the [SWP calculator](/calculators/swp). To work out the corpus from your expenses and retirement age, use the [retirement calculator](/calculators/retirement). For early retirement, try the [FIRE calculator](/calculators/fire).`,
    faq: [
      {
        q: "How much corpus do I need for ₹50,000 a month?",
        a: `About ${inrShort(corpus25)} for 25 years at 8%, or ${inrShort(forever)} if you want the capital to stay intact. With yearly inflation increases, closer to ${inrShort(indexed)}.`,
      },
      {
        q: "Is SWP better than an FD for monthly income?",
        a: "With an SWP, only the gain part of each withdrawal is taxed, while FD interest is taxed in full. But an FD's income is fixed, and an SWP's fund value can fall. Many retirees use both.",
      },
      {
        q: "What is a safe SWP withdrawal rate?",
        a: "Many planners start around 4% of the corpus a year and raise it with inflation. Higher rates work for shorter periods.",
      },
    ],
  };
}

function gratuityFormula(): BlogArticle {
  const ex = gratuity({
    monthlyBasicDa: 50_000,
    years: 10,
    months: 7,
    covered: true,
  });
  const exNot = gratuity({
    monthlyBasicDa: 50_000,
    years: 10,
    months: 7,
    covered: false,
  });
  const salaries = [30_000, 50_000, 1_00_000];
  const spans = [5, 10, 20, 30];
  const rows = spans.map((y) => [
    `${y} years`,
    ...salaries.map((s) =>
      inr(
        gratuity({ monthlyBasicDa: s, years: y, months: 0, covered: true })
          .amount,
      ),
    ),
  ]);
  const compareRows = [
    { y: 5, m: 7 },
    { y: 10, m: 3 },
    { y: 20, m: 8 },
  ].map(({ y, m }) => {
    const c = gratuity({
      monthlyBasicDa: 50_000,
      years: y,
      months: m,
      covered: true,
    });
    const n = gratuity({
      monthlyBasicDa: 50_000,
      years: y,
      months: m,
      covered: false,
    });
    return [`${y} years ${m} months`, inr(c.amount), inr(n.amount)];
  });
  const raiseGain =
    gratuity({ monthlyBasicDa: 60_000, years: 20, months: 0, covered: true })
      .amount -
    gratuity({ monthlyBasicDa: 50_000, years: 20, months: 0, covered: true })
      .amount;
  const leave = leaveEncashment({
    monthlyBasicDa: 50_000,
    leaveDays: 60,
    yearsOfService: 10,
    atRetirement: false,
    government: false,
  });
  const big = gratuity({
    monthlyBasicDa: 1_50_000,
    years: 30,
    months: 0,
    covered: true,
  });
  return {
    slug: "gratuity-calculation-formula-examples",
    metaTitle: "Gratuity Calculation Formula with Examples | Finkoin",
    title: "Gratuity Calculation Formula: Worked Examples and Table",
    description: `Gratuity = 15 × last basic + DA × years ÷ 26. With ₹50,000 basic and 10 years 7 months, it is ${inr(ex.amount)}. Table, rounding and tax rules.`,
    keywords: [
      "gratuity calculation formula",
      "gratuity calculator",
      "how to calculate gratuity",
      "gratuity for 10 years",
      "gratuity tax exemption",
    ],
    publishedAt: PUBLISHED,
    category: "retirement",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/gratuity", label: "Gratuity calculator" },
      {
        href: "/calculators/leave-encashment",
        label: "Leave encashment calculator",
      },
      { href: "/calculators/salary", label: "Salary in-hand calculator" },
    ],
    body: `If your employer is covered by the Payment of Gratuity Act, gratuity is **15 × last drawn basic + DA × years of service ÷ 26**. With a last basic + DA of ₹50,000 and 10 years 7 months of service, you get **${inr(ex.amount)}**.

## The two formulas

1. **Employer covered by the Gratuity Act:** 15 × last basic + DA × years ÷ 26. Service of 6 months or more in the final year counts as a full year.
2. **Employer not covered:** 15 × last basic + DA × years ÷ 30. Only completed years count.

The 26 stands for working days in a month. Fifteen days' wages are paid for each year of service.

## Worked example

Last basic + DA ₹50,000 a month, service 10 years 7 months.

- **Covered:** 7 months is over 6, so service is ${ex.serviceYears} years. Gratuity = 15 × ₹50,000 × ${ex.serviceYears} ÷ 26 = **${inr(ex.amount)}**.
- **Not covered:** only 10 completed years count. Gratuity = 15 × ₹50,000 × ${exNot.serviceYears} ÷ 30 = **${inr(exNot.amount)}**.

## Gratuity table (covered employers)

${table(["Service", ...salaries.map((s) => `Basic + DA ${inr(s)}`)], rows)}

## Covered versus not covered

Basic + DA of ₹50,000, with part years of service:

${table(["Service", "Covered (÷ 26)", "Not covered (÷ 30)"], compareRows)}

The covered formula pays more for two reasons. It divides by 26 instead of 30, and it rounds 6 months or more up to a full year.

## Who gets gratuity

You generally need 5 years of continuous service with the same employer. Gratuity is based on your **last drawn** basic + DA, so a raise late in your career lifts the whole amount. With 20 years of service, a final basic + DA of ₹60,000 instead of ₹50,000 adds ${inr(raiseGain)}.

## Common mistakes

- **Using gross or CTC instead of basic + DA.** Allowances such as HRA do not count.
- **Adding service with a previous employer.** Gratuity is worked out separately for each employer.
- **Forgetting the rounding rule.** If you are covered and close to a 6-month mark, a few weeks can add a full year of gratuity.
- **Expecting it every month.** Gratuity is paid as one lumpsum when you leave.

## How gratuity is taxed

- **Government employees:** fully exempt.
- **Private employees:** exempt up to **₹20 lakh**. Anything above is taxed as salary.

For example, a last basic + DA of ₹1.5 lakh and 30 years of service gives ${inrShort(big.amount)}. Of that, ₹20 lakh is exempt and ${inrShort(big.taxable)} is taxable.

## Gratuity in your CTC

Many employers show gratuity inside your CTC at about 4.81% of basic. It is not paid monthly. You receive it only when you leave after becoming eligible. The [salary calculator](/calculators/salary) shows how this lowers your in-hand pay.

## Gratuity and leave encashment

Many people get both when they leave. Leave encashment pays for unused earned leave, usually at basic + DA ÷ 30 for each day. With ₹50,000 basic + DA and 60 days of leave, that is ${inr(leave.amount)}. Its tax rules are different from gratuity's, so work them out separately.

## Work out your own

Enter your basic + DA and service in the [gratuity calculator](/calculators/gratuity). For unused leave paid out on exit, use the [leave encashment calculator](/calculators/leave-encashment).`,
    faq: [
      {
        q: "What is the formula for gratuity?",
        a: "15 × last drawn basic + DA × years of service ÷ 26 for employers covered by the Gratuity Act, and ÷ 30 with completed years only for others.",
      },
      {
        q: "How much gratuity will I get for 10 years on ₹50,000 basic?",
        a: `About ${inr(gratuity({ monthlyBasicDa: 50_000, years: 10, months: 0, covered: true }).amount)} if your employer is covered by the Gratuity Act.`,
      },
      {
        q: "Is gratuity taxable?",
        a: "It is fully exempt for government employees. For private employees, up to ₹20 lakh is exempt and the rest is taxed as salary.",
      },
    ],
  };
}

function healthInsuranceCover(): BlogArticle {
  const cities: Array<{ id: CityTier; label: string }> = [
    { id: "metro", label: "Metro" },
    { id: "tier1", label: "Tier 1 city" },
    { id: "tier2", label: "Smaller city" },
  ];
  const plan = (city: CityTier, eldestAge: number) =>
    healthCover({
      city,
      adults: 2,
      children: 1,
      eldestAge,
      includeParents: true,
      employerCover: 5_00_000,
      years: 10,
      medicalInflationPct: 12,
    });
  const metro = plan("metro", 35);
  const metro45 = plan("metro", 45);
  const family4 = healthCover({
    city: "metro",
    adults: 2,
    children: 2,
    eldestAge: 35,
    includeParents: false,
    employerCover: 5_00_000,
    years: 10,
    medicalInflationPct: 12,
  });
  const rows = cities.map((c) => {
    const h = plan(c.id, 35);
    return [
      c.label,
      inrShort(h.family),
      inrShort(h.personalBase),
      inrShort(h.superTopUp),
      inrShort(h.parents),
    ];
  });
  return {
    slug: "how-much-health-insurance-cover-for-family",
    metaTitle: "How Much Health Insurance Cover for a Family? | Finkoin",
    title: "How Much Health Insurance Cover Does Your Family Need?",
    description: `A metro family of three should aim for about ${inrShort(metro.family)} of health cover, with a super top-up. Table by city, plus parents' cover.`,
    keywords: [
      "how much health insurance cover do I need",
      "health insurance cover for family",
      "family floater sum insured",
      "super top up health insurance",
      "health insurance for parents",
    ],
    publishedAt: PUBLISHED,
    category: "insurance",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/health-cover", label: "Health cover calculator" },
      { href: "/calculators/emergency", label: "Emergency fund calculator" },
      { href: "/analyse", label: "Run the free financial health check" },
    ],
    body: `A family of two adults and one child in a metro should aim for about **${inrShort(metro.family)}** of health cover. A practical way to get there is a personal policy of ${inrShort(metro.personalBase)} plus a super top-up of ${inrShort(metro.superTopUp)}.

## Why ₹5 lakh is rarely enough today

The health cover calculator assumes a major surgery costs ${inrShort(metro.surgeryToday)} today. At 12% medical inflation, the same bill grows to about **${inrShort(metro.futureSurgery)}** in 10 years. Your cover has to keep up.

## Suggested cover by city

Two adults, one child, eldest aged 35, ₹5 lakh of employer cover:

${table(["City", "Family cover to aim for", "Personal base policy", "Super top-up", "Separate cover for parents"], rows)}

These come from the Finkoin health cover calculator. It starts from ₹10 lakh for a metro family, ₹7.5 lakh in a tier 1 city and ₹5 lakh elsewhere. It adds more for each extra adult and child.

## When to buy more

- **Eldest member 45 or older.** The calculator adds ₹5 lakh. A metro family with an eldest member of 45 should aim for about ${inrShort(metro45.family)}.
- **Parents.** Cover them in a separate policy. Older members in your floater raise the premium for everyone.
- **A history of illness in the family.** Lean towards the higher end.

## Floater or individual policies?

A family floater shares one sum insured across everyone. It usually costs less than separate policies for each member. The trade-off is that one large claim can use up most of the cover for the rest of the year. A floater suits a young family. Older members are often better off with their own policy.

## Do not lean on your employer's cover

Group cover ends when you leave the job. It is also often too small. The calculator counts only half of it when sizing your personal policy. Buy your own base policy while you are young and healthy.

## How a super top-up helps

A super top-up pays once your total bills in a year cross a set limit, called the deductible. Match the deductible to your base cover. You get a large total cover for much less than one big base policy. The calculator sizes the top-up so your total cover is about twice the family target.

## Review your cover every few years

At 12% medical inflation, a ${inrShort(metro.surgeryToday)} bill becomes about ${inrShort(inflate(metro.surgeryToday, 12, 5))} in 5 years. A cover that looks generous today can feel small within a few years. Check it every 3 years, and whenever your family grows. Raising cover is easier while everyone is healthy. A new illness can make a higher cover costlier or harder to get.

## Tax benefit

In the old tax regime, Section 80D allows ₹25,000 a year for self and family (₹50,000 if 60 or older). You can claim another ₹25,000, or ₹50,000 for senior citizen parents.

## Get your number

Put in your city, family and employer cover in the [health cover calculator](/calculators/health-cover). Keep cash for bills the policy will not pay with the [emergency fund calculator](/calculators/emergency). To check insurance, savings and debt together, run the [free financial health check](/analyse).`,
    faq: [
      {
        q: "How much health insurance is enough for a family of four?",
        a: `In a metro, aim for about ${inrShort(family4.family)} for two adults and two children, plus a super top-up. Increase it if the eldest member is 45 or older.`,
      },
      {
        q: "Should parents be in my family floater?",
        a: "Usually not. Older members raise the premium for the whole floater. A separate policy for parents is often better.",
      },
      {
        q: "Is my employer's health insurance enough?",
        a: "No. It ends with the job and is often too small. Keep a personal policy as well.",
      },
    ],
  };
}

function carLoanVsCash(): BlogArticle {
  const price = 10_00_000;
  const down = 2_00_000;
  const loan = price - down;
  const rate = 9.5;
  const years = 5;
  const months = years * 12;
  const emi = emiFor(loan, rate, months);
  const interest = emi * months - loan;
  const returns = [6, 8, 10, 12];
  const rows = returns.map((r) => {
    const keep = lumpsumFV(loan, r, years);
    const sip = sipFV(emi, r, months);
    return [
      `${r}%`,
      inrShort(keep),
      inrShort(sip),
      keep > sip ? "Loan" : "Cash",
    ];
  });
  // Return at which both choices end level (bisection on the gap).
  const gap = (r: number) => lumpsumFV(loan, r, years) - sipFV(emi, r, months);
  let lo = 1;
  let hi = 30;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    if (gap(mid) > 0) hi = mid;
    else lo = mid;
  }
  const breakEven = (lo + hi) / 2;
  const downRows = [20, 40, 60].map((pct) => {
    const l = (price * (100 - pct)) / 100;
    const e = emiFor(l, rate, months);
    return [`${pct}%`, inrShort(l), inr(e), inr(e * months - l)];
  });
  const tenureRows = [3, 5, 7].map((y) => {
    const e = emiFor(loan, rate, y * 12);
    return [`${y} years`, inr(e), inr(e * y * 12 - loan)];
  });
  return {
    slug: "car-loan-vs-paying-cash",
    metaTitle: "Car Loan vs Paying Cash: Which Is Better? | Finkoin",
    title: "Car Loan vs Paying Cash: Which Costs Less?",
    description: `An ${inrShort(loan)} car loan at 9.5% for 5 years costs ${inr(interest)} in interest. Paying cash wins unless your money earns over ${breakEven.toFixed(1)}% a year.`,
    keywords: [
      "car loan vs cash",
      "should I take a car loan",
      "car loan or pay cash",
      "car loan EMI calculator",
    ],
    publishedAt: PUBLISHED,
    category: "loans",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/car", label: "Car loan EMI calculator" },
      { href: "/calculators/whencar", label: "When to buy a car calculator" },
      { href: "/calculators/rentcar", label: "Rent vs own car calculator" },
    ],
    body: `An ${inrShort(loan)} car loan at ${rate}% for ${years} years has an EMI of **${inr(emi)}** and costs **${inr(interest)}** in interest. Paying cash is cheaper unless your savings would earn more than about **${breakEven.toFixed(1)}% a year** after tax.

## The comparison

Take a ${inrShort(price)} car with a ${inrShort(down)} down payment either way. The question is the other ${inrShort(loan)}.

- **Pay cash:** you spend the ${inrShort(loan)} today. Each month you invest what the EMI would have been, ${inr(emi)}.
- **Take the loan:** you keep the ${inrShort(loan)} invested and pay the EMI from income.

Both paths spend the same money. After ${years} years, which leaves you with more?

${table(["Return on your savings", "Loan: savings kept invested", "Cash: EMI invested monthly", "Ahead"], rows)}

The loan comes out ahead only if your savings earn more than about ${breakEven.toFixed(1)}% a year. That is above the ${rate}% quoted rate, because the loan charges interest monthly.

## Why cash usually wins

- **The loan cost is certain.** Investment returns are not, and over 5 years equity can disappoint.
- **Returns are taxed.** Interest from an FD or gains from a fund are taxed, so you need an even higher pre-tax return.
- **A car loses value.** You pay interest on something that is worth less every year.

## When a loan can make sense

- Paying cash would empty your emergency fund.
- The money is in an investment you do not want to break, such as a long-term goal fund.
- You get a genuinely low rate and can repay early.

## Shorter tenure, less interest

If you do borrow, keep the tenure short. Same ${inrShort(loan)} at ${rate}%:

${table(["Tenure", "EMI", "Total interest"], tenureRows)}

## The loan is only part of the cost

Insurance, fuel, servicing and parking add to what a car costs each month. A car also loses value from the day you buy it. Count these before deciding how much car you can afford, whatever way you pay. If you take a loan and want to close it early, check the foreclosure charges in your loan terms first.

## A middle path: a bigger down payment

You do not have to choose all or nothing. Paying more upfront cuts the interest sharply. Same ${inrShort(price)} car at ${rate}% for ${years} years:

${table(["Down payment", "Loan", "EMI", "Total interest"], downRows)}

Keep your emergency fund intact, then put the rest of your savings towards the down payment.

## Can you afford the EMI?

The car loan calculator warns you when the EMI is more than 40% of your monthly salary. For an EMI of ${inr(emi)}, that means a monthly salary of at least ${inr(emi / 0.4)}. Remember that other EMIs share the same salary.

## Check your numbers

See the EMI and full schedule in the [car loan EMI calculator](/calculators/car). Decide whether to buy now or save first with the [when to buy a car calculator](/calculators/whencar). If you drive little, compare owning with cabs in the [rent vs own car calculator](/calculators/rentcar).`,
    faq: [
      {
        q: "Is it better to buy a car with cash or a loan?",
        a: `Cash is usually cheaper. A loan wins only if your money earns more than about ${breakEven.toFixed(1)}% a year after tax, for a ${rate}% loan.`,
      },
      {
        q: "What is the EMI on an ₹8 lakh car loan?",
        a: `About ${inr(emi)} a month at ${rate}% for ${years} years, with ${inr(interest)} of total interest.`,
      },
    ],
  };
}

function rentVsBuy(): BlogArticle {
  const price = 1_00_00_000;
  const down = 20_00_000;
  const loan = price - down;
  const rate = 8.5;
  const years = 20;
  const emi = emiFor(loan, rate, years * 12);
  const rent = 28_000;
  const rentGrowth = 5;
  /** Renter's portfolio: down payment plus each year's (EMI − rent) invested. */
  const renterWealth = (ret: number) => {
    let total = lumpsumFV(down, ret, years);
    for (let y = 1; y <= years; y += 1) {
      const monthlyRent = inflate(rent, rentGrowth, y - 1);
      const yearEnd = sipFV(emi - monthlyRent, ret, 12);
      total += lumpsumFV(yearEnd, ret, years - y);
    }
    return total;
  };
  const returns = [8, 10, 12];
  const rows = returns.map((r) => {
    const w = renterWealth(r);
    return [
      `${r}%`,
      inrShort(w),
      `${cagr(price, w, years).toFixed(1)}% a year`,
    ];
  });
  const w10 = renterWealth(10);
  const be10 = cagr(price, w10, years);
  const finalRent = inflate(rent, rentGrowth, years - 1);
  const totalEmi = emi * years * 12;
  const house5 = lumpsumFV(price, 5, years);
  return {
    slug: "rent-vs-buy-house-india",
    metaTitle: "Rent vs Buy a House in India: The Real Maths | Finkoin",
    title: "Rent vs Buy a House in India: Which Leaves You Richer?",
    description: `Renting a ₹1 crore home and investing the difference beats buying unless the house grows over ${be10.toFixed(1)}% a year, if investments earn 10%. Full table.`,
    keywords: [
      "rent vs buy house India",
      "should I buy or rent a house",
      "rent or buy calculator",
      "buying vs renting home",
    ],
    publishedAt: PUBLISHED,
    category: "planning",
    readTimeMinutes: 6,
    relatedTools: [
      { href: "/calculators/rentbuy", label: "Rent vs buy calculator" },
      { href: "/calculators/home", label: "Home loan EMI calculator" },
      {
        href: "/calculators/down-payment",
        label: "Down payment calculator",
      },
    ],
    body: `For a ${inrShort(price)} home with a ${inrShort(down)} down payment, buying wins only if the house grows faster than about **${be10.toFixed(1)}% a year** over ${years} years. That assumes the renter invests the down payment and the EMI-minus-rent gap at 10% a year.

## The setup

- **Buyer:** pays ${inrShort(down)} down and takes an ${inrShort(loan)} loan at ${rate}% for ${years} years. The EMI is **${inr(emi)}**. After ${years} years the buyer owns the house outright.
- **Renter:** pays ${inr(rent)} a month in rent, rising ${rentGrowth}% a year. They invest the ${inrShort(down)} on day one. Each month they also invest the gap between the EMI and their rent.

Both spend the same amount every month. The only question is what each owns at the end.

## What the renter has after ${years} years

${table(["Return on renter's investments", "Renter's portfolio", "House growth needed to match"], rows)}

At 10%, the renter ends with about ${inrShort(w10)}. For the buyer to match it, the ${inrShort(price)} house must be worth that much after ${years} years. That means growing ${be10.toFixed(1)}% a year.

By year ${years}, rent has risen to about ${inr(finalRent)} a month. That is close to the EMI, so the renter's monthly saving shrinks over time.

## A quick check: EMI versus rent

In this example the EMI is ${(emi / rent).toFixed(1)} times the starting rent. That gap is what the renter gets to invest each month. The wider the gap between EMI and rent in your city, the stronger the case for renting. The faster rents rise, the more the gap closes.

## The buyer's side in numbers

Over ${years} years the buyer pays ${inrShort(down + totalEmi)} in all: ${inrShort(down)} down and ${inrShort(totalEmi)} in EMIs. Of that, ${inrShort(totalEmi - loan)} is interest. If the house grows 5% a year, it is worth about ${inrShort(house5)} at the end. That is less than the renter's ${inrShort(w10)} at 10% returns, but more than the renter's ${inrShort(renterWealth(8))} at 8%.

## What this leaves out

- **Stamp duty, registration and brokerage** add to the buyer's cost on day one.
- **Maintenance and property tax** add to the buyer's yearly cost.
- **Tax benefits** on home loan interest and principal help the buyer, but only in the old regime.
- **Discipline.** The renter wins only if they actually invest the difference every month.

The first two favour renting. The last two can favour buying.

## Beyond the numbers

A home gives stability. You cannot be asked to move, and you can change it as you like. Renting gives flexibility for job moves and keeps your money liquid. The longer you stay in one home, the more the one-time costs of buying are spread out. If you may move cities in a few years, renting is usually simpler.

## Check your city's numbers

Compare the cash outflow in the [rent vs buy calculator](/calculators/rentbuy). Work out the EMI in the [home loan EMI calculator](/calculators/home). If you decide to buy, plan the down payment with the [down payment calculator](/calculators/down-payment).`,
    faq: [
      {
        q: "Is it better to rent or buy a house in India?",
        a: `It depends on how fast the house grows versus your investments. In our example, buying wins only if the house grows over ${be10.toFixed(1)}% a year when investments earn 10%.`,
      },
      {
        q: "What is a good rent to price ratio for buying?",
        a: `In our example, a ${inrShort(price)} home rents for ${inr(rent)} a month, about ${((rent * 12 * 100) / price).toFixed(1)}% of its price a year. The lower this yield, the stronger the case for renting.`,
      },
    ],
  };
}

function creditCardMinimumDue(): BlogArticle {
  const balance = 1_00_000;
  const monthlyRate = 3.75;
  const minDue = 5;
  const run = (fixedPayment: number) =>
    creditCardPayoff({
      balance,
      monthlyRatePct: monthlyRate,
      minDuePct: minDue,
      fixedPayment,
    });
  const base = run(10_000);
  const min = base.minimum;
  const plans = [5_000, 10_000, 20_000];
  const fixed10 = run(10_000).fixed;
  const firstInterest = (balance * monthlyRate) / 100;
  const firstGst = firstInterest * 0.18;
  const firstMin = (balance * minDue) / 100;
  const rows = [
    [
      `Minimum due only (${minDue}% of balance)`,
      yearsMonths(min.months),
      inr(min.interest),
      inr(balance + min.interest),
    ],
    ...plans.map((p) => {
      const f = run(p).fixed;
      return [
        `Fixed ${inr(p)} a month`,
        yearsMonths(f.months),
        inr(f.interest),
        inr(balance + f.interest),
      ];
    }),
  ];
  return {
    slug: "credit-card-minimum-due-real-cost",
    metaTitle: "Credit Card Minimum Due: What It Really Costs | Finkoin",
    title: "Credit Card Minimum Due: What Paying Only the Minimum Costs",
    description: `Paying only the minimum due on a ₹1 lakh card bill takes ${yearsMonths(min.months)} and costs ${inrShort(min.interest)} in interest and GST. See faster options.`,
    keywords: [
      "credit card minimum due",
      "minimum amount due credit card",
      "credit card interest calculator",
      "what happens if I pay only minimum due",
    ],
    publishedAt: PUBLISHED,
    category: "loans",
    readTimeMinutes: 5,
    relatedTools: [
      {
        href: "/calculators/credit-card",
        label: "Credit card interest calculator",
      },
      { href: "/calculators/debt-payoff", label: "Debt payoff calculator" },
      { href: "/analyse", label: "Run the free financial health check" },
    ],
    body: `If you pay only the ${minDue}% minimum due on a ₹1 lakh credit card bill, it takes about **${yearsMonths(min.months)}** to clear. You pay about **${inr(min.interest)}** in interest and GST along the way.

## How the minimum due works

The minimum due is a small part of your bill, often around 5% of the balance. Paying it keeps your account in good standing. But interest still runs on the whole unpaid balance. Cards typically charge 3% to 4% a month, plus 18% GST on the interest.

At ${monthlyRate}% a month, that is ${(monthlyRate * 12).toFixed(0)}% a year before GST. Almost every other loan is cheaper.

## ₹1 lakh balance at ${monthlyRate}% a month

${table(["How you pay", "Time to clear", "Interest + GST", "Total paid"], rows)}

The figures assume no new spending on the card. The minimum due shrinks as the balance shrinks, which is why it drags on so long.

## Why it takes so long

In the first month, interest on ₹1 lakh at ${monthlyRate}% is ${inr(firstInterest)}. GST adds ${inr(firstGst)}. The minimum due is ${inr(firstMin)}. So only ${inr(firstMin - firstInterest - firstGst)} of your payment reduces what you owe. Next month the minimum due is a little smaller, and the cycle repeats.

## Small increases make a big difference

Paying ${inr(10_000)} a month instead of the ${inr(firstMin)} starting minimum clears the debt in ${yearsMonths(fixed10.months)} instead of ${yearsMonths(min.months)}. It saves about ${inrShort(min.interest - fixed10.interest)} in interest and GST. The key is to pay a fixed amount that does not shrink as the balance falls.

## The hidden cost: no interest-free period

While you carry a balance, new purchases usually start charging interest from the day you buy. You lose the interest-free period until the full bill is cleared. So the real cost of revolving is often higher than the table shows.

## How to get out

1. **Stop using the card** for new spending until the balance is clear.
2. **Pay a fixed amount, not the minimum.** Even ${inr(5_000)} a month cuts the time sharply.
3. **Move the balance to a cheaper loan.** A personal loan or a loan against an FD usually costs far less than a card. Use it only to clear the card, not to spend more.
4. **With several debts, pay the costliest first.** The [debt payoff calculator](/calculators/debt-payoff) shows the order.

## Using a card without paying interest

A credit card is free to use if you pay the full statement balance by the due date every month. You then get the interest-free period on purchases. The trouble starts only when you carry a balance. If you cannot pay in full this month, pay as much as you can and stop new spending.

## A safe habit

Set up autopay for the full amount, or at least the minimum, so you never miss a due date. Then pay the rest yourself before the due date. A missed payment adds late fees and hurts your credit score.

## Check your own card

Put in your balance, rate and payment in the [credit card interest calculator](/calculators/credit-card). To see how card debt fits with your other loans and savings, run the [free financial health check](/analyse).`,
    faq: [
      {
        q: "What happens if I pay only the minimum due?",
        a: `Your account stays regular, but interest runs on the full balance. A ₹1 lakh bill at ${monthlyRate}% a month takes about ${yearsMonths(min.months)} to clear on minimum payments.`,
      },
      {
        q: "Does paying the minimum due affect my credit score?",
        a: "Paying at least the minimum on time avoids a missed payment. But a high balance relative to your limit can still weigh on your score.",
      },
      {
        q: "How much interest do credit cards charge in India?",
        a: "About 3% to 4% a month, or 36% to 48% a year, plus 18% GST on the interest.",
      },
    ],
  };
}

function flatVsReducing(): BlogArticle {
  const amount = 5_00_000;
  const flat = 10;
  const months = 36;
  const f = flatToReducing(amount, flat, months);
  const realEmi = emiFor(amount, flat, months);
  const realInterest = realEmi * months - amount;
  const flats = [8, 10, 12, 14];
  const tenures = [1, 3, 5];
  const ratios = flats.flatMap((fr) =>
    tenures.map((y) => flatToReducing(amount, fr, y * 12).effectivePct / fr),
  );
  const phone = flatToReducing(50_000, 12, 12);
  const rows = flats.map((fr) => [
    `${fr}% flat`,
    ...tenures.map(
      (y) => `${flatToReducing(amount, fr, y * 12).effectivePct.toFixed(1)}%`,
    ),
  ]);
  return {
    slug: "flat-vs-reducing-interest-rate",
    metaTitle: "Flat vs Reducing Interest Rate Explained | Finkoin",
    title: "Flat vs Reducing Interest Rate: What a Flat Rate Really Costs",
    description: `A 10% flat rate on a 3-year loan equals about ${f.effectivePct.toFixed(1)}% on a reducing balance. See the conversion table and the extra interest you pay.`,
    keywords: [
      "flat vs reducing interest rate",
      "flat rate to reducing rate",
      "flat interest rate calculator",
      "reducing balance interest",
    ],
    publishedAt: PUBLISHED,
    category: "loans",
    readTimeMinutes: 5,
    relatedTools: [
      {
        href: "/calculators/flat-vs-reducing",
        label: "Flat vs reducing rate calculator",
      },
      { href: "/calculators/emi", label: "EMI calculator" },
      { href: "/calculators/car", label: "Car loan EMI calculator" },
    ],
    body: `A **10% flat rate** on a 3-year loan costs the same as about **${f.effectivePct.toFixed(1)}% on a reducing balance**. On a ${inrShort(amount)} loan, you pay ${inr(f.totalInterest)} in interest instead of ${inr(realInterest)}.

## The difference in one line

- **Flat rate:** interest is charged on the full loan amount for the whole tenure, even as you repay it.
- **Reducing rate:** interest is charged only on what you still owe. As you repay, interest falls.

Home loans and most bank loans use reducing rates. Flat rates often show up in consumer durable loans, some personal loans and some vehicle loans.

## Worked example

${inr(amount)} for 3 years:

${table(
  ["", "10% flat", "10% reducing"],
  [
    ["Total interest", inr(f.totalInterest), inr(realInterest)],
    ["EMI", inr(f.emi), inr(realEmi)],
    ["Total repaid", inr(amount + f.totalInterest), inr(realEmi * months)],
  ],
)}

**Flat interest = loan × rate × years** = ${inr(amount)} × 10% × 3 = ${inr(f.totalInterest)}. The EMI is the loan plus that interest, divided by ${months} months.

You pay ${inr(f.totalInterest - realInterest)} more on the flat rate, because you pay interest on money you have already returned.

## Flat to reducing conversion table

${table(["Flat rate", ...tenures.map((y) => (y === 1 ? "1-year loan" : `${y}-year loan`))], rows)}

The reducing equivalent is about ${Math.min(...ratios).toFixed(1)} to ${Math.max(...ratios).toFixed(1)} times the flat rate in this table. The multiple dips a little for longer loans, but the extra interest in rupees keeps growing.

## How the conversion works

The reducing rate is the rate at which a normal EMI equals the flat-rate EMI. For the example above, that means finding the rate at which a ${inrShort(amount)}, 3-year loan has an EMI of ${inr(f.emi)}. There is no simple formula, so calculators search for it step by step.

## A small loan example

A ₹50,000 gadget loan at 12% flat for 1 year costs ${inr(phone.totalInterest)} in interest. The EMI is ${inr(phone.emi)}. That is the same as about ${phone.effectivePct.toFixed(1)}% on a reducing balance.

## Before you sign a flat-rate loan

Some flat-rate loans fix the full interest at the start. Prepaying such a loan may save you little. Ask how prepayment is handled before you sign. Also ask for the total amount you will repay, including fees. Dividing that by the loan amount shows the true cost at a glance.

## How to protect yourself

- **Ask for the reducing rate or APR.** Lenders should be able to give you the annual percentage rate.
- **Compare EMIs, not headline rates.** For the same loan and tenure, the lower EMI is the cheaper loan.
- **Watch "no-cost" offers.** Check whether processing fees or a higher price hide the interest.

## Questions to ask the lender

1. Is the quoted rate flat or reducing?
2. What is the EMI, and how many EMIs are there?
3. What is the total amount I will repay, including fees?
4. What does it cost to close the loan early?

The answers let you compare any two offers on equal terms.

## Convert any rate

Enter a flat rate and tenure in the [flat vs reducing rate calculator](/calculators/flat-vs-reducing). Then check the EMI at the reducing rate with the [EMI calculator](/calculators/emi). For how EMIs are built, read [how EMI is calculated](/blog/how-emi-is-calculated-formula-examples).`,
    faq: [
      {
        q: "What is 10% flat rate in reducing rate?",
        a: `About ${f.effectivePct.toFixed(1)}% for a 3-year loan and ${flatToReducing(amount, 10, 60).effectivePct.toFixed(1)}% for a 5-year loan.`,
      },
      {
        q: "Which is better, flat or reducing rate?",
        a: "At the same quoted number, a reducing rate is always cheaper. Compare loans by the reducing rate or the EMI.",
      },
    ],
  };
}

function ssyMaturity(): BlogArticle {
  const rate = PO_RATES.ssy;
  const depositYears = 15;
  const totalYears = 21;
  /** Deposits for 15 years, then the balance compounds until year 21. */
  const maturity = (yearly: number, r: number) =>
    lumpsumFV(
      poSsyMaturity(yearly, depositYears, r),
      r,
      totalYears - depositYears,
    );
  const max = maturity(1_50_000, rate);
  const rows = [12_000, 50_000, 1_00_000, 1_50_000].map((y) => [
    inr(y),
    inrShort(y * depositYears),
    inrShort(poSsyMaturity(y, depositYears, rate)),
    inrShort(maturity(y, rate)),
  ]);
  const ppf15 = poSsyMaturity(1_50_000, depositYears, PO_RATES.ppf);
  const lowRate = 7.5;
  const rateRows = [lowRate, rate].map((r) => [
    `${r}%`,
    inrShort(maturity(1_50_000, r)),
    inrShort(maturity(1_50_000, r) - 1_50_000 * depositYears),
  ]);
  return {
    slug: "sukanya-samriddhi-yojana-maturity-amount",
    metaTitle: "Sukanya Samriddhi Maturity Amount: Table | Finkoin",
    title: "Sukanya Samriddhi Yojana Maturity Amount: How Much You Get",
    description: `₹1.5 lakh a year in Sukanya Samriddhi grows to about ${inrShort(max)} at maturity at ${rate}%. Maturity table for smaller deposits and key rules.`,
    keywords: [
      "sukanya samriddhi maturity amount",
      "SSY calculator",
      "sukanya samriddhi yojana interest rate",
      "SSY 1.5 lakh per year maturity",
      "sukanya samriddhi 21 years",
    ],
    publishedAt: PUBLISHED,
    category: "savings",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/po-ssy", label: "Sukanya Samriddhi calculator" },
      {
        href: "/calculators/child-education",
        label: "Child education calculator",
      },
      { href: "/calculators/ppf", label: "PPF calculator" },
    ],
    body: `If you deposit the maximum **₹1.5 lakh a year** in Sukanya Samriddhi, the account grows to about **${inrShort(max)}** when it matures, at ${rate}%. You deposit ${inrShort(1_50_000 * depositYears)} in total, and the rest is interest.

## How the account runs

- You deposit for **${depositYears} years** from opening.
- The account **matures ${totalYears} years** from the date you open it.
- In the last ${totalYears - depositYears} years, no deposits are needed. The balance keeps earning interest.
- Deposits can be between ₹250 and ₹1.5 lakh in a financial year.
- The account is for a girl child and must be opened before she turns 10.

## Sukanya Samriddhi maturity table at ${rate}%

${table(["Yearly deposit", "Total deposited", `Balance after ${depositYears} years`, `Maturity at ${totalYears} years`], rows)}

The table assumes you deposit at the start of each year and the rate stays at ${rate}%. A ₹1,000 monthly habit is the ₹12,000 row.

## How the maturity is worked out

Each year's deposit earns interest, compounded yearly, until the account matures. A ₹1.5 lakh deposit in year 1 grows for 21 years, to about ${inrShort(lumpsumFV(1_50_000, rate, totalYears))}. The deposit in year 15 grows for only 7 years, to about ${inrShort(lumpsumFV(1_50_000, rate, 7))}. Add up all 15 deposits and you get the maturity amount. This is why depositing early in the financial year helps.

## The rate can change

${rate}% is the notified rate for ${PO_RATES_PERIOD}. The government reviews small savings rates every quarter, so the SSY rate can change over the life of the account. Check the current rate before you plan. Here is ₹1.5 lakh a year at two rates:

${table(["Rate", `Maturity at ${totalYears} years`, "Interest earned"], rateRows)}

## Tax treatment

Under current rules, SSY is EEE. The interest and the maturity amount are tax-free. Deposits also count under Section 80C if you use the old tax regime.

## SSY versus PPF

Both are government-backed and tax-free under current rules. SSY pays more today: ${rate}% against ${PO_RATES.ppf}% for PPF. ₹1.5 lakh a year for ${depositYears} years grows to about ${inrShort(poSsyMaturity(1_50_000, depositYears, rate))} in SSY and ${inrShort(ppf15)} in PPF, at today's rates. SSY can only be used for a girl child. PPF is open to anyone. Note that both share the same ₹1.5 lakh Section 80C limit.

## What it is worth in today's money

Maturity is 21 years away, and prices will rise. At 6% inflation, ${inrShort(max)} in 21 years buys roughly what ${inrShort(max / inflate(1, 6, totalYears))} buys today. Keep this in mind when you compare it with today's college fees. Depositing monthly instead of at the start of the year also earns slightly less than the table shows.

## Open early

Opening the account when your daughter is a baby means it matures when she is about 21. That lines up with college or other big expenses. Opening it at 9 means maturity at about 30.

## Is SSY enough for her goals?

SSY is safe and tax-free. But college costs can rise faster than the SSY rate. Many parents pair it with an equity SIP. Size the goal with the [child education calculator](/calculators/child-education). Compare with the [PPF calculator](/calculators/ppf), or run your own deposits in the [Sukanya Samriddhi calculator](/calculators/po-ssy).`,
    faq: [
      {
        q: "What is the maturity amount of ₹1.5 lakh a year in SSY?",
        a: `About ${inrShort(max)} at ${rate}%, if you deposit for ${depositYears} years and hold to maturity at ${totalYears} years.`,
      },
      {
        q: "How many years do I need to deposit in Sukanya Samriddhi?",
        a: `${depositYears} years. The account then keeps earning interest until it matures ${totalYears} years from opening.`,
      },
      {
        q: "Is Sukanya Samriddhi interest taxable?",
        a: "No. Under current rules the interest and maturity amount are tax-free, and deposits qualify for Section 80C in the old regime.",
      },
    ],
  };
}

function scssMisMonthlyIncome(): BlogArticle {
  const scssMax = 30_00_000;
  const misSingle = 9_00_000;
  const misJoint = 15_00_000;
  const scssQ = poScssQuarterly(scssMax);
  const misS = poMisMonthly(misSingle);
  const misJ = poMisMonthly(misJoint);
  const amounts = [5_00_000, 9_00_000, 15_00_000, 30_00_000];
  const rows = amounts.map((a) => [
    inrShort(a),
    a <= misJoint ? inr(poMisMonthly(a)) : "Above MIS limit",
    inr(poScssQuarterly(a)),
    inr(poScssQuarterly(a) / 3),
  ]);
  const combinedMonthly = scssQ / 3 + misJ;
  const realAfter5 = scssQ / 3 / inflate(1, 6, 5);
  const for50k = corpusForPension(50_000, PO_RATES.scss);
  const plan40 = scssQ / 3 + misS;
  return {
    slug: "post-office-scss-mis-monthly-income-retirees",
    metaTitle: "SCSS vs Post Office MIS: Monthly Income | Finkoin",
    title: "SCSS and Post Office MIS: Monthly Income for Retirees",
    description: `₹30 lakh in SCSS pays ${inr(scssQ)} a quarter at ${PO_RATES.scss}%. ₹15 lakh in a joint MIS pays ${inr(misJ)} a month. Payout table and limits.`,
    keywords: [
      "SCSS monthly income",
      "post office MIS monthly income",
      "senior citizen savings scheme interest",
      "SCSS vs MIS",
      "monthly income scheme for retirees",
    ],
    publishedAt: PUBLISHED,
    category: "retirement",
    readTimeMinutes: 5,
    relatedTools: [
      { href: "/calculators/po-scss", label: "SCSS calculator" },
      { href: "/calculators/po-mis", label: "Post Office MIS calculator" },
      { href: "/calculators/swp", label: "SWP calculator" },
    ],
    body: `₹30 lakh in the Senior Citizen Savings Scheme pays **${inr(scssQ)} every quarter** at ${PO_RATES.scss}%, which is ${inr(scssQ / 3)} a month. A joint Post Office Monthly Income Scheme account of ₹15 lakh adds **${inr(misJ)} a month** at ${PO_RATES.mis}%.

## The two schemes at a glance

${table(
  ["", "SCSS", "Post Office MIS"],
  [
    [
      "Rate (" + PO_RATES_PERIOD + ")",
      `${PO_RATES.scss}% a year`,
      `${PO_RATES.mis}% a year`,
    ],
    ["Interest paid", "Every quarter", "Every month"],
    [
      "Maximum deposit",
      inrShort(scssMax),
      `${inrShort(misSingle)} single, ${inrShort(misJoint)} joint`,
    ],
    ["Tenure", "5 years, extendable", "5 years"],
  ],
)}

Both rates are set by the government and reviewed every quarter. Check the current rate before you put money in.

## How the payouts are worked out

The maths is simple. SCSS pays amount × rate ÷ 4 every quarter. MIS pays amount × rate ÷ 12 every month. The deposit itself is not touched.

## Income by amount invested

${table(["Amount", "MIS monthly income", "SCSS quarterly income", "SCSS per month"], rows)}

A single MIS account of ${inrShort(misSingle)} pays ${inr(misS)} a month.

## Using both together

A retiree who fills SCSS to ${inrShort(scssMax)} and a joint MIS to ${inrShort(misJoint)} gets about **${inr(combinedMonthly)} a month** in total. The capital comes back after 5 years.

## Example: ₹40 lakh of retirement savings

Say a retiree has ₹40 lakh. They put ${inrShort(scssMax)} in SCSS, ${inrShort(misSingle)} in a single MIS account and keep ₹1 lakh in savings for emergencies. That gives about **${inr(plan40)} a month**: ${inr(scssQ / 3)} from SCSS and ${inr(misS)} from MIS.

SCSS interest arrives once a quarter, not monthly. Keep about three months of expenses in your savings account so the gaps do not pinch.

## How much for ₹50,000 a month?

At ${PO_RATES.scss}%, ₹50,000 a month needs about ${inrShort(for50k)} invested. That is more than the SCSS limit allows. So most retirees who want this income need other sources too, such as a pension, rent or an SWP.

## SCSS or MIS first?

If you are eligible for SCSS, it usually makes sense to fill it first because it pays the higher rate. MIS then adds monthly income on top. If you are not yet eligible for SCSS, MIS is the simpler option for regular income.

## What to watch

- **Income stays flat.** At 6% inflation, ${inr(scssQ / 3)} a month buys only what about ${inr(realAfter5)} buys today after 5 years.
- **SCSS interest is taxable.** Section 80TTB may help seniors in the old regime.
- **Reinvestment risk.** When the 5 years end, the rate on offer may be lower.
- **Lock-in.** Breaking either scheme early can reduce what you get back.

## Where they fit

SCSS and MIS are good for the steady, safe part of retirement income. They do not grow with inflation. Many retirees keep a growth portion in mutual funds and draw from it with an SWP. See [how much corpus you need for ₹50,000 a month](/blog/swp-corpus-for-50000-monthly-income).

## Check your payout

Work out your income in the [SCSS calculator](/calculators/po-scss) and the [Post Office MIS calculator](/calculators/po-mis). To plan withdrawals from a fund, use the [SWP calculator](/calculators/swp).`,
    faq: [
      {
        q: "How much monthly income will I get from ₹30 lakh in SCSS?",
        a: `About ${inr(scssQ / 3)} a month, paid as ${inr(scssQ)} every quarter at ${PO_RATES.scss}%.`,
      },
      {
        q: "What is the maximum investment in Post Office MIS?",
        a: `${inrShort(misSingle)} in a single account and ${inrShort(misJoint)} in a joint account. At ${PO_RATES.mis}%, ₹10,000 pays about ${inr(poMisMonthly(10_000))} a month.`,
      },
      {
        q: "Which is better for retirees, SCSS or MIS?",
        a: `SCSS pays a higher rate (${PO_RATES.scss}% vs ${PO_RATES.mis}%) but quarterly and only for those generally aged 60 or above. MIS pays monthly. Many retirees use both.`,
      },
    ],
  };
}

function ctcToInHand(): BlogArticle {
  const breakup = (ctc: number, regime: "new" | "old") =>
    salaryBreakup({
      ctc,
      basicPct: 40,
      variablePct: 0,
      employerPfOnFullBasic: false,
      includeGratuity: true,
      professionalTax: 2_400,
      regime,
      rentMonthly: 20_000,
      metro: true,
      extra80C: 50_000,
    });
  const s15 = breakup(15_00_000, "new");
  const s15old = breakup(15_00_000, "old");
  const ctcs = [8_00_000, 12_00_000, 15_00_000, 20_00_000, 30_00_000];
  const rows = ctcs.map((c) => {
    const s = breakup(c, "new");
    return [
      inrShort(c),
      inr(s.gross),
      inr(s.employeePf),
      inr(s.tax),
      inr(s.monthlyInHand),
      `${Math.round((s.annualInHand / c) * 100)}%`,
    ];
  });
  return {
    slug: "ctc-to-in-hand-salary-calculation",
    metaTitle: "CTC to In-hand Salary: How It Is Calculated | Finkoin",
    title: "CTC to In-hand Salary: What You Actually Take Home",
    description: `A ₹15 lakh CTC gives about ${inr(s15.monthlyInHand)} a month in hand in the new regime. See the breakup and a table from ₹8 lakh to ₹30 lakh CTC.`,
    keywords: [
      "CTC to in hand salary",
      "in hand salary calculator",
      "15 lakh CTC in hand salary",
      "take home salary calculation",
      "salary breakup",
    ],
    publishedAt: PUBLISHED,
    category: "tax",
    readTimeMinutes: 6,
    relatedTools: [
      { href: "/calculators/salary", label: "Salary in-hand calculator" },
      {
        href: "/calculators/tax-regime-2026",
        label: "Old vs new regime calculator",
      },
      { href: "/calculators/hra", label: "HRA exemption calculator" },
    ],
    body: `A **₹15 lakh CTC** gives about **${inr(s15.monthlyInHand)} a month** in hand under the new tax regime. That assumes basic pay is 40% of CTC, no variable pay, and PF on the ₹15,000 wage ceiling.

## Why in-hand is lower than CTC

CTC is what the company spends on you. Part of it never reaches your bank account:

1. **Employer PF** and **gratuity** are counted in CTC but not paid monthly. Take them out and you get gross salary.
2. From gross salary, your **own PF**, **professional tax** and **income tax** are deducted.
3. What is left is your in-hand pay.

## Breakup of a ₹15 lakh CTC

${table(
  ["Item", "Yearly amount"],
  [
    ["CTC", inr(15_00_000)],
    ["Basic (40% of CTC)", inr(s15.basic)],
    ["Employer PF (12% of capped basic)", `− ${inr(s15.employerPf)}`],
    ["Gratuity (4.81% of basic)", `− ${inr(s15.gratuityPart)}`],
    ["**Gross salary**", `**${inr(s15.gross)}**`],
    ["Employee PF", `− ${inr(s15.employeePf)}`],
    ["Professional tax", `− ${inr(2_400)}`],
    ["Income tax (new regime)", `− ${inr(s15.tax)}`],
    ["**In-hand per year**", `**${inr(s15.annualInHand)}**`],
    ["**In-hand per month**", `**${inr(s15.monthlyInHand)}**`],
  ],
)}

In the new regime, tax is worked out on gross salary minus the ₹75,000 standard deduction. The 87A rebate makes tax nil when taxable income is up to ₹12 lakh.

## In-hand salary by CTC (new regime)

${table(["CTC", "Gross salary", "Employee PF", "Income tax", "Monthly in-hand", "In-hand ÷ CTC"], rows)}

Same assumptions throughout: basic at 40% of CTC, PF on capped basic, gratuity included in CTC, ₹2,400 professional tax and no variable pay.

Up to about ₹12 lakh CTC, in-hand pay is a high share of CTC because there is no income tax. Above that, tax takes a growing share.

Employer and employee PF are not lost. Both go into your EPF account and earn interest until you withdraw. See how they grow in the [EPF calculator](/calculators/epf).

## Read your offer letter

Look for four things: basic pay, variable pay, whether PF is on capped or full basic, and whether gratuity sits inside CTC. Joining bonuses and insurance premiums are sometimes counted in CTC too. These do not reach you every month.

## What changes your number

- **Variable pay or bonus.** If part of CTC is variable, your fixed monthly pay is lower. You get the rest when it is paid.
- **PF on full basic.** Some employers deduct PF on the full basic. That lowers in-hand pay but builds more retirement savings.
- **Old regime.** With rent of ₹20,000 in a metro and ₹50,000 of extra 80C, the old regime tax on a ₹15 lakh CTC is about ${inr(s15old.tax)}, against ${inr(s15.tax)} in the new regime. In-hand pay is about ${inr(s15old.monthlyInHand)} a month. Check which is better for you.
- **Professional tax** depends on where you work. Check your payslip.

## Work out your own

Enter your CTC and structure in the [salary calculator](/calculators/salary). If you pay rent, work out the exemption in the [HRA calculator](/calculators/hra). Then pick your regime with the [old vs new regime calculator](/calculators/tax-regime-2026).`,
    faq: [
      {
        q: "What is the in-hand salary for ₹15 lakh CTC?",
        a: `About ${inr(s15.monthlyInHand)} a month in the new regime, with basic at 40% of CTC and no variable pay. It changes with your salary structure.`,
      },
      {
        q: "What is the in-hand salary for ₹12 lakh CTC?",
        a: `About ${inr(breakup(12_00_000, "new").monthlyInHand)} a month in the new regime on the same assumptions. Income tax is nil because taxable income stays under ₹12 lakh.`,
      },
      {
        q: "Why is my in-hand salary less than CTC ÷ 12?",
        a: "CTC includes employer PF and gratuity, which are not paid monthly. Your own PF, professional tax and income tax are also deducted.",
      },
    ],
  };
}

export const BLOG_ARTICLES_MORE_GUIDES: BlogArticle[] = [
  stepUpVsNormalSip(),
  costOfDelayingSip(),
  swpFor50kMonthly(),
  gratuityFormula(),
  healthInsuranceCover(),
  carLoanVsCash(),
  rentVsBuy(),
  creditCardMinimumDue(),
  flatVsReducing(),
  ssyMaturity(),
  scssMisMonthlyIncome(),
  ctcToInHand(),
];
