/**
 * Guides for the tax and goals & life calculators. Every number comes from
 * the same engines the calculators use (lib/advisorCalculators.ts, which
 * builds on lib/taxRegimeComparisonFY2026.ts). Illustrative only, not advice.
 */

import {
  advanceTax,
  budgetSplit,
  capitalGains,
  deductionPlanner,
  goalPlan,
  gst,
  incomeTax,
  ltcgHarvest,
  netWorth,
  presumptiveTax,
  rentalIncome,
  salaryBreakup,
  salaryHike,
} from "@/lib/advisorCalculators";

import { type CalcGuide, inr, inrShort } from "./shared";

/** The year the tax engine's slabs, rebates and limits are written for. */
const TAX_YEAR = "FY 2025-26 (AY 2026-27)";
const RULES_NOTE = `Slabs, rates and limits here are as the tool models them for ${TAX_YEAR}. Tax rules change most years, so check the current year's rules before you file.`;

const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

// ─── Salary ──────────────────────────────────────────────────────────────────

function salaryGuide(): CalcGuide {
  const ctc = 15_00_000;
  const base = {
    basicPct: 40,
    variablePct: 10,
    employerPfOnFullBasic: false,
    includeGratuity: true,
    professionalTax: 2_400,
    rentMonthly: 20_000,
    metro: true,
    extra80C: 50_000,
  };
  const s = salaryBreakup({ ...base, ctc, regime: "new" });
  const old = salaryBreakup({ ...base, ctc, regime: "old" });
  const ctcs = [6_00_000, 10_00_000, 15_00_000, 25_00_000, 50_00_000];
  return {
    intro:
      "A salary calculator turns your yearly CTC into the money that actually reaches your bank account each month. Enter your CTC, the basic share, the variable pay and your tax regime to see the full break-up.",
    howItWorks: [
      "CTC includes items you never receive as monthly pay. The tool takes out employer PF (12% of basic, capped at a ₹15,000 monthly basic unless you choose full basic) and a gratuity provision of 4.81% of basic. What is left is your gross salary.",
      "From gross salary it deducts your own PF, professional tax and income tax. The new regime gets a ₹75,000 standard deduction. The old regime gets ₹50,000, plus HRA exemption, 80C and professional tax. For the old regime the tool assumes HRA of 50% of basic in a metro and 40% elsewhere.",
      `Variable pay is kept out of the monthly figure because it is usually paid once a year. ${RULES_NOTE}`,
    ],
    formula: {
      expression:
        "Monthly in-hand = (Gross − your PF − professional tax − income tax − variable pay) ÷ 12",
      legend: [
        "Gross = CTC − employer PF − gratuity provision",
        "Income tax is worked out on gross minus the deductions your regime allows",
      ],
    },
    example: {
      title: `${inrShort(ctc)} CTC, 40% basic, 10% variable, new regime`,
      steps: [
        `Basic = ${inr(s.basic)}. Employer PF of ${inr(s.employerPf)} and gratuity of ${inr(s.gratuityPart)} leave a gross salary of ${inr(s.gross)}.`,
        `Your PF of ${inr(s.employeePf)}, professional tax of ${inr(base.professionalTax)} and income tax of ${inr(s.tax)} are deducted.`,
        `Take-home for the year = ${inr(s.annualInHand)}. Leaving out ${inr(s.variable)} of variable pay, the monthly in-hand is ${inr(s.monthlyInHand)}.`,
        `In the old regime, with ${inr(base.rentMonthly)} rent in a metro and ${inr(base.extra80C)} of other 80C, tax is ${inr(old.tax)} and monthly in-hand is ${inr(old.monthlyInHand)}.`,
      ],
    },
    table: {
      caption:
        "Monthly in-hand by CTC (40% basic, 10% variable, PF on ₹15,000 cap; old regime with ₹20,000 metro rent and ₹50,000 other 80C)",
      head: [
        "CTC",
        "Tax (new)",
        "In-hand a month (new)",
        "Tax (old)",
        "In-hand a month (old)",
      ],
      rows: ctcs.map((c) => {
        const n = salaryBreakup({ ...base, ctc: c, regime: "new" });
        const o = salaryBreakup({ ...base, ctc: c, regime: "old" });
        return [
          inrShort(c),
          inr(n.tax),
          inr(n.monthlyInHand),
          inr(o.tax),
          inr(o.monthlyInHand),
        ];
      }),
    },
    tips: [
      "Read your offer letter for the basic share. A higher basic raises PF and gratuity but lowers monthly in-hand.",
      "PF on full basic cuts take-home now but builds a bigger tax-efficient retirement fund.",
      "Tell your employer your regime choice early in the year so monthly TDS matches your real tax.",
      "Bonus and variable pay are taxed too, so budget on the monthly figure, not the CTC.",
    ],
  };
}

// ─── Capital gains ───────────────────────────────────────────────────────────

