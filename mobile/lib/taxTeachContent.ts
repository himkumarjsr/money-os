export type TaxTeachContent = {
  what: string;
  who: string;
  limit?: string;
  example: string;
  proTip: string;
};

function t(partial: TaxTeachContent): TaxTeachContent {
  return partial;
}

/** Tooltip copy for tax regime calculator — educational only. */
export const TEACH = {
  sections: {
    profile: t({
      what: "Who you are affects age-based slabs (senior / super senior), 80D caps, and which hints we show.",
      who: "Anyone resident or non-resident can explore inputs; NRI rules are not fully modelled.",
      limit: "Age 60–79: senior citizen slabs; 80+: super senior.",
      example:
        "A 62-year-old pensioner uses senior slabs and may prefer 80TTB over 80TTA.",
      proTip:
        "Reconcile date of birth with PAN — employer payroll slabs depend on it.",
    }),
    income: t({
      what: "Money you earn or realise in the year, before exemptions specific to each allowance.",
      who: "Salaried, business, freelancers, retirees — enter every bucket that applies.",
      limit:
        "No universal cap on gross income; specific incomes have their own tax treatments.",
      example:
        "Salary ₹12L + freelance ₹3L → ₹15L ordinary slab base before deductions.",
      proTip:
        "Keep AIS / Form 26AS handy — banks often report interest employers miss.",
    }),
    rentHra: t({
      what: "Rent-related breaks: HRA exemption when employer pays HRA; 80GG when you pay rent but get no HRA.",
      who: "Salaried tenants with HRA; salaried/professionals without HRA paying rent for residence.",
      limit:
        "HRA is least of three tests; 80GG here uses illustrative rent − 10% income, 25% income, ₹60k cap.",
      example:
        "Metro HRA ₹2.4L, rent ₹2.4L, salary ₹12L → exempt slice often driven by rent minus 10% of salary.",
      proTip:
        "Landlord PAN thresholds apply above rent limits — keep receipts aligned with bank transfers.",
    }),
    rsuLeaveGratuity: t({
      what: "RSU vesting is typically taxed as salary when shares settle; selling later triggers capital gains with different clocks.",
      who: "Employees with equity compensation and retirees receiving statutory payouts.",
      limit:
        "Perquisite values come from employer FMV; CG limits follow securities laws.",
      example:
        "₹4L vest in salary; ₹1L STCG when trimming holdings within one year of listing.",
      proTip:
        "Download vesting statements + trade logs — payroll often understates complexity.",
    }),
    deductions: t({
      what: "Chapter VI-A and specific deductions that mainly reduce taxable income under the old regime.",
      who: "Residents claiming deductions under law — eligibility differs per section.",
      limit:
        "Each section has its own ceiling (e.g. 80C ₹1.5L combined basket).",
      example: "₹1.5L ELSS + ₹50k NPS 80CCD(1B) uses two different caps.",
      proTip:
        "New regime in this tool uses only ₹75k standard deduction — compare side by side here.",
    }),
  },

  income: {
    basicMonthly: t({
      what: "Fixed contractual pay before variable allowances — often the base for HRA % tests.",
      who: "Salaried employees with a Basic component on payslip.",
      limit: "No separate income-tax ‘limit’ on Basic itself.",
      example:
        "Basic ₹70,000/month → ₹8.4L/year before other monthly components.",
      proTip:
        "If DA merges into Basic mid-year, update your average for planning.",
    }),
    hraMonthly: t({
      what: "House Rent Allowance credited monthly — taxable unless exempt under HRA rules.",
      who: "Salaried employees whose payslip shows HRA.",
      limit:
        "Exemption is least of three amounts (see HRA section), not automatic.",
      example:
        "HRA ₹20,000/month ×12 with matching rent can yield partial exemption.",
      proTip:
        "Declare provisional rent early with employer to avoid excess TDS.",
    }),
    allowancesMonthly: t({
      what: "Other fixed recurring allowances (special, conveyance where taxable, etc.).",
      who: "Depends on employer structure — only include taxable portions you understand.",
      limit:
        "Some allowances are fully/partially exempt — this tool treats entered amounts as ordinary income unless you exclude them.",
      example: "Special allowance ₹10,000/month taxable adds ₹1.2L to gross.",
      proTip: "Cross-check ‘earnings’ vs ‘perquisites’ on Form 16 Part B.",
    }),
    hraBaseAnnual: t({
      what: "Annual figure used for ‘10% of salary’ in HRA exemption — often Basic + DA.",
      who: "Salaried claimants optimising HRA.",
      limit: "Not a deduction cap; it narrows the rent-minus-10% test.",
      example:
        "Basic ₹8.4L + DA ₹1.2L → enter ₹9.6L if DA counts for your employer’s rule.",
      proTip: "Leave at ₹0 to auto-use Basic ×12 from the Basic field.",
    }),
    rsuVesting: t({
      what: "Fair value of shares taxed as salary when RSUs vest per payroll.",
      who: "Employees with ESOP/RSU plans.",
      limit:
        "Taxed as salary in year of vest; perquisite valuation follows employer.",
      example:
        "₹4L vesting value shows up in Form 16 as perquisites — add here as ordinary income.",
      proTip:
        "Sell timing does not undo vesting tax — budget for cash withholding or sell-to-cover.",
    }),
    rsuSaleStcg: t({
      what: "Short-term capital gains when RSUs sold within holding period for listed equity.",
      who: "Employees selling vested shares within STCG window.",
      limit:
        "This tool uses a flat 15% illustrative rate on gains — verify grandfathering / surcharge.",
      example:
        "Gain ₹1L STCG → model ₹15k tax before cess add-ons at slab merge.",
      proTip:
        "Broker ledger downloads beat remembered averages — reconcile FIFO lots.",
    }),
    rsuSaleLtcg: t({
      what: "Long-term capital gains on listed equity RSU sales — simplified ₹1L exemption then 10% on balance.",
      who: "Holders past applicable holding period for equity.",
      limit: "Illustrative: LTCG tax ≈ 10% × max(0, gain − ₹1,00,000).",
      example: "Gain ₹3L → taxable ₹2L → ₹20k base tax illustration.",
      proTip:
        "International plans may have US/other withholding — adjust net cash.",
    }),
    leaveEncashmentTaxable: t({
      what: "Cash received for unused leave that is taxable in your hands after statutory exemptions.",
      who: "Employees receiving leave encashment on exit or during service per policy.",
      limit:
        "Exemptions depend on government vs non-government rules — enter only taxable part here.",
      example: "Total ₹8L, exempt ₹3L → enter ₹5L taxable.",
      proTip:
        "Employer proof of exemption calculation prevents mismatch with CPC notices.",
    }),
    leaveEncashmentExempt: t({
      what: "Portion of leave encashment qualifying as exempt under notified limits.",
      who: "Eligible employees per Income-tax sections applicable to your employer type.",
      limit: "Varies by case — not auto-calculated here.",
      example: "₹3L exempt slice documented by HR.",
      proTip: "Keep calculation worksheet — auditors ask often.",
    }),
    gratuityTaxable: t({
      what: "Gratuity amount taxed after statutory exemption for eligible employees.",
      who: "Employees covered by Payment of Gratuity Act or exempt schemes.",
      limit:
        "Exemption caps apply — enter taxable remainder only in taxable field.",
      example: "Received ₹15L, exempt ₹10L → ₹5L taxable.",
      proTip:
        "Retirement timing vs completion of five years matters — verify HR letter.",
    }),
    gratuityExempt: t({
      what: "Exempt gratuity component approved under law for your category.",
      who: "Eligible employees receiving gratuity.",
      limit: "Subject to salary/service formulae — not recomputed in-tool.",
      example: "₹10L exempt portion per Form 16.",
      proTip: "Coordinate with 89 relief if spikes income across slabs.",
    }),
    ltaTaxable: t({
      what: "Cash allowances or unclaimed LTA converted to taxable salary.",
      who: "Employees where LTA is paid-out or unutilised per policy.",
      limit: "Exempt LTA requires actual travel proofs under rules.",
      example: "₹50k paid without proofs → often taxable — enter here.",
      proTip: "Submit boarding passes / tickets within employer timelines.",
    }),
    ltaExempt: t({
      what: "Leave Travel Concession exempt under Section 10(5) when conditions met.",
      who: "Salaried employees claiming LTA for domestic travel per employer policy.",
      limit: "Twice in block; family definitions restricted.",
      example: "Economy flights for eligible family → exempt component only.",
      proTip: "Block-year calendars confuse everyone — screenshot HR policy.",
    }),
    businessProfit: t({
      what: "Profit from business or profession after expenses under applicable heads.",
      who: "Owners, partners, proprietors filing ITR with business income.",
      limit:
        "Presumptive vs normal schemes differ — this field is your net number.",
      example: "PGBP ₹20L after audited books.",
      proTip: "Advance tax instalments matter — avoid interest under 234C.",
    }),
    freelanceIncome: t({
      what: "Professional fees / freelance receipts net of deductible expenses (simplified).",
      who: "Consultants, creators, gig workers.",
      limit: "Presumptive 44ADA may apply — enter declared taxable profit.",
      example: "₹9L net professional income.",
      proTip: "GST turnover ≠ income tax profit — separate ledgers.",
    }),
    pension: t({
      what: "Regular pension from employer fund / government schemes taxed as salary-like income.",
      who: "Retirees drawing pension.",
      limit:
        "Standard deduction ₹50k (old regime model) may apply to pension style income in practice — consult CA.",
      example: "₹4.8L annual pension.",
      proTip: "Commuted vs uncommuted portions differ — split per Form 16.",
    }),
    familyPension: t({
      what: "Pension received by family nominee — often under ‘income from other sources’ with separate deductions.",
      who: "Spouse/family members drawing pension after employee demise.",
      limit:
        "Deduction under family pension rules exists — not auto-split here; reduce taxable entry manually if advised.",
      example:
        "₹3.6L family pension taxable after ₹15k standard deduction where applicable.",
      proTip: "Ask CA for Section 57(iia) deduction eligibility.",
    }),
    rentalIncome: t({
      what: "Rent received net of municipal taxes standard deduction model.",
      who: "Property owners letting assets.",
      limit: "Old regime can offset loan interest 24(b) subject to conditions.",
      example: "₹7.2L annual rent after municipal tax deduction assumption.",
      proTip: "Vacancy vs deemed let-out rules matter — property lawyers help.",
    }),
    interestIncome: t({
      what: "Interest from FDs, savings, bonds counted here before 80TTA/TTB relief.",
      who: "Anyone earning interest.",
      limit:
        "80TTA / 80TTB caps apply separately on eligible savings interest.",
      example: "₹80k SB+FD interest.",
      proTip: "AIS often shows interest employers didn’t — reconcile early.",
    }),
    dividendIncome: t({
      what: "Dividends taxed in investor hands at applicable rates.",
      who: "Shareholders / MF dividend recipients.",
      limit: "TDS thresholds exist — enter gross taxable dividends.",
      example: "₹60k dividends.",
      proTip:
        "Foreign dividends may need treaty tie-breaker — NRI toggle warns.",
    }),
    agriculturalIncome: t({
      what: "Farm receipts — often exempt or computed separately depending on structure.",
      who: "Farmers / landowners with farm income.",
      limit:
        "Integration rules when agri + non-agri cross thresholds — not modelled.",
      example: "₹2L receipts excluded via toggle for illustration.",
      proTip:
        "Maintain village-wise registers if scale crosses exemption thresholds.",
    }),
    otherStcg: t({
      what: "Short-term capital gains on equity/equity funds besides RSU sales.",
      who: "Active traders / investors within STCG window.",
      limit: "Illustrative flat 15% on gains entered.",
      example: "₹40k STCG on quick MF flip.",
      proTip: "Business vs capital character debates happen — document intent.",
    }),
    otherLtcg: t({
      what: "Long-term gains on listed equity beyond RSU sales.",
      who: "Investors holding beyond STCG period.",
      limit: "Illustrative ₹1L exemption then 10% on balance.",
      example: "₹5L LTCG → ₹40k base tax illustration.",
      proTip:
        "Harvest losses legally against gains before year-end when rules allow.",
    }),
  },

  deductions: {
    eightyCRunning: t({
      what: "Combined ₹1.5L basket: ELSS, PPF, EPF (employee voluntary), LIC, tuition fees, principal repayment, etc.",
      who: "Individuals/HUFs investing/paying eligible items.",
      limit: "₹1,50,000 combined across all 80C instruments.",
      example: "₹60k ELSS + ₹90k EPF employee → ₹1.5L full.",
      proTip:
        "Front-load ELSS in April for longest holding clarity, not last-week March chaos.",
    }),
    eightyCElss: t({
      what: "Equity Linked Saving Scheme mutual funds with three-year lock-in.",
      who: "Residents wanting market-linked 80C.",
      limit: "Counts toward shared ₹1.5L 80C cap.",
      example: "₹60,000 ELSS SIP lumpsum.",
      proTip: "Choose direct growth plans to minimise distributor leak.",
    }),
    eightyCPpf: t({
      what: "Public Provident Fund contributions.",
      who: "Anyone with PPF account.",
      limit:
        "Annual ₹1.5L contribution max to PPF account — plus overall 80C cap.",
      example: "₹1L PPF online transfer.",
      proTip: "Extend blocks consciously — liquidity is deliberately slow.",
    }),
    eightyCLic: t({
      what: "Life insurance premiums for self/spouse/kids subject to sum-assured linked caps.",
      who: "Policyholders with qualifying policies.",
      limit:
        "Premium eligibility capped as % of sum assured for policies post 2012.",
      example: "₹25k premium on eligible term plan.",
      proTip:
        "Investment-cum-insurance premiums steal 80C room — prefer pure term outside basket.",
    }),
    eightyCEpf: t({
      what: "Recognised provident fund employee contributions (voluntary + mandatory within eligibility).",
      who: "Salaried EPF members.",
      limit:
        "VPF/additional employee contribution stacks into 80C until ₹1.5L overall.",
      example: "₹72k employee EPF line from payslip.",
      proTip: "Download PF passbook annually — HR typos happen.",
    }),
    eightyCTuition: t({
      what: "Tuition fees for max two children in recognised Indian institutions.",
      who: "Parents paying school/college tuition.",
      limit: "Inside ₹1.5L 80C basket; excludes donations/transport.",
      example: "₹48k annual school invoice.",
      proTip: "Payment receipts must name parent as payer matching ITR.",
    }),
    eightyCHomePrincipal: t({
      what: "Principal repayment on eligible housing loan inside 80C basket.",
      who: "Homeowners servicing EMI with principal component.",
      limit: "Overall ₹1.5L shared — coordinate with ELSS/EPF.",
      example: "₹1.2L principal from lender certificate.",
      proTip:
        "Prepayment shifts principal schedule — download fresh certificate each FY.",
    }),
    eightyCCD: t({
      what: "Additional NPS Tier-I contribution under subsection (1B) beyond normal ₹1.5L 80C.",
      who: "Subscribers contributing voluntarily.",
      limit: "₹50,000 extra deduction window.",
      example: "₹50k lump-sum NPS before March 31.",
      proTip:
        "Tier-II doesn’t get this unless specifically notified combos — verify receipt.",
    }),
    eightyDSelf: t({
      what: "Health insurance premiums for self, spouse, dependent children.",
      who: "Residents buying eligible policies.",
      limit:
        "Generally ₹25,000; ₹50,000 if taxpayer or spouse is senior (tool caps by taxpayer age).",
      example: "₹18k floater premium.",
      proTip:
        "Multi-year premiums may be allocated across years per rules — ask insurer letter.",
    }),
    eightyDParents: t({
      what: "Health premiums / medical expenditure for parents.",
      who: "Children paying parents’ policies.",
      limit:
        "₹25,000 if parents below 60; ₹50,000 if the oldest parent is 60+ (enter parent age in 80D).",
      example: "Senior parents floater ₹38k.",
      proTip: "Separate receipts naming proposer/payee avoid scrutiny.",
    }),
    eightyDD: t({
      what: "Medical treatment/maintenance for disabled dependent.",
      who: "Taxpayers with prescribed disability dependents.",
      limit: "Flat amounts ₹75k / ₹1.25L depending on severity rules.",
      example:
        "Dependent with severe disability → claim upto ₹1.25L subject to certificate.",
      proTip: "Disability certificate validity dates — renew before filing.",
    }),
    eightyDDB: t({
      what: "Medical treatment for specified diseases for self/dependents.",
      who: "Residents incurring eligible expenses.",
      limit:
        "₹40,000; ₹1,00,000 if senior patient versions apply — tool caps by taxpayer age bands simplified.",
      example: "Cancer treatment ₹2L → capped deduction slice.",
      proTip: "Specialist prescriptions + hospital bills bundle.",
    }),
    eightyE: t({
      what: "Interest on education loan for higher studies.",
      who: "Individual servicing qualifying loan for self/relative per rules.",
      limit: "No upper limit on interest deduction for eligible years.",
      example: "₹72k annual interest certificate from bank.",
      proTip: "Moratorium years still accrue interest — capture lender PDF.",
    }),
    eightyEEA: t({
      what: "Additional interest for affordable housing loans sanctioned in eligible window.",
      who: "First-time buyers meeting stamp duty/value & sanction tests.",
      limit:
        "Up to ₹1,50,000 subject to conditions — don’t double-count same interest as 24(b).",
      example: "₹90k eligible extra interest.",
      proTip:
        "Sanction letter date is eligibility spine — screenshot PDF forever.",
    }),
    eightyG: t({
      what: "Donations to approved funds/institutions.",
      who: "Donors with eligible receipts.",
      limit:
        "50% or 100% of donation depending on fund — enter post-adjustment eligible amount.",
      example: "₹20k to PM relief with 100% eligibility.",
      proTip:
        "Digital receipts with 80G approval number beat handwritten chits.",
    }),
    eightyGG: t({
      what: "Deduction for rent paid when you don’t receive HRA.",
      who: "Individuals without HRA paying rent for job/profession.",
      limit:
        "Least of rent−10% income, 25% income, ₹5,000/month — tool uses illustrative ₹60k annual cap.",
      example: "Rent ₹3L, income ₹10L → computed slice appears automatically.",
      proTip:
        "Form 10BA analogue diligence — maintain landlord PAN cross-check.",
    }),
    eightyTTA: t({
      what: "Deduction for savings account interest for non-seniors.",
      who: "Residents with SB interest.",
      limit: "₹10,000 typical cap.",
      example: "₹7k SB interest → full deduction.",
      proTip: "Seniors should generally use 80TTB instead.",
    }),
    eightyTTB: t({
      what: "Deduction on interest from deposits for senior citizens.",
      who: "Resident seniors earning interest income.",
      limit: "₹50,000 on qualifying interest.",
      example: "₹42k FD interest covered.",
      proTip: "Submit 15H when eligible to avoid TDS cash-flow drag.",
    }),
    eightyU: t({
      what: "Deduction for taxpayer with disability.",
      who: "Individuals with prescribed disability certificate.",
      limit: "₹75,000 / ₹1,25,000 depending on severity.",
      example: "Moderate disability ₹75k deduction.",
      proTip: "Renew certificates aligned with assessment year filing.",
    }),
    eightyRRB: t({
      what: "Deduction for royalty on books for resident authors.",
      who: "Authors receiving royalty income.",
      limit: "Statutory limits apply — tool caps illustratively at ₹3L.",
      example: "₹2L royalty receipts.",
      proTip: "Contracts should separate royalty vs assignment lumps.",
    }),
    twentyFourB: t({
      what: "Interest on housing loan for acquisition/construction.",
      who: "Owners with self-occupied / let-out rules per law.",
      limit:
        "Self-occupied interest deduction historically ₹2L subject to conditions.",
      example: "₹1.8L interest certificate.",
      proTip:
        "Pre-EMI caps tie to completion timelines — lender letters mandatory.",
    }),
    professionalTax: t({
      what: "State professional tax deducted from salary.",
      who: "Employees in states levying PT.",
      limit: "Varies by state; tool caps illustration at ₹5,000/year.",
      example: "₹2,400/year Maharashtra PT.",
      proTip:
        "Salary revision mid-year changes PT bands — annual proof matters.",
    }),
    standardOld: t({
      what: "Flat ₹50,000 standard deduction from salary/pension income component per current norms.",
      who: "Eligible salaried/pensioners — modelled as lump in old regime.",
      limit: "₹50,000",
      example: "Auto-added in old regime breakdown.",
      proTip: "Employers usually bake into Form 16 — reconcile.",
    }),
    standardNew: t({
      what: "New regime standard deduction ₹75,000 in this FY model.",
      who: "Opt-in new regime filers.",
      limit: "₹75,000 illustrative.",
      example: "Applied automatically on new regime column.",
      proTip: "Employer choice vs ITR choice — align declarations quarterly.",
    }),
  },
} as const;
