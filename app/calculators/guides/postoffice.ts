/**
 * Guides for the India Post / small savings calculators. Every rate and
 * number comes from lib/postOfficeSchemes.ts, the same engine the tools use,
 * so a rate change there flows into these guides automatically.
 */

import {
  PO_RATES,
  PO_RATES_PERIOD,
  poKvpMaturity,
  poMisMonthly,
  poNscMaturity,
  poRdMaturity,
  poSavingsYearly,
  poScssQuarterly,
  poSsyMaturity,
  poTdMaturity,
  poTdRate,
  type PoTdYears,
} from "@/lib/postOfficeSchemes";

import { type CalcGuide, inr, inrShort } from "./shared";

const RATE_NOTE = `The government sets small savings rates every quarter. This guide uses the rates the calculator uses, notified for ${PO_RATES_PERIOD}.`;

const TD_YEARS: PoTdYears[] = [1, 2, 3, 5];

const SSY_DEPOSIT_YEARS = 15;
const SSY_TOTAL_YEARS = 21;

/** Same model as the SSY calculator: 15 yearly deposits, then compounding to year 21. */
function ssyMaturity(yearly: number) {
  const afterDeposits = poSsyMaturity(yearly, SSY_DEPOSIT_YEARS, PO_RATES.ssy);
  const growth = Math.pow(
    1 + PO_RATES.ssy / 100,
    SSY_TOTAL_YEARS - SSY_DEPOSIT_YEARS,
  );
  return { afterDeposits, maturity: afterDeposits * growth };
}

const kvpYears = (PO_RATES.kvpMonths / 12).toFixed(1);

function poGuide(): CalcGuide {
  const amount = 1_00_000;
  const td5 = poTdMaturity(amount, 5);
  const nsc = poNscMaturity(amount);
  const kvp = poKvpMaturity(amount);
  const misTotal = poMisMonthly(amount) * 12 * 5;
  return {
    intro:
      "The Post Office schemes calculator puts every India Post small savings scheme in one place. Pick a scheme to see its notified rate and work out maturity value or regular income.",
    howItWorks: [
      `It covers the Savings Account, Time Deposit, Recurring Deposit, NSC, KVP, MIS, SCSS and Sukanya Samriddhi. ${RATE_NOTE}`,
      "The schemes differ in how they pay you. TD, NSC, KVP and SSY pay everything at maturity. MIS pays interest every month and SCSS every quarter.",
      "Each scheme also has its own calculator page with more detail. Always confirm the live rate and eligibility at India Post before investing.",
    ],
    example: {
      title: `${inr(amount)} for about five years in four schemes`,
      steps: [
        `A 5-year Time Deposit at ${PO_RATES.td5}%, compounded quarterly, matures at ${inr(td5)}.`,
        `NSC at ${PO_RATES.nsc}%, compounded yearly, matures at ${inr(nsc)} after 5 years.`,
        `KVP at ${PO_RATES.kvp}% doubles to ${inr(kvp)}, but takes ${PO_RATES.kvpMonths} months, about ${kvpYears} years.`,
        `MIS at ${PO_RATES.mis}% pays ${inr(misTotal)} as monthly interest over 5 years, and returns the ${inr(amount)} at the end.`,
      ],
    },
    table: {
      caption: `Post Office scheme rates for ${PO_RATES_PERIOD}`,
      head: ["Scheme", "Rate", "Tenure", "How it pays"],
      rows: [
        [
          "Savings Account",
          `${PO_RATES.savings}%`,
          "No lock-in",
          "Interest on balance",
        ],
        [
          "Time Deposit",
          `${PO_RATES.td1}% to ${PO_RATES.td5}%`,
          "1, 2, 3 or 5 years",
          "At maturity",
        ],
        ["Recurring Deposit", `${PO_RATES.rd}%`, "5 years", "At maturity"],
        ["NSC", `${PO_RATES.nsc}%`, "5 years", "At maturity"],
        [
          "Kisan Vikas Patra",
          `${PO_RATES.kvp}%`,
          `${PO_RATES.kvpMonths} months`,
          "Doubles at maturity",
        ],
        ["Monthly Income Scheme", `${PO_RATES.mis}%`, "5 years", "Monthly"],
        ["SCSS", `${PO_RATES.scss}%`, "5 years, extendable", "Quarterly"],
        [
          "Sukanya Samriddhi",
          `${PO_RATES.ssy}%`,
          `${SSY_TOTAL_YEARS} years from opening`,
          "At maturity",
        ],
      ],
    },
    tips: [
      "Use MIS or SCSS when you need a regular income, and TD, NSC or KVP when you want a lump sum later.",
      "Compare a 5-year TD and NSC side by side; both can count toward Section 80C within the ₹1.5 lakh cap when eligible.",
      "Interest from most of these schemes is taxable. Sukanya Samriddhi is the exception, as it is EEE under current rules.",
      "PPF is also offered at post offices; use the PPF calculator for it.",
    ],
  };
}

