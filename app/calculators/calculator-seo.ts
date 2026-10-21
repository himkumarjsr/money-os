import {
  expandAbbreviations,
  findAbbreviations,
} from "./calculator-abbreviations";
import { CATEGORIES } from "./calculator-config";
import { ADVISOR_SEO } from "./calculator-seo-advisor";
import { SITE_URL } from "@/lib/seo";

export type CalculatorSeo = {
  title: string;
  description: string;
  keywords: string[];
  faq: Array<{ q: string; a: string }>;
  /** Clean public path, e.g. /calculators/sip */
  path: string;
  appName: string;
};

/** IDs that get dedicated indexable URLs under /calculators/[id]. */
export const INDEXABLE_CALC_IDS = CATEGORIES.flatMap((c) =>
  c.items.map((i) => i.id),
).filter((id) => id !== "tax-regime");

export const SEO_COPY: Record<string, CalculatorSeo> = {
  ...ADVISOR_SEO,
  sip: {
    path: "/calculators/sip",
    appName: "SIP Calculator India",
    title: "SIP Calculator - Systematic Investment Plan Returns | Finkoin",
    description:
      "Free SIP (Systematic Investment Plan) calculator for India. See the final corpus, amount invested and wealth gained from a monthly mutual fund SIP.",
    keywords: [
      "SIP calculator India",
      "SIP returns calculator",
      "monthly SIP calculator",
      "mutual fund SIP calculator",
      "SIP investment calculator India",
      "how much SIP to become crorepati",
      "SIP calculator online free",
      "Finkoin SIP calculator",
      "SIP wealth calculator",
      "best SIP calculator India 2026",
    ],
    faq: [
      {
        q: "What is a SIP?",
        a: "A Systematic Investment Plan invests a fixed amount in a mutual fund every month, usually by auto-debit. It builds the habit and averages out the price you pay.",
      },
      {
        q: "What is a SIP calculator?",
        a: "A SIP calculator estimates the future value of monthly mutual fund investments based on amount, expected return rate, and tenure.",
      },
      {
        q: "How is SIP return calculated?",
        a: "It uses a compounding formula with periodic monthly investment, expected annual return, and investment duration.",
      },
      {
        q: "Is SIP better than FD?",
        a: "SIP may offer higher long-term growth with market risk, while FD offers fixed returns with lower risk. Use both for different goals.",
      },
      {
        q: "How much SIP do I need to become a crorepati?",
        a: "It depends on return rate and years. At ~12% for 20 years, roughly ₹10,000–12,000 per month can approach ₹1 crore. Use the calculator with your numbers.",
      },
    ],
  },
  swp: {
    path: "/calculators/swp",
    appName: "SWP Calculator India",
    title: "SWP Calculator India - Systematic Withdrawal Plan | Finkoin",
    description:
      "Free SWP (Systematic Withdrawal Plan) calculator. Plan monthly withdrawals from mutual funds, see how long your corpus lasts and model retirement income.",
    keywords: [
      "SWP calculator India",
      "systematic withdrawal plan calculator",
      "mutual fund withdrawal calculator",
      "SWP vs SIP",
      "retirement withdrawal calculator India",
      "Finkoin SWP calculator",
    ],
    faq: [
      {
        q: "What is SWP?",
        a: "A Systematic Withdrawal Plan lets you withdraw a fixed amount regularly from your mutual fund investment.",
      },
      {
        q: "How does an SWP calculator help?",
        a: "It projects remaining corpus over time based on withdrawal amount, expected returns, and tenure.",
      },
      {
        q: "Is SWP good for retirement income?",
        a: "SWP can provide regular cash flow in retirement, but market returns and withdrawal rate affect how long the corpus lasts.",
      },
    ],
  },
  emi: {
    path: "/calculators/emi",
    appName: "EMI Calculator India",
    title: "EMI Calculator - Equated Monthly Instalment for Loans | Finkoin",
    description:
      "Free EMI (Equated Monthly Instalment) calculator. See the monthly payment, total interest and total repayment for a home, car or personal loan.",
    keywords: [
      "EMI calculator",
      "EMI calculator India",
      "loan EMI calculator",
      "home loan EMI calculator",
      "personal loan EMI calculator",
      "car loan EMI calculator",
      "Finkoin EMI calculator",
      "EMI calculator online free",
      "reducing balance EMI calculator",
    ],
    faq: [
      {
        q: "What is an EMI?",
        a: "An Equated Monthly Instalment is the fixed amount you pay your lender every month. Each EMI covers that month's interest and repays part of the principal.",
      },
      {
        q: "What is an EMI calculator?",
        a: "An EMI calculator estimates monthly loan installments from principal, interest rate, and tenure.",
      },
      {
        q: "How is EMI calculated?",
        a: "EMI uses a reducing-balance formula with loan amount, monthly interest rate, and number of months.",
      },
      {
        q: "Can I compare loan options with an EMI calculator?",
        a: "Yes - vary interest rate and tenure to compare affordability and total interest outgo.",
      },
      {
        q: "Does a lower EMI always mean a cheaper loan?",
        a: "Not always. A longer tenure lowers EMI but can increase total interest. Compare total interest, not only EMI.",
      },
    ],
  },
  ppf: {
    path: "/calculators/ppf",
    appName: "PPF Calculator India",
    title: "PPF Calculator India - Public Provident Fund Maturity | Finkoin",
    description:
      "Free PPF (Public Provident Fund) calculator for India. Project the 15-year maturity of yearly deposits, the interest earned and your 80C tax saving.",
    keywords: [
      "PPF calculator India",
      "public provident fund calculator",
      "PPF maturity calculator",
      "PPF interest calculator",
      "PPF 15 year calculator",
      "Finkoin PPF calculator",
    ],
    faq: [
      {
        q: "What is PPF?",
        a: "The Public Provident Fund is a 15-year government savings scheme with tax-free interest and maturity. You can deposit ₹500 to ₹1.5 lakh a year.",
      },
      {
        q: "What is PPF calculator?",
        a: "A PPF calculator estimates maturity value of Public Provident Fund contributions over the 15-year tenure.",
      },
      {
        q: "Is PPF interest fixed?",
        a: "PPF interest is set by the government and can change over time; calculators use an assumed rate for planning.",
      },
    ],
  },
  epf: {
    path: "/calculators/epf",
    appName: "PF Calculator India",
    title: "PF Calculator India - EPF Balance at Retirement | Finkoin",
    description:
      "Free PF calculator. Project your Employees' Provident Fund (EPF) balance at 60 from your current balance, yearly contribution, age and interest rate.",
    keywords: [
      "PF calculator India",
      "EPF calculator",
      "employee provident fund calculator",
      "EPF maturity calculator",
      "PF balance at retirement",
      "Finkoin PF calculator",
    ],
    faq: [
      {
        q: "What does the PF calculator show?",
        a: "It projects your Employee Provident Fund balance at age 60 from your current balance, yearly contribution, current age and the age you stop contributing.",
      },
      {
        q: "What EPF interest rate does it use?",
        a: "It starts at 8.25% p.a., the EPFO rate for FY 2024-25. The rate is declared every year, so you can change it.",
      },
      {
        q: "What happens after I stop contributing?",
        a: "The calculator keeps compounding your balance at the same rate until age 60, with no new contributions.",
      },
    ],
  },
  nsc: {
    path: "/calculators/nsc",
    appName: "NSC Calculator India",
    title: "NSC Calculator India - 7.7% National Savings Certificate | Finkoin",
    description:
      "Free NSC calculator India. Estimate 5-year National Savings Certificate maturity at the notified 7.7% p.a. rate (Jul–Sep 2026).",
    keywords: [
      "NSC calculator India",
      "Finkoin NSC calculator",
      "national savings certificate calculator",
      "NSC interest rate 2026",
      "NSC maturity calculator",
    ],
    faq: [
      {
        q: "What is NSC?",
        a: "National Savings Certificate is a 5-year small savings scheme offered through post offices in India. Interest is compounded annually.",
      },
      {
        q: "What is the current NSC interest rate?",
        a: "For Jul–Sep 2026 the notified NSC rate is 7.7% p.a. Rates are reviewed every quarter by the government.",
      },
      {
        q: "Does NSC save tax?",
        a: "Yes. Deposits qualify for Section 80C in the old regime, and each year's interest is treated as reinvested and also counts for 80C, except in the final year.",
      },
    ],
  },
  emergency: {
    path: "/calculators/emergency",
    appName: "Emergency Fund Calculator India",
    title: "Emergency Fund Calculator India - How Much Do You Need? | Finkoin",
    description:
      "Free emergency fund calculator India. Find your target corpus by life stage and monthly expenses. Know how much safety buffer to keep liquid.",
    keywords: [
      "emergency fund calculator India",
      "how much emergency fund India",
      "emergency corpus calculator",
      "liquid fund for emergency India",
      "Finkoin emergency fund",
      "6 month emergency fund calculator",
    ],
    faq: [
      {
        q: "How much emergency fund do I need in India?",
        a: "The calculator uses 3 months of expenses if single, 6 if married, 9 with children and 12 if you are over 50. Add more if your income is irregular.",
      },
      {
        q: "Where should I keep my emergency fund?",
        a: "Prefer liquid or overnight mutual funds and a savings buffer - not equity SIPs or locked FDs for the core emergency amount.",
      },
      {
        q: "How long should building an emergency fund take?",
        a: "Aim for 6–12 months by setting aside a fixed amount every month. The calculator shows the timeline for what you can add.",
      },
    ],
  },
  fire: {
    path: "/calculators/fire",
    appName: "FIRE Number Calculator India",
    title:
      "FIRE Number Calculator India - When Can You Retire Early? | Finkoin",
    description:
      "Free FIRE (Financial Independence, Retire Early) calculator. Estimate the corpus to retire early from your expenses and loans, using the 25× rule.",
    keywords: [
      "FIRE number calculator India",
      "FIRE calculator India",
      "how much money to retire India",
      "retire early India",
      "financial independence India",
      "Finkoin FIRE calculator",
      "4 percent rule India",
    ],
    faq: [
      {
        q: "What does FIRE stand for?",
        a: "Financial Independence, Retire Early: building enough investments that their returns cover your expenses, so work becomes optional.",
      },
      {
        q: "What is a FIRE number?",
        a: "Your FIRE number estimates investable wealth needed for financial independence - often around 25× annual expenses (4% rule), adjusted for Indian costs and loans.",
      },
      {
        q: "Does a home loan change my FIRE number?",
        a: "Yes. Outstanding loans increase the corpus you need or extend your timeline. Include EMIs and liabilities when calculating FIRE in India.",
      },
    ],
  },
  home: {
    path: "/calculators/home",
    appName: "Home Loan Calculator India",
    title: "Home Loan EMI Calculator 2026 - Affordability & Planning | Finkoin",
    description:
      "Free home loan EMI (Equated Monthly Instalment) calculator for India. See your monthly EMI, total interest and how much home loan you can afford.",
    keywords: [
      "home loan EMI calculator",
      "home loan calculator India 2026",
      "home loan EMI calculator with prepayment",
      "housing loan calculator",
      "home loan tax benefit calculator",
      "Section 24B calculator",
      "Finkoin home loan calculator",
      "how much home loan can I afford",
    ],
    faq: [
      {
        q: "How much home loan can I afford?",
        a: "Affordability depends on income, existing EMIs, interest rate, and tenure. This calculator helps stress-test those inputs.",
      },
      {
        q: "What tax benefits apply on a home loan?",
        a: "Under the old regime, principal can qualify under 80C (within overall limit) and interest under Section 24B (up to ₹2 lakh for self-occupied, subject to rules).",
      },
      {
        q: "Should I prepay my home loan or invest?",
        a: "Compare loan interest vs expected investment returns after tax. Prepaying reduces risk; investing may grow wealth faster if returns beat the loan rate.",
      },
    ],
  },
  car: {
    path: "/calculators/car",
    appName: "Car Loan Calculator India",
    title: "Car Loan Calculator India - EMI & Affordability | Finkoin",
    description:
      "Free car loan calculator for India. See your Equated Monthly Instalment (EMI), the total interest and whether the car fits your monthly salary.",
    keywords: [
      "car loan calculator India",
      "Finkoin car loan calculator",
      "car EMI calculator",
    ],
    faq: [
      {
        q: "How is car loan EMI calculated?",
        a: "Car loan EMI uses principal, interest rate, and tenure on a reducing-balance schedule.",
      },
      {
        q: "How much car can I afford on my salary?",
        a: "A common rule is to keep the car EMI under 10–15% of take-home pay and the car's price under about half of your yearly income.",
      },
      {
        q: "Should I pick a longer car loan tenure?",
        a: "A longer tenure lowers the EMI but raises the total interest, and cars lose value fast. 3–5 years is usual.",
      },
    ],
  },
  rentbuy: {
    path: "/calculators/rentbuy",
    appName: "Rent vs Buy Calculator India",
    title: "Rent vs Buy Calculator India - Should You Buy a Home? | Finkoin",
    description:
      "Free rent vs buy calculator for India. Compare the cash you pay to own a home, including the loan and down payment, with renting a similar home.",
    keywords: [
      "rent vs buy calculator India",
      "Finkoin rent vs buy",
      "should I buy a house India",
    ],
    faq: [
      {
        q: "Is buying always better than renting?",
        a: "Not always - it depends on rent, property price, loan costs, tenure, and opportunity cost of down payment.",
      },
      {
        q: "What is the price-to-rent ratio?",
        a: "The property price divided by a year's rent. In Indian metros it is often 30–40, which usually makes renting cheaper in the short run.",
      },
      {
        q: "How long should I stay for buying to pay off?",
        a: "Usually 7–10 years or more, so that price growth and saved rent can make up for stamp duty, interest and maintenance.",
      },
    ],
  },
  rentcar: {
    path: "/calculators/rentcar",
    appName: "Rent vs Own Car Calculator",
    title: "Rent vs Own Car Calculator India - Cab or Car? | Finkoin",
    description:
      "Free rent vs own car calculator. Compare your monthly cab or rental cost with the full cost of owning a car: loan, fuel, insurance and upkeep.",
    keywords: [
      "rent vs own car calculator",
      "Finkoin car ownership calculator",
    ],
    faq: [
      {
        q: "When does owning a car make sense?",
        a: "When frequent travel makes cab costs higher than EMI, fuel, insurance, and maintenance combined.",
      },
      {
        q: "What does owning a car really cost?",
        a: "The loan or down payment, fuel, insurance, servicing, parking and the value the car loses each year.",
      },
      {
        q: "Is a cab cheaper than owning a car in India?",
        a: "Often yes for light use. The more you drive each month, the more owning pays off; the calculator compares both at your monthly distance.",
      },
    ],
  },
  whencar: {
    path: "/calculators/whencar",
    appName: "When to Buy Car Calculator",
    title: "When to Buy a Car Calculator - Down Payment Plan | Finkoin",
    description:
      "Free when to buy a car calculator. See how many months it takes to save a 20% down payment and whether the car fits your monthly income.",
    keywords: ["when to buy car calculator", "car down payment planner India"],
    faq: [
      {
        q: "How much down payment should I keep for a car?",
        a: "A larger down payment lowers EMI stress. This tool helps you plan when savings reach a comfortable down payment.",
      },
      {
        q: "How is the waiting time worked out?",
        a: "The calculator divides the down payment you still need by what you can save each month.",
      },
      {
        q: "What share of salary should a car loan take?",
        a: "Keep the monthly car loan payment under about 10–15% of your take-home pay.",
      },
    ],
  },
  po: {
    path: "/calculators/po",
    appName: "Post Office Calculator India",
    title: "Post Office Schemes Calculator India - All Rates 2026 | Finkoin",
    description:
      "Free Post Office scheme calculators: Savings Account, Time Deposit, Recurring Deposit, Monthly Income Scheme, Senior Citizen Savings and Sukanya.",
    keywords: [
      "post office calculator India",
      "Finkoin post office schemes",
      "India Post savings calculator",
      "post office interest rates 2026",
      "small savings schemes calculator",
    ],
    faq: [
      {
        q: "Which post office schemes can I calculate?",
        a: "Finkoin covers POSA, Time Deposit, RD, NSC, KVP, MIS, SCSS and Sukanya Samriddhi with dedicated maturity or income calculators.",
      },
      {
        q: "Are the interest rates up to date?",
        a: "Defaults use MoF/DoP notified rates for Jul–Sep 2026. Always confirm the live circular before investing - rates can change quarterly.",
      },
      {
        q: "Are Post Office schemes safe?",
        a: "Yes. They are small savings schemes backed by the Government of India, so your deposit and interest are guaranteed.",
      },
    ],
  },
  "po-savings": {
    path: "/calculators/po-savings",
    appName: "Post Office Savings Account Calculator",
    title: "Post Office Savings Account Calculator - 4% Interest | Finkoin",
    description:
      "Free Post Office Savings Account calculator. Estimate yearly and monthly interest on your balance at the notified 4% p.a. rate, and the tax on it.",
    keywords: [
      "post office savings account calculator",
      "POSA interest calculator",
      "post office savings rate 4%",
    ],
    faq: [
      {
        q: "What is the Post Office Savings Account interest rate?",
        a: "The notified rate for Jul–Sep 2026 is 4% p.a. Interest is taxable subject to §80TTA/80TTB limits.",
      },
      {
        q: "What is the minimum balance?",
        a: "₹500. An account below it can be charged a maintenance fee.",
      },
      {
        q: "Is Post Office savings interest tax-free?",
        a: "It is taxable, but savings interest up to ₹10,000 a year can be deducted under Section 80TTA in the old regime (₹50,000 under 80TTB for senior citizens).",
      },
    ],
  },
  "po-td": {
    path: "/calculators/po-td",
    appName: "Post Office Time Deposit Calculator",
    title: "Post Office Time Deposit Calculator - 1 to 5 Years | Finkoin",
    description:
      "Free Post Office Time Deposit (TD) calculator. Find the maturity value and interest for a 1, 2, 3 or 5-year deposit at notified rates of 6.9%–7.5%.",
    keywords: [
      "post office TD calculator",
      "post office FD calculator",
      "post office time deposit interest rate",
      "PO FD maturity calculator",
    ],
    faq: [
      {
        q: "What are current Post Office TD rates?",
        a: "For Jul–Sep 2026: 1-year 6.9%, 2-year 7.0%, 3-year 7.1%, 5-year 7.5% - compounded quarterly.",
      },
      {
        q: "Does a Post Office Time Deposit save tax?",
        a: "Only the 5-year deposit qualifies for Section 80C in the old regime, up to ₹1.5 lakh a year.",
      },
      {
        q: "Can I close a Post Office Time Deposit early?",
        a: "Yes, after 6 months. Closing before 1 year pays savings account interest; later closures pay a reduced rate.",
      },
    ],
  },
  "po-rd": {
    path: "/calculators/po-rd",
    appName: "Post Office RD Calculator",
    title: "Post Office RD Calculator India - 6.7% Recurring Deposit | Finkoin",
    description:
      "Free Post Office RD (Recurring Deposit) calculator. Estimate the 5-year maturity value and interest on a monthly deposit at the notified 6.7% p.a. rate.",
    keywords: [
      "post office RD calculator",
      "recurring deposit calculator India Post",
      "PO RD maturity calculator",
    ],
    faq: [
      {
        q: "What is the Post Office RD interest rate?",
        a: "The 5-year National Savings Recurring Deposit rate for Jul–Sep 2026 is 6.7% p.a.",
      },
      {
        q: "What is the minimum Post Office RD deposit?",
        a: "₹100 a month, in multiples of ₹10, with no upper limit.",
      },
      {
        q: "What happens if I miss an RD instalment?",
        a: "A small default fee is charged for each missed month. After 4 missed instalments the account is discontinued, though it can be revived within 2 months.",
      },
    ],
  },
  "po-kvp": {
    path: "/calculators/po-kvp",
    appName: "Kisan Vikas Patra Calculator",
    title: "KVP Calculator India - Doubles in 115 Months | Finkoin",
    description:
      "Free KVP (Kisan Vikas Patra) calculator. See when your money doubles at the notified 7.5% p.a. rate (115 months as of Jul–Sep 2026) and the maturity.",
    keywords: [
      "KVP calculator",
      "kisan vikas patra calculator",
      "KVP maturity calculator",
      "KVP interest rate 2026",
    ],
    faq: [
      {
        q: "What is Kisan Vikas Patra?",
        a: "A Post Office savings certificate that doubles a one-time deposit over a fixed period. The minimum is ₹1,000 and there is no upper limit.",
      },
      {
        q: "How long does KVP take to double?",
        a: "At the Jul–Sep 2026 notified 7.5% rate, KVP doubles in 115 months.",
      },
      {
        q: "Is KVP interest taxable?",
        a: "Yes. The gain is taxed at your slab rate, and KVP does not qualify for Section 80C.",
      },
    ],
  },
  "po-mis": {
    path: "/calculators/po-mis",
    appName: "Post Office MIS Calculator",
    title: "Post Office MIS Calculator - Monthly Income Scheme 7.4% | Finkoin",
    description:
      "Free Post Office MIS (Monthly Income Scheme) calculator. See the monthly income at 7.4% p.a. on up to ₹9 lakh single or ₹15 lakh joint for 5 years.",
    keywords: [
      "post office MIS calculator",
      "POMIS calculator",
      "monthly income scheme calculator",
      "post office monthly income",
    ],
    faq: [
      {
        q: "What is the Post Office MIS?",
        a: "The Monthly Income Scheme is a 5-year Post Office deposit that pays interest every month. The principal is returned at maturity.",
      },
      {
        q: "How much monthly income does MIS give?",
        a: "At 7.4% p.a., ₹10,000 deposit pays about ₹62 per month. Principal returns after 5 years.",
      },
      {
        q: "Is MIS interest taxable?",
        a: "Yes, at your slab rate, and the deposit does not qualify for Section 80C.",
      },
    ],
  },
  "po-scss": {
    path: "/calculators/po-scss",
    appName: "SCSS Calculator India",
    title: "SCSS Calculator India - Senior Citizen Savings 8.2% | Finkoin",
    description:
      "Free SCSS (Senior Citizens' Savings Scheme) calculator. Estimate the quarterly interest at 8.2% p.a. for depositors aged 60+, up to ₹30 lakh.",
    keywords: [
      "SCSS calculator",
      "senior citizen savings scheme calculator",
      "SCSS interest rate 2026",
      "post office SCSS calculator",
    ],
    faq: [
      {
        q: "What is SCSS?",
        a: "The Senior Citizens' Savings Scheme is a 5-year government deposit for people aged 60 and above that pays interest every quarter.",
      },
      {
        q: "Who can invest in SCSS?",
        a: "Generally individuals aged 60 or above (with limited early-retirement exceptions). Maximum deposit is ₹30 lakh.",
      },
      {
        q: "Does SCSS give a tax benefit?",
        a: "Deposits qualify for Section 80C in the old regime. The interest is taxable, with TDS once it crosses ₹1 lakh a year.",
      },
    ],
  },
  "po-ssy": {
    path: "/calculators/po-ssy",
    appName: "Sukanya Samriddhi Calculator",
    title: "Sukanya Samriddhi Yojana Calculator - 8.2% SSY | Finkoin",
    description:
      "Free Sukanya Samriddhi Yojana (SSY) calculator. Project your daughter's account maturity at 8.2% p.a. with 15 years of deposits and tax-free interest.",
    keywords: [
      "sukanya samriddhi calculator",
      "SSY calculator India",
      "sukanya samriddhi yojana interest rate",
      "SSY maturity calculator",
    ],
    faq: [
      {
        q: "What is the SSY interest rate?",
        a: "For Jul–Sep 2026 the notified Sukanya Samriddhi rate is 8.2% p.a. Interest is EEE (tax-free) under current rules.",
      },
      {
        q: "Who can open an SSY account?",
        a: "A parent or guardian of a girl under 10, for up to two daughters. Deposits run for 15 years and the account matures when it turns 21.",
      },
      {
        q: "How much can I deposit in SSY?",
        a: "₹250 to ₹1.5 lakh a year, and deposits qualify for Section 80C in the old regime.",
      },
    ],
  },
  "tax-regime": {
    path: "/calculators/tax-regime-2026",
    appName: "Tax Regime Calculator 2025-26",
    title:
      "Old vs New Tax Regime Calculator 2025-26 - Which Saves More? | Finkoin",
    description:
      "Free old vs new tax regime calculator for 2025-26. Compare both regimes with 80C, rent, pension and home loan deductions and see which saves more.",
    keywords: [
      "old vs new tax regime calculator",
      "tax regime calculator 2025-26",
      "income tax calculator India 2026",
      "which tax regime is better",
      "tax saving calculator India",
      "80C deduction calculator",
      "HRA exemption calculator",
      "new tax regime slabs 2026",
      "87A rebate calculator",
      "salary tax calculator 2025-26",
      "ITR tax calculator India",
      "Finkoin tax calculator",
    ],
    faq: [
      {
        q: "Which tax regime is better for salaried employees in 2025-26?",
        a: "For FY 2025-26, the new tax regime is often better if your deductions (80C + HRA + home loan interest) are less than about ₹3.75 lakh. If deductions exceed that, the old regime may save more. Use Finkoin's calculator for your exact numbers.",
      },
      {
        q: "What is the standard deduction in new tax regime 2025-26?",
        a: "The standard deduction in the new tax regime for FY 2025-26 is ₹75,000 for salaried employees (increased from ₹50,000 in Budget 2024).",
      },
      {
        q: "Can I switch between old and new tax regime every year?",
        a: "Salaried employees can switch every financial year when filing ITR. Business owners face restrictions on switching back. Inform your employer at the start of the year for TDS.",
      },
      {
        q: "What deductions are available in old tax regime?",
        a: "Old regime allows Section 80C (₹1.5 lakh), 80D health insurance, HRA exemption, Section 24B home loan interest (up to ₹2 lakh for self-occupied), NPS 80CCD(1B) (₹50,000 extra), and more.",
      },
      {
        q: "Is income up to ₹12 lakh tax-free in 2025-26?",
        a: "Under the new regime, if taxable income is up to ₹12 lakh, the Section 87A rebate brings tax to zero. For salaried people that means a salary up to ₹12.75 lakh after the ₹75,000 standard deduction.",
      },
    ],
  },
  default: {
    path: "/calculators",
    appName: "Finkoin Financial Calculators",
    title: "Free Financial Calculators for India 2026 | Finkoin",
    description:
      "Free financial calculators for India: investments, loans, tax, retirement, insurance and Post Office schemes. Know it. Fix it. Grow it.",
    keywords: [
      "financial calculator India free",
      "tax calculator India 2026",
      "SIP calculator India",
      "EMI calculator India",
      "home loan calculator India",
      "FIRE calculator India",
      "Finkoin calculators",
      "personal finance calculators India",
    ],
    faq: [
      {
        q: "What calculators are available on Finkoin?",
        a: "Finkoin offers investment, loan, and life-planning calculators including SIP, SWP, EMI, PPF, and tax regime comparison.",
      },
      {
        q: "Are these calculator results exact?",
        a: "They are planning estimates meant for education and comparison, not guaranteed financial advice.",
      },
      {
        q: "Can I use calculators for free?",
        a: "Yes, all calculators are free to use online.",
      },
    ],
  },
};

