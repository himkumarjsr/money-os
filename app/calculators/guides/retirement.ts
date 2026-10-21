/**
 * Guides for the retirement and insurance calculators. Every number is
 * computed from the same engines the calculators use, with the calculators'
 * own default assumptions, so the guide never disagrees with the tool.
 * Illustrative only, not investment, tax or insurance advice.
 */

import {
  annuityIncome,
  buyTermInvestRest,
  corpusForPension,
  gratuity,
  healthCover,
  leaveEncashment,
  npsPlan,
  policyIrr,
  retirementPlan,
  termCover,
  type CityTier,
} from "@/lib/advisorCalculators";
import { computeFireNumbers } from "@/lib/fireCalculator";

import { type CalcGuide, inr, inrShort } from "./shared";

const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

/** "12 years 4 months" from the FIRE engine's month count. */
function yearsMonths(months: number | null): string {
  if (months === null) return "over 50 years";
  if (months <= 0) return "already there";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const ys = y > 0 ? `${y} year${y === 1 ? "" : "s"}` : "";
  const ms = m > 0 ? `${m} month${m === 1 ? "" : "s"}` : "";
  return [ys, ms].filter(Boolean).join(" ");
}

// ─── Retirement corpus ──────────────────────────────────────────────────────

function retirementGuide(): CalcGuide {
  const base = {
    age: 30,
    retireAge: 60,
    lifeExpectancy: 85,
    monthlyExpense: 50_000,
    inflationPct: 6,
    preReturnPct: 11,
    postReturnPct: 7,
    existingSavings: 5_00_000,
  };
  const r = retirementPlan(base);
  const multiple = r.corpus / (r.monthlyAtRetirement * 12);
  const expenses = [30_000, 50_000, 75_000, 1_00_000];
  return {
    intro:
      "A retirement calculator estimates the corpus you need on the day you retire and the monthly SIP that builds it. Enter your age, retirement age, monthly expenses today, inflation, expected returns and what you have already saved.",
    howItWorks: [
      "First, today's monthly expenses are grown at the inflation rate until retirement. That is what the same lifestyle will cost then.",
      "Next, the calculator finds the corpus that can pay those expenses every year until the age you plan for. The withdrawals rise with inflation each year, while the remaining corpus earns the post-retirement return.",
      "Finally, it grows your current savings to retirement and works out the monthly SIP, or a SIP rising 10% a year, that fills the gap.",
    ],
    formula: {
      expression:
        "Corpus = E × [1 − ((1 + i) ÷ (1 + p))^N] ÷ (p − i) × (1 + p)",
      legend: [
        "E = yearly expenses in the first year of retirement",
        "i = inflation (as a decimal)",
        "p = return after retirement (as a decimal)",
        "N = years in retirement; withdrawals are taken at the start of each year",
      ],
    },
    example: {
      title: `Age ${base.age}, retiring at ${base.retireAge}, ${inr(base.monthlyExpense)} a month today`,
      steps: [
        `At ${base.inflationPct}% inflation, ${inr(base.monthlyExpense)} today becomes ${inr(r.monthlyAtRetirement)} a month in ${r.yearsToGo} years.`,
        `To fund ${r.yearsInRetirement} years of rising expenses at a ${base.postReturnPct}% return, you need ${inrShort(r.corpus)}. That is about ${multiple.toFixed(0)} times the first year's expenses.`,
        `Existing savings of ${inrShort(base.existingSavings)} grow to ${inrShort(r.existingFV)} at ${base.preReturnPct}%, leaving a gap of ${inrShort(r.gap)}.`,
        `A flat SIP of ${inr(r.sip)} a month fills it, or start at ${inr(r.stepUpStart)} and raise it 10% every year.`,
      ],
    },
    table: {
      caption: `Retiring at ${base.retireAge} from age ${base.age}, planning to ${base.lifeExpectancy}: ${base.inflationPct}% inflation, ${base.preReturnPct}% before and ${base.postReturnPct}% after retirement, no savings yet`,
      head: [
        "Monthly expenses today",
        "Monthly expenses at retirement",
        "Corpus needed",
        "Monthly SIP needed",
      ],
      rows: expenses.map((e) => {
        const x = retirementPlan({
          ...base,
          monthlyExpense: e,
          existingSavings: 0,
        });
        return [
          inr(e),
          inr(x.monthlyAtRetirement),
          inrShort(x.corpus),
          inr(x.sip),
        ];
      }),
    },
    tips: [
      "Leave out EMIs that end before you retire. Include rent if you will not own a home by then.",
      "Keep the post-retirement return modest. Most of the corpus should sit in safer assets once you stop earning.",
      "Plan to at least age 85. Running out of money at 80 is a bigger risk than leaving some behind.",
      "Re-run the numbers every year or two, and after any big change in income or expenses.",
    ],
  };
}

