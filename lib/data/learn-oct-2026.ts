/**
 * Learn guides added in October 2026 for the calculators and tools shipped
 * that month (PF, gratuity, step-up SIP, XIRR, direct vs regular, flat vs
 * reducing, loan eligibility, debt payoff, FD/RD tax, net worth).
 *
 * Merged into lib/learnContent.ts, lib/learnRichArticles.ts and
 * lib/learnArticleFaqs.ts.
 */
import type { LearnFaq } from "@/components/learn/LearnFaqAccordion";
import type { LearnArticle } from "@/lib/learnContent";
import type { RichArticle } from "@/lib/learnRichArticles";

const UPDATED = "2026-10-17";

export const LEARN_ARTICLES_OCT_2026: LearnArticle[] = [
  {
    id: "epf-pf-explained-contribution-interest-withdrawal",
    title: "EPF (PF) explained — contribution, interest, VPF and withdrawal",
    subtitle:
      "Where your 12% goes, how EPFO interest is credited, when PF is taxed, and how to estimate your balance at retirement.",
    category: "Investment",
    readTime: 9,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "EPF is the biggest retirement asset most salaried Indians own, and the one they understand least. This guide explains the split between EPF and EPS, how interest is calculated, VPF, tax rules and withdrawals.",
    ],
  },
  {
    id: "gratuity-calculation-formula-eligibility-tax",
    title: "Gratuity in India — formula, eligibility and tax exemption",
    subtitle:
      "The 15/26 formula, the five-year rule, how years are rounded, and the ₹20 lakh tax-free limit, with worked examples.",
    category: "Basics",
    readTime: 7,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "Gratuity is a lump sum your employer pays when you leave after long service. This guide shows the formula, who qualifies and how much of it is tax-free.",
    ],
  },
  {
    id: "step-up-sip-and-cost-of-delay",
    title: "Step-up SIP — why raising your SIP every year matters so much",
    subtitle:
      "A 10% yearly step-up can double your final corpus. Plus what a five-year delay really costs, in rupees.",
    category: "Investment",
    readTime: 7,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "A flat SIP stays the same while your salary grows. A step-up SIP grows with you. Here is the maths, with numbers.",
    ],
  },
  {
    id: "xirr-vs-cagr-vs-absolute-return",
    title: "XIRR vs CAGR vs absolute return — which number to trust",
    subtitle:
      "Why your SIP app shows XIRR, when CAGR is right, and how absolute return misleads over long periods.",
    category: "Investment",
    readTime: 7,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "Three return numbers, three different questions. This guide explains when each one is the right yardstick.",
    ],
  },
  {
    id: "direct-vs-regular-mutual-funds-expense-ratio",
    title: "Direct vs regular mutual funds — what the expense ratio costs you",
    subtitle:
      "A 1% higher expense ratio can take ₹12 lakh out of a 20-year SIP. How to check your plan and switch sensibly.",
    category: "Investment",
    readTime: 7,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "Same fund, same manager, same portfolio, different cost. This guide shows how direct and regular plans differ and what the gap compounds to.",
    ],
  },
  {
    id: "flat-vs-reducing-interest-rate",
    title:
      "Flat vs reducing interest rate — the real cost of a ‘10% flat’ loan",
    subtitle:
      "A 10% flat rate is close to 18% on a reducing balance. How to convert, and which loans quote flat rates.",
    category: "Loans",
    readTime: 6,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "A flat rate charges interest on the full loan for the whole tenure, even as you repay. This guide shows how to see the real rate.",
    ],
  },
  {
    id: "loan-eligibility-foir-explained",
    title: "Loan eligibility and FOIR — how much can you really borrow?",
    subtitle:
      "How banks use FOIR, EMI per lakh and your existing EMIs to decide your limit, and why you should borrow less than that.",
    category: "Loans",
    readTime: 7,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "Lenders decide your loan amount from one ratio: how much of your income already goes to EMIs. This guide explains FOIR with a worked example.",
    ],
  },
  {
    id: "debt-payoff-avalanche-vs-snowball",
    title: "Debt avalanche vs snowball — the fastest way to become debt-free",
    subtitle:
      "Pay the costliest debt first or the smallest first? The rupee difference, and how to pick the method you will stick to.",
    category: "Loans",
    readTime: 7,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "Two well-known ways to clear several loans. This guide compares them on a real Indian debt mix: a credit card, a consumer loan and a personal loan.",
    ],
  },
  {
    id: "fd-rd-interest-tax-tds-15g-15h",
    title:
      "FD and RD interest tax — TDS limits, Form 15G/15H and what you actually earn",
    subtitle:
      "How bank deposit interest is taxed, when TDS is cut (₹50,000 / ₹1 lakh for seniors), and the post-tax return.",
    category: "Tax",
    readTime: 7,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "FD interest is fully taxable at your slab rate, whether or not the bank deducts TDS. This guide explains the rules and the real post-tax return.",
    ],
  },
  {
    id: "how-to-calculate-net-worth",
    title: "How to calculate your net worth (and track it every month)",
    subtitle:
      "What to count as assets and liabilities, what to leave out, and why the monthly trend matters more than the number.",
    category: "Basics",
    readTime: 6,
    publishedAt: UPDATED,
    updatedAt: UPDATED,
    content: [
      "Net worth is what you own minus what you owe. Simple to define, easy to get wrong. This guide shows what to include and how to track it.",
    ],
  },
];