function capitalGainsGuide(): CalcGuide {
  const buyValue = 5_00_000;
  const sellValue = 8_00_000;
  const slabPct = 30;
  const long = { buyDate: "2022-04-01", sellDate: "2025-10-01" };
  const c = capitalGains({
    asset: "equity",
    ...long,
    buyValue,
    sellValue,
    expenses: 0,
    slabPct,
  });
  const preCess = c.tax / 1.04;
  const cases: Array<{
    label: string;
    asset: "equity" | "debt-mf" | "gold";
    buyDate: string;
    sellDate: string;
  }> = [
    {
      label: "Listed shares or equity funds, 8 months",
      asset: "equity",
      buyDate: "2025-02-01",
      sellDate: "2025-10-01",
    },
    {
      label: "Listed shares or equity funds, 3.5 years",
      asset: "equity",
      ...long,
    },
    { label: "Debt fund, 3.5 years", asset: "debt-mf", ...long },
    {
      label: "Physical gold, 18 months",
      asset: "gold",
      buyDate: "2024-04-01",
      sellDate: "2025-10-01",
    },
    { label: "Physical gold, 3.5 years", asset: "gold", ...long },
  ];
  return {
    intro:
      "A capital gains tax calculator shows the tax due when you sell shares, mutual funds, property or gold at a profit. Enter the asset type, the buy and sell dates, the prices and your slab to see the gain, the rate and the tax.",
    howItWorks: [
      "First it decides whether the gain is short-term or long-term. Listed shares and equity funds turn long-term after 12 months; property, physical gold and unlisted shares after 24 months. Debt funds bought after April 2023 are taxed at your slab however long you hold them.",
      "Equity gains are taxed at 20% short-term and 12.5% long-term, with the first ₹1.25 lakh of long-term gain each year exempt. Other long-term gains are taxed at 12.5% without indexation. For land or a building bought before 23 July 2024, the tool also works out 20% with indexation and shows the lower tax.",
      "Rates follow Budget 2024 for sales after 23 July 2024. The tool adds 4% cess but not surcharge. Tax rules change most years, so check them before you file.",
    ],
    formula: {
      expression:
        "Tax = (Sale price − purchase price − expenses − exemption) × rate × 1.04",
      legend: [
        "Expenses = brokerage, stamp duty, transfer costs or improvement cost",
        "Exemption = up to ₹1.25 lakh a year, only for long-term equity gains",
        "1.04 adds the 4% health and education cess",
      ],
    },
    example: {
      title: `Equity bought for ${inrShort(buyValue)}, sold for ${inrShort(sellValue)} after ${c.heldMonths} months`,
      steps: [
        `Gain = ${inr(sellValue)} − ${inr(buyValue)} = ${inr(c.gain)}. Held ${c.heldMonths} months, so it is long-term.`,
        `The first ${inr(c.exemption)} is exempt, leaving ${inr(c.gain - c.exemption)} taxable.`,
        `Tax at 12.5% = ${inr(preCess)}, plus 4% cess = ${inr(c.tax)}.`,
        `You keep ${inr(c.net)} from the sale.`,
      ],
    },
    table: {
      caption: `Tax on a ${inrShort(sellValue - buyValue)} gain, ${slabPct}% slab, cess included`,
      head: ["Asset and holding period", "Rate applied", "Tax"],
      rows: cases.map((x) => {
        const r = capitalGains({
          asset: x.asset,
          buyDate: x.buyDate,
          sellDate: x.sellDate,
          buyValue,
          sellValue,
          expenses: 0,
          slabPct,
        });
        return [x.label, r.rateLabel, inr(r.tax)];
      }),
    },
    tips: [
      "Add brokerage, stamp duty and improvement costs. They reduce the taxable gain.",
      "A capital loss can be carried forward for 8 years, but only if you file your return on time.",
      "If an equity holding is close to 12 months, waiting can cut the rate from 20% to 12.5%.",
      "For property, Section 54 or 54EC reinvestment within the time limits can save the long-term tax.",
    ],
  };
}

// ─── LTCG harvesting ─────────────────────────────────────────────────────────

function ltcgHarvestGuide(): CalcGuide {
  const unrealised = 2_00_000;
  const h = ltcgHarvest(unrealised, 0);
  const years = 10;
  const booked = [0, 50_000, 1_00_000, 1_25_000];
  return {
    intro:
      "An LTCG (Long-Term Capital Gains) harvesting calculator shows how much long-term equity gain to book this year so it falls inside the ₹1.25 lakh yearly exemption. Enter your unrealised long-term gain and any gain already booked this year.",
    howItWorks: [
      "Long-term gains on listed shares and equity funds are tax-free up to ₹1.25 lakh a year; above that the rate is 12.5% plus cess. The exemption cannot be carried to the next year, so unused room is lost.",
      "Harvesting means selling units with a long-term gain up to that room and buying them back. Your holding stays the same, but the purchase cost resets higher, so less gain is taxed when you finally sell.",
      `The tool works out the room left this year, the gain to book and the future tax saved at 12.5% plus 4% cess. These rates are as modelled for ${TAX_YEAR}.`,
    ],
    formula: {
      expression:
        "Gain to book = lower of (unrealised long-term gain, ₹1.25 lakh − long-term gain already booked)",
      legend: [
        "Future tax saved = gain booked × 12.5% × 1.04",
        "Count all listed equity and equity fund gains booked in the same financial year",
      ],
    },
    example: {
      title: `${inrShort(unrealised)} of unrealised long-term gain, nothing booked yet`,
      steps: [
        `Room left this year = ${inr(h.room)}.`,
        `Gain to book = lower of ${inr(unrealised)} and ${inr(h.room)} = ${inr(h.harvest)}.`,
        `Future tax saved = ${inr(h.harvest)} × 12.5% × 1.04 = ${inr(h.taxSaved)}.`,
        `Repeated for ${years} years, that is about ${inr(h.taxSaved * years)} of tax avoided.`,
      ],
    },
    table: {
      caption: `Harvesting with ${inrShort(unrealised)} of unrealised long-term gain`,
      head: [
        "Long-term gain already booked",
        "Room left",
        "Gain to book",
        "Future tax saved",
      ],
      rows: booked.map((b) => {
        const x = ltcgHarvest(unrealised, b);
        return [inr(b), inr(x.room), inr(x.harvest), inr(x.taxSaved)];
      }),
    },
    tips: [
      "Sell only units held for more than 12 months. Selling newer units creates short-term gain taxed at 20%.",
      "Mutual fund units are redeemed oldest first, so check the gain on those units before you sell.",
      "Check exit loads and brokerage first; they can wipe out a small saving.",
      "Place the trade a few working days before 31 March so it settles within the financial year.",
    ],
  };
}

