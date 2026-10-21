/**
 * Guides for the investing calculators: compare, cost of delay, STP, compound
 * interest, CAGR, XIRR, expense ratio, asset allocation, inflation, money
 * doubling, EPF and gold. Every number comes from the same engines the
 * calculators use. Illustrative only, not advice.
 */

import {
  assetAllocation,
  cagr,
  expenseRatioDrag,
  fixedDeposit,
  goldCompare,
  inflate,
  lumpsumFV,
  realReturn,
  rebalance,
  sipDelayCost,
  stpPlan,
  xirr,
  yearsToMultiply,
  type Compounding,
  type RiskProfile,
} from "@/lib/advisorCalculators";
import {
  computeScenario,
  type GrowResult,
  type LoanResult,
  type Scenario,
} from "@/lib/compareScenarios";
import {
  EPF_DEFAULT_RATE_PCT,
  EPF_FINAL_AGE,
  computeEpfProjection,
} from "@/lib/epfCalculator";

import { type CalcGuide, inr, inrShort } from "./shared";

const pct = (n: number, digits = 2) => `${n.toFixed(digits)}%`;
const yrs = (n: number) => `${n.toFixed(1)} years`;

function grow(s: Scenario) {
  return computeScenario(s) as GrowResult;
}
function loan(s: Scenario) {
  return computeScenario(s) as LoanResult;
}

function compareGuide(): CalcGuide {
  const tenures = [15, 20, 25];
  const loans = tenures.map((years) =>
    loan({ kind: "loan", amount: 50_00_000, rate: 8.5, years, stepUp: 0 }),
  );
  const [l15, l20, l25] = loans;
  const rows: [string, Scenario][] = [
    [
      "SIP ₹12,500 a month at 10%",
      { kind: "sip", amount: 12_500, rate: 10, years: 15, stepUp: 0 },
    ],
    [
      "SIP ₹12,500 a month at 12%",
      { kind: "sip", amount: 12_500, rate: 12, years: 15, stepUp: 0 },
    ],
    [
      "Step-up SIP ₹12,500, +10% a year, at 12%",
      { kind: "stepup", amount: 12_500, rate: 12, years: 15, stepUp: 10 },
    ],
    [
      "PPF ₹1.5 lakh a year at 7.1%",
      { kind: "ppf", amount: 1_50_000, rate: 7.1, years: 15, stepUp: 0 },
    ],
  ];
  return {
    intro:
      "The compare calculator puts two or three scenarios side by side. Pick SIP, step-up SIP, lumpsum, FD, RD, PPF or a loan, set the amount, rate and tenure for each, and read the difference in rupees.",
    howItWorks: [
      "Each scenario runs through the same engine as its own calculator. Investment scenarios show the final value, the money you put in, the gain and how many times your money multiplied.",
      "Loan scenarios show the EMI, total interest, total paid and interest per rupee borrowed. Every scenario after A gets a one-line verdict against A.",
      "All results are pre-tax and assume a constant rate. Use it to see how much one change matters, not to predict exact returns.",
    ],
    example: {
      title: `${inrShort(50_00_000)} home loan at 8.5%: 15, 20 or 25 years`,
      steps: [
        `15 years: EMI ${inr(l15.emi)}, total interest ${inrShort(l15.totalInterest)}.`,
        `20 years: EMI ${inr(l20.emi)}, total interest ${inrShort(l20.totalInterest)}.`,
        `25 years: EMI ${inr(l25.emi)}, total interest ${inrShort(l25.totalInterest)}.`,
        `Going from 25 to 15 years raises the EMI by ${inr(l15.emi - l25.emi)} but saves ${inrShort(l25.totalInterest - l15.totalInterest)} in interest.`,
      ],
    },
    table: {
      caption: "₹1.5 lakh a year (step-up: to start) for 15 years, pre-tax",
      head: ["Scenario", "You put in", "Final value", "Gain", "Multiple"],
      rows: rows.map(([label, s]) => {
        const r = grow(s);
        return [
          label,
          inrShort(r.invested),
          inrShort(r.value),
          inrShort(r.gain),
          `${r.multiple.toFixed(2)}×`,
        ];
      }),
    },
    tips: [
      "Change one input at a time. Then the verdict tells you exactly what that one change is worth.",
      "Compare like with like on risk. A SIP return is an estimate; a PPF or FD rate is fixed for its period.",
      "Results are before tax. PPF is tax-free, while FD and RD interest is taxed at your slab.",
      "Add a third scenario to test a middle option, such as a 20-year loan between 15 and 25.",
    ],
  };
}