export function getSeoForCalc(calcId?: string): CalculatorSeo {
  if (!calcId) return SEO_COPY.default;
  const seo = SEO_COPY[calcId];
  if (!seo) return SEO_COPY.default;
  return { ...seo, keywords: withFullFormKeyword(seo) };
}

/** Name with abbreviations spelled out: "Systematic Transfer Plan Calculator". */
export function fullFormName(appName: string): string | null {
  if (findAbbreviations(appName).length === 0) return null;
  return expandAbbreviations(appName);
}

/** Adds the spelled-out search phrase, e.g. "systematic transfer plan calculator", and drops case-only repeats. */
function withFullFormKeyword(seo: CalculatorSeo): string[] {
  const full = fullFormName(seo.appName)?.toLowerCase();
  const keywords = full
    ? [seo.keywords[0], full, ...seo.keywords.slice(1)]
    : seo.keywords;
  const seen = new Set<string>();
  return keywords.filter((k) => {
    const key = k.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Map URL segment → internal calc id used by CalculatorsClient. */
export function resolveCalcIdFromPathSegment(segment: string): string | null {
  if (segment === "tax-regime-2026" || segment === "tax-regime") {
    return "tax-regime";
  }
  if (INDEXABLE_CALC_IDS.includes(segment) || segment in SEO_COPY) {
    return segment === "default" ? null : segment;
  }
  // Allow any known config id
  for (const cat of CATEGORIES) {
    if (cat.items.some((i) => i.id === segment)) return segment;
  }
  return null;
}

export function absoluteCalcUrl(path: string) {
  return `${SITE_URL}${path}`;
}

/**
 * Dedicated 1200×630 share banners under public/og.
 * Related tools share a banner so every calculator has a tagged OG image.
 */
const CALC_OG_IMAGE: Record<string, string> = {
  sip: "/og/og-sip.png",
  swp: "/og/og-swp.png",
  "tax-regime": "/og/og-tax-calculator.png",
  emi: "/og/og-emi.png",
  home: "/og/og-emi.png",
  car: "/og/og-emi.png",
  rentbuy: "/og/og-emi.png",
  rentcar: "/og/og-emi.png",
  whencar: "/og/og-emi.png",
  ppf: "/og/og-ppf.png",
  epf: "/og/og-ppf.png",
  nsc: "/og/og-po.png",
  po: "/og/og-po.png",
  "po-savings": "/og/og-po.png",
  "po-td": "/og/og-po.png",
  "po-rd": "/og/og-po.png",
  "po-kvp": "/og/og-po.png",
  "po-mis": "/og/og-po.png",
  "po-scss": "/og/og-po.png",
  "po-ssy": "/og/og-po.png",
  emergency: "/og/og-emergency.png",
  fire: "/og/og-fire.png",
};

/** Category banner for calculators without their own image. */
const CATEGORY_OG_IMAGE: Record<string, string> = {
  investment: "/og/og-sip.png",
  savings: "/og/og-ppf.png",
  retirement: "/og/og-fire.png",
  loans: "/og/og-emi.png",
  tax: "/og/og-tax-calculator.png",
  protection: "/og/og-emergency.png",
  postoffice: "/og/og-po.png",
};

export function getOgImagePathForCalc(calcId: string): string {
  if (CALC_OG_IMAGE[calcId]) return CALC_OG_IMAGE[calcId];
  const cat = CATEGORIES.find((c) => c.items.some((i) => i.id === calcId));
  return (cat && CATEGORY_OG_IMAGE[cat.id]) ?? "/og/og-home.png";
}

export function buildCalculatorJsonLd(seo: CalculatorSeo, calcId?: string) {
  const pageUrl = absoluteCalcUrl(seo.path);
  const item = CATEGORIES.flatMap((c) => c.items).find((i) => i.id === calcId);
  const alternateName = fullFormName(seo.appName);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: seo.appName,
        ...(alternateName ? { alternateName } : {}),
        description: seo.description,
        inLanguage: "en-IN",
        isAccessibleForFree: true,
        url: pageUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
        provider: {
          "@type": "Organization",
          name: "Finkoin",
          url: SITE_URL,
        },
        ...(item ? { featureList: item.blurb } : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: seo.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a,
          },
        })),
      },
    ],
  };
}