// ─── 80C & 80D planner ───────────────────────────────────────────────────────

function deductionsGuide(): CalcGuide {
  const zero = {
    items80C: 0,
    nps80CCD1B: 0,
    health80DSelf: 0,
    selfSenior: false,
    health80DParents: 0,
    parentsSenior: true,
    homeLoanInterest: 0,
  };
  const d = deductionPlanner({
    ...zero,
    items80C: 1_00_000,
    health80DSelf: 15_000,
    slabPct: 30,
  });
  const caps: Array<{ label: string; patch: Partial<typeof zero> }> = [
    { label: "80C", patch: { items80C: 1_50_000 } },
    { label: "80CCD(1B) NPS", patch: { nps80CCD1B: 50_000 } },
    {
      label: "80D self and family (below 60)",
      patch: { health80DSelf: 25_000 },
    },
    { label: "80D parents (60 or older)", patch: { health80DParents: 50_000 } },
    {
      label: "24(b) home loan interest",
      patch: { homeLoanInterest: 2_00_000 },
    },
  ];
  const slabs = [5, 20, 30];
  return {
    intro:
      "An 80C and 80D planner shows how much of each old-regime deduction you have used, how much room is left and the tax you save. Enter what you invest or pay in a year and your tax slab.",
    howItWorks: [
      "The tool caps each section at its limit: ₹1.5 lakh for 80C, ₹50,000 for NPS under 80CCD(1B), ₹25,000 or ₹50,000 each for health insurance of self and parents, and ₹2 lakh for home loan interest on a self-occupied house.",
      "Tax saved is the deduction used times your slab rate plus 4% cess. Room left shows the extra tax you could still save by using every limit.",
      `These deductions count only in the old regime. ${RULES_NOTE}`,
    ],
    formula: {
      expression:
        "Tax saved = (sum of deductions, each capped at its limit) × slab rate × 1.04",
      legend: [
        "Slab rate = your marginal old-regime rate: 5%, 20% or 30%",
        "1.04 adds the 4% cess",
      ],
    },
    example: {
      title: "₹1 lakh in 80C and ₹15,000 of health insurance, 30% slab",
      steps: [
        `Deductions used = ${inr(d.total)}, saving ${inr(d.taxSaved)} of tax.`,
        `Room left across all five sections = ${inr(d.room)}.`,
        `Filling that room would save up to ${inr(d.moreSaving)} more.`,
        `The quickest gains: ${inr(d.rows[0].cap - d.rows[0].used)} more in 80C and ${inr(d.rows[2].cap - d.rows[2].used)} more in 80D for self.`,
      ],
    },
    table: {
      caption:
        "Tax saved by using a section's full limit (old regime, cess included)",
      head: ["Section", "Limit", ...slabs.map((s) => `At ${s}% slab`)],
      rows: caps.map((c) => {
        const at = (slabPct: number) =>
          deductionPlanner({ ...zero, ...c.patch, slabPct });
        return [
          c.label,
          inr(at(30).total),
          ...slabs.map((s) => inr(at(s).taxSaved)),
        ];
      }),
    },
    tips: [
      "Your own EPF contribution already counts toward 80C, so check your payslip before buying more.",
      "NPS under 80CCD(1B) is over and above the ₹1.5 lakh 80C limit.",
      "Paying your parents' health insurance premium adds a separate 80D limit.",
      "Compare both regimes first. If the new regime still wins, these deductions save nothing.",
    ],
  };
}

// ─── Advance tax ─────────────────────────────────────────────────────────────

