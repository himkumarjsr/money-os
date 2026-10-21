/**
 * Long-form guides for the loan, debt and big-purchase calculators. Every
 * number is computed from the same engines the calculators use. Where a
 * calculator's maths lives only inside its React component (car, rent vs buy,
 * rent vs own car, when to buy a car), a small local helper below reproduces
 * that component's maths exactly. Illustrative only, not advice.
 */

import {
  balanceTransfer,
  creditCardPayoff,
  type Debt,
  debtPayoff,
  downPaymentPlan,
  educationLoan,
  emiFor,
  flatToReducing,
  goldLoan,
  loanEligibility,
  prepayVsInvest,
} from "@/lib/advisorCalculators";

import { type CalcGuide, inr, inrShort } from "./shared";

/** "2 years 3 months" style duration; "Never" when the debt never clears. */
function dur(months: number): string {
  if (!Number.isFinite(months)) return "Never";
  const m = Math.round(months);
  const y = Math.floor(m / 12);
  const rest = m % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} year${y === 1 ? "" : "s"}`);
  if (rest > 0 || y === 0) parts.push(`${rest} month${rest === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/** Rupees with a proper minus sign, e.g. −₹4,329 for a loss. */
function signedInr(n: number): string {
  return n < 0 ? `−${inr(-n)}` : inr(n);
}

function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Mirrors CarLoanCalculator: EMI, interest and the 40% / 6× salary checks. */
function carLoan(p: {
  price: number;
  downPct: number;
  ratePct: number;
  years: number;
  salary: number;
}) {
  const loan = p.price * (1 - p.downPct / 100);
  const months = p.years * 12;
  const emi = emiFor(loan, p.ratePct, months);
  const interest = emi * months - loan;
  const emiPct = p.salary > 0 ? (emi / p.salary) * 100 : 0;
  return { loan, emi, interest, emiPct, priceCap: 6 * p.salary };
}

/** Mirrors RentVsBuyCalculator: 20% down, loan repaid over the years you stay. */
function rentVsBuy(p: {
  price: number;
  rent: number;
  ratePct: number;
  years: number;
}) {
  const down = p.price * 0.2;
  const months = p.years * 12;
  const emi = emiFor(p.price - down, p.ratePct, months);
  return {
    down,
    emi,
    buyOutflow: down + emi * months,
    rentOutflow: p.rent * 12 * p.years,
  };
}

/** Mirrors RentVsOwnCarCalculator: 5-year straight-line depreciation + ₹4/km. */
function rentVsOwnCar(p: { km: number; cabPerKm: number; price: number }) {
  const depreciation = p.price / 60;
  return {
    depreciation,
    running: p.km * 4,
    own: depreciation + p.km * 4,
    cab: p.km * p.cabPerKm,
    breakEvenKm: p.cabPerKm > 4 ? depreciation / (p.cabPerKm - 4) : Infinity,
  };
}

/** Mirrors WhenToBuyCarCalculator: 20% down target and the 6× salary cap. */
function whenToBuyCar(p: { income: number; price: number; save: number }) {
  const down = p.price * 0.2;
  return {
    down,
    months: p.save > 0 ? Math.ceil(down / p.save) : Infinity,
    cap: p.income * 6,
  };
}

function carGuide(): CalcGuide {
  const input = {
    price: 10_00_000,
    downPct: 20,
    ratePct: 9.5,
    years: 5,
    salary: 1_80_000,
  };
  const res = carLoan(input);
  const loans = [5_00_000, 8_00_000, 10_00_000, 15_00_000];
  const tenures = [3, 5, 7];
  return {
    intro:
      "A car loan calculator shows the monthly EMI, the total interest and whether the car fits your salary. Enter the car price, down payment, rate, tenure and your monthly salary.",
    howItWorks: [
      "The loan is the car price minus your down payment. The EMI uses the standard reducing-balance formula, so each month's interest is charged only on what you still owe.",
      "The calculator then runs two checks. It flags an EMI above 30% of your monthly salary as a caution, and above 40% as too high.",
      "It also flags a car priced above six times your monthly salary, which is half a year's pay. Car loans run 3 to 7 years in this tool.",
    ],
    formula: {
      expression: "EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1)",
      legend: [
        "P = car price − down payment",
        "r = yearly interest rate ÷ 12 (as a decimal)",
        "n = tenure in months",
      ],
    },
    example: {
      title: `${inrShort(input.price)} car, ${input.downPct}% down, ${input.ratePct}% for ${input.years} years`,
      steps: [
        `Down payment = ${inr(input.price - res.loan)}, so the loan is ${inr(res.loan)}.`,
        `EMI = ${inr(res.emi)} for ${input.years * 12} months, with total interest of ${inr(res.interest)}.`,
        `On a ${inr(input.salary)} monthly salary, the EMI is ${pct(res.emiPct)} of pay, well under the 30% caution mark.`,
        `Six times salary is ${inrShort(res.priceCap)}, so the ${inrShort(input.price)} car passes the price check too.`,
      ],
    },
    table: {
      caption: `Car loan EMI at ${input.ratePct}% a year (assumed rate)`,
      head: ["Loan", ...tenures.map((y) => `${y} years`)],
      rows: loans.map((l) => [
        inrShort(l),
        ...tenures.map((y) => inr(emiFor(l, input.ratePct, y * 12))),
      ]),
    },
    tips: [
      "A bigger down payment cuts both the EMI and the total interest. Aim to fund running costs from salary, not the loan.",
      "A shorter tenure costs less overall. Pick the shortest one whose EMI stays under 30% of your pay.",
      "Dealer and some used-car loans quote a flat rate. Convert it to the reducing rate before you compare offers.",
      "Insurance, fuel and servicing come on top of the EMI. Budget for them before you choose the car.",
    ],
  };
}

function loanEligibilityGuide(): CalcGuide {
  const income = 1_00_000;
  const existing = 10_000;
  const foir = 50;
  const rate = 8.5;
  const years = 20;
  const res = loanEligibility({
    monthlyIncome: income,
    existingEmis: existing,
    foirPct: foir,
    ratePct: rate,
    years,
  });
  const clear = loanEligibility({
    monthlyIncome: income,
    existingEmis: 0,
    foirPct: foir,
    ratePct: rate,
    years,
  });
  const incomes = [50_000, 75_000, 1_00_000, 1_50_000, 2_00_000];
  const foirs = [40, 50, 60];
  return {
    intro:
      "A loan eligibility calculator shows the largest loan a lender may give you and the EMI that comes with it. Enter your take-home pay, existing EMIs, the rate, the tenure and the FOIR limit.",
    howItWorks: [
      "Lenders cap your total EMIs at a share of your take-home pay, called FOIR. Your existing EMIs come off that cap first, and what is left is the most your new EMI can be.",
      "The calculator turns that EMI into a loan amount at your rate and tenure. It then applies the RBI loan-to-value limit to show the home price you could buy.",
      "The result is a ceiling, not a target. Lenders also weigh your credit score, age and job stability.",
    ],
    formula: {
      expression:
        "Max EMI = income × FOIR − existing EMIs;  Loan = EMI × (1 − (1 + r)^−n) ÷ r",
      legend: [
        "income = net monthly take-home pay",
        "FOIR = share of income allowed for all EMIs",
        "r = yearly interest rate ÷ 12, n = tenure in months",
      ],
    },
    example: {
      title: `${inr(income)} take-home, ${inr(existing)} existing EMI, ${rate}% for ${years} years`,
      steps: [
        `At ${foir}% FOIR, total EMIs can be ${inr((income * foir) / 100)}. After the existing EMI, the new EMI can be ${inr(res.maxEmi)}.`,
        `That EMI supports a loan of about ${inrShort(res.loan)} at ${rate}% over ${years} years.`,
        `The bank funds up to ${Math.round(res.ltv * 100)}% of the price at this loan size, so the home could cost about ${inrShort(res.propertyValue)}.`,
        `Closing the ${inr(existing)} EMI first lifts the loan to ${inrShort(clear.loan)}, about ${inrShort(clear.loan - res.loan)} more.`,
      ],
    },
    table: {
      caption: `Eligible loan at ${rate}% for ${years} years, no existing EMIs`,
      head: ["Take-home pay", ...foirs.map((f) => `FOIR ${f}%`)],
      rows: incomes.map((inc) => [
        inr(inc),
        ...foirs.map((f) =>
          inrShort(
            loanEligibility({
              monthlyIncome: inc,
              existingEmis: 0,
              foirPct: f,
              ratePct: rate,
              years,
            }).loan,
          ),
        ),
      ]),
    },
    tips: [
      "Borrow less than the limit. Many planners suggest keeping all EMIs within 30% to 40% of take-home pay.",
      "Clear small loans before you apply. Every rupee of existing EMI cuts your new loan by much more.",
      "A longer tenure raises eligibility but adds a lot of interest. Check both before you stretch it.",
      "A co-applicant's income is added to yours, along with their EMIs.",
    ],
  };
}

function prepayVsInvestGuide(): CalcGuide {
  const outstanding = 30_00_000;
  const rate = 8.5;
  const years = 15;
  const lumpsum = 5_00_000;
  const ret = 11;
  const res = prepayVsInvest({
    outstanding,
    ratePct: rate,
    monthsLeft: years * 12,
    lumpsum,
    investReturnPct: ret,
  });
  const returns = [7, 8.5, 10, 12];
  return {
    intro:
      "A prepay vs invest calculator compares two uses of spare money: paying down your loan or investing it. Enter the loan balance, rate, years left, the spare amount and your expected after-tax return.",
    howItWorks: [
      "Prepay path: the spare money reduces the loan, and you keep paying the same EMI. The loan closes early. From then until the original end date, the freed EMI is invested every month.",
      "Invest path: the loan runs as before, and the spare money is invested once and compounds yearly until the original end date.",
      "The calculator compares the wealth from each path on the original loan end date. It also shows the interest saved and how much earlier the loan ends.",
    ],
    example: {
      title: `${inrShort(outstanding)} left at ${rate}%, ${years} years to go, ${inrShort(lumpsum)} spare`,
      steps: [
        `The EMI is ${inr(res.emi)}. After a ${inrShort(lumpsum)} prepayment, the same EMI clears the loan in ${dur(res.newMonths)}.`,
        `The loan ends ${dur(res.monthsSaved)} early and you save ${inr(res.interestSaved)} in interest.`,
        `Investing the freed EMI at ${ret}% for those months builds ${inrShort(res.prepayWealth)}.`,
        `Investing ${inrShort(lumpsum)} today at ${ret}% for ${years} years builds ${inrShort(res.investWealth)}, so ${res.prepayWealth >= res.investWealth ? "prepaying" : "investing"} comes out ahead.`,
      ],
    },
    table: {
      caption: `${inrShort(lumpsum)} on a ${inrShort(outstanding)} loan at ${rate}%, ${years} years left`,
      head: [
        "Return if invested",
        "Prepay, then invest EMIs",
        "Invest now",
        "Ahead",
      ],
      rows: returns.map((r) => {
        const x = prepayVsInvest({
          outstanding,
          ratePct: rate,
          monthsLeft: years * 12,
          lumpsum,
          investReturnPct: r,
        });
        return [
          `${r}%`,
          inrShort(x.prepayWealth),
          inrShort(x.investWealth),
          x.prepayWealth >= x.investWealth ? "Prepay" : "Invest",
        ];
      }),
    },
    tips: [
      "Use an after-tax return you can count on, not a best-case figure. The saving from prepaying is certain; market returns are not.",
      "Keep your emergency fund intact before you prepay. Money paid into a loan is hard to get back.",
      "Under the old regime, home loan interest is deductible under Section 24(b), which lowers your real loan cost.",
      "Prepayments early in the loan save the most interest, because the balance is highest then.",
    ],
  };
}

function balanceTransferGuide(): CalcGuide {
  const outstanding = 40_00_000;
  const current = 9.5;
  const next = 8.5;
  const years = 15;
  const feePct = 0.5;
  const other = 10_000;
  const res = balanceTransfer({
    outstanding,
    currentRatePct: current,
    newRatePct: next,
    monthsLeft: years * 12,
    feePct,
    otherCharges: other,
  });
  const cuts = [0.25, 0.5, 0.75, 1];
  const spans = [5, 10, 15];
  return {
    intro:
      "A balance transfer calculator shows what you save by moving your home loan to a lower rate, after fees. Enter the balance, years left, both rates, the processing fee and other charges.",
    howItWorks: [
      "The calculator works out the EMI at your current rate and at the new rate, keeping the same years left. The EMI gap times the months left is the gross saving.",
      "From that it subtracts the switching cost: the processing fee plus 18% GST on it, and the legal, valuation and other charges you enter.",
      "It also shows the break-even point, the month when the lower EMIs have paid back those costs.",
    ],
    formula: {
      expression:
        "Net saving = (old EMI − new EMI) × months left − (fee × 1.18 + other charges)",
      legend: [
        "Both EMIs use the same outstanding balance and months left",
        "fee = outstanding × processing fee %",
      ],
    },
    example: {
      title: `${inrShort(outstanding)}, ${years} years left, ${current}% to ${next}%`,
      steps: [
        `The EMI falls from ${inr(res.oldEmi)} to ${inr(res.newEmi)}, a drop of ${inr(res.oldEmi - res.newEmi)} a month.`,
        `Over ${years * 12} months that is a gross saving of ${inr(res.grossSaving)}.`,
        `Switching costs ${inr(res.fees)}: a ${feePct}% fee with GST plus ${inr(other)} in other charges.`,
        `Net saving = ${inr(res.netSaving)}. The fees are recovered in ${dur(res.breakEvenMonths)}.`,
      ],
    },
    table: {
      caption: `Net saving on ${inrShort(outstanding)} from ${current}%, after a ${feePct}% fee and ${inr(other)} charges`,
      head: ["Rate cut", ...spans.map((y) => `${y} years left`)],
      rows: cuts.map((c) => [
        `${c}%`,
        ...spans.map((y) =>
          signedInr(
            balanceTransfer({
              outstanding,
              currentRatePct: current,
              newRatePct: current - c,
              monthsLeft: y * 12,
              feePct,
              otherCharges: other,
            }).netSaving,
          ),
        ),
      ]),
    },
    tips: [
      "Ask your current lender to match the new rate first. Many will reset it for a small fee.",
      "Keep the same tenure or shorter when you switch. Stretching it can wipe out the saving.",
      "A switch late in the loan saves little, because most of the interest is already paid. A small rate cut can even lose money after fees.",
      "Get every charge in writing before you apply, including legal and valuation fees.",
    ],
  };
}

function flatVsReducingGuide(): CalcGuide {
  const amount = 3_00_000;
  const flat = 10;
  const months = 24;
  const res = flatToReducing(amount, flat, months);
  const flats = [8, 10, 12, 14];
  const spans = [12, 24, 36, 60];
  return {
    intro:
      "A flat to reducing rate calculator shows the real interest rate behind a flat-rate loan offer. Enter the loan amount, the flat rate quoted and the tenure in months.",
    howItWorks: [
      "A flat rate charges interest on the full loan amount for the whole tenure, even as you repay it. The total interest is fixed on day one and spread evenly across the EMIs.",
      "The calculator works out that EMI, then finds the reducing-balance rate that gives the same EMI. That reducing rate is the true cost to compare with bank loans.",
    ],
    formula: {
      expression:
        "Interest = P × flat rate × years;  EMI = (P + interest) ÷ n;  then solve EMI = P × r × (1 + r)^n ÷ ((1 + r)^n − 1) for r",
      legend: [
        "P = loan amount, n = tenure in months",
        "r = reducing monthly rate; × 12 gives the real yearly rate",
        "r has no closed form, so the calculator finds it by trial",
      ],
    },
    example: {
      title: `${inrShort(amount)} at ${flat}% flat for ${months} months`,
      steps: [
        `Interest = ${inr(amount)} × ${flat}% × ${months / 12} years = ${inr(res.totalInterest)}.`,
        `EMI = (${inr(amount)} + ${inr(res.totalInterest)}) ÷ ${months} = ${inr(res.emi)}.`,
        `The reducing rate that gives the same EMI is ${pct(res.effectivePct)} a year.`,
        `So the "${flat}%" offer really costs about ${pct(res.effectivePct)}.`,
      ],
    },
    table: {
      caption: "Real reducing-balance rate for a flat rate",
      head: ["Flat rate", ...spans.map((m) => `${m} months`)],
      rows: flats.map((f) => [
        `${f}%`,
        ...spans.map((m) => pct(flatToReducing(amount, f, m).effectivePct)),
      ]),
    },
    tips: [
      "Ask for the reducing-balance rate (APR) in writing. Lenders must state it in the key fact statement.",
      "Compare EMIs for the same amount and tenure, and add processing fees to the cost.",
      "Prepaying a flat-rate loan often saves far less interest than you expect. Check the terms first.",
      "Flat rates are common in consumer durable, some two-wheeler and used-car loans.",
    ],
  };
}

function creditCardGuide(): CalcGuide {
  const balance = 1_00_000;
  const monthlyRate = 3.75;
  const minPct = 5;
  const fixed = 10_000;
  const res = creditCardPayoff({
    balance,
    monthlyRatePct: monthlyRate,
    minDuePct: minPct,
    fixedPayment: fixed,
  });
  const firstInterest = (balance * monthlyRate) / 100;
  const payments = [5_000, 10_000, 20_000, 30_000];
  return {
    intro:
      "A credit card interest calculator shows how long a card balance takes to clear and the interest you pay. Enter the balance, the monthly rate, the minimum due percentage and a fixed amount you could pay.",
    howItWorks: [
      "Each month the calculator adds interest on the unpaid balance, plus 18% GST on that interest. It then takes off your payment and repeats until the balance is cleared.",
      "It runs this twice. Once paying only the minimum due, which shrinks as the balance shrinks (never below ₹200). Once paying your fixed amount every month.",
      "If a payment does not cover the month's interest and GST, the balance never clears.",
    ],
    formula: {
      expression:
        "Next balance = balance + interest × 1.18 − payment;  interest = balance × monthly rate",
      legend: [
        `Minimum due = the larger of ₹200 and ${minPct}% of the balance (as set in the tool)`,
        "1.18 adds 18% GST on the interest",
      ],
    },
    example: {
      title: `${inrShort(balance)} balance at ${monthlyRate}% a month`,
      steps: [
        `First month: interest is ${inr(firstInterest)} plus ${inr(firstInterest * 0.18)} GST, so ${inr(firstInterest * 1.18)} is added.`,
        `Paying only the ${minPct}% minimum takes ${dur(res.minimum.months)} and costs ${inr(res.minimum.interest)} in interest and GST.`,
        `Paying a fixed ${inr(fixed)} a month clears it in ${dur(res.fixed.months)} for ${inr(res.fixed.interest)}.`,
        `A ${monthlyRate}% monthly rate is ${pct(monthlyRate * 12, 0)} a year before GST.`,
      ],
    },
    table: {
      caption: `Clearing ${inrShort(balance)} at ${monthlyRate}% a month plus GST`,
      head: ["Monthly payment", "Time to clear", "Interest + GST"],
      rows: [
        [
          `Minimum due (${minPct}%)`,
          dur(res.minimum.months),
          inr(res.minimum.interest),
        ],
        ...payments.map((p) => {
          const x = creditCardPayoff({
            balance,
            monthlyRatePct: monthlyRate,
            minDuePct: minPct,
            fixedPayment: p,
          }).fixed;
          return [inr(p), dur(x.months), inr(x.interest)];
        }),
      ],
    },
    tips: [
      "Pay the full bill by the due date. That is the only way card spending stays interest-free.",
      "If you cannot, pay a fixed amount well above the minimum. Stop new spends on the card until it is cleared.",
      "A cheaper personal loan used to clear card debt usually saves a lot. Compare its reducing rate and fees first.",
      "Clear card debt before you raise SIPs. Few investments return as much as the card charges.",
    ],
  };
}

function debtPayoffGuide(): CalcGuide {
  const debts: Debt[] = [
    { name: "Credit card", balance: 80_000, ratePct: 42, minEmi: 4_000 },
    { name: "Personal loan", balance: 3_00_000, ratePct: 14, minEmi: 10_000 },
    { name: "Consumer loan", balance: 40_000, ratePct: 16, minEmi: 3_500 },
  ];
  const extra = 5_000;
  const a = debtPayoff(debts, extra, "avalanche");
  const s = debtPayoff(debts, extra, "snowball");
  const minTotal = debts.reduce((sum, d) => sum + d.minEmi, 0);
  const extras = [0, 5_000, 10_000, 20_000];
  const orderText = (o: { name: string; month: number }[]) =>
    o.map((x) => `${x.name.toLowerCase()} (month ${x.month})`).join(", ");
  return {
    intro:
      "A debt payoff calculator shows when you will be debt-free and the total interest, using the avalanche or snowball method. Enter each loan's balance, rate and minimum EMI, plus any extra you can pay monthly.",
    howItWorks: [
      "Each month every debt earns interest, and every debt gets its minimum payment. Any money left over goes to one target debt.",
      "Avalanche targets the debt with the highest interest rate. Snowball targets the smallest balance.",
      "When a debt is cleared, its minimum payment joins the extra and moves to the next target. Your monthly budget stays the same until you are debt-free.",
    ],
    example: {
      title: `Three debts, ${inr(minTotal + extra)} a month in total`,
      steps: [
        `Credit card ${inr(80_000)} at 42%, personal loan ${inrShort(3_00_000)} at 14%, consumer loan ${inr(40_000)} at 16%. Minimums add up to ${inr(minTotal)}, plus ${inr(extra)} extra.`,
        `Avalanche clears them in this order: ${orderText(a.order)}. Debt-free in ${dur(a.months)}, with ${inr(a.interest)} of interest.`,
        `Snowball clears them in this order: ${orderText(s.order)}. Debt-free in ${dur(s.months)}, with ${inr(s.interest)} of interest.`,
        `Avalanche saves ${inr(Math.max(0, s.interest - a.interest))} here.`,
      ],
    },
    table: {
      caption: `The same three debts with different extra payments`,
      head: [
        "Extra a month",
        "Debt-free in (avalanche)",
        "Interest (avalanche)",
        "Interest (snowball)",
      ],
      rows: extras.map((x) => {
        const av = debtPayoff(debts, x, "avalanche");
        const sn = debtPayoff(debts, x, "snowball");
        return [inr(x), dur(av.months), inr(av.interest), inr(sn.interest)];
      }),
    },
    tips: [
      "Pay the minimum on every debt every month, so nothing goes overdue.",
      "Avalanche is always cheaper on paper. Snowball can help if quick wins keep you going.",
      "Put bonuses and tax refunds straight into the target debt.",
      "Keep a small emergency fund so a surprise bill does not go back on the card.",
    ],
  };
}

function educationLoanGuide(): CalcGuide {
  const amount = 15_00_000;
  const rate = 10.5;
  const course = 2;
  const repayYears = 10;
  const slab = 30;
  const base = {
    ratePct: rate,
    moratoriumMonths: course * 12 + 12,
    repayYears,
    slabPct: slab,
  };
  const unpaid = educationLoan({
    ...base,
    amount,
    payInterestDuringStudy: false,
  });
  const paid = educationLoan({ ...base, amount, payInterestDuringStudy: true });
  const amounts = [5_00_000, 10_00_000, 15_00_000, 25_00_000];
  return {
    intro:
      "An education loan calculator shows the EMI (Equated Monthly Instalment) after the study period, the interest that builds up meanwhile and the Section 80E tax saving. Enter the loan, rate, course length, repayment years and tax slab.",
    howItWorks: [
      "No EMI is due during the moratorium. The calculator sets it at the course length plus one year. Simple interest still runs on the loan for that whole period.",
      "If you do not pay that interest as you go, it is added to the loan. The EMI is then worked out on the bigger amount over your repayment years.",
      "For the tax saving, it adds up the interest in the first 8 years of EMIs. It multiplies that by your slab rate plus 4% cess, as allowed under 80E in the old regime.",
    ],
    formula: {
      expression:
        "Study-period interest = P × rate × months ÷ 12;  EMI on (P + unpaid interest)",
      legend: [
        "P = loan amount",
        "months = course length + 12",
        "EMI uses the standard reducing-balance formula",
      ],
    },
    example: {
      title: `${inrShort(amount)} at ${rate}% for a ${course}-year course, repaid over ${repayYears} years`,
      steps: [
        `The moratorium is ${course * 12 + 12} months. Interest for that time = ${inr(unpaid.moratoriumInterest)}.`,
        `Left unpaid, it grows the loan to ${inr(unpaid.principalAtRepay)}, and the EMI is ${inr(unpaid.emi)}.`,
        `Paying that interest while studying keeps the EMI at ${inr(paid.emi)}. Total interest falls from ${inr(unpaid.totalInterest)} to ${inr(paid.totalInterest)}.`,
        `In the ${slab}% slab, 80E saves about ${inr(unpaid.tax80E)} in tax over 8 years if the interest was added.`,
      ],
    },
    table: {
      caption: `${rate}%, ${course}-year course + 1 year, repaid over ${repayYears} years`,
      head: [
        "Loan",
        "Study-period interest",
        "EMI if interest added",
        "EMI if interest paid",
      ],
      rows: amounts.map((amt) => {
        const u = educationLoan({
          ...base,
          amount: amt,
          payInterestDuringStudy: false,
        });
        const p = educationLoan({
          ...base,
          amount: amt,
          payInterestDuringStudy: true,
        });
        return [
          inrShort(amt),
          inr(u.moratoriumInterest),
          inr(u.emi),
          inr(p.emi),
        ];
      }),
    },
    tips: [
      "Pay the simple interest during the course if a parent can. It stops the loan from growing.",
      "The 80E saving depends on the tax slab of the person claiming it. It applies only in the old regime.",
      "Prepay from your first salaries if you can. Prepayments early in the loan save the most interest.",
      "The rates here are assumptions. Compare lenders on the rate, the moratorium length and the fees.",
    ],
  };
}

function goldLoanGuide(): CalcGuide {
  const grams = 50;
  const price = 1_25_000;
  const rate = 10;
  const months = 12;
  const res = goldLoan({
    grams,
    purity: "22K",
    rate24kPer10g: price,
    ratePct: rate,
    months,
  });
  const weights = [10, 25, 50, 100];
  return {
    intro:
      "A gold loan calculator shows how much you can borrow against your gold and the interest you will pay. Enter the weight, purity, today's 24K price, the rate and the tenure.",
    howItWorks: [
      "The calculator values your gold by its pure gold content. It multiplies the weight by the purity (91.6% for 22K, 75% for 18K) and by the 24K price.",
      "It then applies the RBI loan-to-value tiers: 85% for loans up to ₹2.5 lakh, 80% up to ₹5 lakh, 75% above.",
      "It shows two ways to repay: simple interest paid with the principal at the end (bullet), or a monthly EMI.",
    ],
    formula: {
      expression:
        "Gold value = grams × purity × (24K price per 10 g ÷ 10);  Loan = value × LTV",
      legend: [
        "purity = 0.999 for 24K, 0.916 for 22K, 0.75 for 18K",
        "Bullet interest = loan × rate × months ÷ 12",
      ],
    },
    example: {
      title: `${grams} g of 22K gold, 24K at ${inr(price)} per 10 g (assumed), ${rate}% for ${months} months`,
      steps: [
        `Gold value = ${grams} × 0.916 × ${inr(price / 10)} = ${inr(res.value)}.`,
        `At this size the 80% tier applies, so the maximum loan is ${inr(res.maxLoan)}.`,
        `Bullet repayment: ${inr(res.interest)} of interest, paid with the principal at the end.`,
        `Or an EMI of ${inr(res.emi)} for ${months} months.`,
      ],
    },
    table: {
      caption: `22K gold at ${inr(price)} per 10 g of 24K (assumed price)`,
      head: ["Weight", "Gold value", "Maximum loan", "LTV"],
      rows: weights.map((g) => {
        const x = goldLoan({
          grams: g,
          purity: "22K",
          rate24kPer10g: price,
          ratePct: rate,
          months,
        });
        return [`${g} g`, inr(x.value), inr(x.maxLoan), pct(x.ltvPct, 0)];
      }),
    },
    tips: [
      "Enter today's gold price. The loan amount moves with it.",
      "Borrow only what you need, not the maximum. A smaller loan costs less interest.",
      "The rate here is an assumption. Compare lenders on rate, fees and repayment options.",
      "A gold loan suits a short, known need. Do not use it for regular spending.",
    ],
  };
}

function downPaymentGuide(): CalcGuide {
  const input = {
    priceToday: 80_00_000,
    downPct: 20,
    costsPct: 7,
    years: 5,
    appreciationPct: 6,
    savings: 5_00_000,
    returnPct: 9,
    loanRatePct: 8.5,
    loanYears: 20,
  };
  const res = downPaymentPlan(input);
  const spans = [3, 5, 7, 10];
  return {
    intro:
      "A down payment calculator shows how much to save each month to buy a home on time. Enter today's price, years to purchase, down payment and costs, price growth, your savings and their return.",
    howItWorks: [
      "First it grows today's home price by your expected price growth to the year you buy. Then it adds your down payment share and the extra costs, such as stamp duty, registration and interiors.",
      "Your existing savings grow at your expected return. The gap left is covered by a monthly saving, worked out like a goal SIP.",
      "It also shows the home loan you will need then, and its EMI at an assumed 8.5% over 20 years.",
    ],
    formula: {
      expression:
        "Upfront need = price × (1 + g)^t × (down % + costs %);  Gap = need − savings × (1 + i)^t",
      legend: [
        "g = yearly price growth, t = years until you buy",
        "i = yearly return on your savings",
        "Monthly saving = gap × r ÷ ((1 + r)^n − 1), r = i ÷ 12, n = t × 12",
      ],
    },
    example: {
      title: `${inrShort(input.priceToday)} home in ${input.years} years, ${input.downPct}% down + ${input.costsPct}% costs`,
      steps: [
        `At ${input.appreciationPct}% a year, the home costs ${inrShort(res.futurePrice)} in ${input.years} years.`,
        `You need ${input.downPct + input.costsPct}% upfront: ${inr(res.needed)}.`,
        `Your ${inrShort(input.savings)} saved grows to ${inr(res.savingsFV)} at ${input.returnPct}%, leaving a gap of ${inr(res.gap)}.`,
        `Save ${inr(res.sip)} a month. The loan will be ${inrShort(res.loan)}, with an EMI of ${inr(res.emi)}.`,
      ],
    },
    table: {
      caption: `${inrShort(input.priceToday)} home today, ${input.appreciationPct}% price growth, ${inrShort(input.savings)} saved at ${input.returnPct}%`,
      head: ["Years to buy", "Price then", "Upfront needed", "Monthly saving"],
      rows: spans.map((y) => {
        const x = downPaymentPlan({ ...input, years: y });
        return [
          `${y} years`,
          inrShort(x.futurePrice),
          inrShort(x.needed),
          inr(x.sip),
        ];
      }),
    },
    tips: [
      "A bigger down payment means a smaller loan and lower EMI for the next 20 years.",
      "Keep this money in safer options as the purchase date gets close, so a market fall does not delay it.",
      "Keep your emergency fund separate. Do not empty it for the down payment.",
      "Check the EMI against your future take-home pay before you fix the budget.",
    ],
  };
}

function rentBuyGuide(): CalcGuide {
  const input = { price: 1_00_00_000, rent: 28_000, ratePct: 8.5, years: 10 };
  const res = rentVsBuy(input);
  const spans = [5, 10, 15, 20];
  return {
    intro:
      "A rent vs buy calculator compares the cash you pay to own a home with the rent for a similar one. Enter the property price, the monthly rent, the loan rate and how long you plan to stay.",
    howItWorks: [
      "The calculator assumes you pay 20% down and borrow the rest. The loan is repaid over the years you plan to stay.",
      "Buying outflow is the down payment plus every EMI. Renting outflow is the monthly rent times the months you stay, kept flat.",
      "It is a cash-outflow comparison only. It leaves out property price changes, rent increases, tax benefits, maintenance, registration costs and what the down payment could earn if invested.",
    ],
    formula: {
      expression:
        "Buy = 20% of price + EMI × months;  Rent = monthly rent × months",
      legend: [
        "EMI is on 80% of the price, over the years you stay",
        "months = years you plan to stay × 12",
      ],
    },
    example: {
      title: `${inrShort(input.price)} home vs ${inr(input.rent)} rent, ${input.ratePct}% loan, ${input.years} years`,
      steps: [
        `Down payment = ${inrShort(res.down)}, and the loan is ${inrShort(input.price - res.down)}.`,
        `EMI over ${input.years} years = ${inr(res.emi)} a month, against rent of ${inr(input.rent)}.`,
        `Buying outflow = ${inrShort(res.buyOutflow)}. Renting outflow = ${inrShort(res.rentOutflow)}.`,
        `But after buying you own the home, which renting does not give you. Weigh that against the extra cash.`,
      ],
    },
    table: {
      caption: `${inrShort(input.price)} home, ${input.ratePct}% loan, ${inr(input.rent)} rent (not raised)`,
      head: ["Years you stay", "EMI", "Total paid to buy", "Total rent"],
      rows: spans.map((y) => {
        const x = rentVsBuy({ ...input, years: y });
        return [
          `${y} years`,
          inr(x.emi),
          inrShort(x.buyOutflow),
          inrShort(x.rentOutflow),
        ];
      }),
    },
    tips: [
      "A short stay favours renting, because the EMI is squeezed into fewer years.",
      "Add maintenance, stamp duty and registration to the buying side before you decide.",
      "Rent usually rises over time, and the calculator keeps it flat. Allow for that in your own view.",
      "Buy when you plan to stay long and the EMI fits comfortably within your pay.",
    ],
  };
}

function rentCarGuide(): CalcGuide {
  const input = { km: 1_200, cabPerKm: 12, price: 9_00_000 };
  const res = rentVsOwnCar(input);
  const kms = [500, 1_000, 1_500, 2_000, 3_000];
  return {
    intro:
      "A rent vs own car calculator compares your monthly cab cost with the estimated monthly cost of owning a car. Enter the kilometres you travel a month, the cab cost per km and the car price.",
    howItWorks: [
      "The cab cost is your monthly kilometres times the cost per km.",
      "The owned-car cost is the car price spread evenly over 5 years as depreciation, plus about ₹4 a km for fuel and maintenance.",
      "It is a rough guide. It leaves out insurance, parking, loan interest and the car's resale value.",
    ],
    formula: {
      expression:
        "Own = price ÷ 60 + km × ₹4;  Cab = km × cab rate;  break-even km = (price ÷ 60) ÷ (cab rate − ₹4)",
      legend: [
        "price ÷ 60 = depreciation per month over 5 years",
        "₹4 a km = fuel and maintenance (the tool's estimate)",
      ],
    },
    example: {
      title: `${inrShort(input.price)} car, ${input.km.toLocaleString("en-IN")} km a month, cabs at ₹${input.cabPerKm} a km`,
      steps: [
        `Depreciation = ${inr(input.price)} ÷ 60 = ${inr(res.depreciation)} a month.`,
        `Running cost = ${input.km.toLocaleString("en-IN")} km × ₹4 = ${inr(res.running)}, so owning costs about ${inr(res.own)} a month.`,
        `Cabs cost ${input.km.toLocaleString("en-IN")} × ₹${input.cabPerKm} = ${inr(res.cab)} a month.`,
        `Owning wins only above about ${Math.round(res.breakEvenKm).toLocaleString("en-IN")} km a month at these numbers.`,
      ],
    },
    table: {
      caption: `${inrShort(input.price)} car vs cabs at ₹${input.cabPerKm} a km, monthly cost`,
      head: ["Km a month", "Cabs", "Own car (est.)", "Cheaper"],
      rows: kms.map((km) => {
        const x = rentVsOwnCar({ ...input, km });
        return [
          km.toLocaleString("en-IN"),
          inr(x.cab),
          inr(x.own),
          x.cab < x.own ? "Cabs" : "Own",
        ];
      }),
    },
    tips: [
      "Use your real monthly kilometres from the last few months, not a guess.",
      "Depreciation is a cost even when you pay cash for the car.",
      "Add insurance and parking to the owned-car side for a fuller picture.",
      "If you buy, keep the price within your budget using the car loan or when-to-buy calculators.",
    ],
  };
}

function whenCarGuide(): CalcGuide {
  const input = { income: 1_50_000, price: 8_00_000, save: 15_000 };
  const res = whenToBuyCar(input);
  const prices = [6_00_000, 8_00_000, 10_00_000, 15_00_000];
  const saves = [10_000, 20_000, 30_000];
  return {
    intro:
      "A when-to-buy-a-car calculator shows how many months it takes to save a 20% down payment, and whether the car fits your income. Enter your monthly take-home, the car price and your monthly saving.",
    howItWorks: [
      "The down payment target is 20% of the car price. The calculator divides it by your monthly saving and rounds up to whole months. It does not add any return on the savings.",
      "It also checks the car price against six times your monthly take-home, which is half a year's pay. A car above that is flagged as too expensive.",
      "More than 24 months of saving is a caution, and more than 36 months is flagged as too slow.",
    ],
    formula: {
      expression:
        "Months = 20% of car price ÷ monthly saving (rounded up);  Price cap = 6 × monthly take-home",
      legend: ["Savings are not assumed to earn interest"],
    },
    example: {
      title: `${inrShort(input.price)} car, ${inr(input.income)} take-home, saving ${inr(input.save)} a month`,
      steps: [
        `20% down payment = ${inr(res.down)}.`,
        `At ${inr(input.save)} a month, that takes ${res.months} months.`,
        `Six times take-home is ${inrShort(res.cap)}, so the ${inrShort(input.price)} car is within the cap.`,
        `Both checks pass: under 24 months of saving and under the price cap.`,
      ],
    },
    table: {
      caption: "Months to save a 20% down payment",
      head: [
        "Car price",
        ...saves.map((s) => `Saving ${inr(s)}`),
        "Take-home needed",
      ],
      rows: prices.map((p) => [
        inrShort(p),
        ...saves.map(
          (s) => `${whenToBuyCar({ income: 0, price: p, save: s }).months}`,
        ),
        inr(p / 6),
      ]),
    },
    tips: [
      "If the wait is over two years, save more each month or choose a cheaper car.",
      "Keep the down payment money in a safe option such as an RD, since you need it soon.",
      "A bigger down payment means a smaller loan and lower EMI. Check the EMI with the car loan calculator.",
      "Keep your emergency fund separate from the car fund.",
    ],
  };
}

export const LOAN_GUIDES: Record<string, () => CalcGuide> = {
  car: carGuide,
  "loan-eligibility": loanEligibilityGuide,
  "prepay-vs-invest": prepayVsInvestGuide,
  "balance-transfer": balanceTransferGuide,
  "flat-vs-reducing": flatVsReducingGuide,
  "credit-card": creditCardGuide,
  "debt-payoff": debtPayoffGuide,
  "education-loan": educationLoanGuide,
  "gold-loan": goldLoanGuide,
  "down-payment": downPaymentGuide,
  rentbuy: rentBuyGuide,
  rentcar: rentCarGuide,
  whencar: whenCarGuide,
};