function sipDelayGuide(): CalcGuide {
  const monthly = 10_000;
  const rate = 12;
  const years = 25;
  const delay = 5;
  const d = sipDelayCost(monthly, rate, years, delay);
  const delays = [1, 3, 5, 10];
  return {
    intro:
      "The cost of delay calculator shows how much smaller your corpus gets if you start the same SIP a few years later. Enter the monthly SIP, the expected return, when you need the money and how long you plan to wait.",
    howItWorks: [
      "It works out two SIPs that end on the same date. One starts today; the other starts after the delay and so runs for fewer months. The gap between their final values is the cost of waiting.",
      "It also solves for the bigger monthly SIP the late starter needs to reach the same corpus. This is often the more useful number, because it is what waiting costs you every month.",
    ],
    formula: {
      expression: "Cost of delay = FV(P, r, n) − FV(P, r, n − 12d)",
      legend: [
        "FV = SIP future value, P × [((1 + r)^n − 1) ÷ r]",
        "r = expected yearly return ÷ 12, n = months until you need the money",
        "d = years of delay",
      ],
    },
    example: {
      title: `${inr(monthly)} a month at ${rate}%, money needed in ${years} years`,
      steps: [
        `Start today: ${years * 12} instalments grow to ${inrShort(d.now)}.`,
        `Start after ${delay} years: ${(years - delay) * 12} instalments grow to ${inrShort(d.later)}.`,
        `Waiting costs ${inrShort(d.loss)}, even though you invest only ${inrShort(monthly * delay * 12)} less.`,
        `To catch up, the late starter needs ${inr(d.sipToCatchUp)} a month instead of ${inr(monthly)}.`,
      ],
    },
    table: {
      caption: `${inr(monthly)} SIP at ${rate}%, money needed in ${years} years`,
      head: ["Delay", "Final corpus", "Corpus lost", "SIP to catch up"],
      rows: delays.map((y) => {
        const x = sipDelayCost(monthly, rate, years, y);
        return [
          `${y} year${y > 1 ? "s" : ""}`,
          inrShort(x.later),
          inrShort(x.loss),
          inr(x.sipToCatchUp),
        ];
      }),
    },
    tips: [
      "Start with a small SIP now rather than a large one later. You can raise it every year.",
      "If you have already delayed, use the catch-up SIP figure as your new monthly target.",
      "Waiting for a market fall is also a delay. The calculator shows what those missed months can cost.",
    ],
  };
}

function stpGuide(): CalcGuide {
  const amount = 12_00_000;
  const months = 12;
  const debt = 7;
  const eq = 12;
  const years = 5;
  const s = stpPlan({
    amount,
    transferMonths: months,
    debtPct: debt,
    equityPct: eq,
    horizonYears: years,
  });
  const spans = [3, 6, 12, 24];
  return {
    intro:
      "The STP (Systematic Transfer Plan) calculator models moving a lumpsum from a debt or liquid fund into an equity fund in monthly instalments. Enter the amount, the transfer period, both expected returns and how long you hold the money.",
    howItWorks: [
      "The whole amount starts in the debt fund and earns the debt return. Each month a slice moves to equity, sized to empty the debt fund by the last transfer, including the interest it earned.",
      "After the transfers end, everything stays in equity until the end of the holding period. The calculator compares this with putting everything in equity on day one and with leaving it all in debt.",
      "At constant returns, day-one equity always ends higher, because money sits longer in the higher-return fund. An STP trades that small gap for protection against investing everything just before a fall.",
    ],
    example: {
      title: `${inrShort(amount)} moved to equity over ${months} months, held ${years} years`,
      steps: [
        `The base transfer is ${inr(s.transfer)} a month; each transfer also carries the debt interest earned so far.`,
        `Value after ${years} years with STP = ${inrShort(s.finalValue)}.`,
        `All in equity on day one = ${inrShort(s.lumpEquity)}; kept in the debt fund = ${inrShort(s.allDebt)}.`,
        `Here the STP gives up ${inrShort(s.lumpEquity - s.finalValue)} versus day-one equity, assuming steady ${eq}% returns.`,
      ],
    },
    table: {
      caption: `${inrShort(amount)} for ${years} years, debt ${debt}%, equity ${eq}%`,
      head: [
        "Transfer period",
        "Monthly transfer",
        "Value with STP",
        "Gap to day-one equity",
      ],
      rows: spans.map((m) => {
        const x = stpPlan({
          amount,
          transferMonths: m,
          debtPct: debt,
          equityPct: eq,
          horizonYears: years,
        });
        return [
          `${m} months`,
          inr(x.transfer),
          inrShort(x.finalValue),
          inrShort(x.lumpEquity - x.finalValue),
        ];
      }),
    },
    tips: [
      "Use an STP for a bonus, inheritance or maturity amount you are nervous about investing in one go.",
      "Six to twelve months is a common transfer period. Longer periods leave more money in debt for longer.",
      "Each transfer is a redemption from the debt fund, so gains on it are taxed.",
      "Set it up once and leave it. Stopping transfers after a market fall defeats the purpose.",
    ],
  };
}