function advanceTaxGuide(): CalcGuide {
  const totalTax = 1_50_000;
  const tds = 50_000;
  const a = advanceTax(totalTax, tds, false);
  const p = advanceTax(totalTax, tds, true);
  return {
    intro:
      "An advance tax calculator splits the tax you owe for the year into instalments with due dates. Enter your estimated total tax and the TDS or TCS already deducted, and say whether you use presumptive taxation.",
    howItWorks: [
      "Advance tax is the tax left after TDS and TCS. If that balance is ₹10,000 or more, it is paid during the year rather than at filing time.",
      "The tool uses four cumulative instalments: 15% by 15 June, 45% by 15 September, 75% by 15 December and 100% by 15 March. Under presumptive taxation (44AD or 44ADA) the whole amount is due by 15 March.",
      `If nothing is paid on time, the tool estimates 234C interest at 1% a month: three months on each of the first three instalments and one month on the last. ${RULES_NOTE}`,
    ],
    formula: {
      expression:
        "Instalment = (total tax − TDS) × (cumulative % due − cumulative % already due)",
      legend: [
        "Cumulative % = 15%, 45%, 75% and 100% by the four due dates",
        "Presumptive income: 100% by 15 March",
      ],
    },
    example: {
      title: `${inrShort(totalTax)} estimated tax, ${inr(tds)} TDS`,
      steps: [
        `Advance tax = ${inr(totalTax)} − ${inr(tds)} = ${inr(a.net)}, above ₹10,000, so it applies.`,
        `Pay ${a.rows.map((r) => `${inr(r.amount)} by ${r.due}`).join(", ")}.`,
        `Miss every instalment and 234C interest alone is about ${inr(a.penalty234C)}.`,
        `Under 44AD or 44ADA you pay ${inr(p.net)} in one go by 15 March; missing it costs about ${inr(p.penalty234C)}.`,
      ],
    },
    table: {
      caption: `Instalments on ${inr(a.net)} of advance tax`,
      head: [
        "Due date",
        "Cumulative share",
        "Pay this instalment",
        "Paid by then",
      ],
      rows: a.rows.map((r) => [
        r.due,
        `${r.cumulativePct}%`,
        inr(r.amount),
        inr(r.cumulative),
      ]),
    },
    tips: [
      "Re-estimate your income before each due date and adjust the next instalment.",
      "Count interest, rent and capital gains, not just salary or fees, when you estimate tax.",
      "Salaried people with large other income can declare it to the employer so more TDS is deducted.",
      "Keep the challan details; you need them to claim the credit in your return.",
    ],
  };
}

// ─── Presumptive tax (44ADA / 44AD) ──────────────────────────────────────────

function presumptiveTaxGuide(): CalcGuide {
  const receipts = 30_00_000;
  const expenses = 6_00_000;
  const p = presumptiveTax({
    mode: "44ADA",
    receipts,
    digitalPct: 100,
    actualExpenses: expenses,
  });
  const biz = presumptiveTax({
    mode: "44AD",
    receipts,
    digitalPct: 100,
    actualExpenses: expenses,
  });
  const levels = [10_00_000, 20_00_000, 30_00_000, 50_00_000, 75_00_000];
  return {
    intro:
      "A freelancer tax calculator shows the tax under presumptive taxation, where a fixed share of your receipts is treated as income. Enter your yearly receipts, the share received digitally and your actual expenses to compare it with keeping books.",
    howItWorks: [
      "Under Section 44ADA, professionals declare 50% of gross receipts as income. Under Section 44AD, small businesses declare 6% of digital turnover and 8% of cash turnover. No books of account are needed.",
      "The tool checks the limit: ₹75 lakh for 44ADA and ₹3 crore for 44AD when at least 95% is received digitally, or ₹50 lakh and ₹2 crore otherwise.",
      `Tax is worked out on the presumed income in the new regime, with no other income and no standard deduction. ${RULES_NOTE}`,
    ],
    formula: {
      expression:
        "Presumed income = 50% of receipts (44ADA), or 6% of digital + 8% of cash turnover (44AD)",
      legend: [
        "Tax = new-regime slab tax on presumed income, with 87A rebate and 4% cess",
        "Books option = tax on receipts minus actual expenses",
      ],
    },
    example: {
      title: `Freelancer with ${inrShort(receipts)} receipts, all by bank, ${inrShort(expenses)} expenses`,
      steps: [
        `Presumed income under 44ADA = 50% of ${inr(receipts)} = ${inr(p.income)}.`,
        `New-regime tax on that = ${inr(p.tax)}, or ${pct((p.tax / receipts) * 100)} of receipts.`,
        `With books, income would be ${inr(p.booksIncome)} and tax ${inr(p.booksTax)}, so 44ADA saves ${inr(p.booksTax - p.tax)}.`,
        `A business with the same turnover under 44AD declares ${inr(biz.income)} and pays ${inr(biz.tax)}.`,
      ],
    },
    table: {
      caption:
        "Section 44ADA, all receipts digital, new regime, no other income",
      head: [
        "Gross receipts",
        "Presumed income",
        "Tax",
        "Tax as % of receipts",
      ],
      rows: levels.map((r) => {
        const x = presumptiveTax({
          mode: "44ADA",
          receipts: r,
          digitalPct: 100,
          actualExpenses: 0,
        });
        return [inrShort(r), inr(x.income), inr(x.tax), pct((x.tax / r) * 100)];
      }),
    },
    tips: [
      "Take payments by bank or UPI. Staying above 95% digital gives the higher turnover limit.",
      "If your real expenses are above 50% of receipts, compare the books option shown by the tool.",
      "Presumptive taxpayers pay advance tax in one instalment by 15 March.",
      "Keep invoices and bank statements even without books; they support the receipts you declare.",
    ],
  };
}