function poSavingsGuide(): CalcGuide {
  const balance = 50_000;
  const yearly = poSavingsYearly(balance);
  const balances = [10_000, 50_000, 1_00_000, 5_00_000];
  return {
    intro:
      "The Post Office Savings Account calculator shows the interest your balance earns in a year and per month. Enter your average balance to see the result at the notified rate.",
    howItWorks: [
      `The calculator applies the savings rate of ${PO_RATES.savings}% a year to your average balance. ${RATE_NOTE}`,
      "The rate is floating, so it can change from quarter to quarter.",
      "Interest is taxable, subject to the Section 80TTA and 80TTB limits.",
    ],
    formula: {
      expression: "Yearly interest = Average balance × rate ÷ 100",
      legend: [
        `Rate = ${PO_RATES.savings}% a year`,
        "Monthly interest = yearly interest ÷ 12",
      ],
    },
    example: {
      title: `Average balance of ${inr(balance)}`,
      steps: [
        `Yearly interest = ${inr(balance)} × ${PO_RATES.savings} ÷ 100 = ${inr(yearly)}.`,
        `Monthly interest = ${inr(yearly)} ÷ 12 = ${inr(yearly / 12)}.`,
        `Your balance stays ${inr(balance)}, and you can withdraw it when you need it.`,
      ],
    },
    table: {
      caption: `Savings Account interest at ${PO_RATES.savings}%`,
      head: ["Average balance", "Interest a year", "Interest a month"],
      rows: balances.map((b) => [
        inr(b),
        inr(poSavingsYearly(b)),
        inr(poSavingsYearly(b) / 12),
      ]),
    },
    tips: [
      "Use the account to park cash you may need soon, not for long-term growth.",
      `Money you will not touch for a year or more can earn more in a Time Deposit, at ${PO_RATES.td1}% to ${PO_RATES.td5}%.`,
      "Keep an emergency fund here and move the surplus to a TD or RD.",
    ],
  };
}

function poTdGuide(): CalcGuide {
  const principal = 1_00_000;
  const years: PoTdYears = 5;
  const rate = poTdRate(years);
  const maturity = poTdMaturity(principal, years);
  const amounts = [50_000, 1_00_000, 5_00_000, 10_00_000];
  return {
    intro:
      "The Post Office Time Deposit calculator shows what a one-time deposit grows to over 1, 2, 3 or 5 years. Enter the amount and pick a tenure to see the maturity value and interest.",
    howItWorks: [
      `Each tenure has its own rate: ${TD_YEARS.map((y) => `${y} year ${poTdRate(y)}%`).join(", ")}. ${RATE_NOTE}`,
      "Interest is compounded quarterly and paid out with the deposit at maturity in this calculator.",
      "Interest is taxable. The 5-year TD can also count toward Section 80C when eligible.",
    ],
    formula: {
      expression: "A = P × (1 + r ÷ 4)^(4 × t)",
      legend: [
        "P = amount deposited",
        "r = yearly rate for the tenure (as a decimal)",
        "t = tenure in years",
      ],
    },
    example: {
      title: `${inr(principal)} in a ${years}-year TD at ${rate}%`,
      steps: [
        `Quarterly rate = ${rate}% ÷ 4 = ${(rate / 4).toFixed(3)}%, over ${4 * years} quarters.`,
        `Growth factor = ${(maturity / principal).toFixed(4)}.`,
        `Maturity value = ${inr(maturity)}, so interest earned = ${inr(maturity - principal)}.`,
      ],
    },
    table: {
      caption: `Time Deposit maturity for ${PO_RATES_PERIOD} rates, compounded quarterly`,
      head: ["Deposit", ...TD_YEARS.map((y) => `${y} yr (${poTdRate(y)}%)`)],
      rows: amounts.map((a) => [
        inr(a),
        ...TD_YEARS.map((y) => inr(poTdMaturity(a, y))),
      ]),
    },
    tips: [
      `The 5-year TD pays the highest rate, ${PO_RATES.td5}%, but has the longest term.`,
      "Split a large sum across tenures so that part of it matures every year or two.",
      "Because interest is taxable, compare the post-tax return with your slab in mind.",
    ],
  };
}