function compoundGuide(): CalcGuide {
  const principal = 1_00_000;
  const rate = 8;
  const years = 10;
  const freqs: [Compounding, string][] = [
    ["yearly", "Yearly"],
    ["half-yearly", "Half-yearly"],
    ["quarterly", "Quarterly"],
    ["monthly", "Monthly"],
  ];
  const at = (c: Compounding, y = years) =>
    fixedDeposit({
      principal,
      ratePct: rate,
      months: y * 12,
      compounding: c,
      senior: false,
      slabPct: 0,
    });
  const q = at("quarterly");
  const simple = principal * (1 + (rate / 100) * years);
  return {
    intro:
      "The compound interest calculator shows what a one-time amount grows to when interest is added to the balance and then earns interest itself. Enter the principal, the yearly rate, the period and how often interest compounds.",
    howItWorks: [
      "At each compounding date, the interest for that period is added to the balance. The next period's interest is worked out on this larger balance, so growth speeds up over time.",
      "More frequent compounding gives slightly more at the same quoted rate. The calculator shows the effective yearly rate, which lets you compare offers that compound differently.",
      "It also shows the simple interest figure, where interest is paid only on the original amount.",
    ],
    formula: {
      expression: "A = P × (1 + r ÷ k)^(k × t)",
      legend: [
        "P = principal",
        "r = yearly interest rate (as a decimal)",
        "k = compounding periods a year (1, 2, 4 or 12)",
        "t = period in years",
      ],
    },
    example: {
      title: `${inr(principal)} at ${rate}% for ${years} years, compounded quarterly`,
      steps: [
        `Rate per quarter = ${rate}% ÷ 4 = ${rate / 4}%, over ${years * 4} quarters.`,
        `Future value = ${inr(q.maturity)}, so interest earned = ${inr(q.interest)}.`,
        `Simple interest would give ${inr(simple)}, which is ${inr(q.maturity - simple)} less.`,
        `Effective yearly rate = ${pct(q.effectiveYield)}.`,
      ],
    },
    table: {
      caption: `${inr(principal)} at ${rate}% for ${years} years`,
      head: [
        "Compounding",
        "Future value",
        "Interest",
        "Effective yearly rate",
      ],
      rows: freqs.map(([c, label]) => {
        const x = at(c);
        return [label, inr(x.maturity), inr(x.interest), pct(x.effectiveYield)];
      }),
    },
    tips: [
      "Time matters far more than compounding frequency. Adding years changes the result much more than switching to monthly compounding.",
      "Compare deposits on the effective yearly rate, not only the quoted rate.",
      "Interest on a deposit is taxable each year, which lowers what actually compounds.",
    ],
  };
}