// ─── Rental income ───────────────────────────────────────────────────────────

function rentalIncomeGuide(): CalcGuide {
  const base = {
    monthlyRent: 30_000,
    vacantMonths: 1,
    municipalTax: 12_000,
    loanInterest: 0,
    propertyValue: 1_00_00_000,
    maintenance: 36_000,
    slabPct: 30,
  };
  const r = rentalIncome(base);
  const interests = [0, 1_00_000, 2_00_000, 3_00_000];
  return {
    intro:
      "A rental income tax calculator shows the tax on rent from a let-out property and the net yield you earn after costs and tax. Enter the monthly rent, vacant months, municipal tax, loan interest, maintenance and your slab.",
    howItWorks: [
      "Rent actually received, minus municipal tax paid, gives the net annual value. A flat 30% of that is deducted for repairs, whatever you really spend. Home loan interest on the property is then deducted in full.",
      "What remains is taxed at your slab rate plus 4% cess. If interest pushes the result below zero, the tool shows the loss that can reduce other income, up to ₹2 lakh a year in the old regime.",
      `Net yield is rent minus municipal tax, maintenance and tax, divided by the property value. ${RULES_NOTE}`,
    ],
    formula: {
      expression:
        "Taxable rent = (rent received − municipal tax) × 70% − home loan interest",
      legend: [
        "70% = what is left after the flat 30% standard deduction",
        "Tax = taxable rent × slab rate × 1.04",
      ],
    },
    example: {
      title: `${inr(base.monthlyRent)} a month, 1 month vacant, ${inrShort(base.propertyValue)} flat, 30% slab`,
      steps: [
        `Rent received = ${inr(base.monthlyRent)} × 11 = ${inr(r.gross)}. Less ${inr(base.municipalTax)} municipal tax = ${inr(r.nav)}.`,
        `30% standard deduction = ${inr(r.std30)}, so taxable income = ${inr(r.taxable)}.`,
        `Tax at 30% plus cess = ${inr(r.tax)}.`,
        `After ${inr(base.maintenance)} maintenance and tax, the net rental yield is ${pct(r.netYield, 2)}.`,
      ],
    },
    table: {
      caption: `Same flat with a home loan: rent ${inr(base.monthlyRent)} a month, 30% slab`,
      head: [
        "Loan interest a year",
        "Taxable income",
        "Tax on rent",
        "Loss to set off",
      ],
      rows: interests.map((i) => {
        const x = rentalIncome({ ...base, loanInterest: i });
        const taxable =
          x.taxable < 0 ? `Loss of ${inr(-x.taxable)}` : inr(x.taxable);
        return [inr(i), taxable, inr(x.tax), inr(x.setOffLoss)];
      }),
    },
    tips: [
      "Deduct municipal tax only in the year you actually pay it.",
      "Society maintenance and repairs are not deducted separately; the 30% covers them.",
      "Count vacant months honestly. Each empty month cuts both rent and yield.",
      "Compare the net yield with a post-tax FD return before buying a property to let out.",
    ],
  };
}

// ─── GST ─────────────────────────────────────────────────────────────────────

function gstGuide(): CalcGuide {
  const amount = 10_000;
  const rate = 18;
  const add = gst(amount, rate, "add");
  const remove = gst(add.total, rate, "remove");
  const wrong = gst(add.total, rate, "add").tax;
  const rates = [3, 5, 12, 18, 28, 40];
  return {
    intro:
      "A GST (Goods and Services Tax) calculator adds GST to a price or takes it out of a price that already includes it. Enter the amount, choose the rate and say whether the amount is before or after GST.",
    howItWorks: [
      "To add GST, multiply the base price by the rate and add it on. To remove GST, divide the inclusive price by one plus the rate; the difference is the tax.",
      "Within a state, the GST is split equally into CGST and SGST. For a sale to another state, the full amount is IGST. The total is the same either way.",
      "The tool offers 3%, 5%, 12%, 18%, 28% and 40%. Since September 2025 most items sit in the 5% and 18% slabs; 12% and 28% are kept for older invoices.",
    ],
    formula: {
      expression: "Add: GST = base × rate. Remove: base = price ÷ (1 + rate)",
      legend: [
        "rate = GST rate as a decimal, such as 0.18",
        "CGST = SGST = GST ÷ 2 for a sale within the state",
      ],
    },
    example: {
      title: `${inr(amount)} at ${rate}% GST`,
      steps: [
        `Add GST: ${inr(amount)} × ${rate}% = ${inr(add.tax)}, so the price with GST is ${inr(add.total)}.`,
        `Within the state, that is ${inr(add.tax / 2)} CGST and ${inr(add.tax / 2)} SGST.`,
        `Remove GST: ${inr(add.total)} ÷ 1.${rate} = ${inr(remove.base)}, and the GST inside is ${inr(remove.tax)}.`,
        `Taking ${rate}% of ${inr(add.total)} gives ${inr(wrong)}, which overstates the GST by ${inr(wrong - remove.tax)}.`,
      ],
    },
    table: {
      caption: `GST on ${inr(amount)} at each rate`,
      head: [
        "GST rate",
        "GST added",
        "Price with GST",
        `GST inside ${inr(amount)}`,
      ],
      rows: rates.map((r) => {
        const a = gst(amount, r, "add");
        const b = gst(amount, r, "remove");
        return [`${r}%`, inr(a.tax), inr(a.total), inr(b.tax)];
      }),
    },
    tips: [
      "Check whether a quote says 'plus GST' or 'inclusive of GST' before comparing prices.",
      "Never remove GST by taking the rate off the inclusive price; divide instead.",
      "On a B2B invoice, check the supplier's GSTIN and the CGST, SGST or IGST split.",
    ],
  };
}

