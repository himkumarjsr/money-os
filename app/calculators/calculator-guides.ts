/**
 * Long-form, server-rendered guides for every calculator: how
 * the maths works, the formula, a worked example and a ready-reckoner table.
 * Every number is computed from the same engines the calculators use, so the
 * guide can never disagree with the tool. Illustrative only, not advice.
 */

import {
  emiFor,
  fixedDeposit,
  hraExemption,
  lumpsumFV,
  recurringDeposit,
  sipFV,
  sipForTarget,
  stepUpSip,
} from "@/lib/advisorCalculators";

import { INVESTING_GUIDES } from "./guides/investing";
import { LOAN_GUIDES } from "./guides/loans";
import { POST_OFFICE_GUIDES } from "./guides/postoffice";
import { RETIREMENT_GUIDES } from "./guides/retirement";
import { type CalcGuide, inr, inrShort } from "./guides/shared";
import { TAX_GUIDES } from "./guides/tax";

export { type CalcGuide, inr, inrShort };

/** Corpus left after monthly withdrawals (withdraw at month end, monthly compounding). */
function swpBalance(
  corpus: number,
  monthly: number,
  ratePct: number,
  months: number,
) {
  const r = ratePct / 100 / 12;
  let balance = corpus;
  let withdrawn = 0;
  for (let m = 0; m < months && balance > 0; m += 1) {
    balance = balance * (1 + r);
    const take = Math.min(monthly, balance);
    balance -= take;
    withdrawn += take;
  }
  return { balance, withdrawn };
}

/** PPF: one yearly deposit at the start of each year, compounded yearly. */
function ppfMaturity(yearly: number, ratePct: number, years: number) {
  const i = ratePct / 100;
  return yearly * ((Math.pow(1 + i, years) - 1) / i) * (1 + i);
}

function sipGuide(): CalcGuide {
  const monthly = 10_000;
  const rate = 12;
  const years = 15;
  const fv = sipFV(monthly, rate, years * 12);
  const invested = monthly * years * 12;
  const amounts = [1_000, 5_000, 10_000, 25_000];
  const spans = [10, 15, 20, 25];
  return {
    intro:
      "A SIP calculator shows what a fixed monthly investment in a mutual fund can grow to. Enter the monthly amount, the expected yearly return and the number of years to see the total invested, the estimated returns and the final value.",
    howItWorks: [
      "Each monthly instalment is invested and compounds every month until the end of the period. Early instalments compound for longer, which is why the last few years of a long SIP add the most money.",
      "The calculator assumes the same return every year. Real equity returns swing from year to year, so treat the result as an estimate, not a promise.",
    ],
    formula: {
      expression: "FV = P × [((1 + r)^n − 1) ÷ r]",
      legend: [
        "P = monthly SIP amount",
        "r = expected yearly return ÷ 12 (as a decimal)",
        "n = number of monthly instalments",
      ],
    },
    example: {
      title: `${inr(monthly)} a month for ${years} years at ${rate}%`,
      steps: [
        `Monthly rate r = ${rate}% ÷ 12 = 1% = 0.01, and n = ${years} × 12 = ${years * 12} months.`,
        `Total invested = ${inr(monthly)} × ${years * 12} = ${inr(invested)}.`,
        `Final value = ${inr(fv)}, so the estimated gain is ${inr(fv - invested)}.`,
      ],
    },
    table: {
      caption: `SIP value at ${rate}% a year`,
      head: ["Monthly SIP", ...spans.map((y) => `${y} years`)],
      rows: amounts.map((a) => [
        inr(a),
        ...spans.map((y) => inrShort(sipFV(a, rate, y * 12))),
      ]),
    },
    tips: [
      "Start early. A five-year delay roughly doubles the SIP you need for the same goal.",
      "Raise the SIP every year with your salary. A step-up SIP builds a far bigger corpus.",
      "Use a lower return, such as 10%, for a conservative plan.",
      "Equity mutual fund gains above the yearly exemption are taxed as capital gains when you sell.",
    ],
  };
}