function cagrGuide(): CalcGuide {
  const start = 1_00_000;
  const end = 2_50_000;
  const years = 7;
  const c = cagr(start, end, years);
  const abs = ((end - start) / start) * 100;
  const fd = lumpsumFV(start, 7, years);
  const ends = [1_50_000, 2_00_000, 3_00_000, 5_00_000];
  const spans = [3, 5, 10];
  return {
    intro:
      "The CAGR (Compound Annual Growth Rate) calculator finds the steady yearly growth rate between a starting value and an ending value. Enter both values and the holding period in years.",
    howItWorks: [
      "CAGR answers one question: what constant yearly rate would turn the starting value into the ending value over this period? The real path may have had good and bad years in between.",
      "The calculator also shows the absolute return, the real CAGR after 6% inflation, and what a 7% fixed deposit would have grown to.",
      "CAGR needs one amount in and one amount out. If you added money or withdrew along the way, use XIRR instead.",
    ],
    formula: {
      expression: "CAGR = (Ending value ÷ Starting value)^(1 ÷ years) − 1",
      legend: [
        "Ending and starting values in rupees",
        "years = holding period, can include a half year",
      ],
    },
    example: {
      title: `${inrShort(start)} grew to ${inrShort(end)} in ${years} years`,
      steps: [
        `Growth multiple = ${inr(end)} ÷ ${inr(start)} = ${(end / start).toFixed(2)}.`,
        `CAGR = ${(end / start).toFixed(2)}^(1 ÷ ${years}) − 1 = ${pct(c)} a year.`,
        `Absolute return = ${pct(abs, 0)}, which says nothing about how long it took.`,
        `A 7% FD would have grown to ${inr(fd)} over the same ${years} years.`,
      ],
    },
    table: {
      caption: `CAGR on ${inrShort(start)} invested`,
      head: ["Ending value", ...spans.map((y) => `${y} years`)],
      rows: ends.map((e) => [
        inrShort(e),
        ...spans.map((y) => pct(cagr(start, e, y))),
      ]),
    },
    tips: [
      "Always pair a return with its time period. A 100% gain over 5 years is about 14.9% a year; over 10 years it is about 7.2%.",
      "Compare CAGR with a safe option such as an FD over the same years before judging an investment.",
      "Subtract inflation to see whether your buying power actually grew.",
    ],
  };
}

function xirrGuide(): CalcGuide {
  const dates = ["2023-04-10", "2024-04-10", "2025-04-10"];
  const asOf = "2026-04-10";
  const each = 1_00_000;
  const invested = each * dates.length;
  const flowsFor = (current: number) => [
    ...dates.map((date) => ({ date, amount: -each })),
    { date: asOf, amount: current },
  ];
  const current = 3_90_000;
  const r = xirr(flowsFor(current)) ?? 0;
  const lumpYears = 3;
  const values = [3_30_000, 3_60_000, 3_90_000, 4_20_000];
  return {
    intro:
      "The XIRR (Extended Internal Rate of Return) calculator finds the yearly return on investments made on different dates, such as SIPs, top-ups and withdrawals. Enter each amount with its date, then today's value and the date it is valued on.",
    howItWorks: [
      "Money you invest counts as negative and money you receive, including today's value, counts as positive. XIRR is the yearly rate at which all these dated amounts net to zero.",
      "Because it uses actual dates, money invested recently gets credit for only a short time. That is why XIRR is the right return figure for a SIP, while absolute return can mislead.",
    ],
    formula: {
      expression: "Σ Cᵢ ÷ (1 + XIRR)^((dᵢ − d₀) ÷ 365) = 0",
      legend: [
        "Cᵢ = each amount: invested as negative, received or current value as positive",
        "dᵢ = date of that amount, d₀ = date of the first amount",
        "Solved by trial for the rate that makes the sum zero",
      ],
    },
    example: {
      title: `${inr(each)} invested every April for 3 years, worth ${inrShort(current)} in April 2026`,
      steps: [
        `Investments: ${inr(each)} on 10 April 2023, 2024 and 2025, so ${inrShort(invested)} in total.`,
        `Value on 10 April 2026 = ${inr(current)}, a gain of ${inr(current - invested)}.`,
        `Absolute return = ${pct(((current - invested) / invested) * 100, 1)}, ignoring when each rupee went in.`,
        `XIRR = ${pct(r)} a year, because the later instalments had only one or two years to grow.`,
      ],
    },
    table: {
      caption: `${inrShort(invested)} invested: three yearly instalments versus all on day one`,
      head: [
        "Value after 3 years",
        "Absolute return",
        "XIRR, 3 yearly instalments",
        "CAGR, all invested on day one",
      ],
      rows: values.map((v) => [
        inrShort(v),
        pct(((v - invested) / invested) * 100, 1),
        pct(xirr(flowsFor(v)) ?? 0),
        pct(cagr(invested, v, lumpYears)),
      ]),
    },
    tips: [
      "Use XIRR to judge a SIP. Your fund statement or app usually shows it too.",
      "Enter withdrawals as well as investments, or the return will look lower than it is.",
      "XIRR over a year or two swings a lot with the market. Judge it over five years or more.",
    ],
  };
}