// ─── FIRE number ────────────────────────────────────────────────────────────

function fireGuide(): CalcGuide {
  const input = {
    monthlyExpensesExEmi: 70_000,
    monthlyEmi: 30_000,
    totalDebtOutstanding: 25_00_000,
    currentCorpus: 80_00_000,
    monthlySip: 40_000,
    expectedReturnPct: 12,
  };
  const f = computeFireNumbers(input);
  const safer = computeFireNumbers({ ...input, withdrawalRatePct: 3.5 });
  const tableCorpus = 50_00_000;
  const tableSip = 50_000;
  const expenses = [40_000, 60_000, 80_000, 1_00_000, 1_50_000];
  return {
    intro:
      "A FIRE (Financial Independence, Retire Early) calculator estimates the investments you need to stop depending on a salary, and how long it will take to get there. Enter your monthly expenses without EMIs, your EMIs and loans, your current corpus, your monthly SIP and an expected return.",
    howItWorks: [
      "Your FIRE number is 25 times your yearly lifestyle expenses. That is the corpus from which a 4% yearly withdrawal covers one year of spending.",
      "EMIs are left out of the lifestyle figure because loans end. Instead, the calculator adds the outstanding loan amount to the target once, so you can clear it on the day you stop working.",
      "It then projects your current corpus plus monthly SIP at the expected return, compounded monthly, and finds when the total reaches the target.",
    ],
    formula: {
      expression:
        "FIRE target = yearly expenses (without EMIs) × 25 + loans outstanding",
      legend: [
        "25 = 1 ÷ 4%, the yearly withdrawal rate",
        "Yearly expenses = monthly lifestyle spend × 12",
        "Loans outstanding = the amount you would pay off before retiring early",
      ],
    },
    example: {
      title: `${inr(input.monthlyExpensesExEmi)} a month to live on, ${inr(input.monthlyEmi)} in EMIs, ${inrShort(input.totalDebtOutstanding)} of loans`,
      steps: [
        `Lifestyle FIRE corpus = ${inr(input.monthlyExpensesExEmi)} × 12 × 25 = ${inrShort(f.lifestyleFireCorpus)}.`,
        `Counting EMIs as a lifelong expense would give ${inrShort(f.naiveFireCorpus)}. Adding the ${inrShort(input.totalDebtOutstanding)} loan once gives a lower target of ${inrShort(f.totalFireTarget)}.`,
        `With ${inrShort(input.currentCorpus)} invested you are ${f.progressPct.toFixed(0)}% there, and the gap is ${inrShort(f.gap)}.`,
        `Adding ${inr(input.monthlySip)} a month at ${input.expectedReturnPct}% closes the gap in about ${yearsMonths(f.monthsToTarget)}.`,
      ],
    },
    table: {
      caption: `FIRE number at a 4% withdrawal rate, and time to reach it from ${inrShort(tableCorpus)} invested plus ${inr(tableSip)} a month at 12%, no loans`,
      head: [
        "Monthly expenses",
        "FIRE number",
        "Safe monthly withdrawal",
        "Time to reach",
      ],
      rows: expenses.map((e) => {
        const x = computeFireNumbers({
          monthlyExpensesExEmi: e,
          monthlyEmi: 0,
          totalDebtOutstanding: 0,
          currentCorpus: tableCorpus,
          monthlySip: tableSip,
          expectedReturnPct: 12,
        });
        return [
          inr(e),
          inrShort(x.totalFireTarget),
          inr(x.safeMonthlyWithdrawal),
          yearsMonths(x.monthsToTarget),
        ];
      }),
    },
    tips: [
      `For a retirement that may last 40 years or more, test a 3.5% withdrawal rate. In the example, that raises the lifestyle corpus to ${inrShort(safer.lifestyleFireCorpus)}.`,
      "Count only investable wealth in the corpus. Your own home and emergency fund do not pay the bills.",
      "Budget separately for health insurance after you leave a job, since employer cover ends.",
      "Clearing high-interest loans early lowers the target and shortens the timeline at the same time.",
    ],
  };
}

// ─── NPS ────────────────────────────────────────────────────────────────────