// ─── Child education ─────────────────────────────────────────────────────────

function childEducationGuide(): CalcGuide {
  const cost = 25_00_000;
  const years = 13;
  const infl = 10;
  const ret = 12;
  const saved = 2_00_000;
  const plan = (y: number, s = 0) =>
    goalPlan({
      costToday: cost,
      years: y,
      inflationPct: infl,
      returnPct: ret,
      existingSavings: s,
    });
  const g = plan(years);
  const gs = plan(years, saved);
  const late = g.delays.find((d) => d.delayYears === 3);
  const spans = [5, 8, 10, 13, 15];
  return {
    intro:
      "A child education calculator shows what a college course will cost by the time your child is ready, and the monthly SIP needed to fund it. Enter today's cost of the course, the years until college, education inflation and your expected return.",
    howItWorks: [
      "First the tool inflates today's cost to the year of admission. Education costs usually rise faster than general prices, which is why it starts at 10% inflation.",
      "Any money already saved is grown at your expected return and subtracted. The tool then finds the monthly SIP, or the one-time investment today, that covers the remaining gap.",
      "It also shows how much higher the SIP becomes if you start one, two, three or five years later.",
    ],
    formula: {
      expression: "Future cost = cost today × (1 + inflation)^years",
      legend: [
        "Gap = future cost − savings grown at your expected return",
        "Monthly SIP = gap × r ÷ ((1 + r)^n − 1), with r = return ÷ 12 and n = months",
      ],
    },
    example: {
      title: `${inrShort(cost)} course, ${years} years away, ${infl}% inflation, ${ret}% return`,
      steps: [
        `Future cost = ${inr(cost)} × 1.${infl}^${years} = ${inr(g.futureCost)}.`,
        `Monthly SIP needed = ${inr(g.sip)}, or ${inr(g.lumpsum)} invested once today.`,
        `With ${inr(saved)} already saved, the SIP falls to ${inr(gs.sip)}.`,
        late
          ? `Start 3 years later and the SIP rises to ${inr(late.sip)}.`
          : `Starting later raises the SIP sharply.`,
      ],
    },
    table: {
      caption: `A course costing ${inrShort(cost)} today, ${infl}% inflation, ${ret}% return`,
      head: [
        "Years to college",
        "Future cost",
        "Monthly SIP",
        "Or lumpsum today",
      ],
      rows: spans.map((y) => {
        const x = plan(y);
        return [
          String(y),
          inrShort(x.futureCost),
          inr(x.sip),
          inrShort(x.lumpsum),
        ];
      }),
    },
    tips: [
      "Plan graduation and post-graduation as two separate goals with their own dates.",
      "Raise the SIP each year with your income; a flat SIP falls behind 10% cost growth.",
      "Sukanya Samriddhi can fund part of a daughter's education alongside equity funds.",
      "A term insurance cover keeps the plan alive if something happens to you.",
    ],
  };
}

// ─── Marriage ────────────────────────────────────────────────────────────────

function marriageGuide(): CalcGuide {
  const cost = 20_00_000;
  const years = 8;
  const infl = 7;
  const ret = 12;
  const plan = (c: number, y: number) =>
    goalPlan({
      costToday: c,
      years: y,
      inflationPct: infl,
      returnPct: ret,
      existingSavings: 0,
    });
  const g = plan(cost, years);
  const late = g.delays.find((d) => d.delayYears === 2);
  const budgets = [10_00_000, 20_00_000, 30_00_000, 50_00_000];
  const spans = [3, 5, 8, 10];
  return {
    intro:
      "A marriage planning calculator shows what a wedding budget set in today's money will cost on the day, and the monthly SIP needed to save for it. Enter the budget, the years left, the inflation you expect and your return.",
    howItWorks: [
      "Wedding costs such as venue, food, jewellery and travel rise every year. The tool inflates today's budget to the wedding year, starting at 7%.",
      "It grows any savings you already have, subtracts them, and finds the monthly SIP or one-time amount that fills the gap at your expected return.",
      "The shorter the time left, the bigger the monthly amount, because compounding has less time to help.",
    ],
    formula: {
      expression: "Future budget = budget today × (1 + inflation)^years",
      legend: [
        "Monthly SIP = gap × r ÷ ((1 + r)^n − 1)",
        "r = expected yearly return ÷ 12, n = months to the wedding",
      ],
    },
    example: {
      title: `${inrShort(cost)} wedding in ${years} years, ${infl}% inflation, ${ret}% return`,
      steps: [
        `Future budget = ${inr(cost)} × 1.0${infl}^${years} = ${inr(g.futureCost)}.`,
        `Monthly SIP needed = ${inr(g.sip)}.`,
        `Or invest ${inr(g.lumpsum)} once today.`,
        late
          ? `Wait 2 years and the SIP rises to ${inr(late.sip)}.`
          : `Waiting raises the SIP sharply.`,
      ],
    },
    table: {
      caption: `Monthly SIP needed, ${infl}% inflation, ${ret}% return`,
      head: ["Budget today", ...spans.map((y) => `${y} years`)],
      rows: budgets.map((b) => [
        inrShort(b),
        ...spans.map((y) => inr(plan(b, y).sip)),
      ]),
    },
    tips: [
      "For a goal three years away or less, use a lower return such as 7% to stay realistic.",
      "Fix the big items, venue, jewellery and guest count, first; they drive the budget.",
      "Buy gold gradually through gold funds or ETFs rather than all at once.",
      "Avoid a personal loan for the wedding; the EMI outlasts the celebration.",
    ],
  };
}