function expenseRatioGuide(): CalcGuide {
  const monthly = 15_000;
  const gross = 12;
  const direct = 0.5;
  const regular = 1.5;
  const years = 20;
  const run = (y: number) =>
    expenseRatioDrag({
      lumpsum: 0,
      monthly,
      grossPct: gross,
      directTerPct: direct,
      regularTerPct: regular,
      years: y,
    });
  const r = run(years);
  const spans = [10, 15, 20, 25, 30];
  return {
    intro:
      "The direct vs regular calculator shows how much a fund's expense ratio costs you over time. Enter your SIP or one-time amount, the fund's return before costs, the period and the expense ratio of each plan.",
    howItWorks: [
      "The expense ratio is taken out of the fund every year, so your return is the fund's return minus the expense ratio. The calculator grows your money at both net rates and shows the gap.",
      "A regular plan pays a distributor commission from your returns, so its expense ratio is higher. A direct plan of the same fund has the same portfolio and manager at a lower cost.",
    ],
    formula: {
      expression: "Net return = Fund return before costs − Expense ratio",
      legend: [
        "Each plan's value uses the SIP and lumpsum formulas at its own net return",
        "Difference = direct plan value − regular plan value",
      ],
    },
    example: {
      title: `${inr(monthly)} a month for ${years} years, ${gross}% before costs`,
      steps: [
        `Direct plan at ${direct}% expense ratio earns ${gross - direct}% net; regular at ${regular}% earns ${gross - regular}%.`,
        `You invest ${inrShort(r.invested)} in both.`,
        `Direct plan grows to ${inrShort(r.direct)}; regular plan grows to ${inrShort(r.regular)}.`,
        `A 1% yearly cost gap leaves ${inrShort(r.difference)} less in the regular plan, ${pct((r.difference / r.direct) * 100, 1)} of the direct value.`,
      ],
    },
    table: {
      caption: `${inr(monthly)} SIP, ${gross}% before costs, ${direct}% vs ${regular}% expense ratio`,
      head: [
        "Period",
        "Direct plan",
        "Regular plan",
        "Difference",
        "Share of direct value",
      ],
      rows: spans.map((y) => {
        const x = run(y);
        return [
          `${y} years`,
          inrShort(x.direct),
          inrShort(x.regular),
          inrShort(x.difference),
          pct((x.difference / x.direct) * 100, 1),
        ];
      }),
    },
    tips: [
      "Check the expense ratio on the fund's factsheet before you invest, and compare it with the direct plan.",
      "The gap grows with time and amount, so it matters most for long SIPs.",
      "If you value a distributor's advice, weigh that against the yearly cost shown here.",
      "Switching plans means redeeming units, which can trigger capital gains tax.",
    ],
  };
}