function npsGuide(): CalcGuide {
  const base = {
    age: 30,
    monthly: 5_000,
    employerMonthly: 0,
    stepUpPct: 5,
    returnPct: 10,
    annuityPct: 40,
    annuityRatePct: 6.5,
    slabPct: 30,
  };
  const n = npsPlan(base);
  const amounts = [2_000, 5_000, 10_000, 20_000];
  return {
    intro:
      "An NPS calculator estimates your National Pension System corpus at 60, the lump sum you can withdraw and the monthly pension. Enter your age, monthly contribution, any employer contribution, the yearly increase, the expected return and the annuity rate.",
    howItWorks: [
      "Your contribution and your employer's are added and invested every month until 60. The total rises by the yearly increase you choose and compounds at the expected return.",
      "At 60, the calculator sets aside at least 40% of the corpus to buy an annuity and treats the rest as a lump sum. The pension is the annuity amount multiplied by the annuity rate, divided by 12.",
      "Withdrawal rules and annuity rates are set by the regulator and insurers and can change. Treat the 40% minimum and the annuity rate here as assumptions and check the current rules before you plan.",
    ],
    formula: {
      expression:
        "Monthly pension = corpus at 60 × annuity share × annuity rate ÷ 12",
      legend: [
        "Corpus at 60 = monthly contributions with a yearly step-up, compounded monthly",
        "Annuity share = at least 40% in this calculator",
        "Annuity rate = yearly rate quoted for the annuity (as a decimal)",
      ],
    },
    example: {
      title: `Age ${base.age}, ${inr(base.monthly)} a month rising ${base.stepUpPct}% a year, ${base.returnPct}% return`,
      steps: [
        `Over ${n.years} years you contribute ${inrShort(n.invested)}, which grows to ${inrShort(n.corpus)} at 60.`,
        `${100 - base.annuityPct}% can be taken as a lump sum of ${inrShort(n.lumpSum)}.`,
        `The other ${base.annuityPct}%, ${inrShort(n.annuityCorpus)}, buys an annuity at an assumed ${base.annuityRatePct}%, paying ${inr(n.monthlyPension)} a month.`,
        `In the old regime and the ${base.slabPct}% slab, the extra 80CCD(1B) deduction saves about ${inr(n.taxSaved80CCD1B)} a year, including cess.`,
      ],
    },
    table: {
      caption: `NPS from age ${base.age} to 60: ${base.stepUpPct}% yearly increase, ${base.returnPct}% return, ${base.annuityPct}% annuity at ${base.annuityRatePct}%`,
      head: [
        "Starting monthly contribution",
        "Corpus at 60",
        "Lump sum",
        "Monthly pension",
      ],
      rows: amounts.map((a) => {
        const x = npsPlan({ ...base, monthly: a });
        return [
          inr(a),
          inrShort(x.corpus),
          inrShort(x.lumpSum),
          inr(x.monthlyPension),
        ];
      }),
    },
    tips: [
      "If your employer offers NPS under 80CCD(2), that deduction works in the new regime too, so ask HR about it.",
      "The 80CCD(1B) benefit is capped at ₹50,000 a year. Contributions above that still grow but save no extra tax.",
      "The pension is taxed at your slab rate, so compare the post-tax income with other options.",
      "Choose a higher equity share while you are young and move to safer funds as 60 gets closer.",
    ],
  };
}

// ─── Annuity / pension ──────────────────────────────────────────────────────

function annuityGuide(): CalcGuide {
  const corpus = 50_00_000;
  const lifeRate = 7.2;
  const ropRate = 6.2;
  const slab = 20;
  const lifePension = annuityIncome(corpus, lifeRate);
  const ropPension = annuityIncome(corpus, ropRate);
  const afterTax = lifePension * (1 - (slab / 100) * 1.04);
  const target = 40_000;
  const need = corpusForPension(target, lifeRate);
  const corpora = [25_00_000, 50_00_000, 1_00_00_000, 2_00_00_000];
  return {
    intro:
      "An annuity calculator shows the monthly pension a corpus can buy, or the corpus you need for a target pension. Choose the annuity type, enter the corpus or the pension you want, and set the annuity rate.",
    howItWorks: [
      "An annuity turns a one-time payment into a regular income. The calculator multiplies the corpus by the yearly annuity rate and divides by 12 to get the monthly pension.",
      `A life annuity pays the most but returns nothing to your family. A return of purchase price annuity pays less, because your nominee gets the corpus back. The calculator starts at ${lifeRate}% and ${ropRate}% for these, as indicative rates only.`,
      "Real quotes depend on your age, the option you choose and the insurer, and they change over time. A plain life annuity pays the same amount for life, so its buying power falls with inflation.",
    ],
    formula: {
      expression:
        "Monthly pension = corpus × r ÷ 12;  corpus needed = monthly pension × 12 ÷ r",
      legend: [
        "r = yearly annuity rate (as a decimal)",
        "The pension is before tax; annuity income is taxed at your slab",
      ],
    },
    example: {
      title: `${inrShort(corpus)} corpus at an assumed ${lifeRate}%`,
      steps: [
        `Life annuity: ${inrShort(corpus)} × ${lifeRate}% ÷ 12 = ${inr(lifePension)} a month.`,
        `Return of purchase price at ${ropRate}%: ${inr(ropPension)} a month, with the corpus going to your nominee.`,
        `In the ${slab}% slab, the life annuity leaves about ${inr(afterTax)} a month after tax and cess.`,
        `For a ${inr(target)} monthly pension at ${lifeRate}%, you would need ${inrShort(need)}.`,
      ],
    },
    table: {
      caption: "Monthly pension before tax at indicative annuity rates",
      head: [
        "Corpus",
        `Return of purchase price (${ropRate}%)`,
        `Life annuity (${lifeRate}%)`,
      ],
      rows: corpora.map((c) => [
        inrShort(c),
        inr(annuityIncome(c, ropRate)),
        inr(annuityIncome(c, lifeRate)),
      ]),
    },
    tips: [
      "Get quotes from more than one insurer for your exact age and option before you buy.",
      "Annuity rates are fixed when you buy, so the rate on the purchase date matters for life.",
      "Consider splitting the corpus and buying annuities a few years apart, rather than all at once.",
      "Keep part of your retirement money in investments that can grow, to offset inflation.",
    ],
  };
}