function poRdGuide(): CalcGuide {
  const monthly = 5_000;
  const maturity = poRdMaturity(monthly);
  const invested = monthly * 60;
  const amounts = [1_000, 2_000, 5_000, 10_000];
  return {
    intro:
      "The Post Office RD calculator shows what a fixed monthly deposit grows to in the 5-year National Savings Recurring Deposit. Enter the monthly amount to see the maturity value and interest.",
    howItWorks: [
      `You deposit the same amount every month for 5 years, at ${PO_RATES.rd}% a year. ${RATE_NOTE}`,
      "Interest is compounded quarterly, so early deposits earn more than late ones. The calculator uses the official-style RD formula.",
      "Interest is taxable as per your slab.",
    ],
    formula: {
      expression: "M = R × [(1 + i)^n − 1] ÷ [1 − (1 + i)^(−1/3)]",
      legend: [
        "R = monthly deposit",
        `i = yearly rate ÷ 400 (quarterly rate), so ${PO_RATES.rd} ÷ 400 = ${(PO_RATES.rd / 400).toFixed(5)}`,
        "n = number of quarters, 20 for 5 years",
      ],
    },
    example: {
      title: `${inr(monthly)} a month for 5 years at ${PO_RATES.rd}%`,
      steps: [
        `Total deposited = ${inr(monthly)} × 60 = ${inr(invested)}.`,
        `Maturity value = ${inr(maturity)}.`,
        `Interest earned = ${inr(maturity - invested)}.`,
      ],
    },
    table: {
      caption: `5-year RD maturity at ${PO_RATES.rd}%`,
      head: ["Monthly deposit", "Total deposited", "Maturity", "Interest"],
      rows: amounts.map((a) => {
        const m = poRdMaturity(a);
        return [inr(a), inr(a * 60), inr(m), inr(m - a * 60)];
      }),
    },
    tips: [
      "An RD builds the habit of saving a fixed sum every month.",
      "Set up a standing instruction so you do not miss a month.",
      `If you already have a lump sum, a 5-year TD (${PO_RATES.td5}%) or NSC (${PO_RATES.nsc}%) pays a higher rate than RD.`,
    ],
  };
}

function nscGuide(): CalcGuide {
  const principal = 1_00_000;
  const maturity = poNscMaturity(principal);
  const td5 = poTdMaturity(principal, 5);
  const rows: string[][] = [];
  let opening = principal;
  for (let y = 1; y <= 5; y += 1) {
    const closing = opening * (1 + PO_RATES.nsc / 100);
    rows.push([String(y), inr(opening), inr(closing - opening), inr(closing)]);
    opening = closing;
  }
  return {
    intro:
      "The NSC calculator shows the 5-year maturity value of a National Savings Certificate. Enter a one-time investment to see the maturity amount and interest earned.",
    howItWorks: [
      `NSC is a 5-year small savings scheme offered through post offices, at ${PO_RATES.nsc}% a year. ${RATE_NOTE}`,
      "Interest is compounded yearly and paid with the principal at the end of 5 years.",
      "The investment is eligible for Section 80C within the ₹1.5 lakh cap. Interest is taxable, and is treated as reinvested each year.",
    ],
    formula: {
      expression: "A = P × (1 + r)^5",
      legend: [
        "P = amount invested",
        `r = ${PO_RATES.nsc}% a year (as a decimal)`,
        "5 = tenure in years",
      ],
    },
    example: {
      title: `${inr(principal)} in NSC at ${PO_RATES.nsc}%`,
      steps: [
        `Growth factor = ${(1 + PO_RATES.nsc / 100).toFixed(3)}^5 = ${(maturity / principal).toFixed(4)}.`,
        `Maturity value = ${inr(maturity)}.`,
        `Interest earned over 5 years = ${inr(maturity - principal)}.`,
      ],
    },
    table: {
      caption: `Year-by-year growth of ${inr(principal)} in NSC at ${PO_RATES.nsc}%`,
      head: ["Year", "Opening value", "Interest", "Closing value"],
      rows,
    },
    tips: [
      "The yearly interest is added to the certificate, not paid out. It still counts as income for tax.",
      `For ${inr(principal)}, NSC gives ${inr(maturity)} and a 5-year TD gives ${inr(td5)}, so compare both.`,
      "Buy NSC when you want a fixed amount on a fixed date five years away.",
    ],
  };
}