function assetAllocationGuide(): CalcGuide {
  const age = 32;
  const risk: RiskProfile = "moderate";
  const horizon = 15;
  const t = assetAllocation(age, risk, horizon);
  const holdings = { equity: 3_00_000, debt: 5_00_000, gold: 50_000 };
  const moves = rebalance(holdings, t);
  const total = holdings.equity + holdings.debt + holdings.gold;
  const names = { equity: "equity", debt: "debt", gold: "gold" } as const;
  const ages = [25, 35, 45, 55];
  const profiles: RiskProfile[] = ["conservative", "moderate", "aggressive"];
  const mix = (a: number, p: RiskProfile) => {
    const m = assetAllocation(a, p, horizon);
    return `${m.equity} / ${m.debt} / ${m.gold}`;
  };
  return {
    intro:
      "The asset allocation calculator suggests how to split your money between equity, debt and gold. Enter your age, when you need most of the money and how you would react to a 20% fall, then add what you hold now to see how to rebalance.",
    howItWorks: [
      "The equity share starts from a base number minus your age: 90 if you would sell in a fall, 105 if you would wait, 120 if you would buy more. It is kept between 10% and 85%.",
      "A short horizon caps equity: 15% under 3 years, 40% under 5 years and 60% under 7 years. Gold is 10% for conservative and moderate investors and 5% for aggressive ones; debt is the rest.",
      "If you enter current holdings, it shows how much to add to or reduce from each part to reach the target.",
    ],
    formula: {
      expression: "Equity % = base − age, kept between 10% and 85%",
      legend: [
        "base = 90 (conservative), 105 (moderate) or 120 (aggressive)",
        "Capped at 15%, 40% or 60% for horizons under 3, 5 or 7 years",
        "Debt % = 100 − equity % − gold %",
      ],
    },
    example: {
      title: `Age ${age}, moderate risk, money needed in ${horizon} years`,
      steps: [
        `Equity = 105 − ${age} = ${t.equity}%. A ${horizon}-year horizon adds no cap.`,
        `Gold = ${t.gold}%, so debt = ${t.debt}%.`,
        `Current holdings: ${inrShort(holdings.equity)} equity, ${inrShort(holdings.debt)} debt, ${inr(holdings.gold)} gold, ${inrShort(total)} in all.`,
        `To rebalance: ${moves
          .map(
            (m) =>
              `${m.move >= 0 ? "add" : "reduce"} ${inr(Math.abs(m.move))} ${names[m.key]}`,
          )
          .join(", ")}.`,
      ],
    },
    table: {
      caption: `Suggested equity / debt / gold (%) for a ${horizon}-year horizon`,
      head: ["Age", "Would sell in a fall", "Would wait", "Would buy more"],
      rows: ages.map((a) => [String(a), ...profiles.map((p) => mix(a, p))]),
    },
    tips: [
      "Rebalance once a year, or when any part drifts more than about 5% from its target.",
      "Rebalance with new money first; it avoids selling and the tax that comes with it.",
      "Count EPF, PPF and FDs as debt. Many salaried people hold more debt than they think.",
      "Answer the risk question honestly. A mix you abandon in a crash does more harm than a cautious one.",
    ],
  };
}

function inflationGuide(): CalcGuide {
  const amount = 1_00_000;
  const infl = 6;
  const years = 10;
  const future = inflate(amount, infl, years);
  const power = amount / Math.pow(1 + infl / 100, years);
  const nominal = 7;
  const slab = 30;
  const postTax = nominal * (1 - slab / 100);
  const rates = [5, 6, 8, 10];
  const spans = [10, 20, 30];
  return {
    intro:
      "The inflation calculator shows what something will cost in future and how much buying power your money loses. A second mode shows your real return after tax and inflation.",
    howItWorks: [
      "Future cost compounds today's cost at the inflation rate every year. The same maths in reverse shows what today's money will buy in future.",
      "Real return removes inflation from your return. Enter the return, your tax slab and inflation; the calculator first takes off tax, then adjusts for inflation.",
    ],
    formula: {
      expression:
        "Future cost = Cost today × (1 + i)^n;  Real return = (1 + R) ÷ (1 + i) − 1",
      legend: [
        "i = yearly inflation (as a decimal), n = years",
        "R = return after tax (as a decimal)",
      ],
    },
    example: {
      title: `${inrShort(amount)} today at ${infl}% inflation, and a ${nominal}% FD in the ${slab}% slab`,
      steps: [
        `In ${years} years the same things will cost ${inr(future)}.`,
        `${inrShort(amount)} kept aside will buy only ${inr(power)} worth in today's money, a ${pct((1 - power / amount) * 100, 0)} loss.`,
        `A ${nominal}% FD return in the ${slab}% slab is ${pct(postTax, 1)} after tax.`,
        `Real return after tax = ${pct(realReturn(postTax, infl))}, so buying power shrinks.`,
      ],
    },
    table: {
      caption: `What costs ${inrShort(amount)} today will cost`,
      head: ["Inflation", ...spans.map((y) => `In ${y} years`)],
      rows: rates.map((r) => [
        `${r}%`,
        ...spans.map((y) => inrShort(inflate(amount, r, y))),
      ]),
    },
    tips: [
      "Use a higher rate for education and medical goals than for general expenses.",
      "Plan every long-term goal in future rupees, then work out the SIP for that number.",
      "Judge any investment by its return after tax and inflation, not the headline rate.",
    ],
  };
}

