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
  compare: {
    appName: "Compare Calculations",
    tagline: "Investments & Loans Side by Side",
    description:
      "Free compare calculator for India. Put two or three scenarios side by side, such as monthly investing vs a fixed deposit, and see the rupee gap.",
    faq: [
      [
        "Can I compare the same calculator with a different return or tenure?",
        "Yes. Set Scenario A, then change only the return or tenure in Scenario B. The table marks the better result and shows the rupee difference.",
      ],
      [
        "Can I compare SIP with FD or PPF?",
        "Yes. Each scenario can use a different calculator: SIP, step-up SIP, lumpsum, FD, RD or PPF. Loans are compared with loans.",
      ],
      [
        "Can I share a comparison?",
        "Yes. The page link carries every input, so sharing it opens the same comparison.",
      ],
    ],
  },
  "stepup-sip": {
    appName: "Step-up SIP Calculator",
    tagline: "Top-up SIP Returns",
    description:
      "Free step-up SIP (Systematic Investment Plan) calculator. See how raising your SIP every year with your salary grows your corpus versus a flat SIP.",
    faq: [
      [
        "What is a step-up SIP?",
        "A Systematic Investment Plan (SIP) where the monthly amount rises by a fixed percentage every year, usually in line with your salary hike.",
      ],
      [
        "How much more does a 10% step-up give?",
        "Over 15–20 years a 10% yearly step-up typically grows the final corpus by 60–90% compared with a flat SIP of the same starting amount.",
      ],
      [
        "Is a step-up SIP the same as a top-up SIP?",
        "Yes. Both mean a SIP whose monthly amount rises every year, either by a fixed percentage or by a fixed rupee amount.",
      ],
    ],
  },
  lumpsum: {
    appName: "Lumpsum Calculator",
    tagline: "One-time Investment Returns",
    description:
      "Free lumpsum calculator for India. Estimate how a one-time mutual fund or stock investment grows, and what it will be worth in today's money.",
    faq: [
      [
        "How is lumpsum return calculated?",
        "Future value = amount × (1 + annual return)^years, compounded yearly.",
      ],
      [
        "Lumpsum or SIP?",
        "Lumpsum works when you already have the money and a long horizon; SIP spreads the risk of investing at a market peak. An STP combines both.",
      ],
      [
        "Is the lumpsum return guaranteed?",
        "No. Mutual fund and stock returns move with the market. The calculator uses the yearly return you enter as a steady average.",
      ],
    ],
  },
  "goal-sip": {
    appName: "Goal SIP Calculator",
    tagline: "SIP Needed for Any Goal",
    description:
      "Free goal SIP (Systematic Investment Plan) calculator. Find the monthly SIP or one-time amount needed for a car, home, travel or education goal.",
    faq: [
      [
        "What is a goal-based SIP?",
        "A Systematic Investment Plan sized to reach one goal, such as a car or a child's education, by a set date. The calculator works out the monthly amount after inflation.",
      ],
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
      "Free cost of delay calculator. See how much corpus you lose by starting a Systematic Investment Plan (SIP) late, and the SIP needed to catch up.",
    faq: [
      [
        "Why does delay cost so much?",
        "The last years of compounding add the most money. Starting late removes those years, not the early ones.",
      ],
      [
        "Can I make up for a late start?",
        "Yes, by investing more each month — the calculator shows the SIP needed to reach the same corpus.",
      ],
      [
        "How much does a 5-year delay cost?",
        "At 12% a year, starting a 20-year SIP 5 years late can leave you with roughly half the corpus. The calculator shows the exact gap for your numbers.",
      ],
    ],
  },
  stp: {
    appName: "STP Calculator",
    tagline: "Systematic Transfer Plan",
    description:
      "Free STP (Systematic Transfer Plan) calculator. Model moving a lumpsum from a debt or liquid fund into an equity fund in monthly instalments.",
    faq: [
      [
        "What is an STP?",
        "A Systematic Transfer Plan moves a fixed amount every month from one mutual fund (usually liquid or debt) to another (usually equity) in the same fund house.",
      ],
      [
        "Is STP taxed?",
        "Yes. Each transfer is a redemption from the source fund, so gains on it are taxed as capital gains.",
      ],
      [
        "STP or lumpsum: which is better?",
        "An STP spreads a large equity investment over months, so a market fall right after you invest hurts less. A lumpsum can earn more if markets rise steadily.",
      ],
    ],
  },
  compound: {
    appName: "Compound Interest Calculator",
    tagline: "Monthly, Quarterly, Yearly",
    description:
      "Free compound interest calculator for India. See how a one-time amount grows with monthly, quarterly, half-yearly or yearly compounding.",
    faq: [
      [
        "What is compound interest?",
        "Interest earned on both your original amount and the interest already added to it.",
      ],
      [
        "Does compounding frequency matter?",
        "Yes, slightly. Monthly compounding gives a little more than yearly at the same rate.",
      ],
      [
        "What is the compound interest formula?",
        "A = P × (1 + r/n)^(n × t), where P is the principal, r the yearly rate, n the number of compounding periods a year and t the years.",
      ],
    ],
  },
  cagr: {
    appName: "CAGR Calculator",
    tagline: "Compound Annual Growth Rate",
    description:
      "Free CAGR (Compound Annual Growth Rate) calculator. Find the steady yearly growth rate of an investment from its start value, end value and years held.",
    faq: [
      [
        "What is CAGR?",
        "Compound Annual Growth Rate — the steady yearly rate that turns the starting value into the ending value.",
      ],
      [
        "CAGR or XIRR?",
        "Use CAGR for one investment and one exit. Use XIRR for SIPs, top-ups or withdrawals.",
      ],
      [
        "What is a good CAGR?",
        "For Indian equity funds, 10–12% over 10 years or more is reasonable; fixed deposits give about 6–7%. Compare a fund's CAGR with its benchmark over the same period.",
      ],
    ],
  },
  xirr: {
    appName: "XIRR Calculator",
    tagline: "Extended Internal Rate of Return",
    description:
      "Free XIRR (Extended Internal Rate of Return) calculator. Find the real yearly return on investments, top-ups and withdrawals on different dates.",
    faq: [
      [
        "What is XIRR?",
        "Extended Internal Rate of Return — an annualised return that accounts for the date of every investment and withdrawal.",
      ],
      [
        "Why is my XIRR different from absolute return?",
        "Absolute return ignores time. Money invested recently has had less time to grow, which XIRR accounts for.",
      ],
      [
        "What is a good XIRR for a mutual fund SIP?",
        "Around 10–12% over 7 years or more is healthy for an equity fund. Over 1–2 years XIRR swings a lot, so judge it over longer periods.",
      ],
    ],
  },
  "expense-ratio": {
    appName: "Direct vs Regular Mutual Fund Calculator",
    tagline: "Fee Impact",
    description:
      "Free direct vs regular mutual fund calculator. See how much more a direct plan earns than a regular plan over time because of its lower expense ratio.",
    faq: [
      [
        "What is the difference between direct and regular plans?",
        "Same fund and manager. Regular plans pay a distributor commission, so their expense ratio is about 0.5–1.5% higher.",
      ],
      [
        "Does 1% really matter?",
        "Over 20 years a 1% higher cost can take 15–20% off your final corpus.",
      ],
      [
        "What is an expense ratio?",
        "The yearly fee a mutual fund charges as a percentage of your investment. It is taken out of the fund's returns every day, so you never see it as a bill.",
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
      [
        "How much equity suits my age?",
        "A common rule of thumb is 100 minus your age in equity, adjusted for your goals and how you would react to a market fall. The calculator weighs both.",
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
      [
        "How does inflation affect my savings?",
        "At 6% inflation, money loses about half its buying power in 12 years. Savings that earn less than inflation shrink in real terms.",
      ],
    ],
  },
  "money-double": {
    appName: "Rule of 72 Calculator",
    tagline: "Years to Double Your Money",
    description:
      "Free Rule of 72 calculator. Find how many years your money takes to double, triple or grow 10× at any interest rate, with the exact answer alongside.",
    faq: [
      [
        "What is the Rule of 72?",
        "Divide 72 by the annual return to estimate the years needed to double your money.",
      ],
      [
        "How accurate is it?",
        "Very close for returns between 6% and 12%; the calculator also shows the exact figure.",
      ],
      [
        "How long does money take to double at 12%?",
        "About 6 years, because 72 ÷ 12 = 6. The exact figure with yearly compounding is 6.1 years.",
      ],
    ],
  },
  fd: {
    appName: "FD Calculator",
    tagline: "Fixed Deposit Maturity, TDS & Tax",
    description:
      "Free FD (Fixed Deposit) calculator for India. Find maturity value, interest, TDS (Tax Deducted at Source) and your post-tax return with any compounding.",
    faq: [
      [
        "What is an FD?",
        "A Fixed Deposit is a lump sum placed with a bank for a fixed term at a fixed interest rate. Interest is paid out regularly or added to the deposit at maturity.",
      ],
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
      "Free RD (Recurring Deposit) calculator for bank deposits. Find the maturity value and interest on a fixed monthly deposit with quarterly compounding.",
    faq: [
      [
        "What is an RD?",
        "A Recurring Deposit lets you put a fixed amount into a bank every month for a set term and earn a fixed interest rate on it.",
      ],
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
      "Free gold investment calculator. Compare Sovereign Gold Bonds (SGB), gold Exchange Traded Funds (ETF) and jewellery after making charges and tax.",
    faq: [
      [
        "Which is the best way to invest in gold?",
        "SGBs held to maturity are tax-free on gains and pay 2.5% interest. Gold ETFs are next. Jewellery loses making charges and GST.",
      ],
      [
        "How is gold taxed?",
        "Physical gold held over 24 months and gold ETFs over 12 months are taxed at 12.5% long-term; shorter holdings at your slab.",
      ],
      [
        "What is a gold ETF?",
        "An Exchange Traded Fund that holds physical gold and trades on the stock exchange like a share. It tracks the gold price with no making charges.",
      ],
    ],
  },
  retirement: {
    appName: "Retirement Calculator India",
    tagline: "Corpus & Monthly Saving Needed",
    description:
      "Free retirement calculator for India. Find the corpus you need to retire and the monthly investment that builds it, after inflation and returns.",
    faq: [
      [
        "How much do I need to retire in India?",
        "It depends on expenses, inflation and years in retirement. Typically 25–35× your yearly expenses at retirement.",
      ],
      [
        "What counts towards the corpus?",
        "EPF, PPF, NPS, mutual funds and other long-term savings meant for retirement.",
      ],
      [
        "What return should I assume for retirement planning?",
        "About 10–12% a year for equity-heavy savings while you work, and 6–8% after retirement when most money moves to safer debt.",
      ],
    ],
  },
  nps: {
    appName: "NPS Calculator",
    tagline: "Pension, Lump Sum & Tax Benefit",
    description:
      "Free NPS (National Pension System) calculator. Estimate your corpus at 60, the tax-free lump sum, the annuity and the monthly pension it buys.",
    faq: [
      [
        "What is NPS?",
        "The National Pension System is a government-regulated retirement scheme. You invest in equity and debt funds until 60, then take part as a lump sum and buy a pension with the rest.",
      ],
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
      "Free annuity calculator for India. See the monthly pension an annuity pays for your corpus, or the corpus you need for a target monthly pension.",
    faq: [
      [
        "What is an annuity?",
        "A plan from an insurer that pays you a fixed income for life in return for a one-time amount.",
      ],
      [
        "Is annuity income taxable?",
        "Yes, it is taxed at your slab rate every year.",
      ],
      [
        "What annuity rate can I expect in India?",
        "Roughly 6–8% a year from insurers for a life annuity, and less if the purchase price is returned to your family. The rate is fixed when you buy.",
      ],
    ],
  },
  gratuity: {
    appName: "Gratuity Calculator",
    tagline: "Amount & Tax Exemption",
    description:
      "Free gratuity calculator for India. Work out gratuity from your last basic pay plus Dearness Allowance (DA) and years of service, and the tax-free part.",
    faq: [
      [
        "How is gratuity calculated?",
        "15 × last drawn basic + DA × years of service ÷ 26 for employers covered by the Gratuity Act.",
      ],
      [
        "How much gratuity is tax-free?",
        "Up to ₹20 lakh for private employees; fully exempt for government employees.",
      ],
      [
        "Who is eligible for gratuity?",
        "Generally employees who complete 5 years of continuous service with a covered employer. The 5-year condition does not apply on death or disability.",
      ],
    ],
  },
  "leave-encashment": {
    appName: "Leave Encashment Calculator",
    tagline: "Payout & Tax",
    description:
      "Free leave encashment calculator for India. Calculate the payout for unused leave and how much of it is tax-free at retirement or resignation.",
    faq: [
      [
        "Is leave encashment taxable?",
        "While in service, fully. At retirement or resignation, private employees get an exemption of up to ₹25 lakh.",
      ],
      [
        "How is it calculated?",
        "Basic + DA ÷ 30 × leave days encashed, as per your employer's policy.",
      ],
      [
        "How many leave days count for the tax exemption?",
        "For private employees the exemption counts at most 30 days of leave for each completed year of service, up to ₹25 lakh in total.",
      ],
    ],
  },
  "loan-eligibility": {
    appName: "Loan Eligibility Calculator",
    tagline: "How Much Can I Borrow?",
    description:
      "Free home loan eligibility calculator. Find the loan and Equated Monthly Instalment (EMI) you qualify for from your income and existing loans.",
    faq: [
      [
        "What is FOIR?",
        "Fixed Obligation to Income Ratio — the share of your take-home lenders allow for all EMIs, usually 40–60%.",
      ],
      [
        "How much of the house price will a bank fund?",
        "Up to 90% for loans under ₹30 lakh, 80% up to ₹75 lakh and 75% above, as per RBI.",
      ],
      [
        "How can I improve my loan eligibility?",
        "Clear small loans first, add an earning co-applicant, choose a longer tenure and keep your credit score above 750.",
      ],
    ],
  },
  "prepay-vs-invest": {
    appName: "Prepay vs Invest Calculator",
    tagline: "Prepay Home Loan or Invest?",
    description:
      "Free prepay vs invest calculator. Should you prepay your home loan or invest the money? Compare the interest you save with what the money could earn.",
    faq: [
      [
        "Is it better to prepay a home loan or invest?",
        "If your expected post-tax return is clearly above your loan rate, investing can win. Prepaying is a guaranteed return equal to your loan rate.",
      ],
      [
        "Is there a penalty for prepaying?",
        "No, RBI does not allow prepayment charges on floating-rate loans to individuals.",
      ],
      [
        "Should I cut the EMI or the tenure after prepaying?",
        "Cutting the tenure saves more interest. Cutting the Equated Monthly Instalment (EMI) eases your monthly cash flow instead.",
      ],
    ],
  },
  "balance-transfer": {
    appName: "Home Loan Balance Transfer Calculator",
    tagline: "Your Savings",
    description:
      "Free home loan balance transfer calculator. See how much you save by moving your loan to a lower rate, after processing fees and other charges.",
    faq: [
      [
        "When is a balance transfer worth it?",
        "Usually when the rate difference is 0.5% or more and many years are left on the loan.",
      ],
      [
        "What does switching cost?",
        "Processing fee (often 0.25–1%), legal and valuation charges, and GST on the fee.",
      ],
      [
        "Can I take a top-up loan with a balance transfer?",
        "Yes. Many lenders offer a top-up loan along with a balance transfer, usually at a slightly higher rate than the home loan.",
      ],
    ],
  },
  "flat-vs-reducing": {
    appName: "Flat to Reducing Rate Calculator",
    tagline: "Real Loan Interest Rate",
    description:
      "Free flat to reducing rate calculator. Convert a flat interest rate quoted on a loan into the real reducing-balance rate and see the true cost.",
    faq: [
      [
        "What is a flat interest rate?",
        "Interest charged on the full loan amount for the whole tenure, even as you repay it.",
      ],
      [
        "How does flat compare to reducing rate?",
        "A flat rate is roughly 1.8–1.9 times the equivalent reducing rate.",
      ],
      [
        "Where are flat rates used?",
        "Mostly on personal loans, two-wheeler and car loans from dealers, and consumer durable loans. Ask for the reducing-balance rate before you sign.",
      ],
    ],
  },
  "credit-card": {
    appName: "Credit Card Interest Calculator",
    tagline: "Minimum Due Trap",
    description:
      "Free credit card interest calculator. See how long a card bill takes to clear and the interest you pay if you pay only the minimum due each month.",
    faq: [
      [
        "How much interest do credit cards charge?",
        "About 3–4% a month (36–48% a year), plus 18% GST on the interest.",
      ],
      [
        "Why is paying the minimum due bad?",
        "Interest keeps running on the full balance, so the debt can take years to clear.",
      ],
      [
        "How can I get out of credit card debt faster?",
        "Pay more than the minimum, stop new spending on the card, or move the balance to a cheaper personal loan and repay that.",
      ],
    ],
  },
  "debt-payoff": {
    appName: "Debt Payoff Calculator",
    tagline: "Avalanche vs Snowball",
    description:
      "Free debt payoff calculator. Plan how to become debt-free and compare the avalanche and snowball methods for paying off several loans and cards.",
    faq: [
      [
        "What is the avalanche method?",
        "Pay minimums on all debts and put every extra rupee on the highest-interest debt first. It saves the most interest.",
      ],
      [
        "What is the snowball method?",
        "Clear the smallest balance first for quick wins, then roll that payment into the next debt.",
      ],
      [
        "Which is better, avalanche or snowball?",
        "Avalanche saves more interest. Snowball clears loans one by one sooner, which keeps some people motivated. The calculator shows both.",
      ],
    ],
  },
  "education-loan": {
    appName: "Education Loan EMI Calculator",
    tagline: "EMI, Moratorium & 80E",
    description:
      "Free education loan EMI (Equated Monthly Instalment) calculator. See the EMI after the moratorium, interest added while you study and the 80E saving.",
    faq: [
      [
        "How is the education loan EMI worked out?",
        "Interest that builds up during the moratorium is added to the loan, and the Equated Monthly Instalment is then worked out on that larger balance over the repayment years.",
      ],
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
      "Free gold loan calculator for India. Find how much you can borrow on your gold jewellery at today's price, and the interest you will pay on it.",
    faq: [
      [
        "How much loan can I get on gold?",
        "Up to 85% of the gold's value for loans up to ₹2.5 lakh, 80% up to ₹5 lakh and 75% above.",
      ],
      [
        "How is gold valued?",
        "By weight and purity at the lender's rate, usually the average of recent 22K prices.",
      ],
      [
        "What interest do gold loans charge?",
        "Roughly 9–18% a year, depending on the lender, the loan-to-value and the repayment scheme. Banks usually charge less than gold loan companies.",
      ],
    ],
  },
  salary: {
    appName: "Salary Calculator India",
    tagline: "CTC to In-hand",
    description:
      "Free salary calculator for India. Convert CTC (Cost to Company) to monthly in-hand pay after Provident Fund (PF), professional tax and income tax.",
    faq: [
      [
        "What is CTC?",
        "Cost to Company is the total your employer spends on you in a year: basic pay, allowances, bonus, employer PF and gratuity.",
      ],
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
    tagline: "House Rent Allowance Exemption",
    description:
      "Free HRA (House Rent Allowance) exemption calculator. Find the tax-free part of your HRA in the old regime from your basic pay, rent and city.",
    faq: [
      [
        "What is HRA?",
        "House Rent Allowance is the part of your salary meant for rent. If you pay rent, some or all of it is tax-free under Section 10(13A) in the old regime.",
      ],
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
      "Free capital gains calculator. Find Short-Term Capital Gains (STCG) and Long-Term Capital Gains (LTCG) tax on shares, funds, property and gold.",
    faq: [
      [
        "What is the LTCG tax on shares?",
        "12.5% on gains above ₹1.25 lakh a year for listed shares and equity funds held over 12 months.",
      ],
      [
        "Is indexation still available on property?",
        "For land or buildings bought before 23 July 2024, resident individuals can pay the lower of 12.5% without or 20% with indexation.",
      ],
      [
        "What is the STCG tax on shares?",
        "20% on gains from listed shares and equity funds held for 12 months or less, for sales made on or after 23 July 2024.",
      ],
    ],
  },
  "ltcg-harvest": {
    appName: "LTCG Harvesting Calculator",
    tagline: "Use the ₹1.25 Lakh Exemption",
    description:
      "Free LTCG (Long-Term Capital Gains) harvesting calculator. Book equity gains each year within the ₹1.25 lakh exemption to cut your future tax.",
    faq: [
      [
        "What is LTCG?",
        "Long-Term Capital Gains are profits on listed shares and equity funds held over 12 months. Gains above ₹1.25 lakh a year are taxed at 12.5%.",
      ],
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
      "Free 80C and 80D deduction calculator. See how much of 80C, 80CCD(1B), 80D and home loan interest you have used, the room left and the tax saved.",
    faq: [
      [
        "What is the 80C limit?",
        "₹1.5 lakh a year, across EPF, PPF, ELSS, life insurance, tuition fees, home loan principal and more.",
      ],
      [
        "How much is 80D?",
        "₹25,000 for self and family (₹50,000 if 60+), plus ₹25,000 or ₹50,000 for parents.",
      ],
      [
        "Are 80C and 80D allowed in the new regime?",
        "No. Most deductions, including 80C and 80D, apply only in the old regime. Employer pension contributions under 80CCD(2) are allowed in both.",
      ],
    ],
  },
  "advance-tax": {
    appName: "Advance Tax Calculator",
    tagline: "Instalments & Due Dates",
    description:
      "Free advance tax calculator for India. Split the tax you owe into quarterly instalments with due dates, and see the interest if you pay late.",
    faq: [
      [
        "Who must pay advance tax?",
        "Anyone whose tax after TDS is ₹10,000 or more in a year, except senior citizens without business income.",
      ],
      [
        "What are the due dates?",
        "15% by 15 June, 45% by 15 September, 75% by 15 December and 100% by 15 March.",
      ],
      [
        "What interest applies if I miss advance tax?",
        "1% a month under Section 234C on each short instalment, and 1% a month under Section 234B if you paid less than 90% of your tax by 31 March.",
      ],
    ],
  },
  "presumptive-tax": {
    appName: "Freelancer Tax Calculator (44ADA)",
    tagline: "Presumptive Taxation",
    description:
      "Free tax calculator for freelancers and small businesses. Compare presumptive tax under Section 44ADA and 44AD with keeping full books of accounts.",
    faq: [
      [
        "What is Section 44ADA?",
        "Professionals with receipts up to ₹75 lakh (if cash is under 5%) can declare 50% of receipts as income without keeping books.",
      ],
      [
        "What is Section 44AD?",
        "Small businesses can declare 6% of digital and 8% of cash turnover as income, up to ₹3 crore turnover.",
      ],
      [
        "Do I pay advance tax under 44ADA?",
        "Yes, but in a single instalment: the full advance tax is due by 15 March.",
      ],
    ],
  },
  "rental-income": {
    appName: "Rental Income Tax Calculator",
    tagline: "Tax on Rent & Rental Yield",
    description:
      "Free rental income tax calculator. Find tax on rent after municipal tax, the 30% standard deduction and home loan interest, plus your net rental yield.",
    faq: [
      [
        "How is rental income taxed?",
        "Rent minus municipal tax, minus a flat 30% standard deduction and home loan interest, is taxed at your slab.",
      ],
      [
        "Can a rental loss reduce other income?",
        "Up to ₹2 lakh a year in the old regime; the rest carries forward for 8 years.",
      ],
      [
        "What is a good rental yield in India?",
        "Homes in big cities usually yield 2–4% a year before tax. Commercial property often yields 6–9%.",
      ],
    ],
  },
  gst: {
    appName: "GST Calculator",
    tagline: "Add or Remove GST",
    description:
      "Free GST (Goods and Services Tax) calculator for India. Add GST to a price or remove it from a GST-inclusive price, with the central and state split.",
    faq: [
      [
        "What is GST?",
        "Goods and Services Tax is India's single indirect tax on most goods and services. Within a state it is split equally into CGST and SGST; between states IGST applies.",
      ],
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
      "Free term insurance calculator for India. Find the life cover your family needs using income replacement, loans, future goals and existing savings.",
    faq: [
      [
        "How much term insurance do I need?",
        "Enough to replace your income for your family and clear loans and goals — often 10–20 times your annual income.",
      ],
      [
        "Till what age should cover run?",
        "Until your retirement age, typically 60–65, when your dependants no longer rely on your income.",
      ],
      [
        "Is the term insurance premium tax-deductible?",
        "Yes, under Section 80C in the old regime, within the overall ₹1.5 lakh limit.",
      ],
    ],
  },
  "health-cover": {
    appName: "Health Insurance Cover Calculator",
    tagline: "Right Cover for You",
    description:
      "Free health insurance cover calculator. Find the right cover for your family by city, family size, age and employer cover, plus a super top-up.",
    faq: [
      [
        "How much health cover is enough?",
        "₹10 lakh or more for a family in a metro, with a super top-up for larger bills.",
      ],
      [
        "Is employer health cover enough?",
        "No. It ends with the job and is often too small. Keep a personal policy.",
      ],
      [
        "What is a super top-up?",
        "A low-cost policy that pays once your total hospital bills in a year cross a set deductible, such as ₹5 lakh. It stretches a base policy cheaply.",
      ],
    ],
  },
  "policy-return": {
    appName: "Policy Return Calculator",
    tagline: "Endowment & Money-back Returns",
    description:
      "Free policy return calculator. Find the real Internal Rate of Return (IRR) of an endowment or money-back policy and compare it with mutual funds.",
    faq: [
      [
        "What return do endowment plans give?",
        "Typically 4–6% a year — often below PPF.",
      ],
      [
        "What is IRR?",
        "Internal Rate of Return: the yearly return that equates all premiums paid with the maturity amount received.",
      ],
      [
        "Should I surrender a low-return policy?",
        "Compare the surrender value invested elsewhere with what the policy pays at maturity. Surrendering in the first few years often loses money, so check before you decide.",
      ],
    ],
  },
  "buy-term-invest": {
    appName: "Buy Term & Invest the Rest Calculator",
    tagline: "vs Endowment",
    description:
      "Free buy term and invest the rest calculator. Compare a traditional endowment plan with term insurance plus investing the premium you save.",
    faq: [
      [
        "What does 'buy term and invest the rest' mean?",
        "Buy cheap pure term cover for protection and invest the money you would have paid for an endowment plan.",
      ],
      [
        "Is it always better?",
        "Usually, if you actually invest the difference every year with discipline.",
      ],
      [
        "What return should I assume on the money I invest?",
        "About 10–12% a year for an equity fund held 15 years or more, or about 7% for a safe government savings scheme.",
      ],
    ],
  },
  "child-education": {
    appName: "Child Education Calculator",
    tagline: "Plan for College",
    description:
      "Free child education calculator. Find what a college course will cost by the time your child is ready, and the monthly investment needed to fund it.",
    faq: [
      [
        "What inflation should I use for education?",
        "About 10% a year for higher education in India.",
      ],
      [
        "Where should I invest for a child's education?",
        "Equity funds for 7+ years away, moving to debt in the last 2–3 years. Sukanya Samriddhi suits a daughter.",
      ],
      [
        "How much will higher education cost in 15 years?",
        "At 10% education inflation, costs roughly quadruple in 15 years: a ₹10 lakh course today could cost about ₹42 lakh.",
      ],
    ],
  },
  marriage: {
    appName: "Marriage Planning Calculator",
    tagline: "Save for a Wedding",
    description:
      "Free marriage planning calculator for India. Find what a wedding budget set in today's money will cost on the day, and the monthly saving needed.",
    faq: [
      [
        "How early should I start saving for a wedding?",
        "As early as possible — even 5–8 years ahead makes the monthly amount much smaller.",
      ],
      [
        "Where should wedding savings go?",
        "Equity funds if 5+ years away; FDs or debt funds for the last 2–3 years.",
      ],
      [
        "What inflation should I use for wedding costs?",
        "About 6–8% a year. Gold, venue and catering costs often rise faster than general inflation.",
      ],
    ],
  },
  "down-payment": {
    appName: "Home Down Payment Calculator",
    tagline: "Save for a House",
    description:
      "Free home down payment calculator. Find how much to save every month for a home's down payment, stamp duty and registration, with price growth.",
    faq: [
      [
        "How much down payment is needed for a home?",
        "At least 10–25% of the price as per RBI limits, plus 6–8% for stamp duty and registration.",
      ],
      [
        "Does a home loan cover stamp duty?",
        "No, stamp duty and registration must be paid from your own money.",
      ],
      [
        "Where should I keep down payment savings?",
        "Equity or hybrid funds if the purchase is 5 years or more away; move the money to fixed deposits or debt funds in the last 2–3 years.",
      ],
    ],
  },
  "salary-hike": {
    appName: "Salary Hike Calculator",
    tagline: "Hike %, Real Hike & In-hand",
    description:
      "Free salary hike calculator. Work out your hike percentage, your real hike after inflation and the extra in-hand salary you get each month.",
    faq: [
      [
        "What is a real salary hike?",
        "Your hike after removing inflation. A 6% hike with 6% inflation is a 0% real hike.",
      ],
      [
        "Why is my in-hand increase smaller than my hike?",
        "Part of the extra salary goes to tax and PF.",
      ],
      [
        "What is a good salary hike in India?",
        "Average yearly hikes are around 8–10%. Anything above inflation is a real hike; a job switch often brings 20–30%.",
      ],
    ],
  },
  "net-worth": {
    appName: "Net Worth Calculator India",
    tagline: "Assets Minus Liabilities",
    description:
      "Free net worth calculator for India. Add what you own and what you owe to see your net worth, liquid assets and debt ratio in one place.",
    faq: [
      ["What is net worth?", "Everything you own minus everything you owe."],
      [
        "What is a healthy debt ratio?",
        "Loans under 30% of total assets is healthy; above 50% is high.",
      ],
      [
        "How often should I check my net worth?",
        "Every 6–12 months is enough. Watch the trend over years rather than any single number.",
      ],
    ],
  },
  budget: {
    appName: "50/30/20 Budget Calculator",
    tagline: "Needs, Wants & Savings",
    description:
      "Free 50/30/20 budget calculator. Split your take-home pay into needs, wants and savings with the 50/30/20 rule, and compare with what you spend.",
    faq: [
      [
        "What is the 50/30/20 rule?",
        "Spend 50% on needs, 30% on wants and save 20% of your take-home.",
      ],
      [
        "Should I save more than 20%?",
        "If you can, yes — especially for early retirement or big goals.",
      ],
      [
        "What counts as needs and what counts as wants?",
        "Needs are rent, loan payments, groceries, bills and insurance. Wants are eating out, shopping, travel and subscriptions.",
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