export const LEARN_RICH_OCT_2026: Record<string, RichArticle> = {
  "epf-pf-explained-contribution-interest-withdrawal": {
    seoTitle: "EPF Explained: Contribution, Interest, VPF & Tax | Finkoin",
    seoDescription:
      "How EPF works in India: 12% split between EPF and EPS, 8.25% interest, VPF, tax on PF interest, withdrawal rules and a PF value estimate.",
    updatedAt: UPDATED,
    tags: ["EPF", "PF", "VPF", "Retirement", "Salary"],
    toc: [
      { id: "split", label: "Where your 12% goes" },
      { id: "interest", label: "How interest is credited" },
      { id: "vpf", label: "VPF: topping up" },
      { id: "tax", label: "Tax on EPF" },
      { id: "withdrawal", label: "Withdrawals and transfers" },
      { id: "estimate", label: "Estimate your PF at retirement" },
    ],
    intro: [
      "Every month 12% of your basic pay (plus DA) goes into the Employees’ Provident Fund, and your employer adds another 12%. Over a 30-year career this quietly becomes a crore-plus corpus for many salaried people. Yet most people only open their passbook when they change jobs.",
      "This guide explains how EPF really works, using a ₹40,000 basic salary as the running example.",
    ],
    sections: [
      {
        id: "split",
        title: "Where your 12% goes",
        blocks: [
          {
            kind: "p",
            text: "Your own 12% goes fully into EPF. Your employer’s 12% is split: 8.33% goes to the Employees’ Pension Scheme (EPS), capped at 8.33% of ₹15,000 (₹1,250 a month), and the rest goes to your EPF account.",
          },
          {
            kind: "table",
            headers: ["Basic + DA ₹40,000", "Monthly", "Goes to"],
            rows: [
              ["Your contribution (12%)", "₹4,800", "EPF"],
              ["Employer share to EPS", "₹1,250", "EPS (pension, capped)"],
              ["Employer share to EPF", "₹3,550", "EPF"],
              ["Total into EPF", "₹8,350", "Earns EPF interest"],
            ],
          },
          {
            kind: "callout",
            tone: "violet",
            title: "EPS is not part of your PF balance",
            text: "The EPS amount builds a pension entitlement, not a withdrawable balance that earns interest. When you project your PF, count only the EPF part (₹8,350 a month in the example above).",
          },
        ],
      },
      {
        id: "interest",
        title: "How interest is credited",
        blocks: [
          {
            kind: "p",
            text: "EPFO declares a rate each year; it was 8.25% for FY 2024-25. Interest is worked out on your monthly running balance but credited once a year, so a contribution made in April earns about eleven months of interest that year and one made in March earns none until the next year.",
          },
          {
            kind: "ul",
            items: [
              "The rate is reviewed every year, so treat 8.25% as an assumption, not a promise.",
              "Interest is credited after the year ends; your passbook can look ‘stuck’ for months before the credit appears.",
              "An account with no contributions for a long period after you leave service can become inoperative and stop earning interest, so transfer old PF when you switch jobs.",
            ],
          },
        ],
      },
      {
        id: "vpf",
        title: "VPF: topping up at the same rate",
        blocks: [
          {
            kind: "p",
            text: "The Voluntary Provident Fund lets you contribute more than 12%, up to 100% of basic plus DA, through payroll. VPF earns the same rate as EPF and has the same lock-in. Your employer does not match it.",
          },
          {
            kind: "callout",
            tone: "amber",
            title: "Watch the ₹2.5 lakh limit",
            text: "If your own EPF plus VPF contributions cross ₹2.5 lakh in a year (₹5 lakh if your employer contributes nothing), interest on the excess is taxable. Heavy VPF users can cross this quickly.",
          },
        ],
      },
      {
        id: "tax",
        title: "Tax on EPF",
        blocks: [
          {
            kind: "ul",
            items: [
              "Your contribution qualifies for Section 80C, but only under the old regime.",
              "Employer contributions to EPF, NPS and superannuation above ₹7.5 lakh a year in total are taxable as a perquisite.",
              "If your own contributions cross ₹2.5 lakh in a year, interest on the excess is taxable every year.",
              "Withdrawals after five years of continuous service (including service with earlier employers whose PF you transferred) are tax-free.",
              "Withdrawals before five years are taxable, and TDS applies if the amount is above ₹50,000.",
            ],
          },
        ],
      },
      {
        id: "withdrawal",
        title: "Withdrawals and transfers",
        blocks: [
          {
            kind: "p",
            text: "EPF allows partial withdrawals for specific needs such as a house, medical treatment, education and marriage, subject to service conditions and limits set by EPFO. Full withdrawal is allowed at retirement or after a period of unemployment.",
          },
          {
            kind: "p",
            text: "When you change jobs, transfer the balance to the new employer’s account through your UAN instead of withdrawing. Withdrawing resets the five-year clock for tax and breaks the compounding you have built.",
          },
        ],
      },
      {
        id: "estimate",
        title: "Estimate your PF at retirement",
        blocks: [
          {
            kind: "p",
            text: "With a ₹40,000 basic, ₹8,350 a month into EPF and 8.25% interest, 30 years of contributions grow to roughly ₹1.2 crore if your basic never rises. With a 5% yearly rise in basic, the same 30 years gets you to about ₹2.2 crore.",
          },
          {
            kind: "callout",
            tone: "emerald",
            title: "Try your numbers",
            text: "The Finkoin PF calculator takes your current balance, yearly contribution and age, and shows the value at 60 year by year.",
          },
        ],
      },
    ],
    finkoinTip:
      "Open the PF calculator with your passbook balance and this year’s contribution to see your PF value at 60.",
    finkoinTipHref: "/calculators/epf",
    tools: [
      {
        href: "/calculators/epf",
        title: "PF (EPF) calculator",
        desc: "Your PF value at 60",
      },
      {
        href: "/calculators/gratuity",
        title: "Gratuity calculator",
        desc: "Gratuity amount and tax",
      },
      {
        href: "/calculators/retirement",
        title: "Retirement calculator",
        desc: "Corpus you need to retire",
      },
    ],
    related: [
      { id: "nps-vs-epf-for-retirement", title: "NPS vs EPF for retirement" },
      {
        id: "gratuity-calculation-formula-eligibility-tax",
        title: "Gratuity — formula, eligibility and tax",
      },
      {
        id: "hidden-tax-savings-salary-india",
        title: "Hidden tax savings in your salary",
      },
    ],
  },

  "gratuity-calculation-formula-eligibility-tax": {
    seoTitle: "Gratuity Calculation: Formula, Eligibility & Tax | Finkoin",
    seoDescription:
      "Gratuity formula (15 × salary × years ÷ 26), the five-year rule, how service years are rounded and the ₹20 lakh tax exemption, with examples.",
    updatedAt: UPDATED,
    tags: ["Gratuity", "Salary", "Retirement", "Tax"],
    toc: [
      { id: "what", label: "What gratuity is" },
      { id: "formula", label: "The formula" },
      { id: "eligibility", label: "Who qualifies" },
      { id: "tax", label: "Tax on gratuity" },
      { id: "ctc", label: "Gratuity in your CTC" },
    ],
    intro: [
      "Gratuity is a thank-you payment from your employer for long service, paid when you resign, retire or are laid off after the qualifying period. For someone with ten years at one company it can easily be three to five months of basic pay.",
    ],
    sections: [
      {
        id: "what",
        title: "What gratuity is",
        blocks: [
          {
            kind: "p",
            text: "The Payment of Gratuity Act, 1972 covers establishments with ten or more employees. Covered employers must pay gratuity by the statutory formula; others may pay under their own policy, often using a slightly lower formula.",
          },
        ],
      },
      {
        id: "formula",
        title: "The formula",
        blocks: [
          {
            kind: "table",
            headers: ["Employer type", "Formula"],
            rows: [
              [
                "Covered by the Act",
                "15 × last drawn (basic + DA) × years of service ÷ 26",
              ],
              [
                "Not covered",
                "15 × average (basic + DA) of last 10 months × completed years ÷ 30",
              ],
            ],
          },
          {
            kind: "p",
            text: "Why 26? The Act treats a month as 26 working days, so 15 ÷ 26 is fifteen days’ wages for every year of service.",
          },
          {
            kind: "callout",
            tone: "violet",
            title: "Worked example",
            text: "Last drawn basic + DA ₹60,000, service 10 years 7 months at a covered employer. Service above six months rounds up, so years = 11. Gratuity = 15 × 60,000 × 11 ÷ 26 ≈ ₹3,80,769. Had the service been 10 years 5 months, it would round down to 10 years: about ₹3,46,154.",
          },
        ],
      },
      {
        id: "eligibility",
        title: "Who qualifies",
        blocks: [
          {
            kind: "ul",
            items: [
              "Five years of continuous service with the same employer is the usual condition.",
              "The five-year condition does not apply on death or disablement.",
              "Under the Code on Social Security, fixed-term employees qualify after one year; check how your employer has applied the new labour codes.",
              "Notice period counts towards service. Unpaid long leave may not, depending on the employer’s records.",
            ],
          },
        ],
      },
      {
        id: "tax",
        title: "Tax on gratuity",
        blocks: [
          {
            kind: "p",
            text: "Government employees get gratuity fully tax-free. For private-sector employees, the exempt amount is the lowest of three numbers: the gratuity actually received, the formula amount, and ₹20 lakh. Anything above that is taxed as salary.",
          },
          {
            kind: "callout",
            tone: "amber",
            title: "₹20 lakh is a lifetime limit",
            text: "The ₹20 lakh exemption applies across all the gratuity you receive in your career, not per employer.",
          },
        ],
      },
      {
        id: "ctc",
        title: "Gratuity in your CTC",
        blocks: [
          {
            kind: "p",
            text: "Many offer letters include gratuity as roughly 4.81% of basic (15 ÷ 26 ÷ 12). That money is not paid monthly and you only get it if you stay five years, so do not count it as take-home when comparing offers.",
          },
        ],
      },
    ],
    finkoinTip:
      "Enter your basic, DA and years of service in the gratuity calculator to see the amount and the tax-free part.",
    finkoinTipHref: "/calculators/gratuity",
    tools: [
      {
        href: "/calculators/gratuity",
        title: "Gratuity calculator",
        desc: "Amount and tax-free part",
      },
      {
        href: "/calculators/leave-encashment",
        title: "Leave encashment calculator",
        desc: "Leave payout and exemption",
      },
      {
        href: "/calculators/salary",
        title: "Salary calculator",
        desc: "CTC to in-hand pay",
      },
    ],
    related: [
      {
        id: "epf-pf-explained-contribution-interest-withdrawal",
        title: "EPF (PF) explained",
      },
      {
        id: "hidden-tax-savings-salary-india",
        title: "Hidden tax savings in your salary",
      },
      { id: "form-16-what-to-verify", title: "Form 16 — what to verify" },
    ],
  },

  "step-up-sip-and-cost-of-delay": {
    seoTitle: "Step-up SIP: Why Raising Your SIP Yearly Matters | Finkoin",
    seoDescription:
      "A ₹10,000 SIP with a 10% yearly step-up grows to about ₹2 crore in 20 years vs ₹1 crore flat. Plus the real cost of delaying a SIP by 5 years.",
    updatedAt: UPDATED,
    tags: ["Step-up SIP", "SIP", "Mutual funds", "Compounding"],
    toc: [
      { id: "what", label: "What a step-up SIP is" },
      { id: "numbers", label: "Flat vs step-up in rupees" },
      { id: "delay", label: "The cost of waiting" },
      { id: "how", label: "How to set it up" },
    ],
    intro: [
      "Most people start a SIP when they get their first job and never change the amount. Ten years later their salary has doubled but the SIP is still ₹5,000. A step-up SIP fixes that by raising the amount automatically every year.",
    ],
    sections: [
      {
        id: "what",
        title: "What a step-up SIP is",
        blocks: [
          {
            kind: "p",
            text: "A step-up (or top-up) SIP increases your monthly instalment by a fixed percentage or amount once a year. Most fund houses and platforms let you set this when you register the SIP.",
          },
        ],
      },
      {
        id: "numbers",
        title: "Flat vs step-up in rupees",
        blocks: [
          {
            kind: "p",
            text: "₹10,000 a month for 20 years, assuming 12% a year (illustrative, not guaranteed):",
          },
          {
            kind: "table",
            headers: [
              "Yearly step-up",
              "You invest",
              "Approx. value after 20 years",
            ],
            rows: [
              ["None (flat)", "₹24 lakh", "₹1.0 crore"],
              ["5%", "₹39.7 lakh", "₹1.37 crore"],
              ["10%", "₹68.7 lakh", "₹1.99 crore"],
            ],
          },
          {
            kind: "callout",
            tone: "emerald",
            title: "Why it works",
            text: "A 10% step-up roughly doubles the end value because the bigger instalments of later years still get many years to compound. And if your salary also grows 10% a year, the SIP stays the same share of your income.",
          },
        ],
      },
      {
        id: "delay",
        title: "The cost of waiting",
        blocks: [
          {
            kind: "p",
            text: "Same ₹10,000 flat SIP at 12%, with a target year 25 years from now. Start today and you have about ₹1.9 crore at the end. Start five years later and you have about ₹1.0 crore. Waiting five years saves you ₹6 lakh of instalments and costs you about ₹90 lakh of final value.",
          },
        ],
      },
      {
        id: "how",
        title: "How to set it up",
        blocks: [
          {
            kind: "ul",
            items: [
              "Match the step-up to your expected salary growth; 5–10% is common.",
              "Time it with your appraisal month so the increase never pinches.",
              "If your platform does not support step-up, raise the SIP manually every April.",
              "Keep your emergency fund and term cover in place before increasing equity SIPs.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "Compare a flat and a step-up SIP side by side, then see what a delay costs with your own amount.",
    finkoinTipHref: "/calculators/stepup-sip",
    tools: [
      {
        href: "/calculators/stepup-sip",
        title: "Step-up SIP calculator",
        desc: "SIP that grows every year",
      },
      {
        href: "/calculators/sip-delay",
        title: "Cost of delay calculator",
        desc: "What waiting costs",
      },
      {
        href: "/calculators/goal-sip",
        title: "Goal SIP calculator",
        desc: "SIP needed for a goal",
      },
    ],
    related: [
      {
        id: "sip-calculator-1-crore-10-15-20-years",
        title: "How much SIP for ₹1 crore",
      },
      { id: "sip-vs-lumpsum-when-to-use-which", title: "SIP vs lumpsum" },
      {
        id: "what-is-compound-interest-and-why-it-changes-everything",
        title: "Compound interest explained",
      },
    ],
  },

  "xirr-vs-cagr-vs-absolute-return": {
    seoTitle: "XIRR vs CAGR vs Absolute Return Explained | Finkoin",
    seoDescription:
      "Which return number to trust: absolute return, CAGR or XIRR. Why SIP returns need XIRR, with a worked ₹10,000 SIP example.",
    updatedAt: UPDATED,
    tags: ["XIRR", "CAGR", "Returns", "Mutual funds"],
    toc: [
      { id: "absolute", label: "Absolute return" },
      { id: "cagr", label: "CAGR" },
      { id: "xirr", label: "XIRR" },
      { id: "example", label: "One SIP, three numbers" },
      { id: "which", label: "Which one to use" },
    ],
    intro: [
      "Your fund app shows one return, your friend quotes another and the fund factsheet a third. They can all be right, because they answer different questions.",
    ],
    sections: [
      {
        id: "absolute",
        title: "Absolute return",
        blocks: [
          {
            kind: "p",
            text: "Absolute return is the plain percentage gain: (current value − invested) ÷ invested. ₹1 lakh that becomes ₹2 lakh is a 100% absolute return, whether it took 2 years or 12. That is why it is misleading for anything longer than a year.",
          },
        ],
      },
      {
        id: "cagr",
        title: "CAGR",
        blocks: [
          {
            kind: "p",
            text: "CAGR (compound annual growth rate) is the steady yearly rate that turns the starting value into the ending value. ₹1 lakh to ₹2 lakh in 6 years is a CAGR of about 12.2%. CAGR is the right measure for a single lump sum held for a known period.",
          },
          {
            kind: "callout",
            tone: "violet",
            title: "Formula",
            text: "CAGR = (ending value ÷ starting value)^(1 ÷ years) − 1",
          },
        ],
      },
      {
        id: "xirr",
        title: "XIRR",
        blocks: [
          {
            kind: "p",
            text: "XIRR handles many cash flows on different dates, like monthly SIPs, extra top-ups and partial withdrawals. It finds the single yearly rate at which all your investments, grown to today, equal your current value. Each instalment is credited only for the time it was actually invested.",
          },
        ],
      },
      {
        id: "example",
        title: "One SIP, three numbers",
        blocks: [
          {
            kind: "p",
            text: "₹10,000 a month for 36 months (₹3.6 lakh in total), worth ₹4.5 lakh at the end:",
          },
          {
            kind: "table",
            headers: ["Measure", "Result", "What it says"],
            rows: [
              ["Absolute return", "25%", "Total gain on money put in"],
              [
                "CAGR on ₹3.6 lakh over 3 years",
                "≈ 7.7%",
                "Wrong: assumes all money was invested on day one",
              ],
              [
                "XIRR",
                "≈ 15%",
                "Right: the last instalments were invested only for weeks",
              ],
            ],
          },
        ],
      },
      {
        id: "which",
        title: "Which one to use",
        blocks: [
          {
            kind: "ul",
            items: [
              "Single lump sum held for a known period: CAGR.",
              "SIPs, top-ups, withdrawals, or a whole portfolio: XIRR.",
              "Less than a year, or a quick sanity check: absolute return.",
              "Compare against what the same money would have earned elsewhere (FD, index fund) using the same measure.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "Enter your SIP dates and current value in the XIRR calculator to see your real yearly return.",
    finkoinTipHref: "/calculators/xirr",
    tools: [
      {
        href: "/calculators/xirr",
        title: "XIRR calculator",
        desc: "Real return on SIPs",
      },
      {
        href: "/calculators/cagr",
        title: "CAGR calculator",
        desc: "Yearly growth between two values",
      },
      {
        href: "/calculators/inflation",
        title: "Inflation calculator",
        desc: "Real return after inflation",
      },
    ],
    related: [
      {
        id: "understanding-inflation-and-your-real-returns",
        title: "Inflation and your real returns",
      },
      {
        id: "direct-vs-regular-mutual-funds-expense-ratio",
        title: "Direct vs regular mutual funds",
      },
      { id: "sip-vs-lumpsum-when-to-use-which", title: "SIP vs lumpsum" },
    ],
  },

  "direct-vs-regular-mutual-funds-expense-ratio": {
    seoTitle: "Direct vs Regular Mutual Fund: Expense Ratio Cost | Finkoin",
    seoDescription:
      "Direct and regular plans hold the same portfolio; only the expense ratio differs. See what a 1% gap costs on a 20-year SIP and how to switch.",
    updatedAt: UPDATED,
    tags: ["Direct plan", "Regular plan", "Expense ratio", "Mutual funds"],
    toc: [
      { id: "difference", label: "The only difference" },
      { id: "cost", label: "What 1% costs over 20 years" },
      { id: "check", label: "How to check your plan" },
      { id: "switch", label: "Switching sensibly" },
    ],
    intro: [
      "Every mutual fund scheme comes in two versions. The direct plan is bought straight from the fund house; the regular plan is sold through a distributor who earns a commission. The commission comes out of your returns, every year.",
    ],
    sections: [
      {
        id: "difference",
        title: "The only difference",
        blocks: [
          {
            kind: "p",
            text: "Both plans own exactly the same stocks or bonds and have the same fund manager. The regular plan has a higher expense ratio, typically 0.5–1.5% a year more for equity funds, because it pays the distributor. That is why direct plans always show a higher NAV after a few years.",
          },
        ],
      },
      {
        id: "cost",
        title: "What 1% costs over 20 years",
        blocks: [
          {
            kind: "table",
            headers: [
              "Investment (illustrative)",
              "At 12% (direct)",
              "At 11% (regular)",
              "Gap",
            ],
            rows: [
              [
                "₹10,000 monthly SIP, 20 years",
                "≈ ₹99.9 lakh",
                "≈ ₹87.4 lakh",
                "≈ ₹12.6 lakh",
              ],
              [
                "₹10 lakh lump sum, 20 years",
                "≈ ₹96.5 lakh",
                "≈ ₹80.6 lakh",
                "≈ ₹15.8 lakh",
              ],
            ],
          },
          {
            kind: "callout",
            tone: "amber",
            title: "Fees compound too",
            text: "A 1% fee sounds small, but it is charged on your whole balance every year, including on gains you made earlier.",
          },
        ],
      },
      {
        id: "check",
        title: "How to check your plan",
        blocks: [
          {
            kind: "ul",
            items: [
              "Look at the scheme name in your statement: direct plans say ‘Direct’, regular plans say ‘Regular’ or nothing.",
              "Your consolidated account statement (CAS) from CAMS or KFintech lists every folio with the plan type.",
              "Compare the scheme’s expense ratio on the fund house website for both plans.",
            ],
          },
        ],
      },
      {
        id: "switch",
        title: "Switching sensibly",
        blocks: [
          {
            kind: "p",
            text: "Switching from regular to direct counts as a redemption, so it can trigger capital gains tax and exit load. A common approach is to start all new SIPs in direct plans and move old units gradually, using the yearly LTCG exemption and waiting for exit loads to expire.",
          },
          {
            kind: "p",
            text: "If you value a distributor’s or advisor’s guidance, paying for it is fine. Just know what you are paying, and compare it with a fee-only SEBI-registered advisor.",
          },
        ],
      },
    ],
    finkoinTip:
      "Enter your SIP and the two expense ratios to see the rupee gap over your horizon.",
    finkoinTipHref: "/calculators/expense-ratio",
    tools: [
      {
        href: "/calculators/expense-ratio",
        title: "Direct vs regular calculator",
        desc: "Cost of the expense ratio",
      },
      {
        href: "/calculators/ltcg-harvest",
        title: "LTCG harvesting calculator",
        desc: "Use the yearly exemption",
      },
      {
        href: "/calculators/xirr",
        title: "XIRR calculator",
        desc: "Real return on SIPs",
      },
    ],
    related: [
      {
        id: "what-is-an-index-fund-and-why-it-beats-most-mutual-funds",
        title: "Index funds explained",
      },
      { id: "stcg-vs-ltcg-on-equity-india", title: "STCG vs LTCG on equity" },
      {
        id: "xirr-vs-cagr-vs-absolute-return",
        title: "XIRR vs CAGR vs absolute return",
      },
    ],
  },

  "flat-vs-reducing-interest-rate": {
    seoTitle: "Flat vs Reducing Interest Rate: The Real Cost | Finkoin",
    seoDescription:
      "A 10% flat-rate loan costs about 18% on a reducing balance. How flat rates work, which loans use them, and how to compare offers.",
    updatedAt: UPDATED,
    tags: ["Flat rate", "Reducing balance", "Personal loan", "EMI"],
    toc: [
      { id: "how", label: "How each rate works" },
      { id: "example", label: "₹5 lakh example" },
      { id: "where", label: "Where flat rates show up" },
      { id: "compare", label: "How to compare offers" },
    ],
    intro: [
      "A dealer says the car or phone loan is ‘only 10%’. A bank quotes 14% for a personal loan. The dealer’s offer looks cheaper, but it is usually far more expensive, because it is a flat rate.",
    ],
    sections: [
      {
        id: "how",
        title: "How each rate works",
        blocks: [
          {
            kind: "ul",
            items: [
              "Reducing balance: interest is charged only on what you still owe. As you repay, the interest part of each EMI falls. Home loans and most bank loans work this way.",
              "Flat rate: interest is charged on the full original amount for the whole tenure, even though you have repaid most of it by the end.",
            ],
          },
        ],
      },
      {
        id: "example",
        title: "₹5 lakh example",
        blocks: [
          {
            kind: "p",
            text: "₹5 lakh for 3 years at 10% flat: interest = 5,00,000 × 10% × 3 = ₹1,50,000. EMI = ₹6,50,000 ÷ 36 ≈ ₹18,056.",
          },
          {
            kind: "p",
            text: "The same ₹18,056 EMI on a ₹5 lakh, 3-year reducing-balance loan implies an interest rate of about 17.9%.",
          },
          {
            kind: "callout",
            tone: "amber",
            title: "Rule of thumb",
            text: "A flat rate is roughly 1.7–1.9 times the equivalent reducing rate for typical 1–5 year loans.",
          },
        ],
      },
      {
        id: "where",
        title: "Where flat rates show up",
        blocks: [
          {
            kind: "p",
            text: "Consumer durable finance, some two-wheeler and used-car loans, and some small-ticket personal loans from NBFCs and dealers. ‘No-cost EMI’ offers are a different trick: the interest is usually built into the price or offset by a discount you give up.",
          },
        ],
      },
      {
        id: "compare",
        title: "How to compare offers",
        blocks: [
          {
            kind: "ul",
            items: [
              "Ask for the APR or reducing-balance rate in writing; lenders must state it in the key fact statement.",
              "Compare EMIs for the same amount and tenure, and add processing fees.",
              "Check prepayment terms: on a flat-rate loan, prepaying often saves far less interest than you expect.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "Convert any flat-rate offer to its real reducing rate before you sign.",
    finkoinTipHref: "/calculators/flat-vs-reducing",
    tools: [
      {
        href: "/calculators/flat-vs-reducing",
        title: "Flat vs reducing calculator",
        desc: "The real interest rate",
      },
      {
        href: "/calculators/emi",
        title: "EMI calculator",
        desc: "EMI for any loan",
      },
      {
        href: "/calculators/car",
        title: "Car loan calculator",
        desc: "EMI and total cost",
      },
    ],
    related: [
      {
        id: "credit-card-minimum-trap",
        title: "The credit card minimum-due trap",
      },
      {
        id: "debt-payoff-avalanche-vs-snowball",
        title: "Debt avalanche vs snowball",
      },
      {
        id: "loan-eligibility-foir-explained",
        title: "Loan eligibility and FOIR",
      },
    ],
  },

  "loan-eligibility-foir-explained": {
    seoTitle: "Loan Eligibility & FOIR: How Much Can You Borrow? | Finkoin",
    seoDescription:
      "How banks use FOIR (fixed obligations to income ratio) to set your loan limit, with a worked home loan example and safer borrowing limits.",
    updatedAt: UPDATED,
    tags: ["FOIR", "Loan eligibility", "Home loan", "EMI"],
    toc: [
      { id: "foir", label: "What FOIR is" },
      { id: "example", label: "Worked example" },
      { id: "levers", label: "What changes your limit" },
      { id: "safe", label: "Eligible vs comfortable" },
    ],
    intro: [
      "When you apply for a loan, the bank asks one main question: after your existing EMIs, how much of your monthly income is left for a new one? That share is FOIR.",
    ],
    sections: [
      {
        id: "foir",
        title: "What FOIR is",
        blocks: [
          {
            kind: "p",
            text: "FOIR (fixed obligations to income ratio) is your total EMIs, including the new loan, divided by your monthly net income. Lenders commonly cap it somewhere between 40% and 60%, higher for bigger incomes and stronger credit profiles.",
          },
        ],
      },
      {
        id: "example",
        title: "Worked example",
        blocks: [
          {
            kind: "ul",
            items: [
              "Net monthly income: ₹1,00,000",
              "Lender’s FOIR cap: 50%, so total EMIs can be ₹50,000",
              "Existing car loan EMI: ₹10,000, so room for a new EMI is ₹40,000",
              "Home loan at 8.5% for 20 years: EMI per lakh ≈ ₹868",
              "Eligible loan ≈ 40,000 ÷ 868 × 1,00,000 ≈ ₹46 lakh",
            ],
          },
          {
            kind: "callout",
            tone: "violet",
            title: "Closing the car loan first",
            text: "Clearing that ₹10,000 car EMI before applying raises the eligible home loan by about ₹11.5 lakh in this example.",
          },
        ],
      },
      {
        id: "levers",
        title: "What changes your limit",
        blocks: [
          {
            kind: "ul",
            items: [
              "Longer tenure lowers EMI per lakh and raises eligibility, at the cost of much more interest.",
              "A co-applicant’s income is added, along with their EMIs.",
              "Credit card outstanding is often counted as 5% of the balance per month, even if you pay in full.",
              "A CIBIL score of 750+ can get a higher FOIR cap and a lower rate.",
            ],
          },
        ],
      },
      {
        id: "safe",
        title: "Eligible vs comfortable",
        blocks: [
          {
            kind: "p",
            text: "The bank’s limit is the most it will lend, not what you can comfortably repay. Many planners suggest keeping all EMIs within 30–40% of take-home pay so you can still fund your emergency fund, insurance and investments.",
          },
        ],
      },
    ],
    finkoinTip:
      "Enter your income, existing EMIs and the loan rate to see your eligible amount and the EMI share of your pay.",
    finkoinTipHref: "/calculators/loan-eligibility",
    tools: [
      {
        href: "/calculators/loan-eligibility",
        title: "Loan eligibility calculator",
        desc: "How much you can borrow",
      },
      {
        href: "/calculators/home",
        title: "Home loan calculator",
        desc: "EMI and affordability",
      },
      {
        href: "/calculators/down-payment",
        title: "Down payment calculator",
        desc: "Save for the down payment",
      },
    ],
    related: [
      {
        id: "how-your-cibil-credit-score-is-calculated",
        title: "How your CIBIL score is calculated",
      },
      {
        id: "fixed-vs-floating-home-loan",
        title: "Fixed vs floating home loan",
      },
      {
        id: "flat-vs-reducing-interest-rate",
        title: "Flat vs reducing interest rate",
      },
    ],
  },

  "debt-payoff-avalanche-vs-snowball": {
    seoTitle: "Debt Avalanche vs Snowball: Which Clears Debt Faster? | Finkoin",
    seoDescription:
      "Avalanche (highest rate first) vs snowball (smallest balance first) on a real Indian debt mix, the rupee difference, and how to choose.",
    updatedAt: UPDATED,
    tags: [
      "Debt payoff",
      "Avalanche",
      "Snowball",
      "Credit card",
      "Personal loan",
    ],
    toc: [
      { id: "methods", label: "The two methods" },
      { id: "example", label: "Same debts, both methods" },
      { id: "choose", label: "Which one to pick" },
      { id: "speed", label: "Ways to speed it up" },
    ],
    intro: [
      "When you have a credit card balance, a consumer loan and a personal loan, the question is not just how much to pay but where to put every extra rupee. Two methods answer that.",
    ],
    sections: [
      {
        id: "methods",
        title: "The two methods",
        blocks: [
          {
            kind: "ul",
            items: [
              "Both: pay the minimum on every debt, every month, so nothing goes overdue.",
              "Avalanche: put all extra money on the debt with the highest interest rate.",
              "Snowball: put all extra money on the debt with the smallest balance, to close accounts quickly.",
            ],
          },
        ],
      },
      {
        id: "example",
        title: "Same debts, both methods",
        blocks: [
          {
            kind: "p",
            text: "Credit card ₹1.5 lakh at 42% a year, consumer loan ₹40,000 at 16%, personal loan ₹3 lakh at 14%. Total budget ₹30,000 a month.",
          },
          {
            kind: "table",
            headers: ["Method", "Paid first", "Debt-free in", "Interest paid"],
            rows: [
              ["Avalanche", "Credit card (42%)", "20 months", "≈ ₹84,000"],
              [
                "Snowball",
                "Consumer loan (smallest)",
                "20 months",
                "≈ ₹89,500",
              ],
            ],
          },
          {
            kind: "p",
            text: "Avalanche saves about ₹5,500 here. The gap grows when the high-rate debt is also large, or when the budget is tight and payoff takes years.",
          },
        ],
      },
      {
        id: "choose",
        title: "Which one to pick",
        blocks: [
          {
            kind: "p",
            text: "Avalanche is always cheaper on paper. Snowball wins if closing an account quickly keeps you motivated and stops you from giving up. The best method is the one you follow every month until the end.",
          },
          {
            kind: "callout",
            tone: "amber",
            title: "Credit cards first, almost always",
            text: "Card interest of 36–45% a year is so much higher than other debt that clearing it first usually beats any other move, including investing.",
          },
        ],
      },
      {
        id: "speed",
        title: "Ways to speed it up",
        blocks: [
          {
            kind: "ul",
            items: [
              "Move card balances to a cheaper personal loan or balance transfer, then close the loop by not adding new spends.",
              "Put bonuses and tax refunds straight into the target debt.",
              "Keep a small emergency fund so a surprise bill does not go back on the card.",
              "Pause new SIP increases until high-interest debt is cleared; do not stop insurance premiums.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "List your loans and cards and see the payoff order, months and interest for both methods.",
    finkoinTipHref: "/calculators/debt-payoff",
    tools: [
      {
        href: "/calculators/debt-payoff",
        title: "Debt payoff calculator",
        desc: "Avalanche vs snowball",
      },
      {
        href: "/calculators/credit-card",
        title: "Credit card interest calculator",
        desc: "Cost of the minimum due",
      },
      {
        href: "/calculators/balance-transfer",
        title: "Balance transfer calculator",
        desc: "Savings from switching lenders",
      },
    ],
    related: [
      {
        id: "credit-card-minimum-trap",
        title: "The credit card minimum-due trap",
      },
      {
        id: "flat-vs-reducing-interest-rate",
        title: "Flat vs reducing interest rate",
      },
      {
        id: "how-your-cibil-credit-score-is-calculated",
        title: "How your CIBIL score is calculated",
      },
    ],
  },

  "fd-rd-interest-tax-tds-15g-15h": {
    seoTitle: "FD & RD Interest Tax: TDS, 15G/15H, Real Return | Finkoin",
    seoDescription:
      "FD and RD interest is taxed at your slab. TDS limits (₹50,000, ₹1 lakh for seniors), Form 15G/15H, and your post-tax FD return.",
    updatedAt: UPDATED,
    tags: ["FD", "RD", "TDS", "Form 15G", "Form 15H", "Tax"],
    toc: [
      { id: "taxed", label: "How FD interest is taxed" },
      { id: "tds", label: "TDS limits" },
      { id: "forms", label: "Form 15G and 15H" },
      { id: "real", label: "Your post-tax return" },
      { id: "tips", label: "Practical tips" },
    ],
    intro: [
      "Fixed and recurring deposits feel tax-simple, but many people under-report FD interest because the bank did not cut TDS. The rule is simple: all interest is taxable, TDS or not.",
    ],
    sections: [
      {
        id: "taxed",
        title: "How FD interest is taxed",
        blocks: [
          {
            kind: "p",
            text: "Interest from bank FDs and RDs is added to your income under ‘income from other sources’ and taxed at your slab rate, in the year it accrues, even on a cumulative FD where you receive it only at maturity.",
          },
        ],
      },
      {
        id: "tds",
        title: "TDS limits",
        blocks: [
          {
            kind: "table",
            headers: [
              "Depositor",
              "TDS applies when interest from one bank in a year exceeds",
              "Rate",
            ],
            rows: [
              ["Below 60", "₹50,000", "10% (20% without PAN)"],
              ["Senior citizen (60+)", "₹1,00,000", "10% (20% without PAN)"],
            ],
          },
          {
            kind: "callout",
            tone: "amber",
            title: "TDS is not the final tax",
            text: "If you are in the 20% or 30% slab, TDS at 10% leaves more tax to pay. Pay the balance as advance tax or self-assessment tax to avoid interest under 234B and 234C.",
          },
        ],
      },
      {
        id: "forms",
        title: "Form 15G and 15H",
        blocks: [
          {
            kind: "ul",
            items: [
              "Form 15G (below 60) and 15H (60+) ask the bank not to deduct TDS.",
              "You can submit 15G only if the tax on your total income for the year is nil and your interest is within the basic exemption limit.",
              "Seniors can submit 15H if their total tax for the year is nil after rebate.",
              "Submit a fresh form to each bank at the start of every financial year. A false declaration is an offence.",
            ],
          },
        ],
      },
      {
        id: "real",
        title: "Your post-tax return",
        blocks: [
          {
            kind: "table",
            headers: ["FD rate", "10% slab", "20% slab", "30% slab"],
            rows: [
              ["7.0%", "6.3%", "5.6%", "4.9%"],
              ["7.5%", "6.75%", "6.0%", "5.25%"],
            ],
          },
          {
            kind: "p",
            text: "Before cess. With inflation around 4–5%, a 30% slab taxpayer earns very little real return on an FD. FDs are still right for safety, short goals and emergency money; just do not expect them to build long-term wealth.",
          },
        ],
      },
      {
        id: "tips",
        title: "Practical tips",
        blocks: [
          {
            kind: "ul",
            items: [
              "Check AIS each year: it lists FD interest from every bank even when no TDS was cut.",
              "Splitting deposits across banks avoids TDS but not tax.",
              "Seniors can claim up to ₹50,000 of deposit interest as a deduction under 80TTB in the old regime.",
              "For an RD, the same rules apply to the interest earned each year.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "See your FD maturity, TDS and post-tax amount for your slab in one place.",
    finkoinTipHref: "/calculators/fd",
    tools: [
      {
        href: "/calculators/fd",
        title: "FD calculator",
        desc: "Maturity with TDS and tax",
      },
      {
        href: "/calculators/rd",
        title: "RD calculator",
        desc: "Bank RD maturity",
      },
      {
        href: "/calculators/advance-tax",
        title: "Advance tax calculator",
        desc: "Instalments and due dates",
      },
    ],
    related: [
      {
        id: "liquid-and-overnight-mutual-funds",
        title: "Liquid and overnight mutual funds",
      },
      {
        id: "understanding-inflation-and-your-real-returns",
        title: "Inflation and your real returns",
      },
      { id: "tax-planning-calendar-india-fy", title: "Tax planning calendar" },
    ],
  },

  "how-to-calculate-net-worth": {
    seoTitle: "How to Calculate Your Net Worth in India | Finkoin",
    seoDescription:
      "Net worth = assets − liabilities. What to count (PF, PPF, gold, property), what to leave out, a worked example and how to track it monthly.",
    updatedAt: UPDATED,
    tags: ["Net worth", "Assets", "Liabilities", "Tracking"],
    toc: [
      { id: "formula", label: "The formula" },
      { id: "assets", label: "What counts as an asset" },
      { id: "liabilities", label: "What counts as a liability" },
      { id: "example", label: "Worked example" },
      { id: "track", label: "Track the trend" },
    ],
    intro: [
      "Income tells you how much you earn. Net worth tells you how much of it you have kept. It is the single best number for checking whether your finances are moving in the right direction.",
    ],
    sections: [
      {
        id: "formula",
        title: "The formula",
        blocks: [
          {
            kind: "callout",
            tone: "violet",
            title: "Net worth",
            text: "Everything you own (at today’s value) − everything you owe (outstanding principal).",
          },
        ],
      },
      {
        id: "assets",
        title: "What counts as an asset",
        blocks: [
          {
            kind: "ul",
            items: [
              "Bank balances, FDs, RDs and liquid funds.",
              "Mutual funds and shares at current market value.",
              "EPF, PPF, NPS and VPF balances.",
              "Gold and sovereign gold bonds at today’s price.",
              "Property at a realistic resale value, not the builder’s latest price list.",
              "Surrender value of traditional insurance policies (not the sum assured).",
            ],
          },
          {
            kind: "p",
            text: "Leave out your car and gadgets, or count them at a heavily depreciated value. They lose value every year and you will not sell them to fund a goal. Term insurance has no asset value.",
          },
        ],
      },
      {
        id: "liabilities",
        title: "What counts as a liability",
        blocks: [
          {
            kind: "ul",
            items: [
              "Outstanding principal on home, car, personal, education and gold loans.",
              "Credit card balance, including unbilled EMIs.",
              "Money borrowed from family or friends that you intend to repay.",
            ],
          },
        ],
      },
      {
        id: "example",
        title: "Worked example",
        blocks: [
          {
            kind: "table",
            headers: ["Assets", "Value", "Liabilities", "Owed"],
            rows: [
              ["Savings + FD", "₹4,00,000", "Home loan", "₹38,00,000"],
              ["Mutual funds", "₹9,50,000", "Car loan", "₹3,20,000"],
              ["EPF + PPF", "₹12,00,000", "Credit card", "₹45,000"],
              ["Flat (resale)", "₹65,00,000", "", ""],
              ["Gold", "₹3,00,000", "", ""],
              ["Total", "₹93,50,000", "Total", "₹41,65,000"],
            ],
          },
          {
            kind: "p",
            text: "Net worth = ₹93.5 lakh − ₹41.65 lakh ≈ ₹51.9 lakh. Excluding the house you live in, the ‘liquid’ net worth that can fund goals is about ₹28.5 lakh minus the non-home loans: roughly ₹24.9 lakh.",
          },
        ],
      },
      {
        id: "track",
        title: "Track the trend",
        blocks: [
          {
            kind: "p",
            text: "Update it once a month or once a quarter on the same date. A rising line means you are saving and investing more than you borrow and spend. Market dips will cause wobbles; look at the 12-month direction, not one month.",
          },
        ],
      },
    ],
    finkoinTip:
      "Add your assets and loans on your Finkoin profile to see your net worth with a tap-to-expand breakup.",
    finkoinTipHref: "/profile",
    tools: [
      {
        href: "/calculators/net-worth",
        title: "Net worth calculator",
        desc: "What you own minus what you owe",
      },
      {
        href: "/analyse",
        title: "Financial health check",
        desc: "Score, gaps and a fix plan",
      },
      {
        href: "/calculators/budget",
        title: "Budget (50/30/20) calculator",
        desc: "Split your take-home pay",
      },
    ],
    related: [
      { id: "what-is-asset-allocation", title: "What is asset allocation" },
      {
        id: "what-is-the-50-30-20-budgeting-rule",
        title: "The 50/30/20 budgeting rule",
      },
      {
        id: "emergency-fund-how-much-where-to-keep-it",
        title: "Emergency fund — how much and where",
      },
    ],
  },
};

export const LEARN_FAQS_OCT_2026: Record<string, LearnFaq[]> = {
  "epf-pf-explained-contribution-interest-withdrawal": [
    {
      q: "How much of my salary goes to EPF?",
      a: "You contribute 12% of basic plus DA. Your employer also contributes 12%, of which up to ₹1,250 a month goes to the pension scheme (EPS) and the rest to your EPF account.",
    },
    {
      q: "What is the current EPF interest rate?",
      a: "EPFO declared 8.25% for FY 2024-25. The rate is reviewed every year, so check the latest notification.",
    },
    {
      q: "Is EPF interest taxable?",
      a: "Only partly. If your own contributions cross ₹2.5 lakh in a year (₹5 lakh if the employer contributes nothing), interest on the excess is taxable. Interest on contributions within the limit is tax-free.",
    },
    {
      q: "Is EPF withdrawal taxable?",
      a: "It is tax-free after five years of continuous service, including transferred service from earlier employers. Before five years it is taxable, with TDS if the amount is above ₹50,000.",
    },
  ],
  "gratuity-calculation-formula-eligibility-tax": [
    {
      q: "How is gratuity calculated?",
      a: "For employers covered by the Payment of Gratuity Act: 15 × last drawn basic plus DA × years of service ÷ 26. Service above six months in the last year rounds up.",
    },
    {
      q: "Do I get gratuity if I leave before five years?",
      a: "Usually not, except on death or disablement. Fixed-term employees qualify after one year under the Code on Social Security.",
    },
    {
      q: "How much gratuity is tax-free?",
      a: "For private-sector employees, the lowest of the gratuity received, the formula amount and ₹20 lakh is exempt. The ₹20 lakh limit applies across your whole career.",
    },
  ],
  "step-up-sip-and-cost-of-delay": [
    {
      q: "What is a step-up SIP?",
      a: "A SIP whose monthly amount rises by a fixed percentage or amount every year, usually in line with your salary hike.",
    },
    {
      q: "How much should I step up my SIP every year?",
      a: "5–10% a year is common. Matching your expected salary growth keeps the SIP the same share of your income.",
    },
    {
      q: "How much does delaying a SIP cost?",
      a: "At 12% a year, a ₹10,000 SIP over 25 years grows to about ₹1.9 crore. Starting five years later gives about ₹1 crore by the same date.",
    },
  ],
  "xirr-vs-cagr-vs-absolute-return": [
    {
      q: "What is the difference between XIRR and CAGR?",
      a: "CAGR measures growth of a single amount between two dates. XIRR handles many investments and withdrawals on different dates, so it is the right measure for SIPs.",
    },
    {
      q: "Why is my SIP XIRR higher than its absolute return looks?",
      a: "Absolute return ignores time. In a SIP, later instalments were invested only briefly, so the yearly return (XIRR) can be higher than the total gain suggests.",
    },
    {
      q: "What is a good XIRR for an equity SIP?",
      a: "Over long periods, Indian equity index funds have historically delivered low double digits, but returns vary a lot by period. Compare your XIRR with an index fund over the same dates.",
    },
  ],
  "direct-vs-regular-mutual-funds-expense-ratio": [
    {
      q: "What is the difference between direct and regular mutual funds?",
      a: "Both hold the same portfolio. Regular plans pay a distributor commission through a higher expense ratio; direct plans do not, so they return more.",
    },
    {
      q: "How much more does a regular plan cost?",
      a: "Typically 0.5–1.5% a year more for equity funds. A 1% gap on a ₹10,000 SIP over 20 years can cost around ₹12 lakh at 12% returns.",
    },
    {
      q: "Should I switch from regular to direct?",
      a: "Switching is a redemption and may attract capital gains tax and exit load. Start new SIPs in direct plans and move old units gradually.",
    },
  ],
  "flat-vs-reducing-interest-rate": [
    {
      q: "What is a flat interest rate?",
      a: "Interest charged on the full original loan for the whole tenure, even as you repay. It makes the loan look cheaper than it is.",
    },
    {
      q: "How do I convert a flat rate to a reducing rate?",
      a: "Work out the EMI under the flat rate, then find the reducing-balance rate that gives the same EMI. For 1–5 year loans the reducing rate is roughly 1.7–1.9 times the flat rate.",
    },
    {
      q: "Is 10% flat better than 14% reducing?",
      a: "No. A 10% flat rate over 3 years is about 17.9% on a reducing balance, so the 14% reducing loan is cheaper.",
    },
  ],
  "loan-eligibility-foir-explained": [
    {
      q: "What is FOIR?",
      a: "Fixed obligations to income ratio: all your EMIs, including the new loan, divided by your monthly net income. Lenders usually cap it at 40–60%.",
    },
    {
      q: "How can I increase my home loan eligibility?",
      a: "Close small loans first, add an earning co-applicant, choose a longer tenure, keep card balances low and maintain a CIBIL score above 750.",
    },
    {
      q: "Should I borrow the full eligible amount?",
      a: "Not necessarily. Keeping total EMIs within 30–40% of take-home pay leaves room for savings, insurance and emergencies.",
    },
  ],
  "debt-payoff-avalanche-vs-snowball": [
    {
      q: "What is the debt avalanche method?",
      a: "Pay minimums on every debt and put all extra money on the one with the highest interest rate. It costs the least interest.",
    },
    {
      q: "What is the debt snowball method?",
      a: "Pay minimums on every debt and put all extra money on the smallest balance first. It closes accounts quickly, which helps motivation.",
    },
    {
      q: "Should I invest or pay off debt first?",
      a: "Clear high-interest debt such as credit cards and personal loans first; few investments reliably beat 14–42% interest. Keep insurance and a small emergency fund in place.",
    },
  ],
  "fd-rd-interest-tax-tds-15g-15h": [
    {
      q: "When does the bank deduct TDS on FD interest?",
      a: "When interest from that bank in a financial year exceeds ₹50,000, or ₹1 lakh for senior citizens. TDS is 10% with PAN and 20% without.",
    },
    {
      q: "Is FD interest taxable if no TDS was deducted?",
      a: "Yes. All FD and RD interest is taxable at your slab rate and must be shown in your ITR. It also appears in your AIS.",
    },
    {
      q: "Who can submit Form 15G or 15H?",
      a: "Form 15G is for people below 60 whose total tax for the year is nil. Form 15H is for senior citizens whose total tax is nil.",
    },
  ],
  "how-to-calculate-net-worth": [
    {
      q: "How do I calculate my net worth?",
      a: "Add up everything you own at today’s value (bank, investments, PF, PPF, gold, property) and subtract everything you owe (loan principal, card dues).",
    },
    {
      q: "Should I include my house in net worth?",
      a: "Yes, at a realistic resale value. Also look at net worth without the home you live in, since you are unlikely to sell it to fund goals.",
    },
    {
      q: "How often should I track net worth?",
      a: "Monthly or quarterly, on the same date. Focus on the 12-month direction rather than short-term market swings.",
    },
  ],
};