function moneyDoubleGuide(): CalcGuide {
  const rate = 8;
  const amount = 1_00_000;
  const exact = yearsToMultiply(rate, 2);
  const rates = [6, 8, 10, 12, 15];
  return {
    intro:
      "The money doubling calculator shows how many years your money takes to double, triple, grow four times or ten times at a given yearly return. It shows the exact answer next to the Rule of 72 estimate.",
    howItWorks: [
      "The Rule of 72 is a mental shortcut: divide 72 by the yearly return to estimate the years to double. It is close for everyday rates.",
      "The exact figure comes from the compound growth formula, solved for time. It assumes the return is earned every year and reinvested.",
    ],
    formula: {
      expression: "Years to multiply = log(M) ÷ log(1 + r)",
      legend: [
        "M = multiple wanted (2 to double, 3 to triple, 10 for 10×)",
        "r = yearly return (as a decimal)",
        "Rule of 72 estimate for doubling = 72 ÷ return in %",
      ],
    },
    example: {
      title: `${inrShort(amount)} at ${rate}% a year`,
      steps: [
        `Rule of 72: 72 ÷ ${rate} = ${(72 / rate).toFixed(1)} years to reach ${inrShort(amount * 2)}.`,
        `Exact: log 2 ÷ log ${(1 + rate / 100).toFixed(2)} = ${yrs(exact)}.`,
        `Tripling to ${inrShort(amount * 3)} takes ${yrs(yearsToMultiply(rate, 3))}; 10× takes ${yrs(yearsToMultiply(rate, 10))}.`,
      ],
    },
    table: {
      caption: "Years for money to grow at a constant yearly return",
      head: ["Return", "Rule of 72", "Double", "Triple", "10×"],
      rows: rates.map((r) => [
        `${r}%`,
        yrs(72 / r),
        yrs(yearsToMultiply(r, 2)),
        yrs(yearsToMultiply(r, 3)),
        yrs(yearsToMultiply(r, 10)),
      ]),
    },
    tips: [
      "Use the return after tax. Tax on interest every year slows doubling noticeably.",
      "Run the rule on inflation too: at 6%, prices double in about 12 years.",
      "Small rate differences add up. Compare the 10× column at 8% and 12%.",
    ],
  };
}

function epfGuide(): CalcGuide {
  const rate = EPF_DEFAULT_RATE_PCT;
  const yearly = 8_350 * 12;
  const balance = 2_00_000;
  const age = 30;
  const till = 58;
  const run = (b: number, a: number, t = till) =>
    computeEpfProjection({
      currentBalance: b,
      yearlyContribution: yearly,
      currentAge: a,
      contributeTillAge: t,
      annualRatePct: rate,
    });
  const res = run(balance, age);
  const ages = [25, 30, 35, 40, 45];
  return {
    intro: `The PF calculator projects your Employee Provident Fund balance at age ${EPF_FINAL_AGE}. Enter your current PF balance, the yearly employee plus employer contribution, any VPF, your age, when you stop contributing and the interest rate.`,
    howItWorks: [
      "Each year your opening balance earns a full year of interest. That year's contributions earn interest only for the months after each one is paid, as EPFO works it out on the monthly running balance.",
      `Contributions stop at the age you choose. The balance then keeps compounding at the same rate until ${EPF_FINAL_AGE}, with nothing new added.`,
      `The rate defaults to ${rate}%, the EPFO rate for FY 2024-25. EPFO declares the rate every year, so treat it as an assumption and check the current rate.`,
    ],
    formula: {
      expression:
        "Year-end balance = B × (1 + r) + C + (C ÷ 12) × (r ÷ 12) × 66",
      legend: [
        "B = opening balance, C = contributions in the year",
        "r = yearly EPF rate (as a decimal)",
        "66 = 11 + 10 + … + 0 months of interest on twelve monthly deposits",
      ],
    },
    example: {
      title: `Age ${age}, ${inrShort(balance)} balance, ${inr(8_350)} a month into EPF until ${till}`,
      steps: [
        `${inr(8_350)} a month is the EPF part on a ${inr(40_000)} basic: your 12% plus the employer share left after EPS.`,
        `That is ${inr(yearly)} a year for ${res.contributionYears} years, then ${res.growthOnlyYears} years of growth only.`,
        `Total put in, including the opening balance = ${inrShort(res.totalInvested)}.`,
        `Value at ${EPF_FINAL_AGE} at ${rate}% = ${inrShort(res.finalValue)}, of which ${inrShort(res.totalInterest)} is interest.`,
      ],
    },
    table: {
      caption: `PF at ${EPF_FINAL_AGE} from a zero balance, ${inr(yearly)} a year until ${till}, at ${rate}%`,
      head: [
        "Starting age",
        "Total contributed",
        "Interest",
        `Value at ${EPF_FINAL_AGE}`,
      ],
      rows: ages.map((a) => {
        const x = run(0, a);
        return [
          String(a),
          inrShort(x.totalInvested),
          inrShort(x.totalInterest),
          inrShort(x.finalValue),
        ];
      }),
    },
    tips: [
      "Count only the EPF part of your employer's share. The EPS pension share does not earn EPF interest.",
      "Transfer your old PF when you change jobs so it keeps earning and counts towards continuous service.",
      "VPF earns the same rate, but interest on your own EPF plus VPF above ₹2.5 lakh a year is taxable.",
      "The calculator keeps your contribution flat. Raise it as your salary grows for a closer estimate.",
    ],
  };
}