function lumpsumGuide(): CalcGuide {
  const amount = 5_00_000;
  const rate = 12;
  const years = 10;
  const fv = lumpsumFV(amount, rate, years);
  const amounts = [1_00_000, 5_00_000, 10_00_000];
  const spans = [5, 10, 15, 20];
  return {
    intro:
      "A lumpsum calculator shows what a one-time investment can grow to. Enter the amount, the expected yearly return and the period to see the final value and the gain.",
    howItWorks: [
      "The whole amount is invested on day one and compounds every year. Because nothing is added later, time and the rate of return decide the result.",
      "Compare it with a SIP of the same total: a lumpsum gains more when markets rise steadily, while a SIP spreads the risk of investing at a market high.",
    ],
    formula: {
      expression: "FV = P × (1 + r)^n",
      legend: [
        "P = amount invested",
        "r = expected yearly return (as a decimal)",
        "n = number of years",
      ],
    },
    example: {
      title: `${inr(amount)} for ${years} years at ${rate}%`,
      steps: [
        `Growth factor = 1.${rate}^${years} = ${(fv / amount).toFixed(2)}.`,
        `Final value = ${inr(amount)} × ${(fv / amount).toFixed(2)} = ${inr(fv)}.`,
        `Gain = ${inr(fv - amount)}.`,
      ],
    },
    table: {
      caption: `Lumpsum value at ${rate}% a year`,
      head: ["Invested", ...spans.map((y) => `${y} years`)],
      rows: amounts.map((a) => [
        inr(a),
        ...spans.map((y) => inrShort(lumpsumFV(a, rate, y))),
      ]),
    },
    tips: [
      "At 12%, money roughly doubles every 6 years (the rule of 72).",
      "If you are nervous about timing, split a large amount into a few months of STP.",
      "Keep money you need within three years out of equity.",
    ],
  };
}

function stepUpGuide(): CalcGuide {
  const monthly = 10_000;
  const step = 10;
  const rate = 12;
  const years = 20;
  const res = stepUpSip(monthly, step, rate, years);
  return {
    intro:
      "A step-up SIP calculator shows how raising your SIP by a fixed percentage every year grows your corpus compared with a flat SIP. It is the simplest way to match investing to a rising salary.",
    howItWorks: [
      "In year one you invest the starting amount every month. Each new year the monthly amount rises by the step-up percentage, and every instalment compounds monthly until the end.",
      "The calculator shows both the step-up corpus and the corpus from a flat SIP of the starting amount, so you can see what the yearly increase is worth.",
    ],
    example: {
      title: `${inr(monthly)} a month, ${step}% yearly step-up, ${years} years at ${rate}%`,
      steps: [
        `The SIP rises from ${inr(monthly)} in year 1 to ${inr(res.rows.at(-1)?.monthly ?? monthly)} a month in year ${years}.`,
        `Total invested = ${inr(res.invested)}, final value = ${inr(res.value)}.`,
        `A flat ${inr(monthly)} SIP invests ${inr(res.flatInvested)} and grows to ${inr(res.flatValue)}.`,
        `The step-up adds ${inr(res.value - res.flatValue)} to the final corpus.`,
      ],
    },
    table: {
      caption: `${inr(monthly)} SIP at ${rate}%: flat versus ${step}% step-up`,
      head: ["Year", "Monthly SIP", "Flat SIP value", "Step-up value"],
      rows: res.rows
        .filter((r) => r.year % 5 === 0)
        .map((r) => [
          String(r.year),
          inr(r.monthly),
          inrShort(r.flat),
          inrShort(r.stepUp),
        ]),
    },
    tips: [
      "Set the step-up in your fund's SIP settings so it happens automatically each year.",
      "Match the step-up to your expected salary hike; 5% to 10% is common.",
      "Even a 5% step-up makes a large difference over 15 years or more.",
    ],
  };
}