// ─── Gratuity ───────────────────────────────────────────────────────────────

function gratuityGuide(): CalcGuide {
  const salary = 60_000;
  const years = 8;
  const months = 7;
  const covered = gratuity({
    monthlyBasicDa: salary,
    years,
    months,
    covered: true,
  });
  const notCovered = gratuity({
    monthlyBasicDa: salary,
    years,
    months,
    covered: false,
  });
  const salaries = [30_000, 60_000, 1_00_000, 2_00_000];
  const spans = [5, 10, 20, 30];
  return {
    intro:
      "A gratuity calculator shows the gratuity you will receive from your employer and how much of it is tax-free. Enter your last drawn basic salary plus DA, your years and months of service, and whether your employer is covered by the Gratuity Act.",
    howItWorks: [
      "Employers covered by the Payment of Gratuity Act pay 15 days' wages for each year of service, counting a month as 26 working days. A final part-year of 6 months or more counts as a full year.",
      "Employers not covered by the Act may use 30 days a month and count only completed years, which gives a smaller amount.",
      "For private employees, the tax-free part is capped at ₹20 lakh and anything above it is taxed as salary. Government employees get gratuity fully tax-free.",
    ],
    formula: {
      expression:
        "Gratuity = 15 × last drawn (basic + DA) × years of service ÷ 26",
      legend: [
        "Covered employers: part-years of 6 months or more round up to a full year",
        "Not covered: 15 × salary × completed years ÷ 30, officially on the average salary of the last 10 months",
        "Tax-free for private employees: up to ₹20 lakh across your career",
      ],
    },
    example: {
      title: `Basic + DA ${inr(salary)}, ${years} years ${months} months of service`,
      steps: [
        `${months} extra months is 6 or more, so service counts as ${covered.serviceYears} years at a covered employer.`,
        `Gratuity = 15 × ${inr(salary)} × ${covered.serviceYears} ÷ 26 = ${inr(covered.amount)}.`,
        `At an employer not covered by the Act, only ${notCovered.serviceYears} completed years count: 15 × ${inr(salary)} × ${notCovered.serviceYears} ÷ 30 = ${inr(notCovered.amount)}.`,
        `Both amounts are under ₹20 lakh, so the whole gratuity is tax-free.`,
      ],
    },
    table: {
      caption:
        "Gratuity at an employer covered by the Act (taxable part above ₹20 lakh in brackets)",
      head: ["Basic + DA", ...spans.map((y) => `${y} years`)],
      rows: salaries.map((s) => [
        inr(s),
        ...spans.map((y) => {
          const g = gratuity({
            monthlyBasicDa: s,
            years: y,
            months: 0,
            covered: true,
          });
          return g.taxable > 0
            ? `${inrShort(g.amount)} (${inrShort(g.taxable)} taxable)`
            : inrShort(g.amount);
        }),
      ]),
    },
    tips: [
      "Gratuity is normally paid after 5 years of continuous service. The calculator treats 4 years 8 months as eligible, following court rulings on 240 days in the fifth year. Confirm with your employer.",
      "If you are close to the 6-month mark, a few more weeks of service can add a full year to the formula.",
      "Many offer letters show gratuity as about 4.81% of basic inside CTC. It is not take-home pay, and you get it only if you qualify.",
      "The ₹20 lakh exemption is a lifetime limit, not one per employer.",
    ],
  };
}

// ─── Leave encashment ───────────────────────────────────────────────────────

