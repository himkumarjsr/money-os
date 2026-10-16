import type { CalculatorSeo } from "./calculator-seo";
import { CATEGORIES } from "./calculator-config";

type Copy = {
  appName: string;
  tagline: string;
  description: string;
  faq: Array<[string, string]>;
};

/** SEO copy for the advisor calculators (investing, retirement, loans, tax, insurance, goals). */
const COPY: Record<string, Copy> = {
  "stepup-sip": {
    appName: "Step-up SIP Calculator",
    tagline: "Top-up SIP Returns",
    description:
      "Free step-up SIP calculator for India. See how raising your SIP every year with your salary grows your corpus versus a flat SIP.",
    faq: [
      [
        "What is a step-up SIP?",
        "A SIP where the monthly amount rises by a fixed percentage every year, usually in line with your salary hike.",
      ],
      [
        "How much more does a 10% step-up give?",
        "Over 15–20 years a 10% yearly step-up typically grows the final corpus by 60–90% compared with a flat SIP of the same starting amount.",
      ],
    ],
  },
  lumpsum: {
    appName: "Lumpsum Calculator",
    tagline: "One-time Investment Returns",
    description:
      "Free lumpsum calculator for India. Estimate how a one-time mutual fund or stock investment grows, and what it is worth in today's money.",
    faq: [
      [
        "How is lumpsum return calculated?",
        "Future value = amount × (1 + annual return)^years, compounded yearly.",
      ],
      [
        "Lumpsum or SIP?",
        "Lumpsum works when you already have the money and a long horizon; SIP spreads the risk of investing at a market peak. An STP combines both.",
      ],
    ],
  },
  "goal-sip": {
    appName: "Goal SIP Calculator",
    tagline: "SIP Needed for Any Goal",
    description:
      "Find the monthly SIP or one-time investment needed for any goal — a car, home, travel or education — after inflation.",
    faq: [
      [
        "How is the SIP for a goal calculated?",
        "The goal's cost is inflated to the target year, existing savings are grown, and the remaining gap is converted to a monthly SIP at your expected return.",
      ],
      [
        "What return should I assume?",
        "About 11–12% for equity funds over 7+ years, 7–8% for debt or hybrid funds over shorter periods.",
      ],
    ],
  },
  "sip-delay": {
    appName: "Cost of Delay Calculator",
    tagline: "What Waiting to Invest Costs",
    description:
      "See how much corpus you lose by delaying your SIP by a few years, and the bigger SIP needed to catch up.",
    faq: [
      [
        "Why does delay cost so much?",
        "The last years of compounding add the most money. Starting late removes those years, not the early ones.",
      ],
      [
        "Can I make up for a late start?",
        "Yes, by investing more each month — the calculator shows the SIP needed to reach the same corpus.",
      ],
    ],
  },
  stp: {
    appName: "STP Calculator",
    tagline: "Systematic Transfer Plan",
    description:
      "Free STP calculator. Model moving a lumpsum from a debt or liquid fund into an equity fund in monthly instalments.",
    faq: [
      [
        "What is an STP?",
        "A Systematic Transfer Plan moves a fixed amount every month from one mutual fund (usually liquid or debt) to another (usually equity) in the same fund house.",
      ],
      [
        "Is STP taxed?",
        "Yes. Each transfer is a redemption from the source fund, so gains on it are taxed as capital gains.",
      ],
    ],
  },
  compound: {
    appName: "Compound Interest Calculator",
    tagline: "Monthly, Quarterly, Yearly",
    description:
      "Free compound interest calculator for India with monthly, quarterly, half-yearly and yearly compounding.",
    faq: [
      [
        "What is compound interest?",
        "Interest earned on both your original amount and the interest already added to it.",
      ],
      [
        "Does compounding frequency matter?",
        "Yes, slightly. Monthly compounding gives a little more than yearly at the same rate.",
      ],
    ],
  },
  cagr: {
    appName: "CAGR Calculator",
    tagline: "Compound Annual Growth Rate",
    description:
      "Free CAGR calculator. Find the yearly growth rate of an investment from its start value, end value and holding period.",
    faq: [
      [
        "What is CAGR?",
        "Compound Annual Growth Rate — the steady yearly rate that turns the starting value into the ending value.",
      ],
      [
        "CAGR or XIRR?",
        "Use CAGR for one investment and one exit. Use XIRR for SIPs, top-ups or withdrawals.",
      ],
    ],
  },
  xirr: {
    appName: "XIRR Calculator",
    tagline: "Returns on SIP & Irregular Investments",
    description:
      "Free XIRR calculator for India. Find the real annual return on SIPs, top-ups and withdrawals made on different dates.",
    faq: [
      [
        "What is XIRR?",
        "Extended Internal Rate of Return — an annualised return that accounts for the date of every investment and withdrawal.",
      ],
      [
        "Why is my XIRR different from absolute return?",
        "Absolute return ignores time. Money invested recently has had less time to grow, which XIRR accounts for.",
      ],
    ],
  },
  "expense-ratio": {
    appName: "Direct vs Regular Mutual Fund Calculator",
    tagline: "Expense Ratio Impact",
    description:
      "See how much more a direct mutual fund plan earns than a regular plan over time because of its lower expense ratio.",
    faq: [
      [
        "What is the difference between direct and regular plans?",
        "Same fund and manager. Regular plans pay a distributor commission, so their expense ratio is about 0.5–1.5% higher.",
      ],
      [
        "Does 1% really matter?",
        "Over 20 years a 1% higher cost can take 15–20% off your final corpus.",
      ],
    ],
  },
  "asset-allocation": {
    appName: "Asset Allocation Calculator",
    tagline: "Equity, Debt & Gold Mix",
    description:
      "Free asset allocation calculator for India. Get an equity-debt-gold mix for your age, goals and risk comfort, and see how to rebalance.",
    faq: [
      [
        "What is asset allocation?",
        "How you split money across equity, debt and gold. It drives most of your portfolio's risk and return.",
      ],
      [
        "How often should I rebalance?",
        "Once a year, or when any part drifts more than about 5% from its target.",
      ],
    ],
  },
  inflation: {
    appName: "Inflation Calculator India",
    tagline: "Future Cost & Real Return",
    description:
      "Free inflation calculator. See what things will cost in future, how much buying power money loses, and your real return after tax and inflation.",
    faq: [
      [
        "What inflation rate should I use?",
        "About 5–6% for general expenses, 10% for education and 12–14% for medical costs in India.",
      ],
      [
        "What is real return?",
        "Your return after removing inflation: (1 + return) ÷ (1 + inflation) − 1.",
      ],
    ],
  },
  "money-double": {
    appName: "Rule of 72 Calculator",
    tagline: "Years to Double Your Money",
    description:
      "Find how many years your money takes to double, triple or grow 10× at any interest rate, with the Rule of 72.",
    faq: [
      [
        "What is the Rule of 72?",
        "Divide 72 by the annual return to estimate the years needed to double your money.",
      ],
      [
        "How accurate is it?",
        "Very close for returns between 6% and 12%; the calculator also shows the exact figure.",
      ],
    ],
  },
  fd: {
    appName: "FD Calculator",
    tagline: "Fixed Deposit Maturity, TDS & Tax",
    description:
      "Free FD calculator for India. Calculate fixed deposit maturity, interest, TDS and your post-tax return with monthly or quarterly compounding.",
    faq: [
      [
        "When is TDS deducted on FD interest?",
        "When interest from a bank crosses ₹50,000 in a financial year (₹1 lakh for senior citizens). TDS is 10%, or 20% without PAN.",
      ],
      [
        "Is FD interest taxable?",
        "Yes, it is added to your income and taxed at your slab rate.",
      ],
    ],
  },
  rd: {
    appName: "RD Calculator",
    tagline: "Recurring Deposit Maturity",
    description:
      "Free recurring deposit calculator for banks. Find RD maturity value and interest with quarterly compounding.",
    faq: [
      [
        "How is RD interest calculated?",
        "Each monthly instalment earns interest compounded quarterly for the months it stays deposited.",
      ],
      [
        "Is RD interest taxable?",
        "Yes, at your slab rate. TDS applies like an FD.",
      ],
    ],
  },
  gold: {
    appName: "Gold Investment Calculator",
    tagline: "SGB vs Gold ETF vs Jewellery",
    description:
      "Compare Sovereign Gold Bonds, gold ETFs and physical gold after making charges, GST and tax.",
    faq: [
      [
        "Which is the best way to invest in gold?",
        "SGBs held to maturity are tax-free on gains and pay 2.5% interest. Gold ETFs are next. Jewellery loses making charges and GST.",
      ],
      [
        "How is gold taxed?",
        "Physical gold held over 24 months and gold ETFs over 12 months are taxed at 12.5% long-term; shorter holdings at your slab.",
      ],
    ],
  },
  retirement: {
    appName: "Retirement Calculator India",
    tagline: "Corpus & Monthly SIP Needed",
    description:
      "Free retirement calculator for India. Find the corpus you need to retire and the monthly SIP to build it, after inflation.",
    faq: [
      [
        "How much do I need to retire in India?",
        "It depends on expenses, inflation and years in retirement. Typically 25–35× your yearly expenses at retirement.",
      ],
      [
        "What counts towards the corpus?",
        "EPF, PPF, NPS, mutual funds and other long-term savings meant for retirement.",
      ],
    ],
  },
  nps: {
    appName: "NPS Calculator",
    tagline: "Pension, Lump Sum & Tax Benefit",
    description:
      "Free NPS calculator. Estimate your National Pension System corpus at 60, tax-free lump sum, annuity and monthly pension.",
    faq: [
      [
        "How much NPS can I withdraw at 60?",
        "Up to 60% as a tax-free lump sum. At least 40% must buy an annuity that pays a pension.",
      ],
      [
        "What tax benefit does NPS give?",
        "An extra ₹50,000 deduction under 80CCD(1B) in the old regime. Employer contributions under 80CCD(2) are deductible in both regimes.",
      ],
    ],
  },
  annuity: {
    appName: "Annuity Calculator",
    tagline: "Monthly Pension from a Corpus",
    description:
      "Calculate the monthly pension an annuity pays for your corpus, or the corpus needed for a target pension.",
    faq: [
      [
        "What is an annuity?",
        "A plan from an insurer that pays you a fixed income for life in return for a one-time amount.",
      ],
      [
        "Is annuity income taxable?",
        "Yes, it is taxed at your slab rate every year.",
      ],
    ],
  },
  gratuity: {
    appName: "Gratuity Calculator",
    tagline: "Amount & Tax Exemption",
    description:
      "Free gratuity calculator for India. Calculate gratuity from last drawn basic + DA and years of service, and the tax-free part.",
    faq: [
      [
        "How is gratuity calculated?",
        "15 × last drawn basic + DA × years of service ÷ 26 for employers covered by the Gratuity Act.",
      ],
      [
        "How much gratuity is tax-free?",
        "Up to ₹20 lakh for private employees; fully exempt for government employees.",
      ],
    ],
  },
  "leave-encashment": {
    appName: "Leave Encashment Calculator",
    tagline: "Payout & Tax",
    description:
      "Calculate leave encashment and how much of it is tax-free at retirement or resignation.",
    faq: [
      [
        "Is leave encashment taxable?",
        "While in service, fully. At retirement or resignation, private employees get an exemption of up to ₹25 lakh.",
      ],
      [
        "How is it calculated?",
        "Basic + DA ÷ 30 × leave days encashed, as per your employer's policy.",
      ],
    ],
  },
  "loan-eligibility": {
    appName: "Loan Eligibility Calculator",
    tagline: "How Much Can I Borrow?",
    description:
      "Free home loan eligibility calculator. Find the loan amount and EMI you qualify for from your income and existing EMIs.",
    faq: [
      [
        "What is FOIR?",
        "Fixed Obligation to Income Ratio — the share of your take-home lenders allow for all EMIs, usually 40–60%.",
      ],
      [
        "How much of the house price will a bank fund?",
        "Up to 90% for loans under ₹30 lakh, 80% up to ₹75 lakh and 75% above, as per RBI.",
      ],
    ],
  },
  "prepay-vs-invest": {
    appName: "Prepay vs Invest Calculator",
    tagline: "Prepay Home Loan or Invest?",
    description:
      "Should you prepay your home loan or invest the money? Compare interest saved with what the money could earn.",
    faq: [
      [
        "Is it better to prepay a home loan or invest?",
        "If your expected post-tax return is clearly above your loan rate, investing can win. Prepaying is a guaranteed return equal to your loan rate.",
      ],
      [
        "Is there a penalty for prepaying?",
        "No, RBI does not allow prepayment charges on floating-rate loans to individuals.",
      ],
    ],
  },
  "balance-transfer": {
    appName: "Home Loan Balance Transfer Calculator",
    tagline: "Savings from Switching",
    description:
      "Calculate how much you save by moving your home loan to a lower rate, after processing fees and charges.",
    faq: [
      [
        "When is a balance transfer worth it?",
        "Usually when the rate difference is 0.5% or more and many years are left on the loan.",
      ],
      [
        "What does switching cost?",
        "Processing fee (often 0.25–1%), legal and valuation charges, and GST on the fee.",
      ],
    ],
  },
  "flat-vs-reducing": {
    appName: "Flat to Reducing Rate Calculator",
    tagline: "Real Loan Interest Rate",
    description:
      "Convert a flat interest rate to the real reducing-balance rate and see the true cost of a loan.",
    faq: [
      [
        "What is a flat interest rate?",
        "Interest charged on the full loan amount for the whole tenure, even as you repay it.",
      ],
      [
        "How does flat compare to reducing rate?",
        "A flat rate is roughly 1.8–1.9 times the equivalent reducing rate.",
      ],
    ],
  },
  "credit-card": {
    appName: "Credit Card Interest Calculator",
    tagline: "Minimum Due Trap",
    description:
      "See how long it takes and how much interest you pay if you clear a credit card bill by paying only the minimum due.",
    faq: [
      [
        "How much interest do credit cards charge?",
        "About 3–4% a month (36–48% a year), plus 18% GST on the interest.",
      ],
      [
        "Why is paying the minimum due bad?",
        "Interest keeps running on the full balance, so the debt can take years to clear.",
      ],
    ],
  },
  "debt-payoff": {
    appName: "Debt Payoff Calculator",
    tagline: "Avalanche vs Snowball",
    description:
      "Plan how to become debt-free. Compare the avalanche and snowball methods for paying off several loans.",
    faq: [
      [
        "What is the avalanche method?",
        "Pay minimums on all debts and put every extra rupee on the highest-interest debt first. It saves the most interest.",
      ],
      [
        "What is the snowball method?",
        "Clear the smallest balance first for quick wins, then roll that payment into the next debt.",
      ],
    ],
  },
  "education-loan": {
    appName: "Education Loan EMI Calculator",
    tagline: "EMI, Moratorium & 80E",
    description:
      "Calculate education loan EMI after the moratorium, interest added during study, and the 80E tax benefit.",
    faq: [
      [
        "What is the moratorium on an education loan?",
        "Usually the course period plus 6–12 months, when you don't pay EMIs. Interest still accrues.",
      ],
      [
        "How does Section 80E work?",
        "All interest paid on an education loan is deductible for up to 8 years from when repayment starts, in the old regime.",
      ],
    ],
  },
  "gold-loan": {
    appName: "Gold Loan Calculator",
    tagline: "Loan Amount on Your Gold",
    description:
      "Find how much loan you can get on your gold jewellery and the interest you will pay.",
    faq: [
      [
        "How much loan can I get on gold?",
        "Up to 85% of the gold's value for loans up to ₹2.5 lakh, 80% up to ₹5 lakh and 75% above.",
      ],
      [
        "How is gold valued?",
        "By weight and purity at the lender's rate, usually the average of recent 22K prices.",
      ],
    ],
  },
  salary: {
    appName: "Salary Calculator India",
    tagline: "CTC to In-hand",
    description:
      "Free salary calculator for India. Convert CTC to monthly in-hand salary after PF, professional tax and income tax in the new or old regime.",
    faq: [
      [
        "Why is in-hand salary lower than CTC?",
        "CTC includes employer PF, gratuity and bonus. PF, professional tax and income tax are deducted from your gross salary.",
      ],
      [
        "Which tax regime gives more in-hand?",
        "The new regime for most salaries up to about ₹15 lakh unless you have large deductions like HRA and home loan interest.",
      ],
    ],
  },
  hra: {
    appName: "HRA Calculator",
    tagline: "HRA Exemption",
    description:
      "Free HRA exemption calculator. Find the tax-free part of your house rent allowance in the old regime.",
    faq: [
      [
        "How is HRA exemption calculated?",
        "The lowest of actual HRA, rent minus 10% of basic, and 50% (metro) or 40% of basic.",
      ],
      [
        "Is HRA available in the new regime?",
        "No, HRA exemption is only in the old regime.",
      ],
    ],
  },
  "capital-gains": {
    appName: "Capital Gains Tax Calculator",
    tagline: "Shares, Funds, Property, Gold",
    description:
      "Free capital gains tax calculator for India. Calculate STCG and LTCG tax on shares, mutual funds, property and gold as per Budget 2024 rules.",
    faq: [
      [
        "What is the LTCG tax on shares?",
        "12.5% on gains above ₹1.25 lakh a year for listed shares and equity funds held over 12 months.",
      ],
      [
        "Is indexation still available on property?",
        "For land or buildings bought before 23 July 2024, resident individuals can pay the lower of 12.5% without or 20% with indexation.",
      ],
    ],
  },
  "ltcg-harvest": {
    appName: "LTCG Tax Harvesting Calculator",
    tagline: "Use the ₹1.25 Lakh Exemption",
    description:
      "Calculate how much long-term equity gain to book each year to use the ₹1.25 lakh exemption and cut future tax.",
    faq: [
      [
        "What is tax harvesting?",
        "Selling and buying back equity units to book gains up to the yearly exemption, raising your cost and lowering future tax.",
      ],
      ["When should I harvest?", "Before 31 March every financial year."],
    ],
  },
  deductions: {
    appName: "80C & 80D Deduction Calculator",
    tagline: "Tax Saving Planner",
    description:
      "See how much of 80C, 80CCD(1B), 80D and home loan interest you have used, the room left and the tax you save.",
    faq: [
      [
        "What is the 80C limit?",
        "₹1.5 lakh a year, across EPF, PPF, ELSS, life insurance, tuition fees, home loan principal and more.",
      ],
      [
        "How much is 80D?",
        "₹25,000 for self and family (₹50,000 if 60+), plus ₹25,000 or ₹50,000 for parents.",
      ],
    ],
  },
  "advance-tax": {
    appName: "Advance Tax Calculator",
    tagline: "Instalments & Due Dates",
    description:
      "Calculate advance tax instalments and due dates, and the interest if you miss them.",
    faq: [
      [
        "Who must pay advance tax?",
        "Anyone whose tax after TDS is ₹10,000 or more in a year, except senior citizens without business income.",
      ],
      [
        "What are the due dates?",
        "15% by 15 June, 45% by 15 September, 75% by 15 December and 100% by 15 March.",
      ],
    ],
  },
  "presumptive-tax": {
    appName: "Freelancer Tax Calculator (44ADA)",
    tagline: "Presumptive Taxation",
    description:
      "Free tax calculator for freelancers and small businesses under Section 44ADA and 44AD presumptive taxation.",
    faq: [
      [
        "What is Section 44ADA?",
        "Professionals with receipts up to ₹75 lakh (if cash is under 5%) can declare 50% of receipts as income without keeping books.",
      ],
      [
        "What is Section 44AD?",
        "Small businesses can declare 6% of digital and 8% of cash turnover as income, up to ₹3 crore turnover.",
      ],
    ],
  },
  "rental-income": {
    appName: "Rental Income Tax Calculator",
    tagline: "Tax on Rent & Rental Yield",
    description:
      "Calculate tax on rental income after municipal tax, 30% standard deduction and home loan interest, plus net rental yield.",
    faq: [
      [
        "How is rental income taxed?",
        "Rent minus municipal tax, minus a flat 30% standard deduction and home loan interest, is taxed at your slab.",
      ],
      [
        "Can a rental loss reduce other income?",
        "Up to ₹2 lakh a year in the old regime; the rest carries forward for 8 years.",
      ],
    ],
  },
  gst: {
    appName: "GST Calculator",
    tagline: "Add or Remove GST",
    description:
      "Free GST calculator for India. Add GST to a price or remove it, with CGST, SGST and IGST split.",
    faq: [
      [
        "What are the GST rates?",
        "Since September 2025 most goods and services are taxed at 5% or 18%, with 40% for luxury and sin goods.",
      ],
      [
        "How do I remove GST from a price?",
        "Base price = price ÷ (1 + GST rate).",
      ],
    ],
  },
  "term-cover": {
    appName: "Term Insurance Calculator",
    tagline: "How Much Life Cover",
    description:
      "Free term insurance calculator for India. Find the life cover you need using income replacement and family needs.",
    faq: [
      [
        "How much term insurance do I need?",
        "Enough to replace your income for your family and clear loans and goals — often 10–20 times your annual income.",
      ],
      [
        "Till what age should cover run?",
        "Until your retirement age, typically 60–65, when your dependants no longer rely on your income.",
      ],
    ],
  },
  "health-cover": {
    appName: "Health Insurance Cover Calculator",
    tagline: "Right Cover for Your Family",
    description:
      "Find the right health insurance cover for your family based on city, family size, age and employer cover.",
    faq: [
      [
        "How much health cover is enough?",
        "₹10 lakh or more for a family in a metro, with a super top-up for larger bills.",
      ],
      [
        "Is employer health cover enough?",
        "No. It ends with the job and is often too small. Keep a personal policy.",
      ],
    ],
  },
  "policy-return": {
    appName: "Insurance Policy Return Calculator",
    tagline: "Endowment & Money-back IRR",
    description:
      "Find the real yearly return (IRR) of an endowment or money-back policy and compare it with PPF and mutual funds.",
    faq: [
      [
        "What return do endowment plans give?",
        "Typically 4–6% a year — often below PPF.",
      ],
      [
        "What is IRR?",
        "The yearly return that equates all premiums paid with the maturity amount received.",
      ],
    ],
  },
  "buy-term-invest": {
    appName: "Buy Term & Invest the Rest Calculator",
    tagline: "Term + Invest vs Endowment",
    description:
      "Compare a traditional insurance plan with buying term insurance and investing the premium difference.",
    faq: [
      [
        "What does 'buy term and invest the rest' mean?",
        "Buy cheap pure term cover for protection and invest the money you would have paid for an endowment plan.",
      ],
      [
        "Is it always better?",
        "Usually, if you actually invest the difference every year with discipline.",
      ],
    ],
  },
  "child-education": {
    appName: "Child Education Calculator",
    tagline: "Plan for College",
    description:
      "Plan your child's higher education. Find the future cost of a course and the monthly SIP needed, with education inflation.",
    faq: [
      [
        "What inflation should I use for education?",
        "About 10% a year for higher education in India.",
      ],
      [
        "Where should I invest for a child's education?",
        "Equity funds for 7+ years away, moving to debt in the last 2–3 years. Sukanya Samriddhi suits a daughter.",
      ],
    ],
  },
  marriage: {
    appName: "Marriage Planning Calculator",
    tagline: "Save for a Wedding",
    description:
      "Plan a wedding budget. Find the future cost and the monthly SIP needed to save for it.",
    faq: [
      [
        "How early should I start saving for a wedding?",
        "As early as possible — even 5–8 years ahead makes the monthly amount much smaller.",
      ],
      [
        "Where should wedding savings go?",
        "Equity funds if 5+ years away; FDs or debt funds for the last 2–3 years.",
      ],
    ],
  },
  "down-payment": {
    appName: "Home Down Payment Calculator",
    tagline: "Save for a House",
    description:
      "Find how much to save every month for a home down payment, stamp duty and registration.",
    faq: [
      [
        "How much down payment is needed for a home?",
        "At least 10–25% of the price as per RBI limits, plus 6–8% for stamp duty and registration.",
      ],
      [
        "Does a home loan cover stamp duty?",
        "No, stamp duty and registration must be paid from your own money.",
      ],
    ],
  },
  "salary-hike": {
    appName: "Salary Hike Calculator",
    tagline: "Hike %, Real Hike & In-hand",
    description:
      "Calculate your salary hike percentage, real hike after inflation and extra in-hand salary each month.",
    faq: [
      [
        "What is a real salary hike?",
        "Your hike after removing inflation. A 6% hike with 6% inflation is a 0% real hike.",
      ],
      [
        "Why is my in-hand increase smaller than my hike?",
        "Part of the extra salary goes to tax and PF.",
      ],
    ],
  },
  "net-worth": {
    appName: "Net Worth Calculator India",
    tagline: "Assets Minus Liabilities",
    description:
      "Free net worth calculator. Add what you own and what you owe to see your net worth, liquid assets and debt ratio.",
    faq: [
      ["What is net worth?", "Everything you own minus everything you owe."],
      [
        "What is a healthy debt ratio?",
        "Loans under 30% of total assets is healthy; above 50% is high.",
      ],
    ],
  },
  budget: {
    appName: "50/30/20 Budget Calculator",
    tagline: "Needs, Wants & Savings",
    description:
      "Split your take-home pay into needs, wants and savings with the 50/30/20 rule, and compare with what you actually spend.",
    faq: [
      [
        "What is the 50/30/20 rule?",
        "Spend 50% on needs, 30% on wants and save 20% of your take-home.",
      ],
      [
        "Should I save more than 20%?",
        "If you can, yes — especially for early retirement or big goals.",
      ],
    ],
  },
};

function keywordsFor(id: string, appName: string): string[] {
  for (const c of CATEGORIES) {
    const item = c.items.find((i) => i.id === id);
    if (item) return [appName, ...(item.keywords ?? []), "Finkoin calculator"];
  }
  return [appName, "Finkoin calculator"];
}

export const ADVISOR_SEO: Record<string, CalculatorSeo> = Object.fromEntries(
  Object.entries(COPY).map(([id, c]) => [
    id,
    {
      path: `/calculators/${id}`,
      appName: c.appName,
      title: `${c.appName} — ${c.tagline} | Finkoin`,
      description: c.description,
      keywords: keywordsFor(id, c.appName),
      faq: c.faq.map(([q, a]) => ({ q, a })),
    },
  ]),
);