function goalSipGuide(): CalcGuide {
  const target = 1_00_00_000;
  const rate = 12;
  const spans = [10, 15, 20, 25];
  const sip15 = sipForTarget(target, rate, 15 * 12);
  const targets = [25_00_000, 50_00_000, 1_00_00_000];
  return {
    intro:
      "A goal SIP calculator works backwards from a target amount. Tell it how much you need and by when, and it shows the monthly SIP that gets you there.",
    howItWorks: [
      "It solves the SIP formula for the monthly amount: the target is the future value, and the calculator finds the instalment that reaches it at your expected return.",
      "For goals years away, first inflate today's cost to the future cost, then plan the SIP for that number.",
    ],
    formula: {
      expression: "P = FV × r ÷ ((1 + r)^n − 1)",
      legend: [
        "FV = target amount",
        "r = expected yearly return ÷ 12",
        "n = number of months to the goal",
      ],
    },
    example: {
      title: `${inrShort(target)} in 15 years at ${rate}%`,
      steps: [
        `n = 180 months and r = 0.01.`,
        `Monthly SIP needed = ${inr(sip15)}.`,
        `You invest ${inr(sip15 * 180)} in total; the rest comes from compounding.`,
      ],
    },
    table: {
      caption: `Monthly SIP needed at ${rate}% a year`,
      head: ["Target", ...spans.map((y) => `${y} years`)],
      rows: targets.map((t) => [
        inrShort(t),
        ...spans.map((y) => inr(sipForTarget(t, rate, y * 12))),
      ]),
    },
    tips: [
      "Every five years of delay roughly doubles the SIP you need for the same goal.",
      "Move the money to safer funds in the last two or three years before the goal.",
      "Link each SIP to one goal so you know what it is for.",
    ],
  };
}

function swpGuide(): CalcGuide {
  const corpus = 50_00_000;
  const monthly = 30_000;
  const rate = 8;
  const res = swpBalance(corpus, monthly, rate, 20 * 12);
  const withdrawals = [20_000, 30_000, 40_000];
  return {
    intro:
      "An SWP calculator shows how long a corpus lasts when you withdraw a fixed amount every month while the rest stays invested. It is how many retirees turn savings into a monthly income.",
    howItWorks: [
      "Each month the remaining balance earns the expected return, then your withdrawal is paid out. If the return covers the withdrawal, the corpus can last indefinitely; if not, it runs down.",
      "Withdrawals from mutual funds are partly your own capital, so only the gain portion is taxed, which often makes SWP more tax-efficient than interest income.",
    ],
    example: {
      title: `${inrShort(corpus)} corpus, ${inr(monthly)} a month, ${rate}% return`,
      steps: [
        `First month: the corpus earns about ${inr((corpus * rate) / 100 / 12)}, then ${inr(monthly)} is withdrawn.`,
        `After 20 years you have withdrawn ${inrShort(res.withdrawn)} and ${inrShort(res.balance)} is still invested.`,
      ],
    },
    table: {
      caption: `${inrShort(corpus)} at ${rate}%: balance left after monthly withdrawals`,
      head: [
        "Monthly withdrawal",
        "After 10 years",
        "After 20 years",
        "After 30 years",
      ],
      rows: withdrawals.map((w) => [
        inr(w),
        ...[10, 20, 30].map((y) => {
          const b = swpBalance(corpus, w, rate, y * 12).balance;
          return b > 0 ? inrShort(b) : "Exhausted";
        }),
      ]),
    },
    tips: [
      "A yearly withdrawal of 4% to 5% of the corpus is a common starting point for a long retirement.",
      "Keep 2 to 3 years of withdrawals in debt funds so you never sell equity in a crash.",
      "Raise withdrawals with inflation only if the corpus is keeping up.",
    ],
  };
}

