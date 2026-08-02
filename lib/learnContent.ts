export type LearnCategory =
  | "Basics"
  | "Tax"
  | "Investment"
  | "Insurance"
  | "Loans"
  | "Property";

export type LearnArticle = {
  id: string;
  title: string;
  subtitle: string;
  category: LearnCategory;
  /** Plain paragraphs — rendered as `<p>` in article body */
  content: string[];
  readTime: number;
};

export const learnArticles: LearnArticle[] = [
  {
    id: "sip-calculator-1-crore-10-15-20-years",
    title: "SIP calculator — how much SIP for ₹1 crore in 10/15/20 years",
    subtitle:
      "Live sip calculator 1 crore tool: monthly SIP needed at different returns for 10, 15, and 20 year horizons.",
    category: "Investment",
    readTime: 8,
    content: [
      "Use the embedded SIP-for-goal calculator to see how much monthly SIP you need for ₹1 crore — then adjust years and return assumptions.",
      "Longer horizons shrink the monthly amount; higher assumed returns do the same. Always leave room for emergency fund and insurance before maxing SIPs.",
    ],
  },
  {
    id: "know-taxation-in-india-old-vs-new-slabs-interest-rates",
    title: "Indian Income Tax Explained Simply (FY 2025-26)",
    subtitle:
      "FY vs AY, ITR forms, tax slabs, 87A rebate, TDS (Form 16/AIS/26AS), and old vs new regime — beginner guide for India.",
    category: "Tax",
    readTime: 11,
    content: [
      "This guide explains Indian income tax for FY 2025-26 (AY 2026-27) with beginner-friendly examples: FY vs AY, who should file ITR, the main income heads, what Form 16/AIS/26AS mean, and how old vs new regime differs.",
      "Use the page sections and FAQs to learn the concepts; then verify your exact numbers with a calculator and the current-year rules/notifications.",
    ],
  },
  {
    id: "what-is-compound-interest-and-why-it-changes-everything",
    title: "What is compound interest and why it changes everything",
    subtitle:
      "Formula, a rupee example, and how compounding shows up in mutual funds — explained simply.",
    category: "Basics",
    readTime: 8,
    content: [
      "Compound interest means returns on your principal and on past returns — the snowball effect. Below: a clear formula, a small worked example, how SIP and NAV relate to the same idea, and links to try numbers yourself.",
      "Time helps when you start early; inflation raises prices with similar maths, so long idle cash loses purchasing power. Automating investments and avoiding unnecessary redemptions keeps compounding on your side.",
    ],
  },
  {
    id: "old-vs-new-tax-regime-which-saves-you-more-money",
    title: "Old vs new tax regime 2025-26 — complete comparison with examples",
    subtitle:
      "Side-by-side old vs new tax regime 2026 guide with salary examples, deductions checklist, and an embedded free calculator.",
    category: "Tax",
    readTime: 14,
    content: [
      "This guide helps you decide old vs new regime using a simple method: list your real eligible deductions/exemptions, then compare final tax after rebate/surcharge/cess — not just slab rates.",
      "Use the proof checklist and examples, then confirm with the tax regime calculator.",
    ],
  },
  {
    id: "term-insurance-vs-endowment-why-most-indians-buy-wrong",
    title: "Term insurance vs endowment — why most Indians buy wrong",
    subtitle:
      "Cover loans, education, buffers, and income replacement — but keep the premium small enough that you never have to lapse.",
    category: "Insurance",
    readTime: 10,
    content: [
      "Term insurance exists for one purpose: if you die early, your family receives a large sum. Premiums are comparatively low because there is no investment promise — you pay only to transfer the financial risk of early death to the insurer.",
      "Traditional endowment or money-back plans bundle a small death benefit with savings. The death coverage per rupee of premium is usually tiny compared with term, so families are often underinsured when it matters most — while “guaranteed” maturity returns after charges may be modest.",
      "Think in two layers: (1) enough sum assured so that after paying big obligations (loans, education, medical and emergency buffers) there is still money for years of living costs; (2) a premium you can pay for decades without stress, because a lapsed term policy means no cover. Below is a simple needs picture, an illustrative number table, what “buying wrong” looks like, and how to avoid over-insuring.",
    ],
  },
  {
    id: "what-is-an-index-fund-and-why-it-beats-most-mutual-funds",
    title: "What Is an Index Fund and Why It Beats Most Mutual Funds",
    subtitle:
      "SPIVA data, expense ratios, and a ₹7.5 lakh fee example — why copying Nifty 50 often beats stock-picking after costs.",
    category: "Investment",
    readTime: 8,
    content: [
      "An index fund copies a benchmark like Nifty 50 at very low cost. Below: a cricket-team analogy, how indices work, the chai-stall fee example, SPIVA India numbers, where active funds still compete, taxes, myths, and a practical core–satellite approach.",
      "Last updated: May 2026. Educational only — not investment advice.",
    ],
  },
  {
    id: "how-your-cibil-credit-score-is-calculated",
    title:
      "How Your CIBIL Credit Score Is Calculated — The Complete 2026 Guide",
    subtitle:
      "India’s CIBIL score is a 300–900 number. Know how payment history, utilisation, mix, and inquiries shape approvals and loan pricing.",
    category: "Loans",
    readTime: 12,
    content: [
      "Your CIBIL credit score is the three-digit number most Indian lenders check first. This guide walks through the four weighted factors, what hurts fastest, and the mistakes that linger for years — including why “settled” loans are dangerous.",
      "Last updated: May 2026. Educational only — not credit repair advice; verify bureau data and lender policies before acting.",
    ],
  },
  {
    id: "emergency-fund-how-much-where-to-keep-it",
    title: "How much emergency fund do I need — calculator India",
    subtitle:
      "Emergency fund calculator India: life-stage targets up to 12 months, where to park cash, plus a live tool for your number.",
    category: "Basics",
    readTime: 11,
    content: [
      "An emergency fund is cash you can use within days for job loss, health shocks, or urgent travel — without selling long-term investments in a crash or living on credit cards. It is the most important liquid layer in a personal finance plan.",
      "On this page we cap the planning target at twelve months of essential (must-pay) expenses. You may start with a smaller goal and build up; families with more dependents usually move toward the top of that range.",
      "Keep this money boring and separate from SIPs: liquid mutual funds, sweep fixed deposits, or a dedicated savings account. Rebuild the bucket after every withdrawal and review your “one month” number at least once a year.",
    ],
  },
  {
    id: "sip-vs-lumpsum-when-to-use-which",
    title:
      "SIP vs Lumpsum — When to Use Which (With Real Indian Market Examples)",
    subtitle:
      "Same rupees, different paths: highs favour SIP discipline; deep crashes can favour lumpsum — plus STP hybrid rules.",
    category: "Investment",
    readTime: 11,
    content: [
      "SIP vs lumpsum is the first real decision after you decide to invest: rupee-cost averaging versus putting money to work immediately. Below is a structured comparison with Indian market examples, a hybrid STP approach, and a practical rule for bonuses.",
      "Last updated: May 2026. Educational only — not investment advice; match products to goals and risk tolerance.",
    ],
  },
  {
    id: "how-home-loan-tax-benefits-work-80c-24b",
    title:
      "How Home Loan Tax Benefits Work — Section 80C and 24B Explained Simply",
    subtitle:
      "Principal vs interest, possession rules, joint-owner stacking, and why under-construction EMIs can disappoint.",
    category: "Tax",
    readTime: 11,
    content: [
      "Home loan tax benefits confuse people because one EMI contains two different tax ideas: principal (80C bouquet) and interest (Section 24(b) / “24B”). Read the full guide for worked numbers, joint strategies, and regime choice.",
      "Last updated: May 2026. Educational only — verify limits each assessment year with Form 16 + lender certificates.",
    ],
  },
  {
    id: "what-is-the-50-30-20-budgeting-rule",
    title:
      "Why the 50-30-20 Rule Fails Indians — Finkoin's 40-20-10-30 Framework",
    subtitle:
      "US-born 50/30/20 ignores India’s inflation, weak safety nets, and slow real wage growth — use a India-first bucket model instead.",
    category: "Basics",
    readTime: 12,
    content: [
      "The 50-30-20 budgeting rule is famous, but it was built for a different economy. This article explains why 30% wants is risky in India, how RBI’s ~4% inflation target still sits above rich-country norms, and how Finkoin’s 40-20-10-30 framework prioritises investing and insurance before lifestyle.",
      "Last updated: May 2026. Educational only — tune percentages to your city rent and dependents.",
    ],
  },
  {
    id: "ppf-vs-elss-which-is-better-for-tax-saving",
    title:
      "PPF vs ELSS for Tax Saving — The Honest Answer (Not What Your Bank Wants You to Hear)",
    subtitle:
      "Same ₹1.5L 80C box — very different risk, lock-in, and post-tax wealth outcomes.",
    category: "Tax",
    readTime: 11,
    content: [
      "PPF vs ELSS is the tax-saving decision that shapes wealth: debt-backed certainty versus equity volatility inside Section 80C. Below is a straight comparison of rates, lock-ins, tax treatment, and who should pick which — plus why ELSS needs 7–10 years, not three.",
      "Last updated: May 2026. Educational only — not a product recommendation.",
    ],
  },
  {
    id: "understanding-inflation-and-your-real-returns",
    title:
      "Understanding Inflation and Your Real Returns — What Your Money Is Actually Worth",
    subtitle:
      "CPI April 2026 ~3.48% headline vs 5–6% history, basket inflation, Rule of 72, and post-tax FD reality.",
    category: "Basics",
    readTime: 11,
    content: [
      "Inflation quietly taxes your FD, salary hike, and goals. This inflation guide starts with post-tax real returns, adds India’s April 2026 CPI headline (~3.48%) versus longer-run averages, then shows how education and medical costs inflate faster than averages.",
      "Last updated: May 2026. Educational only — model your personal basket, not only government CPI.",
    ],
  },
  {
    id: "section-80c-limits-and-beyond",
    title:
      "Section 80C Limit Is Just ₹1.5L — Here Are All the Deductions Beyond It",
    subtitle:
      "Map 80D, NPS ₹50k (80CCD(1B)), 24B, 80E, and 80TTA/80TTB — old regime stacking can save serious tax.",
    category: "Tax",
    readTime: 10,
    content: [
      "Section 80C is only ₹1.5 lakh of your tax story. This guide lists the big deductions beyond 80C, typical caps, and a priority order salaried families miss — especially 80D and the extra NPS window.",
      "Last updated: May 2026. Educational only — new regime may disallow many deductions; compare regimes annually.",
    ],
  },
  {
    id: "what-is-health-insurance-floater",
    title: "What Is a Family Floater Health Plan and Is It Right for You?",
    subtitle:
      "Shared sum insured vs individual policies, super top-ups, medical inflation, and parents cover.",
    category: "Insurance",
    readTime: 10,
    content: [
      "Family floater health insurance pools one sum insured across members — cheaper premiums but correlated claim risk. This article compares structures, lists when floaters win, and explains the super top-up trick many middle-class families skip.",
      "Last updated: May 2026. Educational only — read policy wordings; claim ratios vary by insurer and product generation.",
    ],
  },
  {
    id: "fixed-vs-floating-home-loan",
    title:
      "Fixed vs Floating Home Loan — Which Saves More Money in India (With Math)",
    subtitle:
      "Repo-linked floating vs teaser-fixed, 20-year ₹50L illustration, prepayment edge, and cashflow stress tests.",
    category: "Loans",
    readTime: 11,
    content: [
      "Fixed vs floating home loan is a bet on future rates and your own cashflow stability. Below is current-rate context (2026), a twenty-year illustration on a ₹50 lakh loan, and why prepayment rules often matter more than the label on day one.",
      "Last updated: May 2026. Educational only — confirm spreads and reset clauses in your sanction letter.",
    ],
  },
  {
    id: "rera-basics-for-homebuyers",
    title:
      "RERA Basics Every Indian Home Buyer Must Know Before Signing Anything",
    subtitle:
      "Registration, escrow discipline, carpet area, delay remedies, and what RERA cannot fix.",
    category: "Property",
    readTime: 10,
    content: [
      "RERA (Real Estate Regulatory Authority) gives buyers structured disclosures and complaint routes — but only if you verify registration, read agreements, and keep payment proofs. This checklist covers what RERA tries to guarantee and where diligence still saves you.",
      "Last updated: May 2026. Educational only — use your state RERA portal as the source of truth.",
    ],
  },
  {
    id: "what-is-asset-allocation",
    title:
      "What Is Asset Allocation and Why It Is the Most Important Investment Decision",
    subtitle:
      "Equity/debt/gold splits beat stock-picking for most Indians — plus a simple India sleeve template.",
    category: "Investment",
    readTime: 10,
    content: [
      "Asset allocation is how you divide money across asset classes before you pick funds. This guide explains the Brinson insight, India-specific sleeves, age heuristics, and why annual rebalancing is the boring superpower.",
      "Last updated: May 2026. Educational only — not a personalised investment plan.",
    ],
  },
  {
    id: "credit-card-minimum-trap",
    title:
      "The Credit Card Minimum Payment Trap — How Banks Make You Pay 3X the Price",
    subtitle:
      "Revolving APR, lost grace periods, cheaper ways out, and the one habit that fixes it.",
    category: "Basics",
    readTime: 10,
    content: [
      "Credit card minimum payments are designed to keep you revolving at very high effective interest. This trap guide shows the rupee math, why grace periods vanish after one miss, and how to escape if you are already stuck.",
      "Last updated: May 2026. Educational only — read your issuer’s MITC for exact rates and fees.",
    ],
  },
  {
    id: "nps-vs-epf-for-retirement",
    title:
      "NPS vs EPF — Which Is Better for Your Retirement? (Real Numbers Compared)",
    subtitle:
      "Employer match, EPS split, 80CCD(1B), annuity rules, and why job-change EPF withdrawals destroy compounding.",
    category: "Tax",
    readTime: 11,
    content: [
      "NPS vs EPF is the retirement stack question for salaried Indians: guaranteed-ish accrual plus employer match versus market-linked growth and extra deductions. Read the full comparison for withdrawal psychology, annuity taxation, and a simple combined plan.",
      "Last updated: May 2026. Educational only — confirm current EPFO/NPS notifications before committing.",
    ],
  },
  {
    id: "gold-as-investment-myths",
    title:
      "Gold as Investment — Myths Busted and When Gold Actually Makes Sense",
    subtitle:
      "Jewellery spreads, SGB vs ETF vs digital gold, and why 5–10% is usually enough.",
    category: "Investment",
    readTime: 10,
    content: [
      "Gold as investment is different from gold as jewellery or tradition. This guide covers four sensible use-cases, busts common myths, and explains Sovereign Gold Bonds and ETFs versus high-spread physical buying.",
      "Last updated: May 2026. Educational only — not a commodity trading recommendation.",
    ],
  },
  {
    id: "prepayment-vs-tenure-reduction-home-loan",
    title:
      "Home Loan Prepayment — Should You Reduce EMI or Tenure? (With Edge Cases)",
    subtitle:
      "Illustrative ₹50L math, when EMI cut wins, prepayment timing, and the Section 24B trade-off.",
    category: "Loans",
    readTime: 11,
    content: [
      "Home loan prepayment saves interest — but banks offer EMI reduction or tenure reduction, and most people pick the emotionally easy one. Below is the reducing-balance math, the behavioural edge case, and how tax deductions interact late in the loan.",
      "Last updated: May 2026. Educational only — confirm options with your lender’s amortisation schedule.",
    ],
  },
  {
    id: "capital-gains-when-you-sell-property",
    title: "Capital gains when you sell property",
    subtitle:
      "Holding period, improvements, and exemptions decide the final bill.",
    category: "Property",
    readTime: 5,
    content: [
      "Property sold after prescribed holding periods may qualify for long-term capital gains treatment with indexation benefits on land/building in many cases — slabs and surcharge bite hard if you ignore purchase deed costs and approved improvement receipts.",
      "Reinvestment options like another residential property or capital gains bonds have time-bound deposit rules; missing deadlines converts planning into cash payments plus interest penalties.",
      "Joint sale proceeds need matching with ITR capital-gains schedules; TDS by buyers on high-value transactions affects cash flow even if refund is due later.",
      "Inherited property has different cost acquisition rules — legal opinions pay for themselves before marketing the asset.",
      "Model lawyer fees, brokerage, and vacancy periods into your net-of-tax outcome — headline sale prices mislead sellers every season.",
    ],
  },
  {
    id: "stcg-vs-ltcg-on-equity-india",
    title: "STCG vs LTCG on equity in India",
    subtitle:
      "Holding clocks start on dates that changed across Finance Acts — track your grandfathering.",
    category: "Tax",
    readTime: 5,
    content: [
      "Listed equity and equity-oriented funds historically enjoyed zero long-term capital gains tax until reforms introduced a taxed regime beyond specific holding periods. Short-term gains face higher rates tuned to discourage churn.",
      "Grandfathering clauses protected notional gains up to cut-off dates — your broker statement may be wrong; download trade logs from AMCs and reconcile purchase NAVs for shares migrated between demats.",
      "Loss harvesting matters: set off rules pair STCL against STCG before carrying forward balances across years within statutory limits.",
      "International equity feeder funds may be treated as debt funds for tax — do not assume Indian equity rules apply by headline category name alone.",
      "Day-traders mixing business income and capital gains may face scrutiny; structure activity intentionally with CA guidance if scale grows.",
    ],
  },
  {
    id: "diversification-vs-diworsification",
    title: "Diversification vs diworsification",
    subtitle: "Owning everything is not the same as understanding anything.",
    category: "Investment",
    readTime: 4,
    content: [
      "Diversification spreads idiosyncratic risk — one company’s fraud should not sink your retirement if weightings stay sane across dozens of stocks via index funds.",
      "Diworsification happens when you add correlated funds, overlapping themes, and brokerage tips until the portfolio looks busy but behaves like expensive Nifty-plus-noise.",
      "Correlation rises in panics: international diversification helps until global shocks synchronize briefly — still worth it for serial currency and cycle diversification over decades.",
      "Three thoughtful funds can beat twenty random ones. Count effective bets, not Excel rows.",
      "Annual reviews should delete positions you cannot explain in two sentences; if they survive, keep them.",
    ],
  },
  {
    id: "nominee-vs-legal-heir",
    title: "Nominee vs legal heir — know the difference",
    subtitle: "Nomination is temporary custody, not inheritance by itself.",
    category: "Basics",
    readTime: 4,
    content: [
      "Financial institutions ask for nominees to streamline settlement — the nominee receives assets to transmit toward lawful heirs, not automatically to keep if wills or succession law say otherwise.",
      "A will clarifies intent for non-dematerialized assets, bank accounts, and personal effects. Mutual funds and demat accounts still need transmission paperwork even with nominees aligned.",
      "Joint holders bypass some frictions but create their own disputes if contributions were unequal — document Gift Deeds or loan agreements when families pool money.",
      "Update nominations after marriage, childbirth, divorce, or estrangement — stale ex-spouse nominations cause Bollywood-level litigation in real life.",
      "Store a one-page inventory of policies, passwords in a secure vault, and CA/ lawyer contacts for executors.",
    ],
  },
  {
    id: "top-up-home-loan-when-it-makes-sense",
    title: "Top-up home loan — when it makes sense",
    subtitle:
      "Cheaper than personal loans if discipline exists — disastrous if treated as pocket money.",
    category: "Loans",
    readTime: 4,
    content: [
      "Top-up loans ride on existing mortgage collateral; rates often sit between home-loan and personal-loan brackets because security is already pledged to the lender.",
      "Renovation, kid education, or consolidating costlier unsecured debt can justify a top-up if repayment schedules are realistic and lifestyle creep is controlled.",
      "Using home equity to speculate on stocks, weddings beyond budget, or vacations converts long-term shelter security into short-term dopamine — skip.",
      "Tax treatment on interest depends on end use; retain invoices and lender certificates tying proceeds to eligible purposes where deductions matter to you under current law.",
      "Re-amortize household cash flow after top-up — not just EMI parity but insurance coverage and emergency buffer adequacy.",
    ],
  },
  {
    id: "under-construction-vs-ready-property",
    title: "Under-construction vs ready property",
    subtitle: "GST stages, funding risk, and yield trade-offs differ.",
    category: "Property",
    readTime: 5,
    content: [
      "Under-construction launches sometimes price cheaper per square foot but expose buyers to execution delays, GST payment milestones, and bank disbursement schedules that must sync with builder reputation.",
      "Ready-to-move inventory eliminates construction timing risk and often lets you touch and verify fit-outs — liquidity for resale may improve once society formation matures.",
      "Funding mix matters: under-construction purchases usually involve pre-EMI interest; ready properties may suit immediate rental yield investors if cap rates work.",
      "Legal diligence — title, encumbrance, builder lien — matters in both segments; ready does not mean clean automatically.",
      "Builder discounts in soft markets may hide quality shortcuts; third-party structural audits exist for serious buyers.",
    ],
  },
  {
    id: "opd-cover-in-health-insurance",
    title: "OPD cover in health insurance",
    subtitle:
      "Out-patient benefits are tempting but watch sub-limits and utilization friction.",
    category: "Insurance",
    readTime: 4,
    content: [
      "OPD riders reimburse doctor visits, diagnostics, or pharmacy spends below hospitalization thresholds. Insurers cap annual amounts because anti-selection risk is huge — healthy buyers subsidize hypochondriacs otherwise.",
      "Sometimes separate health-wallet products bundle OPD better than generic retail policies; compare premium increments vs expected utilization honestly.",
      "Employer corporate policies occasionally hide OPD wallets; audit HR PDFs during open enrollment instead of discovering limits after a baby’s vaccine schedule.",
      "High-income households budgeting predictable OPD spend sometimes self-insure via a sinking fund while keeping catastrophic hospitalization sums aggressive.",
      "Tele-consult add-ons accelerated post-pandemic; check whether your OPD rider counts them or excludes.",
    ],
  },
  {
    id: "liquid-and-overnight-mutual-funds",
    title: "Liquid and overnight mutual funds",
    subtitle:
      "Near-cash sleeves for treasuries — not replacements for multi-year goals.",
    category: "Investment",
    readTime: 4,
    content: [
      "Liquid funds invest in very short-term debt; overnight funds mature the next business day — both aim for stability and quick redemption, with modest returns above savings accounts.",
      "They suit emergency buckets, business working capital parking, or staging equity SIPs — holding them for retirement decades bleeds to inflation.",
      "Credit risk is lower than long bonds but not zero if funds stretch for yield; read factsheets for credit quality and single-issuer caps.",
      "Taxation on gains follows debt mutual fund rules applicable in your filing year — verify holding periods and indexation eligibility when rules shift.",
      "STP from liquid to equity smooths entry, but STP is psychology as much as arithmetic — set it and ignore daily NAV noise.",
    ],
  },
  {
    id: "form-16-what-to-verify",
    title: "Free ITR filing 2025-26 — Form 16 checklist & tax regime prep",
    subtitle:
      "Verify Form 16, compare old vs new regime free, then file with clarity. Built for India’s ITR season.",
    category: "Tax",
    readTime: 9,
    content: [
      "Part A lists employer TAN and tax deposited; Part B maps allowances, perquisites, deductions, and taxable income computed by payroll.",
      "Before free e-filing, reconcile Form 16 with AIS/26AS, then run Finkoin’s tax regime calculator so you know which regime saves more.",
      "Two Form 16s appear if you switched jobs; merge incomes carefully to avoid under-reporting or double-claiming deductions.",
    ],
  },
  {
    id: "80c-complete-guide-tax-saving-india",
    title: "Section 80C — complete guide to tax-saving investments",
    subtitle:
      "ELSS, PPF, EPF, LIC, tuition fees, and home-loan principal share one ₹1.5 lakh basket — allocate wisely.",
    category: "Tax",
    readTime: 10,
    content: [
      "Section 80C is not one product — it is a shared annual ceiling (currently ₹1.5 lakh) across ELSS mutual funds, PPF, voluntary EPF/employee contributions within eligibility, life insurance premiums tied to sum-assured limits, principal repayment on qualifying home loans, and specified tuition fees.",
      "Because everything shares one cap, stuffing ₹2 lakh into ELSS still yields only ₹1.5 lakh deduction. Decide early whether debt-heavy PPF/EPF or equity-heavy ELSS fits each goal; mixing deliberately beats accidental duplication.",
      "Lock-ins differ: ELSS ≈ three years per instalment, PPF fifteen-year horizon with extensions, insurance policies may lock longer — match liquidity to life events before chasing deductions.",
      "Home-loan principal competes with ELSS for the same basket. New homeowners sometimes forget tuition fees for two children also qualify — keep signed fee receipts with PAN-ready documentation.",
      "Employers often pre-fill PF in Form 16 — subtract that from mental ‘remaining 80C room’ before funding ELSS to avoid last-mile panic.",
      "Alternate sections like 80CCD(1B) for extra NPS sit outside the ₹1.5 lakh box — tag those receipts separately so payroll teams don’t compress them into vanilla 80C.",
    ],
  },
  {
    id: "hra-exemption-complete-guide-india",
    title: "HRA exemption — metro rules, rent proofs, and pitfalls",
    subtitle:
      "Least-of-three math, PAN quoting, and why Form 16 rarely matches back-of-envelope rent guesses.",
    category: "Tax",
    readTime: 9,
    content: [
      "House Rent Allowance exemption is the minimum of: actual HRA received, rent paid minus 10% of salary (salary definition follows payroll rules), and 50% (metro) or 40% (non-metro) of salary — terminology varies by employer policy.",
      "Landlord PAN must be quoted when annual rent crosses thresholds — missing PAN invites disallowance even when rent is genuine. Align bank transfers with agreement timelines.",
      "Metro classification differs between employers and municipal boundaries — verify HR policy rather than assuming ‘Bangalore is always metro’.",
      "Leave-and-license agreements should reflect actual rent; artificial splits between spouses purely for tax optimisation attract scrutiny unless economically supported.",
      "If you switch jobs mid-year, merge both Form 16 HRA computations carefully — duplicate rent months or missing proofs double painful CPC notices.",
      "When HRA is absent, explore Section 80GG subject to conditions — calculators model illustrative caps; still maintain rent receipts and eligibility narratives.",
    ],
  },
  {
    id: "nps-tax-deductions-guide-india",
    title: "NPS tax benefits — 80CCD layers employers rarely explain",
    subtitle:
      "Employee voluntary, employer contribution, and extra ₹50k window — three different stories.",
    category: "Tax",
    readTime: 8,
    content: [
      "National Pension System deductions split across sections: employee contributions may count toward 80CCD within limits inside/over and above the ₹1.5 lakh 80C universe depending on subsection and salary type.",
      "Section 80CCD(1B) offers an additional ₹50,000 deduction box specifically for voluntary Tier-I contributions — ideal for disciplined retirement investors who already maxed ELSS/PPF.",
      "Employer NPS contributions sometimes enjoy exempt treatment up to caps tied to Basic + DA percentages — read Form 16 ‘perquisites exempt’ lines rather than guessing.",
      "Liquidity is intentionally strict: premature withdrawals carry conditions and partial taxability — treat NPS as retirement sleeves, not emergency cash.",
      "Choose lifecycle vs active equity allocation consciously; equity glidepaths reduce sequencing risk but still behave like market portfolios.",
      "Each Finance Act may tweak thresholds — confirm April newsletters from your payroll team before committing annual SIP amounts.",
    ],
  },
  {
    id: "rsu-esop-tax-india-explained",
    title: "RSU & ESOP taxation in India — vesting vs selling",
    subtitle:
      "Perquisite tax at vest, capital gains at sale, and why cash flow shocks ignore your spreadsheet.",
    category: "Tax",
    readTime: 10,
    content: [
      "Restricted Stock Units taxed as salary-like perquisites typically when shares vest and fair market value is determined — employers usually withhold via sell-to-cover or supplemental TDS.",
      "Selling vested shares later triggers capital gains — short-term vs long-term depends on holding period rules for listed securities; grandfathering matters for older grants.",
      "Foreign parent plans may involve US withholding — foreign tax credits or treaty positions may apply; coordinate with a CA filing both jurisdictions.",
      "Broker statements provide acquisition FMV and sale proceeds — reconcile with Form 16 perquisite lines before filing ITR capital gains schedules.",
      "Illustrative calculators often flatten RSU gains into slab proxies — real STCG/LTCG arithmetic diverges; budget separately from salary optimisation.",
      "Plan liquidity: vesting tax hits even if you hold shares; selling triggers brokerage STT and gains reporting — keep three buckets: vest tax, hold shares, sell proceeds.",
    ],
  },
  {
    id: "hidden-tax-savings-salary-india",
    title: "Hidden tax savings on your salary slip",
    subtitle:
      "Professional tax, employer NPS, gadget allowances, and LTA hygiene most spreadsheets skip.",
    category: "Tax",
    readTime: 8,
    content: [
      "Professional tax deducted by states is often allowable as a deduction — small rupee but symbolic of reading every line on payslips.",
      "Employer-paid NPS slices may reduce taxable salary without touching your take-home planning — verify exempt portions before modelling DIY investments.",
      "Reimbursement components with genuine bills (telephone, books in some policies) stay outside taxable salary — missing invoices convert perks into tax.",
      "LTA exemption requires domestic travel proofs within block years — cash payouts without travel typically become taxable — calendar reminders beat HR escalations.",
      "Medical allowances switched regimes multiple times — confirm whether your employer still offers tax-efficient structures vs taxable payouts.",
      "Don’t ignore parents’ insurance premiums — separate 80D parental caps sometimes unused while kids’ policies hog attention.",
    ],
  },
  {
    id: "tax-planning-calendar-india-fy",
    title: "Tax planning calendar — month-by-month for Indian FY",
    subtitle:
      "April proofs, September ELSS, January AIS hygiene, March madness avoided.",
    category: "Tax",
    readTime: 7,
    content: [
      "April: capture new budget standard deduction changes, reset 80C SIPs, refresh rent agreements if landlords rotate.",
      "June–July: actual rent receipts for Q1, tuition fee receipts post admission season, insurance renewal comparisons.",
      "September: mid-year Form 16 projection with employer; adjust declaration window if bonuses predictable.",
      "December: capital gains harvesting decisions before year-end if rules permit carry-forward planning.",
      "January: download AIS, reconcile interest income vs Form 16 gaps, fix TDS mismatches early.",
      "February–March: finalize ELSS lumps if needed, submit proofs, scan NPS/contribution receipts, prepayment certificates for March EMIs.",
      "Year-round: maintain digital vault for certificates — searchable folders beat WhatsApp forwards during scrutiny.",
    ],
  },
  {
    id: "rent-agreement-registration-basics",
    title: "Rent agreement registration basics",
    subtitle:
      "Stamp duty and term clauses differ by state — HRA claims need consistency.",
    category: "Property",
    readTime: 4,
    content: [
      "Many landlords prefer 11-month leave-and-license agreements to avoid rent-control rigidity; registration requirements vary — some states enforce above thresholds only, others encourage e-registration for all.",
      "HRA exemption calculations expect landlord PAN above annual thresholds; keep NEFT trails aligned with agreement rent to satisfy employer auditors and tax scrutiny.",
      "Security deposit disputes dominate small claims courts — photograph meters, capture fixture conditions, and write inventory annexures.",
      "Indexation of future rents should appear explicitly; ambiguous “5% yearly” clauses confuse GST treatment on commercial leases if applicable.",
      "Renew before expiry; lapses risk passport-address mismatches and school admission address proof gaps for families.",
    ],
  },
];

/** Lookup map for O(1) article fetch */
export const learnArticleById: Record<string, LearnArticle> =
  Object.fromEntries(learnArticles.map((a) => [a.id, a]));

export const learnCategories: LearnCategory[] = [
  "Basics",
  "Tax",
  "Investment",
  "Insurance",
  "Loans",
  "Property",
];