function leaveEncashmentGuide(): CalcGuide {
  const salary = 80_000;
  const days = 300;
  const service = 8;
  const daily = salary / 30;
  const l = leaveEncashment({
    monthlyBasicDa: salary,
    leaveDays: days,
    yearsOfService: service,
    atRetirement: true,
    government: false,
  });
  const earnedDays = Math.min(days, 30 * service);
  const dayCounts = [60, 120, 240, 300, 360];
  return {
    intro:
      "A leave encashment calculator shows the payout for unused leave and how much of it is tax-free. Enter your basic plus DA, the leave days to encash, your years of service, and whether you are leaving or still employed.",
    howItWorks: [
      "The payout is one day's salary, taken as basic plus DA divided by 30, multiplied by the leave days encashed. Your employer's policy decides how many days you can encash.",
      "Encashment while you are still in service is fully taxable. At retirement or when you leave a job, government employees are fully exempt.",
      "For private employees, the tax-free part is the lowest of four amounts: the payout, ₹25 lakh, 10 months' salary and the value of leave earned. Leave earned counts at most 30 days for each year of service.",
    ],
    formula: {
      expression: "Leave encashment = (basic + DA) ÷ 30 × leave days",
      legend: [
        "Tax-free for private employees on leaving = lowest of: the payout, ₹25 lakh, 10 × monthly basic + DA, and (basic + DA) ÷ 30 × leave earned",
        "Leave earned is capped at 30 days for each year of service",
      ],
    },
    example: {
      title: `Basic + DA ${inr(salary)}, ${days} days encashed after ${service} years, private employer`,
      steps: [
        `Daily salary = ${inr(salary)} ÷ 30 = ${inr(daily)}, so the payout is ${inr(daily)} × ${days} = ${inr(l.amount)}.`,
        `10 months' salary = ${inr(10 * salary)}, and the ₹25 lakh cap is far higher.`,
        `Leave earned is capped at 30 × ${service} = ${30 * service} days, so this test gives ${inr(daily)} × ${earnedDays} = ${inr(daily * earnedDays)}.`,
        `The lowest is ${inr(l.exempt)}, which is tax-free. The remaining ${inr(l.taxable)} is taxed at your slab.`,
      ],
    },
    table: {
      caption: `Encashment on leaving a private employer: basic + DA ${inr(salary)}, ${service} years of service`,
      head: ["Leave days", "Payout", "Tax-free", "Taxable"],
      rows: dayCounts.map((d) => {
        const x = leaveEncashment({
          monthlyBasicDa: salary,
          leaveDays: d,
          yearsOfService: service,
          atRetirement: true,
          government: false,
        });
        return [String(d), inr(x.amount), inr(x.exempt), inr(x.taxable)];
      }),
    },
    tips: [
      "Check your employer's leave policy for the maximum days you can carry forward and encash.",
      "Encashing leave every year while employed is fully taxable; saving it for when you leave can cut the tax.",
      "Ten months' salary equals 300 days of leave, so days beyond 300 are always taxable for private employees.",
    ],
  };
}

// ─── Term insurance cover ───────────────────────────────────────────────────

/** Mirrors the term cover calculator's fixed assumptions. */
function termFor(age: number) {
  const yearsToRetire = Math.max(1, 60 - age);
  return termCover({
    annualIncome: 15_00_000,
    selfSharePct: 25,
    yearsToRetire,
    growthPct: 6,
    discountPct: 8,
    loans: 30_00_000,
    goals: 25_00_000,
    savings: 8_00_000,
    existingCover: 0,
    monthlyFamilyExpense: 50_000,
    yearsFamilyNeeds: Math.max(10, yearsToRetire),
    inflationPct: 6,
  });
}