// ─── Salary hike ─────────────────────────────────────────────────────────────

function salaryHikeGuide(): CalcGuide {
  const current = 15_00_000;
  const hike = 10;
  const infl = 6;
  const s = salaryHike(current, current * (1 + hike / 100), infl);
  const hikes = [5, 10, 15, 20, 30];
  const taxNow = incomeTax(current * 0.95 - 75_000, "new");
  const taxNew = incomeTax(current * (1 + hike / 100) * 0.95 - 75_000, "new");
  return {
    intro:
      "A salary hike calculator shows your hike percentage, the real hike after inflation and how much more you take home each month. Enter your current CTC and either the hike percentage or the new offer.",
    howItWorks: [
      "The hike percentage compares new CTC with current CTC. The real hike removes inflation, so it shows the change in what your salary can actually buy.",
      "For in-hand pay, the tool assumes about 5% of CTC goes to PF and similar deductions. It then applies new-regime tax with the ₹75,000 standard deduction.",
      `In the new regime, taxable income up to ₹12 lakh pays no tax after the rebate, so hikes near that line can feel uneven. ${RULES_NOTE}`,
    ],
    formula: {
      expression: "Real hike = (1 + hike) ÷ (1 + inflation) − 1",
      legend: [
        "Monthly in-hand = (95% of CTC − new-regime tax) ÷ 12",
        "Tax is on 95% of CTC minus the ₹75,000 standard deduction",
      ],
    },
    example: {
      title: `${inrShort(current)} CTC, ${hike}% hike, ${infl}% inflation`,
      steps: [
        `New CTC = ${inr(current * (1 + hike / 100))}. Real hike = 1.${hike} ÷ 1.0${infl} − 1 = ${pct(s.realPct, 2)}.`,
        `Tax moves from ${inr(taxNow)} to ${inr(taxNew)} a year.`,
        `Monthly in-hand rises from ${inr(s.currentMonthly)} to ${inr(s.newMonthly)}.`,
        `That is ${inr(s.monthlyGain)} more each month.`,
      ],
    },
    table: {
      caption: `Hikes on a ${inrShort(current)} CTC, ${infl}% inflation, new regime`,
      head: ["Hike", "New CTC", "Real hike", "Extra in-hand a month"],
      rows: hikes.map((h) => {
        const n = current * (1 + h / 100);
        const x = salaryHike(current, n, infl);
        return [`${h}%`, inr(n), pct(x.realPct), inr(x.monthlyGain)];
      }),
    },
    tips: [
      "Compare offers on fixed pay. A large variable share may not be paid in full.",
      "Ask how a new offer treats PF, gratuity and joining bonus inside the CTC.",
      "Put part of every hike into a step-up SIP before your spending rises to match it.",
      "Use the Salary calculator for an exact break-up of a specific offer.",
    ],
  };
}

// ─── Net worth ───────────────────────────────────────────────────────────────