function poKvpGuide(): CalcGuide {
  const principal = 1_00_000;
  const maturity = poKvpMaturity(principal);
  const amounts = [10_000, 50_000, 1_00_000, 5_00_000];
  return {
    intro:
      "The Kisan Vikas Patra calculator shows what your deposit becomes at maturity. At the current rate, KVP doubles your money in a fixed number of months.",
    howItWorks: [
      `KVP pays ${PO_RATES.kvp}% a year and doubles the deposit in ${PO_RATES.kvpMonths} months, about ${kvpYears} years. ${RATE_NOTE}`,
      "The number of months to double depends on the rate in force when you invest.",
      "Interest is taxable. The certificate is transferable.",
    ],
    formula: {
      expression: "Maturity = 2 × P",
      legend: [
        "P = amount invested",
        `Paid after ${PO_RATES.kvpMonths} months at ${PO_RATES.kvp}% a year`,
      ],
    },
    example: {
      title: `${inr(principal)} in KVP at ${PO_RATES.kvp}%`,
      steps: [
        `Maturity value = 2 × ${inr(principal)} = ${inr(maturity)}.`,
        `Gain = ${inr(maturity - principal)}, received after ${PO_RATES.kvpMonths} months.`,
        `That is about ${kvpYears} years, nearly twice the 5-year term of NSC or a 5-year TD.`,
      ],
    },
    table: {
      caption: `KVP maturity at ${PO_RATES.kvp}% (${PO_RATES.kvpMonths} months)`,
      head: ["Invested", "Maturity value", "Gain"],
      rows: amounts.map((a) => {
        const m = poKvpMaturity(a);
        return [inr(a), inr(m), inr(m - a)];
      }),
    },
    tips: [
      "KVP suits money you will not need for the full term.",
      `Its ${PO_RATES.kvp}% matches the 5-year TD, but the term is longer, so compare the two before choosing.`,
      "Plan for tax on the interest, as KVP gains are taxable.",
    ],
  };
}

function poMisGuide(): CalcGuide {
  const principal = 9_00_000;
  const monthly = poMisMonthly(principal);
  const amounts = [1_00_000, 4_50_000, 9_00_000, 15_00_000];
  return {
    intro:
      "The Post Office MIS calculator shows the monthly income from a Monthly Income Scheme deposit. Enter the amount to see the monthly and yearly payout.",
    howItWorks: [
      `MIS pays ${PO_RATES.mis}% a year as monthly interest for a 5-year tenure. ${RATE_NOTE}`,
      "The maximum deposit is ₹9 lakh in a single account and ₹15 lakh in a joint account.",
      "Your principal comes back after 5 years. The monthly interest is taxable.",
    ],
    formula: {
      expression: "Monthly income = P × r ÷ 12",
      legend: [
        "P = amount deposited",
        `r = ${PO_RATES.mis}% a year (as a decimal)`,
      ],
    },
    example: {
      title: `${inr(principal)} in a single MIS account`,
      steps: [
        `Yearly interest = ${inr(principal)} × ${PO_RATES.mis}% = ${inr(monthly * 12)}.`,
        `Monthly income = ${inr(monthly * 12)} ÷ 12 = ${inr(monthly)}.`,
        `Over 5 years you receive ${inr(monthly * 60)} in interest.`,
        `At the end of 5 years, the ${inr(principal)} is returned.`,
      ],
    },
    table: {
      caption: `MIS income at ${PO_RATES.mis}%`,
      head: ["Deposit", "Monthly income", "Yearly income", "5-year interest"],
      rows: amounts.map((a) => {
        const m = poMisMonthly(a);
        return [inr(a), inr(m), inr(m * 12), inr(m * 60)];
      }),
    },
    tips: [
      `Each ${inr(10_000)} deposited pays about ${inr(poMisMonthly(10_000))} a month.`,
      "A joint account allows up to ₹15 lakh, for a larger monthly income.",
      "MIS interest is simple and paid out, so it does not compound unless you reinvest it.",
    ],
  };
}