function termCoverGuide(): CalcGuide {
  const age = 32;
  const income = 15_00_000;
  const t = termFor(age);
  const ages = [25, 30, 35, 40, 45];
  return {
    intro:
      "A term insurance calculator estimates how much life cover your family would need if you died during your working years. Enter your age, income, the share you spend on yourself, family expenses, loans, future goals, savings and any existing cover.",
    howItWorks: [
      "The income replacement method, or human life value, adds up the income your family would lose until you turn 60. It leaves out your own share of spending, grows income at 6% a year and discounts it back to today at 8%.",
      "The family needs method funds your family's expenses, rising 6% a year, until you would have turned 60, or for at least 10 years. It adds loans and future goals and subtracts your savings.",
      "The calculator recommends the larger of the two, so neither the loss of income nor the family's needs is left short. It also shows the simple 15 times income rule for comparison.",
    ],
    example: {
      title: `Age ${age}, ${inrShort(income)} income, ${inrShort(30_00_000)} home loan, ${inrShort(25_00_000)} of goals`,
      steps: [
        `Your family relies on 75% of your income, ${inrShort(income * 0.75)} a year, for ${60 - age} more years. Its value today is ${inrShort(t.hlv)}.`,
        `Adding the loan and subtracting ${inrShort(8_00_000)} of savings gives ${inrShort(t.hlv + 30_00_000 - 8_00_000)} by income replacement.`,
        `The family needs method gives ${inrShort(t.needs)}: ${inr(50_000)} a month of expenses for ${60 - age} years, plus the loan and goals, minus savings.`,
        `Recommended cover = ${inrShort(t.recommended)}, against ${inrShort(t.ruleOfThumb)} by the 15 times rule.`,
      ],
    },
    table: {
      caption: `Cover needed by age: ${inrShort(income)} income, ${inr(50_000)} monthly family expenses, ${inrShort(30_00_000)} loans, ${inrShort(25_00_000)} goals, ${inrShort(8_00_000)} savings`,
      head: ["Age", "Income replacement", "Family needs", "Recommended cover"],
      rows: ages.map((a) => {
        const x = termFor(a);
        return [
          String(a),
          inrShort(x.hlv),
          inrShort(x.needs),
          inrShort(x.recommended),
        ];
      }),
    },
    tips: [
      "Buy pure term insurance for protection. Endowment plans and ULIPs give far less cover for the same premium.",
      "Choose a premium you can keep paying for decades; a lapsed policy gives no cover.",
      "Review the cover after marriage, a child or a new loan.",
      "Group cover from an employer usually ends when you leave the job, so do not rely on it alone.",
    ],
  };
}

// ─── Health insurance cover ─────────────────────────────────────────────────

function healthCoverGuide(): CalcGuide {
  const base = {
    city: "metro" as CityTier,
    adults: 2,
    children: 1,
    eldestAge: 35,
    includeParents: true,
    employerCover: 5_00_000,
    years: 10,
    medicalInflationPct: 12,
  };
  const h = healthCover(base);
  const scenarios: {
    label: string;
    city: CityTier;
    adults: number;
    children: number;
    eldestAge: number;
  }[] = [
    {
      label: "Metro, couple",
      city: "metro",
      adults: 2,
      children: 0,
      eldestAge: 30,
    },
    {
      label: "Metro, couple and 2 children",
      city: "metro",
      adults: 2,
      children: 2,
      eldestAge: 38,
    },
    {
      label: "Metro, couple and 1 child, eldest 48",
      city: "metro",
      adults: 2,
      children: 1,
      eldestAge: 48,
    },
    {
      label: "Tier 1 city, couple and 1 child",
      city: "tier1",
      adults: 2,
      children: 1,
      eldestAge: 35,
    },
    {
      label: "Smaller city, couple and 1 child",
      city: "tier2",
      adults: 2,
      children: 1,
      eldestAge: 35,
    },
  ];
  return {
    intro:
      "A health insurance cover calculator suggests a family floater size, a personal base policy and a super top-up for your family. Enter your city, the adults and children to cover, the eldest member's age, your employer's cover and whether to include parents.",
    howItWorks: [
      "The calculator starts from a base by city: ₹10 lakh in a metro, ₹7.5 lakh in a tier 1 city and ₹5 lakh elsewhere. It adds ₹2.5 lakh for each adult beyond two, ₹1 lakh per child and ₹5 lakh if the eldest is 45 or older. The total is rounded up to the next ₹2.5 lakh.",
      "Employer cover ends with the job, so only half of it is counted. Your personal base policy covers the rest, with a minimum of ₹5 lakh. A super top-up takes total cover to at least twice the floater.",
      "Parents get a separate suggestion, because adding them to your floater usually raises its premium. The calculator also grows a ₹5 lakh surgery cost at an assumed 12% medical inflation.",
    ],
    example: {
      title:
        "Metro family: 2 adults, 1 child, eldest 35, ₹5 lakh employer cover, parents included",
      steps: [
        `Base ₹10 lakh plus ₹1 lakh for the child = ₹11 lakh, rounded up to a ${inrShort(h.family)} family floater.`,
        `Half of the employer cover counts, so the personal base policy is ${inrShort(h.personalBase)}.`,
        `A super top-up of ${inrShort(h.superTopUp)} takes total cover to twice the floater. Parents get a separate ${inrShort(h.parents)} policy.`,
        `At 12% medical inflation, a ${inrShort(h.surgeryToday)} surgery today would cost about ${inrShort(h.futureSurgery)} in ${base.years} years.`,
      ],
    },
    table: {
      caption:
        "Suggested cover with ₹5 lakh of employer cover, parents not included",
      head: [
        "Family",
        "Family floater",
        "Personal base policy",
        "Super top-up",
      ],
      rows: scenarios.map((s) => {
        const x = healthCover({ ...base, ...s, includeParents: false });
        return [
          s.label,
          inrShort(x.family),
          inrShort(x.personalBase),
          inrShort(x.superTopUp),
        ];
      }),
    },
    tips: [
      "A super top-up pays only after the year's bills cross its deductible, so match the deductible to your base cover.",
      "Buy a personal policy while you are young and healthy; pre-existing conditions usually have a waiting period.",
      "Read the room rent limit and co-payment terms, since they can cut a claim more than the sum insured does.",
      "This is a rule of thumb, not an underwriting quote. Insurers set premiums by age and health.",
    ],
  };
}