function netWorthGuide(): CalcGuide {
  const liquidKeys = ["bank", "fd", "equity", "gold"];
  const assets = {
    bank: 2_00_000,
    fd: 3_00_000,
    retire: 6_00_000,
    equity: 5_00_000,
    gold: 2_00_000,
    home: 0,
    vehicle: 4_00_000,
    other: 0,
  };
  const liabilities = {
    home: 0,
    car: 2_50_000,
    personal: 0,
    card: 30_000,
    other: 0,
  };
  const n = netWorth(assets, liabilities, liquidKeys);
  const profiles: Array<{
    label: string;
    a: Record<string, number>;
    l: Record<string, number>;
  }> = [
    { label: "Early career", a: assets, l: liabilities },
    {
      label: "New home buyer",
      a: { ...assets, home: 80_00_000 },
      l: { ...liabilities, home: 60_00_000 },
    },
    {
      label: "Home loan nearly repaid",
      a: { ...assets, retire: 40_00_000, equity: 30_00_000, home: 1_20_00_000 },
      l: { home: 10_00_000 },
    },
  ];
  return {
    intro:
      "A net worth calculator adds up everything you own and subtracts everything you owe. Enter your bank balance, investments, property and vehicles, then your loans and card dues.",
    howItWorks: [
      "Total assets include cash, deposits, retirement accounts such as EPF, PPF and NPS, equity, gold, property and vehicles. Total liabilities include home, car and personal loans, card dues and other borrowing.",
      "Net worth is assets minus liabilities. The tool also shows liquid assets, which are bank, deposits, equity and gold, because those can be used within a month.",
      "The debt ratio is loans as a share of assets. The tool flags under 30% as healthy, 30% to 50% as manageable and above 50% as high.",
    ],
    formula: {
      expression: "Net worth = total assets − total liabilities",
      legend: [
        "Debt ratio = total liabilities ÷ total assets × 100",
        "Liquid assets = bank + FDs and debt funds + equity + gold",
      ],
    },
    example: {
      title: "A young professional with a car loan",
      steps: [
        `Assets: ${inr(assets.bank)} bank, ${inr(assets.fd)} FDs, ${inr(assets.retire)} EPF and PPF, ${inr(assets.equity)} equity, ${inr(assets.gold)} gold, ${inr(assets.vehicle)} car. Total = ${inr(n.totalAssets)}.`,
        `Liabilities: ${inr(liabilities.car)} car loan and ${inr(liabilities.card)} card dues. Total = ${inr(n.totalLiabilities)}.`,
        `Net worth = ${inr(n.netWorth)}. Liquid assets = ${inr(n.liquid)}.`,
        `Debt ratio = ${pct(n.debtRatio)}, which the tool rates healthy.`,
      ],
    },
    table: {
      caption: "Three illustrative households",
      head: ["Profile", "Assets", "Loans", "Net worth", "Debt ratio"],
      rows: profiles.map((p) => {
        const x = netWorth(p.a, p.l, liquidKeys);
        return [
          p.label,
          inrShort(x.totalAssets),
          inrShort(x.totalLiabilities),
          inrShort(x.netWorth),
          pct(x.debtRatio),
        ];
      }),
    },
    tips: [
      "Value cars and gadgets at resale price, not purchase price; they lose value every year.",
      "Use current market values for funds and shares, and the latest statement for EPF and PPF.",
      "Recalculate every few months. The trend matters more than any single number.",
      "Your home adds to net worth but not to liquid money for emergencies.",
    ],
  };
}

// ─── Budget (50/30/20) ───────────────────────────────────────────────────────

function budgetGuide(): CalcGuide {
  const takeHome = 80_000;
  const b = budgetSplit(takeHome);
  const actualNeeds = 45_000;
  const actualWants = 20_000;
  const actualSave = takeHome - actualNeeds - actualWants;
  const incomes = [30_000, 50_000, 80_000, 1_20_000, 2_00_000];
  return {
    intro:
      "A 50/30/20 budget calculator splits your monthly take-home pay into needs, wants and savings. Enter your take-home and, if you like, what you actually spend, to see where you stand against the plan.",
    howItWorks: [
      "Needs are costs you cannot skip: rent, EMIs, groceries, utilities and insurance. Wants are choices: dining out, shopping, trips and subscriptions. Savings is what goes to investments and the emergency fund.",
      "The default split is 50% needs, 30% wants and 20% savings. You can change the needs and wants shares, and savings takes whatever is left.",
      "Enter your actual spending to see whether you are saving at, above or below the plan.",
    ],
    formula: {
      expression: "Savings = take-home × (100% − needs % − wants %)",
      legend: [
        "Use take-home pay after tax and PF, not CTC",
        "Default: needs 50%, wants 30%, savings 20%",
      ],
    },
    example: {
      title: `${inr(takeHome)} monthly take-home`,
      steps: [
        `Needs = ${inr(b.needs)}, wants = ${inr(b.wants)}, savings = ${inr(b.savings)}.`,
        `Actual spending: ${inr(actualNeeds)} on needs and ${inr(actualWants)} on wants.`,
        `That leaves ${inr(actualSave)} to save, ${inr(b.savings - actualSave)} short of the plan.`,
        `Needs are ${inr(actualNeeds - b.needs)} over budget, so that is the place to look first.`,
      ],
    },
    table: {
      caption: "50/30/20 split of monthly take-home",
      head: ["Take-home", "Needs (50%)", "Wants (30%)", "Savings (20%)"],
      rows: incomes.map((i) => {
        const x = budgetSplit(i);
        return [inr(i), inr(x.needs), inr(x.wants), inr(x.savings)];
      }),
    },
    tips: [
      "Move the savings amount by auto-debit on salary day, before you start spending.",
      "In a high-rent city needs may cross 50%; cut wants rather than savings.",
      "Treat EMIs as needs. If they crowd out savings, avoid new loans.",
      "Review the split when your income changes, not only once a year.",
    ],
  };
}

export const TAX_GUIDES: Record<string, () => CalcGuide> = {
  salary: salaryGuide,
  "capital-gains": capitalGainsGuide,
  "ltcg-harvest": ltcgHarvestGuide,
  deductions: deductionsGuide,
  "advance-tax": advanceTaxGuide,
  "presumptive-tax": presumptiveTaxGuide,
  "rental-income": rentalIncomeGuide,
  gst: gstGuide,
  "child-education": childEducationGuide,
  marriage: marriageGuide,
  "salary-hike": salaryHikeGuide,
  "net-worth": netWorthGuide,
  budget: budgetGuide,
};