function goldGuide(): CalcGuide {
  const amount = 2_00_000;
  const growth = 9;
  const years = 8;
  const making = 10;
  const slab = 30;
  const etfExpense = 0.5;
  const run = (g: number) =>
    goldCompare({
      amount,
      growthPct: g,
      years,
      makingPct: making,
      etfExpensePct: etfExpense,
      slabPct: slab,
    });
  const res = run(growth);
  const physicalGold = amount / (1.03 * (1 + making / 100));
  const growths = [6, 8, 10, 12];
  return {
    intro:
      "The gold investment calculator compares Sovereign Gold Bonds, gold ETFs or funds, and jewellery after costs and tax. Enter the amount, the expected gold price growth, the holding period, making charges and your tax slab.",
    howItWorks: [
      "Jewellery: 3% GST and making charges are paid upfront and not recovered on resale, so less gold is bought. Gains are taxed at 12.5% after 24 months, or at your slab before that.",
      "Gold ETF or fund: tracks the gold price minus about a 0.5% yearly expense ratio. Gains are taxed at 12.5% after 12 months.",
      "SGB held to maturity: tracks the gold price plus 2.5% yearly interest, which is taxed at your slab. The gain on redemption is tax-free.",
    ],
    example: {
      title: `${inrShort(amount)} in gold for ${years} years at ${growth}% growth, ${slab}% slab`,
      steps: [
        `Jewellery with ${making}% making charges buys only ${inr(physicalGold)} worth of gold after GST and making.`,
        `After tax, jewellery leaves ${inrShort(res.physical.net)} and a gold ETF leaves ${inrShort(res.etf.net)}.`,
        `An SGB leaves ${inrShort(res.sgb.net)}, including its interest after tax.`,
        `The gap between SGB and jewellery here is ${inrShort(res.sgb.net - res.physical.net)}.`,
      ],
    },
    table: {
      caption: `${inrShort(amount)} for ${years} years, ${making}% making charges, ${slab}% slab: take-home after tax`,
      head: ["Gold price growth", "SGB", "Gold ETF / fund", "Jewellery"],
      rows: growths.map((g) => {
        const x = run(g);
        return [
          `${g}% a year`,
          inrShort(x.sgb.net),
          inrShort(x.etf.net),
          inrShort(x.physical.net),
        ];
      }),
    },
    tips: [
      "Gold price growth here is your assumption, not a forecast. Try a few rates.",
      "New SGB issues have stopped. Existing bonds can be bought on the stock exchange.",
      "Buy jewellery to wear, not to invest. Making charges and GST are a cost you rarely get back.",
      "Keeping gold to about 5% to 10% of your portfolio is a common rule.",
    ],
  };
}

export const INVESTING_GUIDES: Record<string, () => CalcGuide> = {
  compare: compareGuide,
  "sip-delay": sipDelayGuide,
  stp: stpGuide,
  compound: compoundGuide,
  cagr: cagrGuide,
  xirr: xirrGuide,
  "expense-ratio": expenseRatioGuide,
  "asset-allocation": assetAllocationGuide,
  inflation: inflationGuide,
  "money-double": moneyDoubleGuide,
  epf: epfGuide,
  gold: goldGuide,
};