function emiGuide(): CalcGuide {
  const loan = 10_00_000;
  const rate = 10;
  const months = 60;
  const emi = emiFor(loan, rate, months);
  const loans = [5_00_000, 10_00_000, 25_00_000, 50_00_000];
  const tenures = [3, 5, 10, 20];
  return {
    intro:
      "An EMI calculator shows the monthly instalment for a loan, plus the total interest and total amount you will repay. It works for home, car, personal and education loans.",
    howItWorks: [
      "Indian banks use the reducing-balance method: each month interest is charged only on the amount still owed. Early EMIs are mostly interest; later EMIs are mostly principal.",
      "A longer tenure lowers the EMI but raises the total interest, often by a lot.",
    ],
    formula: {
      expression: "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)",
      legend: [
        "P = loan amount",
        "r = yearly interest rate ÷ 12 (as a decimal)",
        "n = tenure in months",
      ],
    },
    example: {
      title: `${inr(loan)} at ${rate}% for ${months / 12} years`,
      steps: [
        `r = ${rate}% ÷ 12 = ${(rate / 12).toFixed(3)}% a month and n = ${months}.`,
        `EMI = ${inr(emi)}.`,
        `Total repaid = ${inr(emi * months)}, so total interest = ${inr(emi * months - loan)}.`,
      ],
    },
    table: {
      caption: `EMI at ${rate}% a year`,
      head: ["Loan", ...tenures.map((y) => `${y} years`)],
      rows: loans.map((p) => [
        inrShort(p),
        ...tenures.map((y) => inr(emiFor(p, rate, y * 12))),
      ]),
    },
    tips: [
      "Keep all EMIs together under about 40% of your take-home pay.",
      "Part-prepayments early in the loan save the most interest.",
      "Compare the processing fee and the rate type (fixed or floating), not only the rate.",
    ],
  };
}

function homeLoanGuide(): CalcGuide {
  const loan = 50_00_000;
  const rate = 8.5;
  const years = 20;
  const emi = emiFor(loan, rate, years * 12);
  const rates = [8, 8.5, 9, 9.5];
  const tenures = [15, 20, 25, 30];
  return {
    intro:
      "A home loan EMI calculator shows your monthly EMI, the total interest over the loan and how the EMI changes with the rate and tenure. Use it before you choose a loan amount or a bank.",
    howItWorks: [
      "Home loans use the same reducing-balance EMI as other loans, but the long tenure means interest can exceed the loan amount itself.",
      "Most home loans are floating rate and linked to an external benchmark such as the repo rate, so the EMI or the tenure changes when rates move.",
    ],
    formula: {
      expression: "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)",
      legend: [
        "P = loan amount",
        "r = yearly interest rate ÷ 12",
        "n = tenure in months",
      ],
    },
    example: {
      title: `${inrShort(loan)} at ${rate}% for ${years} years`,
      steps: [
        `EMI = ${inr(emi)}.`,
        `Total repaid over ${years} years = ${inrShort(emi * years * 12)}.`,
        `Total interest = ${inrShort(emi * years * 12 - loan)}, more than the loan itself.`,
      ],
    },
    table: {
      caption: `EMI on a ${inrShort(loan)} home loan`,
      head: ["Rate", ...tenures.map((y) => `${y} years`)],
      rows: rates.map((r) => [
        `${r}%`,
        ...tenures.map((y) => inr(emiFor(loan, r, y * 12))),
      ]),
    },
    tips: [
      "Banks usually lend up to 75% to 90% of the property value; the rest is your down payment.",
      "Under the old tax regime, interest on a self-occupied home can be deducted up to ₹2 lakh a year and principal counts under 80C.",
      "When rates fall, ask your bank to reset the rate or consider a balance transfer.",
    ],
  };
}

function fdGuide(): CalcGuide {
  const principal = 5_00_000;
  const rate = 7;
  const months = 60;
  const res = fixedDeposit({
    principal,
    ratePct: rate,
    months,
    compounding: "quarterly",
    senior: false,
    slabPct: 30,
  });
  const rates = [6, 6.5, 7, 7.5];
  const spans = [1, 3, 5];
  return {
    intro:
      "An FD calculator shows the maturity value and interest on a bank fixed deposit, and what is left after tax. Enter the deposit, the rate, the tenure and how often interest compounds.",
    howItWorks: [
      "Most banks compound FD interest quarterly. The interest is taxable at your slab rate every year, even if you only receive it at maturity.",
      "Banks deduct TDS when your yearly interest crosses the threshold (higher for senior citizens). TDS is not extra tax; it is adjusted when you file your return.",
    ],
    formula: {
      expression: "A = P × (1 + r ÷ k)^(k × t)",
      legend: [
        "P = deposit",
        "r = yearly interest rate (as a decimal)",
        "k = compounding periods a year (4 for quarterly)",
        "t = tenure in years",
      ],
    },
    example: {
      title: `${inr(principal)} for ${months / 12} years at ${rate}%, compounded quarterly`,
      steps: [
        `Maturity value = ${inr(res.maturity)} and interest = ${inr(res.interest)}.`,
        `Effective yearly yield = ${res.effectiveYield.toFixed(2)}%.`,
        `In the 30% slab, tax with cess is about ${inr(res.tax)}, leaving ${inr(res.postTaxMaturity)}.`,
      ],
    },
    table: {
      caption: `Maturity of ${inrShort(principal)}, compounded quarterly`,
      head: ["Rate", ...spans.map((y) => `${y} year${y > 1 ? "s" : ""}`)],
      rows: rates.map((r) => [
        `${r}%`,
        ...spans.map((y) => inr(principal * Math.pow(1 + r / 100 / 4, 4 * y))),
      ]),
    },
    tips: [
      "Senior citizens usually get about 0.5% more.",
      "Split a large FD into several smaller ones with different maturities (an FD ladder).",
      "If you are in a high slab, compare the post-tax return with debt funds.",
    ],
  };
}