function poScssGuide(): CalcGuide {
  const principal = 30_00_000;
  const quarterly = poScssQuarterly(principal);
  const amounts = [5_00_000, 10_00_000, 20_00_000, 30_00_000];
  return {
    intro:
      "The SCSS calculator shows the quarterly interest from a Senior Citizen Savings Scheme deposit. Enter the amount and your age to see the quarterly and yearly income.",
    howItWorks: [
      `SCSS pays ${PO_RATES.scss}% a year, one of the highest small savings rates, with interest paid every quarter. ${RATE_NOTE}`,
      "It is generally for people aged 60 or above, with limited early-retirement exceptions. The maximum deposit is ₹30 lakh.",
      "The tenure is 5 years and can be extended. Interest is taxable, and Section 80TTB may help seniors.",
    ],
    formula: {
      expression: "Quarterly interest = P × r ÷ 4",
      legend: [
        "P = amount deposited",
        `r = ${PO_RATES.scss}% a year (as a decimal)`,
      ],
    },
    example: {
      title: `${inr(principal)} in SCSS at ${PO_RATES.scss}%`,
      steps: [
        `Yearly interest = ${inr(principal)} × ${PO_RATES.scss}% = ${inr(quarterly * 4)}.`,
        `Quarterly interest = ${inr(quarterly * 4)} ÷ 4 = ${inr(quarterly)}.`,
        `Over 5 years you receive ${inr(quarterly * 20)} in interest.`,
        `The ${inrShort(principal)} principal comes back at maturity.`,
      ],
    },
    table: {
      caption: `SCSS income at ${PO_RATES.scss}%`,
      head: [
        "Deposit",
        "Quarterly interest",
        "Yearly interest",
        "Monthly equivalent",
      ],
      rows: amounts.map((a) => {
        const q = poScssQuarterly(a);
        return [inr(a), inr(q), inr(q * 4), inr((q * 4) / 12)];
      }),
    },
    tips: [
      `SCSS pays more than MIS (${PO_RATES.mis}%), so seniors may prefer to fill SCSS first.`,
      "Interest arrives every quarter, so keep a small buffer for monthly spending.",
      "Check your eligibility and the latest rules at India Post before you deposit.",
    ],
  };
}

function poSsyGuide(): CalcGuide {
  const yearly = 1_50_000;
  const { afterDeposits, maturity } = ssyMaturity(yearly);
  const invested = yearly * SSY_DEPOSIT_YEARS;
  const amounts = [25_000, 50_000, 1_00_000, 1_50_000];
  return {
    intro:
      "The Sukanya Samriddhi calculator projects the maturity value of an SSY account for a girl child. Enter the yearly deposit and her age at opening to see the tax-free maturity amount.",
    howItWorks: [
      `SSY pays ${PO_RATES.ssy}% a year, compounded yearly. ${RATE_NOTE}`,
      `The account is opened before she turns 10. The calculator assumes deposits for ${SSY_DEPOSIT_YEARS} years, then growth until ${SSY_TOTAL_YEARS} years from opening.`,
      "The calculator allows up to ₹1.5 lakh a year. SSY is EEE, so the interest is tax-free under current rules.",
    ],
    formula: {
      expression:
        "A15 = P × [((1 + i)^15 − 1) ÷ i] × (1 + i); A21 = A15 × (1 + i)^6",
      legend: [
        "P = yearly deposit (made at the start of each year)",
        `i = ${PO_RATES.ssy}% a year (as a decimal)`,
        "No deposits are made in years 16 to 21",
      ],
    },
    example: {
      title: `${inr(yearly)} a year, opened when she is 2`,
      steps: [
        `Total deposited over ${SSY_DEPOSIT_YEARS} years = ${inr(invested)}.`,
        `Balance after ${SSY_DEPOSIT_YEARS} years = ${inr(afterDeposits)}.`,
        `With 6 more years of growth, the account matures at ${inr(maturity)} when she is about ${2 + SSY_TOTAL_YEARS}.`,
        `Tax-free gain = ${inr(maturity - invested)}.`,
      ],
    },
    table: {
      caption: `SSY maturity at ${PO_RATES.ssy}%`,
      head: [
        "Yearly deposit",
        "Total deposited",
        "After 15 years",
        "At 21 years",
      ],
      rows: amounts.map((a) => {
        const r = ssyMaturity(a);
        return [
          inr(a),
          inrShort(a * SSY_DEPOSIT_YEARS),
          inrShort(r.afterDeposits),
          inrShort(r.maturity),
        ];
      }),
    },
    tips: [
      "Open the account early; the maturity date is fixed from the opening date.",
      "Deposit at the start of the year, as the calculator assumes, so each deposit earns a full year.",
      `SSY interest at ${PO_RATES.ssy}% is tax-free, while TD, NSC, KVP and MIS interest is taxable.`,
      "Confirm eligibility and withdrawal rules at India Post before you open the account.",
    ],
  };
}

export const POST_OFFICE_GUIDES: Record<string, () => CalcGuide> = {
  po: poGuide,
  "po-savings": poSavingsGuide,
  "po-td": poTdGuide,
  "po-rd": poRdGuide,
  nsc: nscGuide,
  "po-kvp": poKvpGuide,
  "po-mis": poMisGuide,
  "po-scss": poScssGuide,
  "po-ssy": poSsyGuide,
};