// ─── Emergency fund ─────────────────────────────────────────────────────────

/**
 * Months of expenses by life stage, as used by the emergency fund calculator
 * (components/calculators/EmergencyFundCalculator.tsx). That calculator has
 * no shared engine, so its two-line maths is mirrored here.
 */
const EMERGENCY_MONTHS = [
  { label: "Single", months: 3 },
  { label: "Married, no children", months: 6 },
  { label: "Married with children", months: 9 },
  { label: "Pre-retirement, 50+", months: 12 },
] as const;

function emergencyGuide(): CalcGuide {
  const expenses = 60_000;
  const months = 6;
  const current = 2_00_000;
  const saving = 15_000;
  const target = expenses * months;
  const gap = Math.max(0, target - current);
  const monthsToFill = Math.ceil(gap / saving);
  const levels = [30_000, 60_000, 1_00_000];
  return {
    intro:
      "An emergency fund calculator shows how much cash to keep for job loss, medical bills or urgent travel, and how long building it takes. Enter your must-pay monthly expenses, your life stage, your current emergency savings and what you can add each month.",
    howItWorks: [
      "The target is your must-pay monthly expenses multiplied by a number of months that depends on your life stage. More dependants mean a longer cushion.",
      "The calculator uses 3 months if single, 6 if married, 9 with children and 12 if you are over 50.",
      "It subtracts what you have already saved and divides the gap by your monthly saving to show how many months it will take to close.",
    ],
    formula: {
      expression:
        "Target = monthly must-pay expenses × months for your life stage",
      legend: [
        "Months = 3 (single), 6 (married), 9 (with children), 12 (50+)",
        "Months to close the gap = (target − current fund) ÷ monthly saving",
      ],
    },
    example: {
      title: `Married couple with ${inr(expenses)} of must-pay expenses a month`,
      steps: [
        `Target = ${inr(expenses)} × ${months} months = ${inr(target)}.`,
        `With ${inr(current)} already saved, the gap is ${inr(gap)}.`,
        `Adding ${inr(saving)} a month closes it in ${monthsToFill} months.`,
      ],
    },
    table: {
      caption: "Emergency fund target by life stage",
      head: ["Life stage", ...levels.map((e) => `${inr(e)} a month`)],
      rows: EMERGENCY_MONTHS.map((s) => [
        `${s.label} (${s.months} months)`,
        ...levels.map((e) => inrShort(e * s.months)),
      ]),
    },
    tips: [
      "Count only must-pay costs: rent or EMIs, groceries, utilities, school fees and insurance premiums.",
      "Move up a level if your income is irregular or you are the only earner.",
      "Refill the fund after every withdrawal, and review your monthly number at least once a year.",
      "Health insurance and an emergency fund work together; one does not replace the other.",
    ],
  };
}

// ─── Policy returns (IRR) ───────────────────────────────────────────────────

function policyReturnGuide(): CalcGuide {
  const premium = 1_00_000;
  const pay = 10;
  const term = 20;
  const maturity = 25_00_000;
  const p = policyIrr(premium, pay, term, maturity);
  const irrText = (x: number | null) =>
    x === null ? "Not defined" : pct(x, 2);
  const maturities = [15_00_000, 20_00_000, 25_00_000, 30_00_000];
  return {
    intro:
      "A policy return calculator finds the real yearly return of an endowment or money-back plan. Enter the yearly premium, the years you pay, the policy term and the maturity amount promised.",
    howItWorks: [
      "Premiums are treated as paid at the start of each year and the maturity amount as received at the end of the term. The calculator then finds the single yearly rate that links the two.",
      "Money paid in year one stays locked for the full term. So a maturity that looks large next to the premiums can still mean a low yearly return.",
      "For comparison, it also grows the same premiums at 7.1% for PPF and 12% for an equity fund. Both are assumptions, not promised returns.",
    ],
    example: {
      title: `${inr(premium)} a year for ${pay} years, ${inrShort(maturity)} at the end of year ${term}`,
      steps: [
        `You pay ${inrShort(p.totalPaid)} in total and receive ${inrShort(maturity)}, ${(maturity / p.totalPaid).toFixed(1)} times what you paid.`,
        `Because the money is locked for up to ${term} years, the yearly return (IRR) is only ${irrText(p.irr)}.`,
        `The same premiums in PPF at 7.1% would grow to ${inrShort(p.ppfValue)}.`,
        `At an assumed 12% in an equity fund, they would grow to ${inrShort(p.equityValue)}.`,
      ],
    },
    table: {
      caption: `IRR for ${inr(premium)} a year paid for ${pay} years, maturing after ${term} years`,
      head: ["Maturity amount", "Times premiums paid", "Yearly return (IRR)"],
      rows: maturities.map((m) => {
        const x = policyIrr(premium, pay, term, m);
        return [
          inrShort(m),
          `${(m / x.totalPaid).toFixed(1)}×`,
          irrText(x.irr),
        ];
      }),
    },
    tips: [
      "Enter only the guaranteed maturity amount. Bonuses in participating plans are not guaranteed.",
      "Surrendering a traditional plan in its early years usually returns much less than the premiums paid.",
      "Check the life cover too. Per rupee of premium, it is usually far smaller than a term plan's.",
      "If you already hold a policy, compare continuing it with making it paid-up before you decide.",
    ],
  };
}