function rdGuide(): CalcGuide {
  const monthly = 5_000;
  const rate = 7;
  const months = 60;
  const res = recurringDeposit(monthly, rate, months);
  const amounts = [2_000, 5_000, 10_000];
  const spans = [1, 3, 5];
  return {
    intro:
      "An RD calculator shows what a fixed monthly deposit in a bank recurring deposit grows to. Enter the monthly amount, the rate and the tenure to see the maturity value and interest.",
    howItWorks: [
      "Each instalment earns interest, compounded quarterly, for the months it stays deposited. The first instalment earns the most; the last earns very little.",
      "RD interest is taxed at your slab rate, and TDS applies above the yearly threshold, just like an FD.",
    ],
    example: {
      title: `${inr(monthly)} a month for ${months / 12} years at ${rate}%`,
      steps: [
        `Total deposited = ${inr(res.deposited)}.`,
        `Maturity value = ${inr(res.maturity)}, so interest = ${inr(res.interest)}.`,
      ],
    },
    table: {
      caption: `RD maturity at ${rate}%, compounded quarterly`,
      head: [
        "Monthly deposit",
        ...spans.map((y) => `${y} year${y > 1 ? "s" : ""}`),
      ],
      rows: amounts.map((a) => [
        inr(a),
        ...spans.map((y) => inr(recurringDeposit(a, rate, y * 12).maturity)),
      ]),
    },
    tips: [
      "An RD suits short goals under three years where you cannot take market risk.",
      "For longer goals, a SIP in a debt or hybrid fund may beat RD after tax.",
      "Missing an instalment can attract a small penalty; set up auto-debit.",
    ],
  };
}

function ppfGuide(): CalcGuide {
  const yearly = 1_50_000;
  const rate = 7.1;
  const years = 15;
  const maturity = ppfMaturity(yearly, rate, years);
  const amounts = [50_000, 1_00_000, 1_50_000];
  return {
    intro:
      "A PPF calculator shows the maturity value of a Public Provident Fund account. Enter your yearly deposit and the interest rate to see the total invested, the interest earned and the tax-free maturity amount.",
    howItWorks: [
      "PPF has a 15-year lock-in that you can extend in blocks of 5 years. You can deposit from ₹500 to ₹1.5 lakh a year, and interest is compounded yearly.",
      "The government sets the PPF rate every quarter. The examples here assume 7.1%, the rate PPF has paid for several years; check the current rate before planning.",
      "PPF is EEE: deposits qualify under Section 80C in the old regime, and both the interest and the maturity amount are tax-free.",
    ],
    formula: {
      expression: "A = P × [((1 + i)^n − 1) ÷ i] × (1 + i)",
      legend: [
        "P = yearly deposit (made at the start of each year)",
        "i = yearly interest rate (as a decimal)",
        "n = number of years",
      ],
    },
    example: {
      title: `${inr(yearly)} a year for ${years} years at ${rate}%`,
      steps: [
        `Total invested = ${inr(yearly * years)}.`,
        `Maturity value = ${inr(maturity)}, so interest = ${inr(maturity - yearly * years)}, all tax-free.`,
      ],
    },
    table: {
      caption: `PPF maturity at ${rate}%, deposit at the start of each year`,
      head: ["Yearly deposit", "15 years", "20 years", "25 years"],
      rows: amounts.map((a) => [
        inr(a),
        ...[15, 20, 25].map((y) => inrShort(ppfMaturity(a, rate, y))),
      ]),
    },
    tips: [
      "Deposit before the 5th of the month (ideally by 5 April) so that money earns interest for the month.",
      "Partial withdrawals are allowed from year 7; loans against PPF from year 3.",
      "PPF suits the safe, tax-free part of a long-term plan; pair it with equity for growth.",
    ],
  };
}

