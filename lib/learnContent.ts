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
    id: "what-is-compound-interest-and-why-it-changes-everything",
    title: "What is compound interest and why it changes everything",
    subtitle:
      "How small, early contributions snowball — and why delaying costs more than you think.",
    category: "Basics",
    readTime: 6,
    content: [
      "Compound interest means you earn returns not only on your original money but also on the returns you have already earned. Over months and years, that layering effect accelerates growth: the curve bends upward instead of growing in a straight line.",
      "Most people intuitively understand simple interest — if you put ₹1 lakh at 8% for a year, you earn ₹8,000. Compound interest asks what happens when that ₹8,000 stays invested and earns its own return next year. Done consistently, the “interest on interest” becomes the largest part of your final wealth.",
      "Time is the hidden ingredient. Starting ten years earlier often beats investing a larger amount later, because an early rupee has more compounding cycles. Conversely, waiting “until you earn more” quietly removes the most valuable years from your plan, and those years cannot be bought back at any salary.",
      "Inflation works against you with the same mathematics in reverse: prices compound upward, so idle cash loses purchasing power year after year. That is why compounding is powerful when it works for investments, and dangerous when it works against money parked without growth.",
      "A practical takeaway: automate monthly investing, avoid interrupting compounding for lifestyle wants, and use conservative return assumptions when planning goals. The habit of staying invested usually matters more than chasing the highest headline return each year.",
    ],
  },
  {
    id: "old-vs-new-tax-regime-which-saves-you-more-money",
    title: "Old vs new tax regime — which saves you more money",
    subtitle:
      "There is no universal winner — your deductions, rent, and income mix decide the better choice.",
    category: "Tax",
    readTime: 7,
    content: [
      "India’s individual tax system offers an old regime with deductions (like 80C, 80D, HRA) and a new regime with lower slab rates but limited exemptions. The better option is not about politics or trends — it is a math problem unique to your return.",
      "The old regime tends to win when you fully use meaningful deductions: home loan interest, provident fund, ELSS, health insurance premiums, NPS additional contribution, and substantial HRA or rental loss set-off. Each of these lowers taxable income before the slab rates apply.",
      "The new regime is often simpler and competitive when you claim few deductions — for example early-career renters with minimal 80C, people without a home loan, or salaried employees whose employer structure already optimizes components. Lower slabs can offset the loss of some breaks.",
      "Watch the marginal rate: small changes in income can push you into a higher slab where the benefit of deductions in the old regime widens. Also remember cess and surcharge (if applicable) apply on tax computed under either regime, so compare final tax payable, not only slab percentages.",
      "A sensible approach is to ask your employer for a pro forma calculation in February, model both regimes with actual proofs, and lock declarations accordingly. Rules and rebate thresholds change in Finance Bills; re-check each assessment year instead of copying last year’s choice blindly.",
    ],
  },
  {
    id: "term-insurance-vs-endowment-why-most-indians-buy-wrong",
    title: "Term insurance vs endowment — why most Indians buy wrong",
    subtitle:
      "Pure protection and investment are different jobs — mixing them often means too little cover and weak returns.",
    category: "Insurance",
    readTime: 7,
    content: [
      "Term insurance exists for one purpose: if you die early, your family receives a large sum that replaces your income for years. Premiums are comparatively low because there is no investment promise — you are paying only for risk transfer to the insurer.",
      "Traditional endowment or money-back plans bundle a small death benefit with savings. Agents often highlight “guaranteed” maturity, but the implied return after charges is frequently modest. Meanwhile, the death coverage per rupee of premium is tiny compared with term plans, leaving families underinsured precisely when the amount matters most.",
      "The right sequence for most households: buy adequate term cover on the primary earner(s) — commonly quoted rules are 10–15 times annual income adjusted for loans — then invest separately in mutual funds, EPF, PPF, or other vehicles matched to goals. You get transparency, liquidity, and usually better long-term compounding than opaque bundled products.",
      "Endowment or whole-life products may still suit very specific needs — forced savings for extremely risk-averse investors, or legacy planning in niche cases. But they should not replace term cover; they are complements at best, not substitutes.",
      "Before signing, ask for the internal rate of return net of all charges and compare with a simple PPF plus term combo. If the bundled product cannot beat that benchmark with room to spare, you are paying extra for packaging, not performance.",
    ],
  },
  {
    id: "what-is-an-index-fund-and-why-it-beats-most-mutual-funds",
    title: "What is an index fund and why it beats most mutual funds",
    subtitle:
      "Owning the market cheaply is a surprisingly strong strategy — most active managers underperform after fees.",
    category: "Investment",
    readTime: 6,
    content: [
      "An index mutual fund or ETF tries to replicate a benchmark like Nifty 50 or Sensex by holding the same stocks in nearly the same weights. It does not attempt to pick winners; it owns the whole slice of the market the index represents.",
      "Because turnover is low and there is no star fund-manager salary embedded, expense ratios are usually tiny — sometimes a fraction of active funds. In investing, costs are one of the few things you control directly, and they compound against you just returns compound for you.",
      "Studies globally and in India repeatedly show that after fees, a minority of active funds beat their benchmark consistently over long periods. Identifying those few in advance is hard for retail investors, who often chase last year’s chart-topper and arrive late to the cycle.",
      "Index funds do not eliminate risk: if the market falls 30%, your fund falls with it. They remove stock-picking risk but keep market risk. That is why asset allocation — mixing equity index funds with debt and emergency cash — still matters for goals with fixed dates.",
      "A practical path: use broad equity index funds for long horizons (7+ years), add mid/small-cap index exposure only if you accept higher volatility, and pair with liquid or short-duration debt for stability. Rebalance once or twice a year instead of reacting to headlines.",
    ],
  },
  {
    id: "how-your-cibil-credit-score-is-calculated",
    title: "How your CIBIL credit score is calculated",
    subtitle:
      "Payment history and unsecured debt behaviour weigh heavily — small slips can linger on your report.",
    category: "Loans",
    readTime: 6,
    content: [
      "Credit bureaus like CIBIL collect repayment data from banks and NBFCs and distill it into a three-digit score — commonly 300–900 in India. Lenders use it as a quick filter for default risk before approving cards, personal loans, or home loans.",
      "Payment history is the dominant factor: EMIs or card dues paid on time build reliability. Even one 30-day delay reported to the bureau can drag the score and stay visible for years depending on how the lender reports and how old the account is.",
      "Credit utilization matters especially on cards: using most of your limit every month signals stress even if you pay in full. Keeping utilization moderate — or asking for a higher limit without increasing spending — can help the optics of your profile.",
      "“Hard” loan enquiries in a short window hint that you are shopping aggressively for credit; too many can be negative. “Soft” checks you initiate for your own report do not hurt the score.",
      "Check your free annual reports from each bureau, dispute errors with evidence, avoid co-signing casually, and never ignore small telecom or BNPL defaults — they increasingly feed credit data. Building a strong score is slow; damaging it can be fast, so automate dues and treat credit as a utility, not extra income.",
    ],
  },
  {
    id: "emergency-fund-how-much-where-to-keep-it",
    title: "Emergency fund — how much, where to keep it",
    subtitle:
      "Survival money should be boring, liquid, and separate from your long-term investments.",
    category: "Basics",
    readTime: 6,
    content: [
      "An emergency fund exists to handle job loss, medical surprises, or urgent travel without selling long-term investments at a market bottom or leaning on high-interest credit cards. It is insurance for cash flow, not a wealth maximization tool.",
      "Rules of thumb: single earners might target 6–9 months of non-discretionary expenses; dual-income households sometimes use 4–6 months; people with volatile commissions or heavy EMIs lean higher. Adjust for dependents, loans, and how fast you could replace income in your industry.",
      "The money belongs in instruments you can access within 1–2 days with near-stable value: sweep FDs, liquid mutual funds, or a separate savings account you do not raid for sales. Avoid equity, long lock-in deposits, or illiquid assets for this bucket.",
      "If you have home loans, keep at least three EMI payments in absolutely liquid form even if you are aggressively prepaying elsewhere — lenders do not pause EMIs because your net worth is tied up in property or long-term funds.",
      "Rebuild the fund after every withdrawal. Many people save once and forget; emergencies repeat. Automate a small monthly top-up until you hit your target, then redirect that SIP to goals — but schedule an annual review to inflate the corpus as your lifestyle costs rise.",
    ],
  },
  {
    id: "sip-vs-lumpsum-when-to-use-which",
    title: "SIP vs lumpsum — when to use which",
    subtitle:
      "Time in the market beats timing — but psychology and windfalls matter too.",
    category: "Investment",
    readTime: 6,
    content: [
      "A systematic investment plan (SIP) invests fixed amounts monthly, automatically buying more units when markets are weak and fewer when they are strong — classic rupee-cost averaging. It disciplines salaried investors who might otherwise wait indefinitely for a “better entry.”",
      "Lumpsum puts money to work immediately, which historically tends to win on average because markets drift upward over long periods. Sitting in cash waiting for a crash can mean years of missed compounding unless your timing is unusually accurate.",
      "Behavior beats spreadsheets: if a large market drop will make you panic-sell, SIPs or staged deployment (investing a windfall over 3–6 months) can be rational even if they are mathematically conservative. The best plan is one you will not abandon mid-cycle.",
      "Windfalls — bonuses, property sale proceeds, RSUs — benefit from a split approach: invest a base lumpsum into your strategic asset allocation, then dollar-cost average the remainder if you fear regret from an immediate correction.",
      "Debt goals with fixed deadlines need lower equity weight regardless of SIP or lumpsum. Match volatility to the horizon: long goals can lean equity via SIP or lumpsum; short goals belong in safer instruments no matter how you fund them.",
    ],
  },
  {
    id: "how-home-loan-tax-benefits-work-80c-24b",
    title: "How home loan tax benefits work (80C, 24B)",
    subtitle:
      "Principal and interest belong to different sections — know caps, conditions, and construction timelines.",
    category: "Tax",
    readTime: 7,
    content: [
      "Home loan tax breaks split into two ideas: repayment of principal (potentially under Section 80C within an overall ₹1.5 lakh bouquet shared with PF, ELSS, etc.) and interest paid on a housing loan (Section 24(b) for self-occupied property up to stated limits, with rules for let-out property differing).",
      "Section 24(b) traditionally offers a meaningful deduction for interest on loans for acquisition or construction, subject to conditions like completion within timelines and certification from the lender. Let-out property treatment changed in recent years; verify the current year’s rules because Finance Acts amend deemed rental income and loss set-off limits.",
      "First-time buyers should also explore additional deduction sections introduced in specific years for affordable housing — these have ₹ thresholds on stamp duty value and loan sanction dates. Missing the sanction window by weeks can forfeit the benefit forever for that loan.",
      "Joint owners can optimize by splitting EMI payments and registration proportions to match income slabs, but banks and sale deeds must reflect the same ownership share. Ad-hoc transfers between spouses without documentation will not satisfy assessing officers.",
      "Do not assume the entire EMI is deductible: principal and interest components change every month in an amortization schedule. Your provisional interest certificate from the lender is the starting point; reconcile with Form 16 and 26AS before filing. Always revalidate each assessment year — this is one of the most amended parts of tax law.",
    ],
  },
  {
    id: "what-is-the-50-30-20-budgeting-rule",
    title: "What is the 50-30-20 budgeting rule",
    subtitle:
      "A simple frame: needs, wants, and future-you — tweak percentages for Indian city realities.",
    category: "Basics",
    readTime: 5,
    content: [
      "Popularized by US Senator Elizabeth Warren’s collaborators, the 50-30-20 rule suggests allocating about 50% of after-tax income to needs, 30% to wants, and 20% to savings and debt payoff. It is a starting heuristic, not scripture.",
      "Needs include rent or EMI that keeps a roof, groceries, utilities, minimum loan payments, insurance premiums, school fees, and basic transport. In expensive metros, housing alone may breach 50%; in that case, adjust other buckets instead of pretending rent is a “want.”",
      "Wants are discretionary — dining out, gadgets, streaming stacks, vacation upgrades. When wants creep past 30% consistently, they usually steal from savings unless income is growing fast enough to fund both.",
      "The 20% bucket covers retirement SIPs, emergency fund top-ups, and accelerated prepayment of high-interest debt. If you carry credit card rollovers at 30%+ annualized cost, redirecting part of this bucket to elimination beats new mutual fund SIPs until the leak stops.",
      "Indian households may need a fourth mental bucket: remittances to parents or festival gifts that Western templates ignore. Build your own 45-25-20-10 split if that reflects reality, but keep the discipline: pay yourself first via automated transfers on salary day before discretionary cash sits in your spending account.",
    ],
  },
  {
    id: "ppf-vs-elss-which-is-better-for-tax-saving",
    title: "PPF vs ELSS — which is better for tax saving",
    subtitle:
      "Lock-in length, risk, and flexibility differ — match the tool to the goal behind the tax saving.",
    category: "Tax",
    readTime: 7,
    content: [
      "Both Public Provident Fund (PPF) and Equity Linked Savings Schemes (ELSS) can sit inside your Section 80C basket, but they behave very differently. PPF is government-backed debt with a long lock-in and tax-free maturity for qualifying investments; ELSS is market-linked equity with a three-year lock-in per installment.",
      "If the rupees you are investing are meant for retirement 15+ years away, ELSS offers higher expected long-term returns with painful short-term volatility. If the goal is capital preservation, a known rate environment, or a psychological need for guaranteed balances, PPF wins on calmness even if headline returns look modest.",
      "Liquidity paths: after initial maturity, PPF can extend in blocks; ELSS opens piecemeal three years after each contribution — useful to know if you might need staggered withdrawals. Neither should replace your emergency fund just because a lock-in is “only” three years.",
      "Do not duplicate the same goal across both unless you are intentionally splitting debt and equity sleeves inside 80C. Many investors do ₹1.5 lakh entirely in ELSS because it is fashionable, then panic in the first bear market. A split (part PPF, part ELSS) diversifies outcomes.",
      "Tax on ELSS gains now falls under equity capital gains rules applicable in your filing year — verify whether grandfathering, grandfathered grandfathering clauses(!), or holding-period changes affect you. PPF enjoys EEE status within statutory limits, making it a potent compounding vault if you can live with the tenure.",
    ],
  },
  {
    id: "understanding-inflation-and-your-real-returns",
    title: "Understanding inflation and your real returns",
    subtitle: "Nominal gains feel good until you subtract the silent tax of rising prices.",
    category: "Basics",
    readTime: 5,
    content: [
      "Inflation measures how broadly prices rise over time. If your bank FD yields 7% but consumer inflation averages 6%, your real return is roughly 1% — before taxes. That is not wealth creation; it is barely preserving purchasing power.",
      "Equity and property historically outpaced inflation over multi-decade windows, but neither offers smooth yearly progress. Debt instruments shine for stability, not for beating inflation after tax — use them for short horizons and liquidity, not multi-decade growth.",
      "CPI baskets differ from your personal inflation: education, healthcare, and rent in metros often rise faster than headline numbers. When planning college fees or elder care, model conservative step-ups, not government averages alone.",
      "Indexing your mental accounts helps: track net worth in “years of expenses saved,” not only rupee crores. That metric adjusts automatically when your lifestyle cost changes.",
      "Fight inflation with growing skills that lift earned income, diversified investments matched to timelines, and ruthless avoidance of high-interest debt that compounds against you faster than any FD can grow.",
    ],
  },
  {
    id: "section-80c-limits-and-beyond",
    title: "Section 80C limits and beyond",
    subtitle: "The ₹1.5 lakh box fills quickly — map alternate sections early in the year.",
    category: "Tax",
    readTime: 5,
    content: [
      "Section 80C bundles life insurance premiums (with caps tied to sum assured), ELSS, PPF, principal repayment on home loans, tuition fees, and a few other instruments under a consolidated annual limit. Once you hit the ceiling, additional ELSS or insurance premium does not earn extra deduction.",
      "Section 80D covers health insurance for self, family, and parents with age-based sub-limits. Missing 80D while maxing ELSS is a common mismatch — medical inflation makes this deduction both financial and emotional insurance.",
      "NPS offers an additional employer contribution benefit for salaried taxpayers under specific sections, and individuals can claim extra contributions subject to caps that differ for central-government schemes versus voluntary tiers. Verify the exact subsection each April after the Finance Act passes.",
      "Donations under 80G, EV loan interest under 80EEB (when applicable), and education loan interest under 80E each have narrow eligibility. Build a one-page cheat sheet of sections you genuinely qualify for instead of discovering them in March.",
      "If alternate minimum tax regimes apply to you, some deductions behave differently or not at all — another reason to model final tax payable instead of chasing every headline break.",
    ],
  },
  {
    id: "what-is-health-insurance-floater",
    title: "What is health insurance floater?",
    subtitle: "One shared sum insured can cover the whole family — understand the trade-offs.",
    category: "Insurance",
    readTime: 4,
    content: [
      "A family floater policy insures multiple members under one sum insured. Anyone can claim up to the full amount until exhausted for the policy year. Premiums are usually lower than separate individual policies with the same total cover.",
      "The risk is correlation: if two members need hospitalization in the same year, the shared pool may fall short while an individual policy would still retain its own limit. Larger floaters (₹10–25 lakh) reduce this anxiety in metros where bills escalate quickly.",
      "Room-rent sub-limits and co-payments can silently cap claims. Read the fine print on modern treatments, consumables, and maternity if relevant — marketing brochures highlight sum insured; exclusions hide in PDFs.",
      "Senior parents may need dedicated senior policies rather than piggybacking on your floater — age morbidity drives premiums and renewal risk. Splitting coverage can feel expensive but prevents one parent’s claims from wiping the children’s buffer.",
      "Review sum insured every few salary increments. A policy bought when you were 25 may be irrelevant by 38 after marriage, kids, or moving cities.",
    ],
  },
  {
    id: "fixed-vs-floating-home-loan",
    title: "Fixed vs floating home loan",
    subtitle: "Rate certainty has a hidden price — benchmark regimes changed after 2019.",
    category: "Loans",
    readTime: 5,
    content: [
      "Floating-rate loans move with external benchmarks like repo-linked lending rates. Your EMI or tenure adjusts when the RBI shifts policy rates. In falling-rate cycles, you benefit automatically; in hiking cycles, EMIs rise unless the lender extends tenure (within limits).",
      "Fixed-rate loans promise stable EMIs initially but often reset after a teaser period or carry higher starting rates to compensate the bank for interest-rate risk. Read whether “fixed” truly means life-of-loan or only a few years.",
      "Prepayment penalties mostly disappeared for floating retail loans but may still apply on some fixed products. If you expect bonuses that will kill the loan early, floating with easy partial prepayment is usually friendlier.",
      "Switching lenders via balance transfer can make sense when spreads widen, but factor legal fees, insurance bundling, and processing friction — spreadsheet the break-even months of EMI saved.",
      "Maintain an emergency EMI buffer regardless of rate type; rates fell for years and then snapped upward — both directions test household cash flow.",
    ],
  },
  {
    id: "rera-basics-for-homebuyers",
    title: "RERA basics for homebuyers",
    subtitle: "State regulators enforce disclosures, escrow norms, and penalty frameworks.",
    category: "Property",
    readTime: 5,
    content: [
      "The Real Estate (Regulation and Development) Act created state-level authorities to register projects, mandate escrow usage for collected amounts, and compel developers to publish timelines and specifications. Buying unregistered inventory where registration was mandatory is an avoidable risk.",
      "Check the RERA certificate, developer litigation history, and delay clauses in the agreement for sale before token money leaves your account. Marketing brochures are not enforceable; the agreement text is.",
      "Possession delays still happen, but buyers have structured complaint paths — document every promised date email and join resident welfare groups early to align legal strategy.",
      "Under-construction purchases should align funding with construction-linked plans; avoid aggressively investing booking amounts in volatile assets if drawdowns coincide with developer demands.",
      "Resale properties involve different paperwork — occupancy certificates, society NOCs, and title insurance (where available) still matter beyond RERA registrations.",
    ],
  },
  {
    id: "what-is-asset-allocation",
    title: "What is asset allocation?",
    subtitle: "How you split equity, debt, and cash matters more than picking one hot fund.",
    category: "Investment",
    readTime: 5,
    content: [
      "Asset allocation is the strategic mix of growth assets (equity, real estate), stability assets (bonds, FDs), and liquidity (cash). It determines most portfolio volatility — stock selection is secondary for most retail investors.",
      "Young investors with decade-long horizons can accept higher equity weights because drawdowns have time to recover. Near-term goals — school fee in three years — belong in debt even if equity headlines are euphoric.",
      "Rebalancing yearly or when any sleeve drifts more than ~5 percentage points sells high and buys low mechanically, without needing market forecasts.",
      "Tax locations matter: use PPF/EPF for fixed-income sleeves when rules fit, equity funds in taxable accounts if holding periods align with capital gains norms relevant to you.",
      "Behavior trumps models: pick an allocation you will hold through one full market cycle without abandoning the plan.",
    ],
  },
  {
    id: "credit-card-minimum-trap",
    title: "The credit card minimum-payment trap",
    subtitle: "Revolving balances turn small purchases into multi-year loans.",
    category: "Basics",
    readTime: 4,
    content: [
      "Paying only the minimum due on a credit card keeps your account current but leaves the bulk compounding at high monthly rates. A dinner out can cost multiples of menu price if it rolls for months.",
      "If you cannot clear the statement in full, treat the card like a toxic loan: pause discretionary spending, move the balance via a cheaper personal loan only if the math works after fees, or negotiate structured repayment.",
      "AUTOPAY for the full statement, not minimum, prevents accidental revolve if cash flow is usually healthy but memory fails.",
      "Multiple cards do not diversify risk — they multiply temptation. Fewer cards with higher rewards quality beat a wallet of average limits you forget to track.",
      "Credit scores recover after defaults, but slowly. Prevention beats repair: spend on cards only what your salary account can clear on due date.",
    ],
  },
  {
    id: "nps-vs-epf-for-retirement",
    title: "NPS vs EPF for retirement",
    subtitle: "Both are long-horizon wrappers with different liquidity and equity exposure rules.",
    category: "Tax",
    readTime: 5,
    content: [
      "Employees’ Provident Fund (EPF) for organized-sector employees is a mandatory, employer-matched, debt-heavy vehicle with tax-exempt interest within statutory limits and maturity treatment tied to employment continuity rules.",
      "The National Pension System (NPS) adds optional equity exposure via lifecycle funds and offers additional deduction windows beyond vanilla 80C for voluntary contributions — but partial liquidity is locked until retirement age thresholds with taxable lump-sum withdrawal norms that evolve.",
      "Choosing extra NPS on top of EPF makes sense when you want market-linked upside and can tolerate lock-in until age 60 (or scheme-specific rules). Skipping voluntary NPS because “EPF is enough” may underweight equity for aggressive savers.",
      "Employer NPS contributions sometimes enjoy exemption caps apart from your own 80C investments — verify Form 16 breakdowns instead of guessing.",
      "Neither replaces an emergency fund; both are slow-moving retirement sleeves, not substitutes for cash buffers or short-goal debt funds.",
    ],
  },
  {
    id: "gold-as-investment-myths",
    title: "Gold as investment — myths to shed",
    subtitle: "Jewellery is consumption; ETFs and SGBs are closer to allocation tools.",
    category: "Investment",
    readTime: 5,
    content: [
      "Physical gold ornaments carry making charges, storage risk, and buy/sell spreads — beautiful to wear, expensive to trade as an investment. Sovereign Gold Bonds and gold ETFs track prices more cleanly for portfolio allocation.",
      "Gold is a diversifier and crisis hedge in many portfolios, not a high real-return engine over decades compared with productive equity. Expect sideways volatility with periodic spikes when real rates fall globally.",
      "SGBs add a small coupon and tax treatment differs from physical sales — read holding-period rules before choosing between ETFs, funds, or bonds.",
      "Over-allocating because “India loves gold culturally” crowds out equities needed for child education or retirement sized to inflation.",
      "Rebalance gold like any sleeve: if it doubles from 5% to 12% of net worth after a crisis rally, trim back to policy weights instead of chasing sentiment headlines.",
    ],
  },
  {
    id: "prepayment-vs-tenure-reduction-home-loan",
    title: "Prepayment vs tenure reduction on home loans",
    subtitle: "Both save interest — the better hinge is cash-flow comfort.",
    category: "Loans",
    readTime: 4,
    content: [
      "Partial prepayment immediately cuts principal, reducing total interest.Either EMI drops or tenure shortens depending on what your lender allows you to choose under the loan agreement.",
      "Keeping EMI constant and reducing tenure maximizes interest savings and speeds freedom from debt. Dropping EMI improves monthly breathing room but leaves more interest paid over time.",
      "Before aggressive prepayment, ensure retirement savings and emergency funds are on track — zero debt with zero investments is not nirvana if retrenchment hits.",
      "Some tax benefits diminish as interest portion shrinks; model post-prepayment projections if old-regime deductions matter to you.",
      "Floating-rate loans usually avoid prepayment penalties; fixed loans may differ — confirm with your lender annually.",
    ],
  },
  {
    id: "capital-gains-when-you-sell-property",
    title: "Capital gains when you sell property",
    subtitle: "Holding period, improvements, and exemptions decide the final bill.",
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
    subtitle: "Holding clocks start on dates that changed across Finance Acts — track your grandfathering.",
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
    subtitle: "Cheaper than personal loans if discipline exists — disastrous if treated as pocket money.",
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
    subtitle: "Out-patient benefits are tempting but watch sub-limits and utilization friction.",
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
    subtitle: "Near-cash sleeves for treasuries — not replacements for multi-year goals.",
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
    title: "Form 16 — what to verify before filing ITR",
    subtitle: "Employer summaries still go wrong — cross-check with salary slips.",
    category: "Tax",
    readTime: 4,
    content: [
      "Part A lists employer TAN and tax deposited; Part B maps allowances, perquisites, deductions, and taxable income computed by payroll. Banks use Part A for loan proofs; the ITR uses reconciled totals.",
      "HRA exemption mistakes happen when rent receipts were not submitted on time or metro classifications differ. Section 80C often shows PF but misses ELSS proofs if declarations closed early.",
      "Bonuses paid in March sometimes land in the wrong financial year column if ERP configs lag — match bank credit dates.",
      "Two Form 16s appear if you switched jobs; merge incomes carefully to avoid under-reporting or double-claiming deductions both employers gave.",
      "Download AIS/ Form 26AS early — interest from co-operative banks or minor SB interest omissions show up there even if Form 16 stayed silent.",
    ],
  },
  {
    id: "rent-agreement-registration-basics",
    title: "Rent agreement registration basics",
    subtitle: "Stamp duty and term clauses differ by state — HRA claims need consistency.",
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
export const learnArticleById: Record<string, LearnArticle> = Object.fromEntries(
  learnArticles.map((a) => [a.id, a]),
);

export const learnCategories: LearnCategory[] = [
  "Basics",
  "Tax",
  "Investment",
  "Insurance",
  "Loans",
  "Property",
];