/** Related internal links for calculator SEO pages. */
/** Learn guide that explains each calculator, shown first under "Related tools & guides". */
export const CALC_LEARN_GUIDES: Record<
  string,
  { id: string; title: string; desc: string }
> = {
  epf: {
    id: "epf-pf-explained-contribution-interest-withdrawal",
    title: "EPF (PF) explained",
    desc: "Contribution, interest, VPF and tax",
  },
  gratuity: {
    id: "gratuity-calculation-formula-eligibility-tax",
    title: "Gratuity guide",
    desc: "Formula, eligibility and ₹20 lakh exemption",
  },
  "leave-encashment": {
    id: "gratuity-calculation-formula-eligibility-tax",
    title: "Gratuity guide",
    desc: "Formula, eligibility and tax",
  },
  "stepup-sip": {
    id: "step-up-sip-and-cost-of-delay",
    title: "Step-up SIP guide",
    desc: "Why raising your SIP yearly matters",
  },
  "sip-delay": {
    id: "step-up-sip-and-cost-of-delay",
    title: "Cost of delay guide",
    desc: "What waiting five years costs",
  },
  "goal-sip": {
    id: "step-up-sip-and-cost-of-delay",
    title: "Step-up SIP guide",
    desc: "Reach goals with a rising SIP",
  },
  xirr: {
    id: "xirr-vs-cagr-vs-absolute-return",
    title: "XIRR vs CAGR explained",
    desc: "Which return number to trust",
  },
  cagr: {
    id: "xirr-vs-cagr-vs-absolute-return",
    title: "XIRR vs CAGR explained",
    desc: "Which return number to trust",
  },
  "expense-ratio": {
    id: "direct-vs-regular-mutual-funds-expense-ratio",
    title: "Direct vs regular funds",
    desc: "What the expense ratio costs",
  },
  "flat-vs-reducing": {
    id: "flat-vs-reducing-interest-rate",
    title: "Flat vs reducing rate guide",
    desc: "The real cost of a flat-rate loan",
  },
  "loan-eligibility": {
    id: "loan-eligibility-foir-explained",
    title: "Loan eligibility and FOIR",
    desc: "How banks decide your limit",
  },
  "debt-payoff": {
    id: "debt-payoff-avalanche-vs-snowball",
    title: "Avalanche vs snowball",
    desc: "Fastest way to become debt-free",
  },
  "credit-card": {
    id: "credit-card-minimum-trap",
    title: "The minimum-due trap",
    desc: "Why paying the minimum costs so much",
  },
  "balance-transfer": {
    id: "debt-payoff-avalanche-vs-snowball",
    title: "Avalanche vs snowball",
    desc: "Clear several debts faster",
  },
  fd: {
    id: "fd-rd-interest-tax-tds-15g-15h",
    title: "FD and RD interest tax",
    desc: "TDS limits, 15G/15H, post-tax return",
  },
  rd: {
    id: "fd-rd-interest-tax-tds-15g-15h",
    title: "FD and RD interest tax",
    desc: "TDS limits, 15G/15H, post-tax return",
  },
  "net-worth": {
    id: "how-to-calculate-net-worth",
    title: "How to calculate net worth",
    desc: "What to count and how to track it",
  },
  budget: {
    id: "what-is-the-50-30-20-budgeting-rule",
    title: "The 50/30/20 rule",
    desc: "Budgeting explained simply",
  },
  inflation: {
    id: "understanding-inflation-and-your-real-returns",
    title: "Inflation and real returns",
    desc: "What inflation does to savings",
  },
  "asset-allocation": {
    id: "what-is-asset-allocation",
    title: "Asset allocation guide",
    desc: "How to split equity, debt and gold",
  },
  nps: {
    id: "nps-vs-epf-for-retirement",
    title: "NPS vs EPF",
    desc: "Which is better for retirement",
  },
  gold: {
    id: "gold-as-investment-myths",
    title: "Gold as an investment",
    desc: "Myths and facts",
  },
  emergency: {
    id: "emergency-fund-how-much-where-to-keep-it",
    title: "Emergency fund guide",
    desc: "How much and where to keep it",
  },
  "health-cover": {
    id: "what-is-health-insurance-floater",
    title: "Health insurance floater",
    desc: "How family floaters work",
  },
  "term-cover": {
    id: "term-insurance-vs-endowment-why-most-indians-buy-wrong",
    title: "Term vs endowment",
    desc: "Why most Indians buy wrong",
  },
  hra: {
    id: "hra-exemption-complete-guide-india",
    title: "HRA exemption guide",
    desc: "How the exemption is worked out",
  },
  "capital-gains": {
    id: "stcg-vs-ltcg-on-equity-india",
    title: "STCG vs LTCG on equity",
    desc: "How gains are taxed",
  },
  "ltcg-harvest": {
    id: "stcg-vs-ltcg-on-equity-india",
    title: "STCG vs LTCG on equity",
    desc: "How gains are taxed",
  },
  deductions: {
    id: "section-80c-limits-and-beyond",
    title: "80C and beyond",
    desc: "Deductions explained",
  },
  compound: {
    id: "what-is-compound-interest-and-why-it-changes-everything",
    title: "Compound interest explained",
    desc: "Formula and a rupee example",
  },
  "prepay-vs-invest": {
    id: "prepayment-vs-tenure-reduction-home-loan",
    title: "Prepay: EMI or tenure?",
    desc: "Home loan prepayment explained",
  },
};