// ─── Buy term and invest the rest ───────────────────────────────────────────

function buyTermInvestGuide(): CalcGuide {
  const base = {
    traditionalPremium: 1_00_000,
    termPremium: 15_000,
    payYears: 15,
    policyYears: 20,
    traditionalMaturity: 28_00_000,
    returnPct: 11,
  };
  const b = buyTermInvestRest(base);
  // Return at which both options end level, found with the same engine.
  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (buyTermInvestRest({ ...base, returnPct: mid }).advantage > 0) hi = mid;
    else lo = mid;
  }
  const breakEven = (lo + hi) / 2;
  const rates = [6, 8, 10, 12];
  return {
    intro:
      "This calculator compares a traditional endowment or money-back plan with buying a term plan for the same cover and investing the premium you save. Enter both premiums, the years you pay, the policy term, the traditional plan's maturity and a return on the invested amount.",
    howItWorks: [
      "The yearly difference between the two premiums is invested at the start of each paying year. It compounds at your chosen return until the end of the policy term.",
      "The result is compared with the traditional plan's maturity amount. Both routes carry life cover, so the comparison is only about the savings part.",
      "The answer depends on the return you assume and on actually investing the difference every year.",
    ],
    example: {
      title: `${inr(base.traditionalPremium)} endowment vs ${inr(base.termPremium)} term plan, ${base.payYears} years of premiums, ${base.policyYears}-year term`,
      steps: [
        `You invest the difference of ${inr(b.yearlyInvested)} a year for ${base.payYears} years.`,
        `At ${base.returnPct}%, it grows to ${inrShort(b.corpus)} by the end of year ${base.policyYears}.`,
        `The traditional plan pays ${inrShort(base.traditionalMaturity)}, so term plus investing is ${b.advantage >= 0 ? "ahead" : "behind"} by ${inrShort(Math.abs(b.advantage))}.`,
        `The two end level at a return of about ${pct(breakEven)} a year on the invested difference.`,
      ],
    },
    table: {
      caption: `Investing ${inr(b.yearlyInvested)} a year for ${base.payYears} years, valued at year ${base.policyYears}, against a ${inrShort(base.traditionalMaturity)} maturity`,
      head: [
        "Return on the difference",
        "Term + invest corpus",
        "Difference vs traditional plan",
      ],
      rows: rates.map((r) => {
        const x = buyTermInvestRest({ ...base, returnPct: r });
        const sign = x.advantage >= 0 ? "+" : "−";
        return [
          pct(r, 0),
          inrShort(x.corpus),
          `${sign}${inrShort(Math.abs(x.advantage))}`,
        ];
      }),
    },
    tips: [
      "Set up an automatic SIP or yearly transfer for the difference, or the comparison does not hold.",
      "Quote the term plan for the same sum assured and policy term as the traditional plan.",
      "Use a conservative return for long periods, and check how the result changes at lower rates.",
      "Investment gains may be taxed differently from the policy's maturity, so compare after tax for your case.",
    ],
  };
}

export const RETIREMENT_GUIDES: Record<string, () => CalcGuide> = {
  retirement: retirementGuide,
  fire: fireGuide,
  nps: npsGuide,
  annuity: annuityGuide,
  gratuity: gratuityGuide,
  "leave-encashment": leaveEncashmentGuide,
  "term-cover": termCoverGuide,
  "health-cover": healthCoverGuide,
  emergency: emergencyGuide,
  "policy-return": policyReturnGuide,
  "buy-term-invest": buyTermInvestGuide,
};