function hraGuide(): CalcGuide {
  const basic = 50_000;
  const hra = 20_000;
  const rent = 22_000;
  const res = hraExemption({
    basicMonthly: basic,
    hraMonthly: hra,
    rentMonthly: rent,
    metro: true,
  });
  const rents = [10_000, 20_000, 25_000, 35_000];
  return {
    intro:
      "An HRA exemption calculator shows how much of your house rent allowance is tax-free and how much is taxable. Enter your basic salary, the HRA you receive, the rent you pay and whether you live in a metro city.",
    howItWorks: [
      "The exempt HRA is the lowest of three amounts: the HRA you actually receive, rent paid minus 10% of basic salary, and 50% of basic in a metro city or 40% elsewhere.",
      "Basic salary here includes dearness allowance where it counts for retirement benefits. The exemption is available only in the old tax regime.",
    ],
    formula: {
      expression:
        "Exempt HRA = lowest of (actual HRA, rent − 10% of basic, 50% or 40% of basic)",
      legend: [
        "Use yearly figures for all three tests",
        "50% of basic applies in a metro city, 40% elsewhere",
      ],
    },
    example: {
      title: `Basic ${inr(basic)}, HRA ${inr(hra)}, rent ${inr(rent)} a month, metro`,
      steps: [
        `Actual HRA = ${inr(res.tests.actualHra)} a year.`,
        `Rent minus 10% of basic = ${inr(res.tests.rentMinus10)}.`,
        `50% of basic = ${inr(res.tests.pctOfBasic)}.`,
        `Exempt HRA = ${inr(res.exempt)}; taxable HRA = ${inr(res.taxable)}.`,
      ],
    },
    table: {
      caption: `Yearly exempt HRA for basic ${inr(basic)} and HRA ${inr(hra)} a month, metro`,
      head: ["Monthly rent", "Exempt HRA", "Taxable HRA"],
      rows: rents.map((r) => {
        const x = hraExemption({
          basicMonthly: basic,
          hraMonthly: hra,
          rentMonthly: r,
          metro: true,
        });
        return [inr(r), inr(x.exempt), inr(x.taxable)];
      }),
    },
    tips: [
      "Keep rent receipts and a rent agreement; give your landlord's PAN to your employer if yearly rent exceeds ₹1 lakh.",
      "You can pay rent to your parents if they own the house and declare the rent as income.",
      "If you do not get HRA, Section 80GG may give a smaller deduction in the old regime.",
      "Compare both regimes. If the new regime still wins, the HRA exemption does not matter.",
    ],
  };
}

const BUILDERS: Record<string, () => CalcGuide> = {
  sip: sipGuide,
  lumpsum: lumpsumGuide,
  "stepup-sip": stepUpGuide,
  "goal-sip": goalSipGuide,
  swp: swpGuide,
  emi: emiGuide,
  home: homeLoanGuide,
  fd: fdGuide,
  rd: rdGuide,
  ppf: ppfGuide,
  hra: hraGuide,
  ...INVESTING_GUIDES,
  ...RETIREMENT_GUIDES,
  ...LOAN_GUIDES,
  ...TAX_GUIDES,
  ...POST_OFFICE_GUIDES,
};

export const GUIDED_CALC_IDS = Object.keys(BUILDERS);

export function getCalcGuide(calcId: string): CalcGuide | null {
  const build = BUILDERS[calcId];
  return build ? build() : null;
}