export function getRelatedLinksForCalc(calcId: string) {
  const guide = CALC_LEARN_GUIDES[calcId];
  const links = relatedLinksWithoutGuide(calcId);
  if (!guide) return links;
  const href = `/learn/${guide.id}`;
  return [
    { href, title: guide.title, desc: guide.desc },
    ...links.filter((l) => l.href !== href),
  ];
}

function relatedLinksWithoutGuide(calcId: string) {
  const common = [
    {
      href: "/analyse",
      title: "Financial Health Check",
      desc: "Know it. Fix it. Grow it. - free score",
    },
  ];
  if (calcId in ADVISOR_SEO) {
    const cat = CATEGORIES.find((c) => c.items.some((i) => i.id === calcId));
    const siblings = (cat?.items ?? [])
      .filter((i) => i.id !== calcId)
      .slice(0, 3);
    return [
      ...siblings.map((i) => ({
        href:
          i.id === "tax-regime"
            ? "/calculators/tax-regime-2026"
            : `/calculators/${i.id}`,
        title: `${i.title} calculator`,
        desc: i.blurb,
      })),
      ...common,
    ];
  }
  if (calcId === "sip") {
    return [
      {
        href: "/calculators/swp",
        title: "SWP Calculator",
        desc: "Plan systematic withdrawals",
      },
      {
        href: "/calculators/tax-regime-2026",
        title: "Tax Regime Calculator",
        desc: "Old vs new regime for FY 2025-26",
      },
      {
        href: "/learn/sip-vs-lumpsum-when-to-use-which",
        title: "SIP vs lump sum guide",
        desc: "When to use which",
      },
      ...common,
    ];
  }
  if (calcId === "home" || calcId === "emi") {
    return [
      {
        href: "/calculators/home",
        title: "Home Loan Calculator",
        desc: "EMI & affordability",
      },
      {
        href: "/calculators/tax-regime-2026",
        title: "Tax Regime Calculator",
        desc: "Include 24B & 80C benefits",
      },
      {
        href: "/learn/how-home-loan-tax-benefits-work-80c-24b",
        title: "Home loan tax benefits",
        desc: "80C + 24B explained",
      },
      ...common,
    ];
  }
  if (
    calcId === "po" ||
    calcId.startsWith("po-") ||
    calcId === "nsc" ||
    calcId === "ppf" ||
    calcId === "epf"
  ) {
    return [
      {
        href: "/calculators/po",
        title: "All Post Office schemes",
        desc: "Compare TD, RD, NSC, KVP, MIS, SCSS, SSY",
      },
      {
        href: "/calculators/po-td",
        title: "Post Office TD",
        desc: "1–5 year time deposit maturity",
      },
      {
        href: "/calculators/po-scss",
        title: "SCSS Calculator",
        desc: "8.2% senior citizen income",
      },
      {
        href: "/calculators/ppf",
        title: "PPF Calculator",
        desc: "15-year EEE tax-free corpus",
      },
      ...common,
    ];
  }
  return [
    {
      href: "/calculators/sip",
      title: "SIP Calculator",
      desc: "Plan monthly investments",
    },
    {
      href: "/calculators/tax-regime-2026",
      title: "Tax Regime Calculator",
      desc: "Old vs new - which saves more",
    },
    {
      href: "/learn/section-80c-limits-and-beyond",
      title: "80C and beyond",
      desc: "Deductions explained",
    },
    ...common,
  ];
}
