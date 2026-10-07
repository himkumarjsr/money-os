/** Structured long-form content for selected Learn articles (same URLs as lib/learnContent). */

export type RichBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | {
      kind: "callout";
      tone: "violet" | "emerald" | "amber";
      title?: string;
      text: string;
    }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type RichSection = { id: string; title: string; blocks: RichBlock[] };

export type RichArticle = {
  tags: string[];
  toc: { id: string; label: string }[];
  intro: string[];
  sections: RichSection[];
  /** Optional — if set, shown in purple tip box with link */
  finkoinTip?: string;
  finkoinTipHref?: string;
  related: { id: string; title: string }[];
  seoTitle: string;
  seoDescription: string;
};

const LEARN_RICH_ARTICLES: Record<string, RichArticle> = {
  "how-your-cibil-credit-score-is-calculated": {
    seoTitle: "CIBIL Score: How India’s 300–900 Number Is Calculated",
    seoDescription:
      "CIBIL weights: payment 35%, utilisation 30%, mix 25%, inquiries 10%. Score bands, 90-day fixes, settled-account trap. Educational only.",
    tags: ["CIBIL", "Credit score", "Loans", "India"],
    toc: [
      { id: "why-matters", label: "Why this matters" },
      { id: "four-factors", label: "The four factors (exact weights)" },
      { id: "hidden", label: "What most people don’t know" },
      { id: "ninety-days", label: "How to improve in 90 days" },
      { id: "settled", label: "Biggest mistake: “Settled”" },
    ],
    intro: [
      "India’s CIBIL score is a three-digit number from 300–900. This CIBIL score guide explains how it is usually calculated, what hurts it most, and how to improve it fast — without changing your loan applications blindly.",
    ],
    sections: [
      {
        id: "why-matters",
        title: "Why this matters",
        blocks: [
          {
            kind: "p",
            text: "About 80% of loans approved in India go to people with a score above 750. Below 700, you may get a higher interest rate or face rejection. A 50-point score difference can mean 1–2% higher home loan rate — on a ₹50 lakh loan over 20 years, that can be roughly ₹6–12 lakh extra interest.",
          },
          {
            kind: "callout",
            tone: "violet",
            title: "Rupee impact",
            text: "Treat your CIBIL score like a pricing lever: the same loan can get meaningfully cheaper with a stronger profile.",
          },
        ],
      },
      {
        id: "four-factors",
        title: "The four factors with exact weights",
        blocks: [
          {
            kind: "p",
            text: "Updated from Jan 2025 onward, many credit profiles refresh more frequently than the older “once a month” mental model — check your report after big life changes (new loan, closure, limit change).",
          },
          {
            kind: "ul",
            items: [
              "1) Payment history — 35% weight: The single most important factor. Miss one EMI by 30 days → score can drop ~30–50 points immediately; 90+ days late can drop 100+ points. One missed payment in three years is a smaller blemish than repeated misses. Pro tip: autopay the minimum due, then pay the full bill manually so you never miss the due date.",
              "2) Credit utilisation — 30% weight: How much of your credit limit you use. ₹40,000 of ₹1,00,000 limit = 40%. Ideal: below ~30%. Above ~50% can hurt significantly. Pro tip: ask your bank to increase the credit limit — spending stays the same but utilisation falls.",
              "3) Credit mix and duration — 25% weight: Mix means both secured (home loan, car loan) and unsecured (credit card, personal loan) can help when reported cleanly. Duration means older accounts boost your score — never close your oldest credit card if you can keep it fee-free (even unused).",
              "4) New credit inquiries — 10% weight: Every loan application can create a hard inquiry; each hard inquiry may drop the score ~5–10 points. Five loans in one month is risky. Checking your own score is a soft inquiry — no impact. Pro tip: apply for one loan at a time and space applications (many people use ~6 months as a practical gap).",
            ],
          },
        ],
      },
      {
        id: "hidden",
        title: "What most people don’t know",
        blocks: [
          {
            kind: "p",
            text: "From Dec 2025, RBI’s push for uniform credit reporting formats aims to make disputes and corrections more predictable — treat “reporting errors” as fixable, but always keep proof (NOCs, bank emails, payment receipts).",
          },
          {
            kind: "ul",
            items: [
              "Score ranges and real impact: 300–549 very poor (many applications rejected); 550–649 poor (high rates); 650–699 average (limited options); 700–749 good; 750–799 very good (best rates often start here); 800–900 excellent (room to negotiate).",
              "Things that usually don’t affect score: your income/salary, checking your own score, savings account balance, age/gender, and investments.",
            ],
          },
        ],
      },
      {
        id: "ninety-days",
        title: "How to improve in 90 days",
        blocks: [
          {
            kind: "ul",
            items: [
              "Day 1: Pay all overdue bills immediately.",
              "Day 30: Utilisation improves as you pay dues and reduce revolving balances.",
              "Day 45: Check your CIBIL report for errors (you can access bureau reports periodically; keep PDFs).",
              "Day 60: Dispute inaccuracies with evidence (plan for a ~30-day resolution cycle in many workflows).",
              "Day 90: Your score starts reflecting sustained improvements if new negatives stop.",
            ],
          },
        ],
      },
      {
        id: "settled",
        title: "Biggest mistake: settling instead of closing",
        blocks: [
          {
            kind: "callout",
            tone: "amber",
            title: "“Settled” is a red flag",
            text: "Settling a loan for less than full dues can show as “settled” on your report — often a long-term negative signal versus a clean closure. Prefer paying the full outstanding and getting a clear closure/NOC, even if the bank offers a settlement discount. Settled accounts can remain visible for years (commonly discussed as ~7 years).",
          },
        ],
      },
    ],
    finkoinTip:
      "Check how your credit behaviour connects to your broader financial health score on Finkoin — patterns in dues, loans, and cash buffers show up together.",
    finkoinTipHref: "/analyse",
    related: [
      {
        id: "credit-card-minimum-trap",
        title: "The credit card minimum-payment trap",
      },
      {
        id: "fixed-vs-floating-home-loan",
        title: "Fixed vs floating home loan",
      },
      {
        id: "how-home-loan-tax-benefits-work-80c-24b",
        title: "How home loan tax benefits work (80C, 24B)",
      },
    ],
  },

  "sip-vs-lumpsum-when-to-use-which": {
    seoTitle: "SIP vs Lumpsum: When Each Wins (India Examples)",
    seoDescription:
      "SIP vs lumpsum: India examples, rupee averaging, STP hybrid, bonus windfall rule. Educational only — not investment advice.",
    tags: ["SIP", "Lumpsum", "Mutual funds", "India"],
    toc: [
      { id: "core-diff", label: "The core difference" },
      { id: "sip-wins", label: "When SIP wins" },
      { id: "lumpsum-wins", label: "When lumpsum wins" },
      { id: "hybrid", label: "The hybrid approach" },
      { id: "timing-truth", label: "The truth about timing" },
      { id: "practical-rule", label: "The practical rule" },
    ],
    intro: [
      "SIP vs lumpsum is not a religion — it is a timing and behaviour problem. A SIP invests ₹5,000 every month automatically; a lumpsum invests ₹60,000 at once. Same money can produce very different paths depending on when you invest and how you react to volatility.",
    ],
    sections: [
      {
        id: "core-diff",
        title: "The core difference",
        blocks: [
          {
            kind: "p",
            text: "SIP: ₹5,000 every month automatically. Lumpsum: ₹60,000 all at once. Same annual cash, very different average entry prices depending on market path.",
          },
        ],
      },
      {
        id: "sip-wins",
        title: "When SIP wins",
        blocks: [
          {
            kind: "ul",
            items: [
              "Markets are at/near all-time highs and you fear buying the top.",
              "You don’t know where markets go next (most of the time, nobody does).",
              "You earn monthly salary and want discipline.",
              "You are a newer investor learning emotional tolerance.",
            ],
          },
          {
            kind: "p",
            text: "Example (illustrative): Jan 2022 — Sensex near ~61,000 (a cycle high). A ₹5 lakh lumpsum bought high; by mid-2022 many portfolios were down ~15%. A ₹20,000/month SIP bought cheaper units through mid/late-2022 and many disciplined SIPs recovered sooner than a single high entry.",
          },
          {
            kind: "callout",
            tone: "emerald",
            title: "Rupee cost averaging",
            text: "At ₹100, ₹5,000 buys 50 units. At ₹80, the same ₹5,000 buys 62.5 units. When prices recover, you own more units because SIP automatically buys more when prices fall.",
          },
        ],
      },
      {
        id: "lumpsum-wins",
        title: "When lumpsum wins",
        blocks: [
          {
            kind: "ul",
            items: [
              "Markets have just fallen sharply (e.g., a 30–40% crash) and you have a long horizon.",
              "You received a windfall (bonus, inheritance, maturity) and won’t panic-sell.",
              "You have 10+ years and genuinely high risk tolerance.",
            ],
          },
          {
            kind: "p",
            text: "Example (illustrative): March 2020 (COVID crash) — Nifty near ~7,500. ₹5 lakh lumpsum invested early in the rebound path could grow materially by 2024; a ₹20,000/month SIP from the same start may still trail a perfect early lumpsum because the deepest units were cheapest — lumpsum “won” because crash timing was the entry point.",
          },
        ],
      },
      {
        id: "hybrid",
        title: "The hybrid approach",
        blocks: [
          {
            kind: "p",
            text: "For large amounts, many advisors suggest parking money in a liquid fund first, then auto-transfer (STP) to equity monthly. You get partial averaging + less timing stress.",
          },
        ],
      },
      {
        id: "timing-truth",
        title: "The truth about timing",
        blocks: [
          {
            kind: "p",
            text: "Nobody consistently predicts tops — not fund managers, not analysts, not media. Over 20 years, SIP wins in many stress scenarios; lumpsum at a random start also tends to work because time-in-market helps. The worst decision is perpetual waiting in cash.",
          },
        ],
      },
      {
        id: "practical-rule",
        title: "The practical rule",
        blocks: [
          {
            kind: "ul",
            items: [
              "Regular monthly income → default to SIP.",
              "Bonus/inheritance: if markets are up ~20%+ vs last year, lean SIP/STP; if down ~20%+, lumpsum can be rational; if unsure, 50% now + 50% STP over ~6 months.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "Model goals and volatility tolerance in Finkoin — your plan reads better when SIP amounts match real monthly cash, not ideal spreadsheets.",
    finkoinTipHref: "/goals",
    related: [
      { id: "what-is-asset-allocation", title: "What is asset allocation?" },
      {
        id: "understanding-inflation-and-your-real-returns",
        title: "Understanding inflation and your real returns",
      },
      {
        id: "liquid-and-overnight-mutual-funds",
        title: "Liquid and overnight mutual funds",
      },
    ],
  },

  "how-home-loan-tax-benefits-work-80c-24b": {
    seoTitle: "Home Loan Tax Benefits: 80C Principal + 24B Interest",
    seoDescription:
      "Home loan EMI: 80C principal vs 24B interest, joint-loan tips, possession/under-construction traps. Educational only.",
    tags: ["Home loan", "Section 80C", "Section 24B", "Tax"],
    toc: [
      { id: "two-buckets", label: "The two buckets" },
      { id: "sec-80c", label: "Section 80C (principal)" },
      { id: "sec-24b", label: "Section 24B (interest)" },
      { id: "joint", label: "The joint-loan strategy" },
      { id: "uc-trap", label: "Under-construction trap" },
      { id: "regime", label: "Old vs new regime decision" },
    ],
    intro: [
      "Home loan tax benefits split into two ideas: principal repayment (often claimed under Section 80C within the shared ₹1.5 lakh bouquet) and interest (Section 24(b), commonly called 24B in conversation). This guide uses a simple EMI example, then the limits and traps Indians miss.",
    ],
    sections: [
      {
        id: "two-buckets",
        title: "The two buckets",
        blocks: [
          {
            kind: "p",
            text: "Every EMI has two parts: principal (80C bucket, subject to caps/conditions) and interest (24B bucket). Example: month 1 of a ₹50 lakh loan at ~8.5% — EMI about ₹43,391; interest component about ₹35,417; principal component about ₹7,974 (your amortisation schedule is the source of truth).",
          },
        ],
      },
      {
        id: "sec-80c",
        title: "Section 80C (principal)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Limit: ₹1,50,000/year shared with all 80C items (ELSS, PPF, EPF, tuition fees, etc.).",
              "Typically meaningful under the old tax regime; the new regime generally removes these deductions — compare regimes with real numbers.",
              "Benefit timing often ties to possession for eligible housing conditions; under-construction periods may not give principal benefit yet (verify your year’s rules + lender certificate).",
              "If you sell within 5 years of possession, many 80C principal benefits on that property can be reversed/clawed back — treat this as a real penalty risk.",
            ],
          },
        ],
      },
      {
        id: "sec-24b",
        title: "Section 24B (interest)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Self-occupied: interest deduction is commonly capped at ₹2,00,000/year (verify current law for your filing year).",
              "Under-construction: pre-EMI/ construction-period interest is often claimed in five equal instalments after possession (not before).",
              "Let-out property: interest deduction rules differ; loss set-off against other income has limits — model carefully with a CA if you rely on this.",
              "Joint loan + co-owners: each eligible co-owner may claim benefits within limits if ownership/loan servicing aligns with documentation.",
            ],
          },
        ],
      },
      {
        id: "joint",
        title: "The joint-loan strategy",
        blocks: [
          {
            kind: "callout",
            tone: "violet",
            title: "Illustrative savings math",
            text: "If both spouses are co-owners and both service the loan, many families can claim ₹2L + ₹2L interest (24B) and ₹1.5L + ₹1.5L principal (80C) within eligibility — that is up to ₹7L of deductions before other sections, which can be large tax saving at the 30% slab (illustratively ~₹2.1L/year). Always match sale deed + loan agreement + payments.",
          },
        ],
      },
      {
        id: "uc-trap",
        title: "Under-construction trap",
        blocks: [
          {
            kind: "p",
            text: "If you buy under-construction, you may pay EMI but get limited/no benefits until possession timelines are met — long delays can mean years of “paying EMI without deductions you expected.” Pre-construction interest is usually spread after possession, not claimed casually before that.",
          },
        ],
      },
      {
        id: "regime",
        title: "Old vs new regime decision",
        blocks: [
          {
            kind: "p",
            text: "Home loan + 80C + HRA together often makes the old regime attractive for buyers — but not always. Calculate both regimes with your exact income, rent, and loan certificate numbers (use Finkoin’s tax calculator for a quick regime comparison).",
          },
        ],
      },
    ],
    finkoinTip:
      "Use Finkoin’s tax calculator to compare old vs new regime with your salary, rent, and home loan numbers side by side.",
    finkoinTipHref: "/calculators/tax-regime-2026",
    related: [
      {
        id: "fixed-vs-floating-home-loan",
        title: "Fixed vs floating home loan",
      },
      {
        id: "section-80c-limits-and-beyond",
        title: "Section 80C limits — and beyond",
      },
      {
        id: "prepayment-vs-tenure-reduction-home-loan",
        title: "Prepayment vs tenure reduction",
      },
    ],
  },

  "what-is-the-50-30-20-budgeting-rule": {
    seoTitle: "Why 50/30/20 Struggles in India — Finkoin 40/20/10/30",
    seoDescription:
      "India inflation ~5–6%, RBI target ~4%, real wage pressure, and why Finkoin uses 40-20-10-30: needs, invest, protect, wants. Educational only.",
    tags: ["Budgeting", "Inflation", "India", "Finkoin framework"],
    toc: [
      { id: "problem-503020", label: "The problem with 50-30-20" },
      { id: "wants-danger", label: "Why 30% wants is risky in India" },
      { id: "framework", label: "Finkoin’s 40-20-10-30 framework" },
      { id: "inflation", label: "How this fights inflation" },
      { id: "personalise", label: "Personalising the framework" },
      { id: "why-finkoin", label: "Why Finkoin uses this" },
    ],
    intro: [
      "The popular 50-30-20 budgeting rule was popularised from a US context (often associated with Elizabeth Warren’s 2006 book era) where inflation was typically lower and safety nets were stronger. India’s cashflow reality is different: headline CPI can print low in some months, but your lifestyle basket often behaves like higher inflation — and your safety net is mostly self-funded.",
    ],
    sections: [
      {
        id: "problem-503020",
        title: "The problem with 50-30-20",
        blocks: [
          {
            kind: "ul",
            items: [
              "50% needs, 30% wants, 20% savings — simple, memorable, and wrong for many Indian metros if copied blindly.",
              "India’s historical CPI average is often discussed around ~5–6%/year; RBI’s inflation target is 4% with a tolerance band commonly cited as 2–6%.",
              "Average Indian salary hikes are often ~8–10%/year, but real salary growth after inflation is often only ~3–4%/year — easy to overspend on wants and miss compounding.",
              "Agricultural real wages grew only ~1%/year from 2014–2024 even though nominal wages grew ~6%/year (World Bank-style narrative) — a reminder that “nominal growth” can hide weak purchasing power gains.",
            ],
          },
        ],
      },
      {
        id: "wants-danger",
        title: "Why 30% wants is dangerous in India",
        blocks: [
          {
            kind: "p",
            text: "The US template assumes stronger retirement healthcare scaffolding; in India, one medical event can wipe savings if insurance is thin. Unemployment buffers are also mostly self-built. Spending 30% on wants is often borrowing from a future self who has fewer public cushions.",
          },
        ],
      },
      {
        id: "framework",
        title: "Finkoin’s 40-20-10-30 framework",
        blocks: [
          {
            kind: "ul",
            items: [
              "40% — Needs: rent/EMI, groceries, utilities/transport/mobile, basic healthcare/medicine, school fees.",
              "20% — Investments: MF SIPs, PPF/NPS (where suitable), EPF (often auto), goal SIPs. Why before wants? Starting ₹10,000/month at ~12% at age 25 vs 30 can differ by crores by age 60 — time is leverage.",
              "10% — Security: term plan, health insurance, emergency fund top-up until ~6 months of expenses, vehicle insurance renewals.",
              "30% — Wants: dining, OTT, shopping/gadgets, vacations — what is left after needs, investing, and protection.",
            ],
          },
        ],
      },
      {
        id: "inflation",
        title: "How this protects you from inflation",
        blocks: [
          {
            kind: "p",
            text: "Much of India’s inflation pain shows up in food and services — the “needs” bucket. Capping needs at ~40% forces trade-offs early. Long-term investments aim to beat inflation over decades; the security bucket prevents one shock from undoing compounding.",
          },
        ],
      },
      {
        id: "personalise",
        title: "Personalising the framework",
        blocks: [
          {
            kind: "table",
            headers: ["Life stage", "Needs", "Security", "Invest", "Wants"],
            rows: [
              [
                "Early career (₹25–40k) — short-term OK",
                "~50%",
                "~10%",
                "~15%",
                "~25%",
              ],
              [
                "Mid career (₹80k–2L) — push invest first",
                "~40%",
                "~10%",
                "~20–25%",
                "~25–30%",
              ],
              [
                "High income (₹2L+) — avoid lifestyle first",
                "~30%",
                "~10%",
                "~30–35%",
                "~25–30%",
              ],
            ],
          },
          {
            kind: "p",
            text: "Key rule: as income rises, increase investments percentage first — not wants percentage.",
          },
        ],
      },
      {
        id: "why-finkoin",
        title: "Why Finkoin uses this",
        blocks: [
          {
            kind: "p",
            text: "Finkoin’s financial health check is built around bucket thinking similar to 40-20-10-30: overspending on wants shows up quickly, and your score improves as investing moves toward healthy targets.",
          },
        ],
      },
    ],
    finkoinTip:
      "Finkoin analyses your 40-20-10-30-style allocation and highlights which bucket needs attention after your profile + spends snapshot.",
    finkoinTipHref: "/analyse",
    related: [
      {
        id: "understanding-inflation-and-your-real-returns",
        title: "Understanding inflation and your real returns",
      },
      {
        id: "emergency-fund-how-much-where-to-keep-it",
        title: "Emergency fund — how much, where to keep it",
      },
      {
        id: "credit-card-minimum-trap",
        title: "The credit card minimum-payment trap",
      },
    ],
  },

  "ppf-vs-elss-which-is-better-for-tax-saving": {
    seoTitle: "PPF vs ELSS for 80C: Lock-in, Risk, Honest Returns Math",
    seoDescription:
      "PPF vs ELSS under ₹1.5L 80C: rates, lock-ins, EEE vs market gains + LTCG, who should pick which, and why ELSS needs 7–10 years. Educational only.",
    tags: ["PPF", "ELSS", "80C", "Tax saving"],
    toc: [
      { id: "basics", label: "The basics" },
      { id: "ppf", label: "PPF" },
      { id: "elss", label: "ELSS" },
      { id: "compare", label: "Honest comparison" },
      { id: "who", label: "Who should choose what" },
      { id: "hidden-elss", label: "Hidden truth about ELSS" },
      { id: "finkoin-rec", label: "What Finkoin recommends" },
    ],
    intro: [
      "PPF vs ELSS is the common Section 80C debate: both can count toward the same ₹1,50,000/year basket, but one is government-backed debt and the other is equity with a short lock-in and market risk. Here is the honest answer — not what a bank’s sales target wants you to hear.",
    ],
    sections: [
      {
        id: "basics",
        title: "The basics",
        blocks: [
          {
            kind: "p",
            text: "Both can qualify for Section 80C deduction. The 80C ceiling is ₹1,50,000/year shared across PF/ELSS/PPF/LIC premium/principal/tuition/etc.",
          },
        ],
      },
      {
        id: "ppf",
        title: "PPF (Public Provident Fund)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Interest: government-notified (often discussed around ~7.1% in recent years; reviewed quarterly).",
              "Lock-in: 15-year product with partial withdrawals after year 7 under rules.",
              "Tax: commonly described as EEE within statutory limits (investment exempt subject to caps, accrual exempt, maturity exempt within rules).",
              "Risk: credit risk is effectively government-backed; not market NAV volatility like equity.",
              "Maximum: ₹1,50,000/year contribution cap.",
            ],
          },
        ],
      },
      {
        id: "elss",
        title: "ELSS (Equity Linked Saving Scheme)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Expected returns: not guaranteed; long-run equity CAGR is often quoted ~12–15% in educational articles — verify with rolling returns, not marketing.",
              "Lock-in: 3 years minimum per instalment (shortest among common 80C options).",
              "Tax: 80C on investment; gains taxed under equity capital gains rules applicable in your filing year (e.g., LTCG above exemption thresholds).",
              "Risk: can be negative in any 3-year window.",
            ],
          },
        ],
      },
      {
        id: "compare",
        title: "The honest comparison",
        blocks: [
          {
            kind: "p",
            text: "Illustrative ₹1.5L/year for 15 years: PPF at ~7.1% might land near ~₹40.7L tax-free (math depends on exact rate path). ELSS at ~12% average might land near ~₹74.9L before tax — tax on large gains can be meaningful (illustratively ~₹5–7L depending on exemptions and redemption timing), leaving a higher net for many scenarios but with volatility risk.",
          },
          {
            kind: "callout",
            tone: "amber",
            title: "No free lunch",
            text: "ELSS can win on median long horizons but can look terrible in bad windows. PPF won’t give equity upside but also won’t show equity drawdowns.",
          },
        ],
      },
      {
        id: "who",
        title: "Who should choose what",
        blocks: [
          {
            kind: "ul",
            items: [
              "Choose PPF if: age 50+, very risk-averse, already heavy equity elsewhere, need predictable sleeve, or you want a government-backed anchor.",
              "Choose ELSS if: below ~45, 5+ year horizon, can tolerate crashes, want wealth-building not just “tax saving”.",
              "Choose both if: high income filling full ₹1.5L — common splits like 50:50 or 70:30 ELSS:PPF depending on risk appetite.",
            ],
          },
        ],
      },
      {
        id: "hidden-elss",
        title: "The hidden truth about ELSS",
        blocks: [
          {
            kind: "p",
            text: "Three years is only the lock-in minimum — many advisors treat ELSS as a 7–10 year sleeve. Redeeming right after lock-in “because tax saving is done” is a common mistake; redeem when your goal needs it.",
          },
        ],
      },
      {
        id: "finkoin-rec",
        title: "What Finkoin recommends (educational framing)",
        blocks: [
          {
            kind: "p",
            text: "If you are conservative, fill PPF first for stability, then add ELSS for growth with money you won’t need soon. Avoid mixing insurance investment products into 80C unless you have audited the costs — many traditional plans underperform simple MF + term insurance splits.",
          },
        ],
      },
    ],
    finkoinTip:
      "Compare tax-saving choices as part of a full plan: Finkoin helps you see insurance, debt, and investing trade-offs together — not as isolated “March products”.",
    finkoinTipHref: "/analyse",
    related: [
      {
        id: "section-80c-limits-and-beyond",
        title: "Section 80C limits — and beyond",
      },
      {
        id: "80c-complete-guide-tax-saving-india",
        title: "Section 80C — complete guide",
      },
      {
        id: "nps-tax-deductions-guide-india",
        title: "NPS tax benefits — 80CCD layers",
      },
    ],
  },

  "understanding-inflation-and-your-real-returns": {
    seoTitle: "Inflation vs FD Returns: Real Returns in India (2026)",
    seoDescription:
      "CPI Apr 2026 ~3.48%, 5–6% history, basket inflation, Rule of 72, real returns, why equity beats inflation long run. Educational.",
    tags: ["Inflation", "CPI", "Real returns", "India"],
    toc: [
      { id: "misconception", label: "The big misconception" },
      { id: "india", label: "India-specific inflation reality" },
      { id: "rule72", label: "The rule of 72" },
      { id: "real", label: "How to calculate real returns" },
      { id: "goals", label: "What this means for goals" },
      { id: "beats", label: "What beats inflation" },
    ],
    intro: [
      "Inflation is the silent tax on purchasing power. Understanding inflation and your real returns starts with one uncomfortable idea: a “7% FD” can still be a losing game after tax and after the prices that matter to your family.",
    ],
    sections: [
      {
        id: "misconception",
        title: "The big misconception",
        blocks: [
          {
            kind: "p",
            text: "Many Indians think: “My FD gives 7% — that is good.” Quick reality check: FD ~7%, long-run CPI often ~5–6%, tax slab 30% → post-tax FD ~4.9% → real return near ~0% (or negative) vs 6% inflation. ₹100 still grows to ₹107 nominally — but purchasing power can stagnate.",
          },
        ],
      },
      {
        id: "india",
        title: "India-specific inflation reality",
        blocks: [
          {
            kind: "ul",
            items: [
              "Headline CPI inflation India April 2026: ~3.48% (current headline number).",
              "Historical 10-year average is often discussed around ~5–6%. RBI inflation target: ~4% with a commonly cited tolerance band ~2–6%.",
              "Medical inflation is often quoted ~12–14%/year; education inflation is often quoted ~10–12%/year depending on segment.",
              "Your relevant inflation is not only headline CPI — it is the inflation of your basket (rent, school fees, healthcare, help at home).",
            ],
          },
          {
            kind: "callout",
            tone: "violet",
            title: "Why headline CPI misleads",
            text: "Even when headline CPI prints low, components can diverge: e.g. food inflation around ~4.2% (April 2026 print narrative) while personal care/services can print far higher in the same release — read sub-indices, not only the headline.",
          },
        ],
      },
      {
        id: "rule72",
        title: "The rule of 72",
        blocks: [
          {
            kind: "p",
            text: "Approximate years to halve purchasing power ≈ 72 ÷ inflation rate. At ~6% CPI: 72 ÷ 6 = 12 years — ₹10 lakh today is ~₹5 lakh purchasing power in 12 years if inflation stays elevated. At ~12% medical inflation: 72 ÷ 12 = 6 years — a ₹5 lakh bill’s “feel” doubles fast.",
          },
        ],
      },
      {
        id: "real",
        title: "How to calculate real returns",
        blocks: [
          {
            kind: "p",
            text: "Precise formula: Real return = ((1 + nominal) ÷ (1 + inflation)) − 1. Simple approximation: nominal − inflation. Examples (educational): FD ~7% vs ~6% inflation ≈ ~1% real pre-tax; after tax, worse. Equity ~12% vs ~6% inflation ≈ ~6% real (still volatile year to year).",
          },
        ],
      },
      {
        id: "goals",
        title: "What this means for goals",
        blocks: [
          {
            kind: "p",
            text: "Child education in ~15 years: if costs rise ~12%/year, a ₹15 lakh today line-item can become a shockingly large number — your SIP must step up with education inflation, not only headline CPI.",
          },
        ],
      },
      {
        id: "beats",
        title: "The three sleeves that often beat inflation (long run)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Equity mutual funds: long-run CAGR often quoted ~11–13% — beats ~5–6% inflation in many multi-decade windows (not every year).",
              "Real estate: can beat inflation in select locations, but illiquid and lumpy.",
              "Gold: often a hedge/stabiliser — not a dividend compounding machine.",
              "Savings/FD/PPF: often ~0–2% real after inflation+tax — fine for stability, weak for long-run wealth alone.",
            ],
          },
          {
            kind: "p",
            text: "Educational conclusion many planners use: long horizons often need meaningful equity exposure (commonly discussed ~60–70% of long-term savings) — personalised to your risk and goals.",
          },
        ],
      },
    ],
    finkoinTip:
      "Use Finkoin’s calculators and goal view to translate “₹1 crore” into months-of-expenses — inflation-aware planning is less misleading than nominal targets.",
    finkoinTipHref: "/calculators",
    related: [
      {
        id: "what-is-the-50-30-20-budgeting-rule",
        title: "Why 50-30-20 struggles — Finkoin 40-20-10-30",
      },
      {
        id: "sip-vs-lumpsum-when-to-use-which",
        title: "SIP vs lumpsum — when to use which",
      },
      {
        id: "what-is-compound-interest-and-why-it-changes-everything",
        title: "What is compound interest?",
      },
    ],
  },

  "section-80c-limits-and-beyond": {
    seoTitle: "Beyond 80C: 80D, NPS ₹50k, 24B, 80E, 80TTA/TTB",
    seoDescription:
      "Beyond ₹1.5L 80C: 80D health, NPS ₹50k 80CCD(1B), 24B interest, 80E, 80TTA/TTB, claim order. Old regime focus. Educational.",
    tags: ["80C", "80D", "NPS", "Tax deductions"],
    toc: [
      { id: "not-only", label: "80C is not the only deduction" },
      { id: "80c", label: "Section 80C" },
      { id: "80d", label: "Section 80D" },
      { id: "nps", label: "Section 80CCD(1B)" },
      { id: "24b", label: "Section 24B" },
      { id: "80e", label: "Section 80E" },
      { id: "80tta", label: "80TTA / 80TTB" },
      { id: "max", label: "Maximum deduction illustration" },
      { id: "priority", label: "Priority order" },
    ],
    intro: [
      "Section 80C limit is just ₹1.5 lakh — many Indians stop planning there. In reality, old-regime taxpayers can often stack several more sections and save large tax if they qualify. (New regime: most deductions don’t apply — compare regimes first.)",
    ],
    sections: [
      {
        id: "not-only",
        title: "80C is not the only deduction",
        blocks: [
          {
            kind: "callout",
            tone: "emerald",
            title: "Reality check",
            text: "You can sometimes claim several lakhs beyond 80C if eligible — especially 80D + 24B + NPS extra window — which can change effective tax materially at the 30% slab.",
          },
        ],
      },
      {
        id: "80c",
        title: "Section 80C (₹1.5L limit)",
        blocks: [
          {
            kind: "ul",
            items: [
              "EPF (employee contribution), PPF, ELSS, life insurance premium (limits apply), home loan principal (eligible housing), tuition fees (rules), NSC/SCSS/SSY where applicable.",
            ],
          },
        ],
      },
      {
        id: "80d",
        title: "Section 80D (₹25,000–₹75,000)",
        blocks: [
          {
            kind: "p",
            text: "Self + family health insurance commonly up to ₹25,000; additional amounts for parents depending on age (often ₹25,000 if parents <60 and ₹50,000 if 60+ in many filings). Preventive check-ups can count within sub-limits. Max illustration often discussed ~₹75,000/year.",
          },
        ],
      },
      {
        id: "nps",
        title: "Section 80CCD(1B) — NPS extra",
        blocks: [
          {
            kind: "p",
            text: "Additional ₹50,000 beyond 80C for NPS Tier-I (within eligibility rules). At 30% slab, that can be ~₹15,000 tax saved — plus market-linked growth/discipline.",
          },
        ],
      },
      {
        id: "24b",
        title: "Section 24B — home loan interest",
        blocks: [
          {
            kind: "p",
            text: "Self-occupied interest deduction commonly capped at ₹2,00,000/year (verify current year). Joint owners may each claim within rules if loan + ownership align.",
          },
        ],
      },
      {
        id: "80e",
        title: "Section 80E — education loan interest",
        blocks: [
          {
            kind: "p",
            text: "Section 80E gives a deduction for interest on a qualifying education loan for higher education — subject to an 8-consecutive-year window and other conditions in law. Eligibility is narrow: it is meant for specified education loans for certain borrowers (commonly discussed for the borrower’s own higher education in typical salaried examples) — do not assume children’s loans automatically qualify; verify with a CA.",
          },
        ],
      },
      {
        id: "80tta",
        title: "80TTA / 80TTB",
        blocks: [
          {
            kind: "p",
            text: "80TTA: savings account interest deduction up to ₹10,000 for eligible assessees below senior thresholds. 80TTB: senior citizens may claim higher deduction on specified interest income — verify current caps.",
          },
        ],
      },
      {
        id: "max",
        title: "Maximum deduction illustration (old regime)",
        blocks: [
          {
            kind: "p",
            text: "Illustrative stack: 80C ₹1,50,000 + 80D ₹75,000 + 80CCD(1B) ₹50,000 + 24B ₹2,00,000 = ₹4,75,000. At 30% slab, ₹4.75L × 30% ≈ ₹1,42,500 tax saved — only if you truly qualify for each line.",
          },
        ],
      },
      {
        id: "priority",
        title: "A practical priority order",
        blocks: [
          {
            kind: "ul",
            items: [
              "1) Use 80CCD(1B) if NPS fits your lock-in needs.",
              "2) Buy adequate health cover and claim 80D cleanly.",
              "3) Fill 80C with lowest-cost, goal-aligned tools (often ELSS/PPF/EPF).",
              "4) Home buyers: capture 24B via lender certificates.",
              "5) Education loan: don’t forget 80E if applicable.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "Finkoin’s tax calculator shows old vs new regime savings for your exact income and deductions — use it before committing to ELSS-only “March panic”.",
    finkoinTipHref: "/calculators/tax-regime-2026",
    related: [
      {
        id: "old-vs-new-tax-regime-which-saves-you-more-money",
        title: "Old vs new tax regime — which saves more?",
      },
      {
        id: "how-home-loan-tax-benefits-work-80c-24b",
        title: "How home loan tax benefits work (80C, 24B)",
      },
      {
        id: "nps-tax-deductions-guide-india",
        title: "NPS tax benefits — 80CCD layers",
      },
    ],
  },

  "what-is-health-insurance-floater": {
    seoTitle: "Family Floater Health Insurance: Pros, Cons, India Tips",
    seoDescription:
      "Floater vs individual cover, super top-up strategy, must-have features, medical inflation, parents policy notes. Educational only.",
    tags: ["Health insurance", "Floater", "Super top-up", "India"],
    toc: [
      { id: "indiv-vs-float", label: "Individual vs floater" },
      { id: "float-ok", label: "When floater makes sense" },
      { id: "indiv-better", label: "When individual is better" },
      { id: "topup", label: "Super top-up strategy" },
      { id: "features", label: "Features to look for" },
      { id: "medinflate", label: "Medical inflation warning" },
      { id: "parents", label: "Parents’ health insurance" },
    ],
    intro: [
      "Family floater health insurance means one sum insured floats across family members. It can be cheaper than separate policies, but one large claim can shrink the pool for everyone else that year — trade-offs matter.",
    ],
    sections: [
      {
        id: "indiv-vs-float",
        title: "Individual vs floater",
        blocks: [
          {
            kind: "p",
            text: "Example: family of four. Four individual ₹5L plans = ₹20L total cover; premiums might be ₹8k–12k/year each (illustrative). A ₹15L floater might cost ₹15k–20k/year — cheaper, but a ₹12L claim can leave only ₹3L for the rest of the policy year.",
          },
        ],
      },
      {
        id: "float-ok",
        title: "When floater makes sense",
        blocks: [
          {
            kind: "ul",
            items: [
              "Young family (typically <45), kids below ~18.",
              "You expect at most one major hospitalisation event per year.",
              "Budget is tight and you still want a meaningful SI.",
            ],
          },
        ],
      },
      {
        id: "indiv-better",
        title: "When individual is better",
        blocks: [
          {
            kind: "ul",
            items: [
              "Parents 55+ inside the same floater can spike premium and renewal risk — often better as a separate senior policy.",
              "Pre-existing conditions for one member can hurt everyone’s pricing/renewal comfort.",
              "If multiple members have higher claim risk, separate pools reduce correlation risk.",
            ],
          },
        ],
      },
      {
        id: "topup",
        title: "The super top-up strategy",
        blocks: [
          {
            kind: "callout",
            tone: "emerald",
            title: "High SI, lower premium",
            text: "Common structure: base ₹5L per person + super top-up ₹20L with ₹5L deductible — top-up pays after the base threshold. Illustrative premiums for large top-ups can be a few thousand rupees/year; compare quotes and continuity clauses carefully.",
          },
        ],
      },
      {
        id: "features",
        title: "Key features to look for",
        blocks: [
          {
            kind: "ul",
            items: [
              "No tiny room-rent limits (or high enough limit vs bill reality).",
              "Restoration benefit (if offered and not gimmicky).",
              "Day-1 accident cover / waiting periods clearly disclosed.",
              "Pre/post hospitalisation days adequate for your city’s diagnostics norms.",
              "Strong hospital network near home/work; transparent claim process.",
            ],
          },
        ],
      },
      {
        id: "medinflate",
        title: "Medical inflation warning",
        blocks: [
          {
            kind: "p",
            text: "Healthcare costs often rise faster than headline CPI — many planners use ~12–14%/year as a stress assumption. ₹10L cover today can feel like ₹5L in purchasing power in ~6 years at ~12% inflation — review SI every ~3 years.",
          },
        ],
      },
      {
        id: "parents",
        title: "Parents’ health insurance",
        blocks: [
          {
            kind: "p",
            text: "Corporate floater usually won’t cover parents the way you assume — buy a dedicated parents policy early (before severe pre-existing conditions). Compare senior products on network + exclusions, not only premium.",
          },
        ],
      },
    ],
    finkoinTip:
      "After you model monthly essentials on Finkoin, check whether your health SI matches “one bad hospital bill” in your city tier — underinsurance is common.",
    finkoinTipHref: "/analyse",
    related: [
      {
        id: "term-insurance-vs-endowment-why-most-indians-buy-wrong",
        title: "Term insurance vs endowment",
      },
      {
        id: "opd-cover-in-health-insurance",
        title: "OPD cover in health insurance",
      },
      {
        id: "emergency-fund-how-much-where-to-keep-it",
        title: "Emergency fund — how much, where to keep it",
      },
    ],
  },

  "fixed-vs-floating-home-loan": {
    seoTitle: "Fixed vs Floating Home Loan: Which Saves More? (India)",
    seoDescription:
      "Repo-linked floating vs teaser-fixed, 20-year EMI math on ₹50L, rate history, prepayment edge on floating, hybrid cashflow plan. Educational only.",
    tags: ["Home loan", "EMI", "Interest rates", "RBI repo"],
    toc: [
      { id: "basic", label: "Basic difference" },
      { id: "rates-2026", label: "Current rates (2026, illustrative)" },
      { id: "math", label: "20-year math" },
      { id: "history", label: "Interest rate history (repo)" },
      { id: "question", label: "The real question" },
      { id: "prepay", label: "Prepayment advantage" },
      { id: "hybrid-loan", label: "Smart hybrid approach" },
    ],
    intro: [
      "Fixed vs floating home loan is not only about the first EMI — it is about how your cashflow behaves when rates change, how prepayment penalties work, and whether your “fixed” is truly fixed for the full tenure.",
    ],
    sections: [
      {
        id: "basic",
        title: "The basic difference",
        blocks: [
          {
            kind: "ul",
            items: [
              "Fixed rate: EMI stability for the truly-fixed period (often shorter than you think).",
              "Floating rate: typically linked to external benchmarks (repo-linked), changes with RBI policy and bank spreads.",
            ],
          },
        ],
      },
      {
        id: "rates-2026",
        title: "Current rates (2026, illustrative ranges)",
        blocks: [
          {
            kind: "p",
            text: "Market-linked floating home loans are often seen around ~8.5–9% for strong profiles at major banks/HFCs. “Fixed” products, when available, may quote higher (often ~10.5–12%) or may be fixed only for 2–5 years before reset.",
          },
        ],
      },
      {
        id: "math",
        title: "The math over 20 years (illustrative)",
        blocks: [
          {
            kind: "p",
            text: "₹50L for 20 years: at ~10.5% fixed, EMI ≈ ₹49,919/month; total outflow ≈ ₹1.20 crore; interest ≈ ₹70 lakh. At ~8.5% floating (if it stayed flat), EMI ≈ ₹43,391/month; total outflow ≈ ₹1.04 crore; interest ≈ ₹54 lakh — a large gap, but floating rates rarely stay flat for two decades.",
          },
          {
            kind: "callout",
            tone: "violet",
            title: "Reality check",
            text: "Use the illustration to learn directionally: floating often starts cheaper; the risk is future hikes. Model +₹3,000–5,000 EMI stress and see if your budget survives.",
          },
        ],
      },
      {
        id: "history",
        title: "Repo rate history (illustrative milestones)",
        blocks: [
          {
            kind: "ul",
            items: [
              "2010: repo ~6.25%",
              "2013: repo ~8% (inflation fight)",
              "2016: repo ~6.25%",
              "2020: repo ~4% (COVID)",
              "2023: repo ~6.5% (inflation cycle)",
              "2026: repo often discussed around ~6.25% (verify live RBI)",
            ],
          },
        ],
      },
      {
        id: "question",
        title: "The real question",
        blocks: [
          {
            kind: "p",
            text: "Can you handle EMI rising by ~₹3,000–5,000/month if rates rise? If yes, floating historically tends to win for many long-tenure borrowers. If no, a shorter fixed window can buy peace — peace has a price.",
          },
        ],
      },
      {
        id: "prepay",
        title: "The prepayment advantage",
        blocks: [
          {
            kind: "p",
            text: "Retail floating loans typically have no prepayment penalty (RBI direction for many products — still read your sanction letter). Fixed loans may impose 2–4% penalties on prepayment in some structures. Bonuses used for prepayment can dominate lifetime interest saved versus the fixed/floating label alone.",
          },
        ],
      },
      {
        id: "hybrid-loan",
        title: "A smart hybrid approach",
        blocks: [
          {
            kind: "ul",
            items: [
              "Prefer floating if you can tolerate variability and want prepayment flexibility.",
              "Keep ~3 months EMI as cash buffer before aggressive prepay.",
              "If rates rise: some lenders allow tenure extension instead of EMI spike — understand costs.",
              "Refinance if another lender offers ~0.5% lower on large balances — small rate cuts compound over years.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "Stress-test EMI + goals together on Finkoin — a loan decision should not crowd out insurance and emergency cash.",
    finkoinTipHref: "/analyse",
    related: [
      {
        id: "prepayment-vs-tenure-reduction-home-loan",
        title: "Prepayment vs tenure reduction",
      },
      {
        id: "how-home-loan-tax-benefits-work-80c-24b",
        title: "How home loan tax benefits work (80C, 24B)",
      },
      {
        id: "top-up-home-loan-when-it-makes-sense",
        title: "Top-up home loan — when it makes sense",
      },
    ],
  },

  "rera-basics-for-homebuyers": {
    seoTitle: "RERA Basics for Indian Home Buyers (2026 Checklist)",
    seoDescription:
      "What RERA is, escrow/carpet area/delivery timelines, how to verify a project, what RERA doesn’t cover, delay complaints. Educational only.",
    tags: ["RERA", "Real estate", "Home buyer", "India"],
    toc: [
      { id: "what", label: "What is RERA" },
      { id: "five", label: "Five protections buyers care about" },
      { id: "verify", label: "How to verify a project" },
      { id: "not-cover", label: "What RERA does not cover" },
      { id: "sign", label: "Before you sign" },
      { id: "delay", label: "If the builder delays" },
    ],
    intro: [
      "RERA (Real Estate Regulatory Authority) is the state-level implementation of India’s Real Estate (Regulation and Development) Act. For homebuyers, it is mainly a disclosure + escrow + complaint framework — not a guarantee that every project will succeed, but a major upgrade versus the pre-2016 opaque market.",
    ],
    sections: [
      {
        id: "what",
        title: "What is RERA",
        blocks: [
          {
            kind: "p",
            text: "Each state has a RERA portal where registered projects must publish key details. Before RERA, delays and plan changes were harder to challenge systematically; after RERA, buyers have structured recourse — but diligence still matters.",
          },
        ],
      },
      {
        id: "five",
        title: "Five protections buyers care about",
        blocks: [
          {
            kind: "ul",
            items: [
              "Registration: mandatory registration for eligible projects — avoid “RERA not applicable” ambiguity unless you truly understand the exemption.",
              "Escrow discipline: a large share of collections is meant to be ring-fenced for project delivery (rules are detailed — read the project QA on the portal).",
              "Carpet area transparency: pricing clarity on carpet area vs super built-up (common difference ~20–30%).",
              "Delivery timelines: promised dates matter; delays can trigger compensation frameworks described on portals/circulars.",
              "Defect liability: structural defect warranty periods apply per law — keep documentation for snags.",
            ],
          },
        ],
      },
      {
        id: "verify",
        title: "How to verify a project",
        blocks: [
          {
            kind: "p",
            text: "Search the state RERA website by builder/project, then cross-check registration validity, completion dates, and filed quarterly progress vs marketing claims. Mismatch = red flag.",
          },
        ],
      },
      {
        id: "not-cover",
        title: "What RERA does not cover",
        blocks: [
          {
            kind: "ul",
            items: [
              "Some small projects / completed inventory may fall outside applicability depending on state thresholds.",
              "RERA is not a substitute for title diligence and loan documentation checks.",
              "Builder insolvency can still become a separate legal process.",
            ],
          },
        ],
      },
      {
        id: "sign",
        title: "Before you sign",
        blocks: [
          {
            kind: "ul",
            items: [
              "Verify RERA registration number on agreement vs portal.",
              "Read agreement for sale end-to-end (penalties, possession, force majeure).",
              "Confirm amenities list is what is legally committed.",
              "Check for complaints filed against the promoter on the portal.",
            ],
          },
        ],
      },
      {
        id: "delay",
        title: "If the builder delays",
        blocks: [
          {
            kind: "p",
            text: "Buyers can file complaints on the state RERA portal with payment proofs and agreement clauses. Many cases resolve in time-bound authority processes — use the system; keep PDF evidence organized.",
          },
        ],
      },
    ],
    finkoinTip:
      "If you are saving for a down payment, Finkoin helps separate “goal investments” from emergency cash — don’t market-time your safety buffer.",
    finkoinTipHref: "/goals",
    related: [
      {
        id: "under-construction-vs-ready-property",
        title: "Under-construction vs ready property",
      },
      {
        id: "rent-agreement-registration-basics",
        title: "Rent agreement registration basics",
      },
      {
        id: "capital-gains-when-you-sell-property",
        title: "Capital gains when you sell property",
      },
    ],
  },

  "what-is-asset-allocation": {
    seoTitle: "Asset Allocation Explained: Why It Beats Stock Picking",
    seoDescription:
      "What allocation is, Brinson insight, India equity/debt/gold sleeves, age rule, annual rebalance, sample split. Educational only.",
    tags: ["Asset allocation", "Portfolio", "India", "Rebalancing"],
    toc: [
      { id: "concept", label: "The concept" },
      { id: "beats", label: "Why it beats stock picking" },
      { id: "classes", label: "Four main asset classes (India framing)" },
      { id: "age", label: "Age-based rule of thumb" },
      { id: "rebalance", label: "Rebalancing explained" },
      { id: "india-model", label: "India-specific model (illustrative)" },
    ],
    intro: [
      "Asset allocation is how you split money across asset types (equity, debt, gold, cash/real estate exposure). For most Indian families, asset allocation drives outcomes more than which single mutual fund you pick this month.",
    ],
    sections: [
      {
        id: "concept",
        title: "The concept",
        blocks: [
          {
            kind: "p",
            text: "Example: ₹10 lakh total — ₹6L equity index funds (60%), ₹2L debt (20%), ₹1L gold (10%), ₹1L liquid (10%). The point is percentages, not lottery tickets in one theme fund.",
          },
        ],
      },
      {
        id: "beats",
        title: "Why it beats stock picking",
        blocks: [
          {
            kind: "p",
            text: "The famous Brinson et al. (1986) finding is often paraphrased: most portfolio return variation is explained by strategic asset allocation, not stock selection. Practically: getting your equity/debt split right matters more than chasing last year’s winner fund.",
          },
        ],
      },
      {
        id: "classes",
        title: "Four main asset classes (India framing)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Equity (stocks/MFs): higher long-run CAGR expectation, can draw down sharply in crashes — best for long horizons.",
              "Debt (FD/bonds/debt MF): lower volatility, credit/ rate risks still exist — best for 2–5 year horizons.",
              "Gold: hedge/stabiliser — commonly sized ~5–10% in retail plans.",
              "Real estate / REITs: lumpy, illiquid — size carefully vs liquidity needs.",
            ],
          },
        ],
      },
      {
        id: "age",
        title: "Age-based rule of thumb",
        blocks: [
          {
            kind: "p",
            text: "Classic heuristic: equity% ≈ 100 − age (some use 110–120 because lifespans rose). At 25: ~75% equity; at 45: ~55%; at 65: ~35% — then personalise for income stability and goals.",
          },
        ],
      },
      {
        id: "rebalance",
        title: "Rebalancing explained",
        blocks: [
          {
            kind: "p",
            text: "If you target 70/30 equity/debt and markets rally, you might drift to 80/20. Rebalancing sells some equity and buys debt to return to policy — mechanically ‘sell high, buy low’ once a year (taxes/costs matter).",
          },
        ],
      },
      {
        id: "india-model",
        title: "India-specific allocation model (illustrative only)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Large-cap index fund ~40%",
              "Mid/small-cap fund ~20%",
              "International index fund ~10%",
              "Debt/liquid ~20%",
              "Gold ETF/SGB sleeve ~10%",
            ],
          },
          {
            kind: "callout",
            tone: "amber",
            title: "Not a recommendation",
            text: "Illustrative diversification across caps and geographies — adjust to your horizon, liquidity, and tax locations.",
          },
        ],
      },
    ],
    finkoinTip:
      "Use Finkoin’s portfolio view to see concentration risk — allocation first, ticker obsession second.",
    finkoinTipHref: "/portfolio",
    related: [
      {
        id: "diversification-vs-diworsification",
        title: "Diversification vs diworsification",
      },
      {
        id: "sip-vs-lumpsum-when-to-use-which",
        title: "SIP vs lumpsum — when to use which",
      },
      {
        id: "what-is-an-index-fund-and-why-it-beats-most-mutual-funds",
        title: "What is an index fund?",
      },
    ],
  },

  "credit-card-minimum-trap": {
    seoTitle: "Credit Card Minimum Due Trap (India): Real Cost Math",
    seoDescription:
      "Minimum due math, lost grace period, APR vs PL/gold/home loan, escape steps, safe card habits. Educational only.",
    tags: ["Credit card", "Debt", "Minimum due", "India"],
    toc: [
      { id: "math", label: "The shocking math" },
      { id: "trap", label: "How the trap works" },
      { id: "grace", label: "The grace period secret" },
      { id: "compare", label: "Comparing interest costs" },
      { id: "escape", label: "If you are already trapped" },
      { id: "right", label: "The right way to use a card" },
    ],
    intro: [
      "The credit card minimum payment trap is one of the most expensive mistakes in personal finance: you stay ‘current’ on the card while interest compounds on the remaining balance at very high monthly rates.",
    ],
    sections: [
      {
        id: "math",
        title: "The shocking math",
        blocks: [
          {
            kind: "p",
            text: "Illustrative: spend ₹1,00,000; minimum due might be ~₹5,000. Revolving interest is often ~3–3.5%/month (~36–42%/year). Minimum payments mostly cover interest; principal falls slowly — total paid can become ₹3–4 lakh+ over many years for ₹1L of purchases.",
          },
        ],
      },
      {
        id: "trap",
        title: "How the minimum due trap works",
        blocks: [
          {
            kind: "p",
            text: "Banks profit when customers revolve — it is one of the highest-yield retail products. A low minimum due encourages ‘pay little’ behaviour while interest runs in the background.",
          },
        ],
      },
      {
        id: "grace",
        title: "The grace period secret",
        blocks: [
          {
            kind: "ul",
            items: [
              "Pay statement in full → typically ~45–50 days interest-free on purchases + rewards (if your scheme qualifies).",
              "Miss full payment → many cards lose the grace benefit; interest may apply from purchase date on carried balances (verify your issuer terms).",
            ],
          },
        ],
      },
      {
        id: "compare",
        title: "Comparing interest costs (illustrative ranges)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Credit card revolving: often ~36–48%/year",
              "Personal loan: often ~12–24%/year",
              "Gold loan: often ~10–14%/year",
              "Home loan: often ~8.5–10%/year",
            ],
          },
        ],
      },
      {
        id: "escape",
        title: "If you are already trapped",
        blocks: [
          {
            kind: "ul",
            items: [
              "Stop spending on the card immediately.",
              "Convert to EMI if the rate is materially lower than revolving (still read fees).",
              "If eligible, use a cheaper loan to close revolving — maths must include processing fees.",
              "Reduce limit / freeze card until you can pay full every month.",
            ],
          },
        ],
      },
      {
        id: "right",
        title: "The right way to use a credit card",
        blocks: [
          {
            kind: "ul",
            items: [
              "Prefer one primary card you track well.",
              "Autopay full statement amount (not minimum).",
              "Weekly statement hygiene; dispute charges fast.",
              "Keep utilisation moderate for credit score optics.",
              "Never withdraw cash on a credit card unless you understand immediate charges + interest from day one.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "If you carry revolving card debt, Finkoin’s debt lens helps prioritise the highest APR leak first — spreadsheets fail when behaviour doesn’t change.",
    finkoinTipHref: "/analyse",
    related: [
      {
        id: "how-your-cibil-credit-score-is-calculated",
        title: "How your CIBIL credit score is calculated",
      },
      {
        id: "top-up-home-loan-when-it-makes-sense",
        title: "Top-up home loan — when it makes sense",
      },
      {
        id: "what-is-the-50-30-20-budgeting-rule",
        title: "Why 50-30-20 struggles — Finkoin 40-20-10-30",
      },
    ],
  },

  "nps-vs-epf-for-retirement": {
    seoTitle: "NPS vs EPF for Retirement: Liquidity, Tax, Returns",
    seoDescription:
      "EPF employer match + 8.25% narrative, NPS market returns + 80CCD(1B), annuity 40% rule, who should prioritise what, transfer vs withdraw trap. Educational.",
    tags: ["NPS", "EPF", "Retirement", "India tax"],
    toc: [
      { id: "epf", label: "EPF basics" },
      { id: "nps", label: "NPS basics" },
      { id: "compare", label: "Real comparison" },
      { id: "who", label: "Who should prioritise which" },
      { id: "withdraw", label: "The withdrawal trap" },
      { id: "plan", label: "A simple combined plan" },
    ],
    intro: [
      "NPS vs EPF is not a winner-takes-all fight — EPF is the forced, employer-matched foundation for many salaried Indians, while NPS adds optional market exposure and an extra deduction window beyond vanilla 80C (where eligible).",
    ],
    sections: [
      {
        id: "epf",
        title: "EPF basics",
        blocks: [
          {
            kind: "ul",
            items: [
              "EPF: employee contributes 12% of salary (definitions vary by payroll); employer contributes 12% of salary with split: 8.33% to EPS (pension) and 3.67% to EPF for many setups — verify your payslip.",
              "Interest rate is declared by government (often discussed around ~8.25% for recent FY narratives — verify EPFO notification for your year).",
              "Tax treatment commonly described as EEE within statutory limits for qualifying withdrawals.",
            ],
          },
        ],
      },
      {
        id: "nps",
        title: "NPS basics",
        blocks: [
          {
            kind: "ul",
            items: [
              "Market-linked returns; many investors see ~8–12% depending on equity allocation and period.",
              "Extra ₹50,000 deduction window under 80CCD(1B) for eligible Tier-I contributions (beyond the 80C box).",
              "Tier I is locked until retirement rules; Tier II is more liquid but typically without the same tax benefits.",
            ],
          },
        ],
      },
      {
        id: "compare",
        title: "The real comparison",
        blocks: [
          {
            kind: "p",
            text: "EPF: predictable accrual mechanics, employer match is ‘free money’, strong debt-like behaviour. NPS: equity/debt choice, extra tax box, but retirement withdrawal rules include mandatory annuity purchase on a portion at exit — annuity income is taxable at slab rates; the lump-sum portion has specified tax treatment — read current year rules before deciding.",
          },
        ],
      },
      {
        id: "who",
        title: "Who should prioritise which",
        blocks: [
          {
            kind: "ul",
            items: [
              "EPF first: never skip employer match; don’t withdraw on job changes — transfer using UAN.",
              "Add NPS for: extra ₹50k deduction, more equity exposure, disciplined retirement beyond EPF.",
            ],
          },
        ],
      },
      {
        id: "withdraw",
        title: "The withdrawal trap",
        blocks: [
          {
            kind: "callout",
            tone: "amber",
            title: "EPFO narrative",
            text: "Media reports cite millions of inoperative accounts and large unclaimed balances when people cash out EPF between jobs — every withdrawal breaks compounding. Prefer transfer; if withdrawn early, TDS and tax rules may apply.",
          },
        ],
      },
      {
        id: "plan",
        title: "A simple combined plan",
        blocks: [
          {
            kind: "p",
            text: "Common retail pattern: let EPF compound, add NPS ₹50k if suitable, run separate ELSS/MF SIPs for goals, keep PPF if you want a government-backed sleeve — together: guaranteed-ish floor + equity upside (personalise).",
          },
        ],
      },
    ],
    finkoinTip:
      "Retirement is multi-account: Finkoin helps you see EPF/NPS/SIP buckets as one timeline instead of three disconnected apps.",
    finkoinTipHref: "/goals",
    related: [
      {
        id: "nps-tax-deductions-guide-india",
        title: "NPS tax benefits — 80CCD layers",
      },
      {
        id: "ppf-vs-elss-which-is-better-for-tax-saving",
        title: "PPF vs ELSS for tax saving",
      },
      {
        id: "term-insurance-vs-endowment-why-most-indians-buy-wrong",
        title: "Term insurance vs endowment",
      },
    ],
  },

  "gold-as-investment-myths": {
    seoTitle: "Gold Investment Myths: Jewellery vs SGB vs ETF (India)",
    seoDescription:
      "When gold helps (hedge, stabiliser), myths busted, best forms (SGB/ETF), digital gold risks, sizing 5–10%. Educational only.",
    tags: ["Gold", "SGB", "ETF", "India"],
    toc: [
      { id: "obsession", label: "India’s gold obsession" },
      { id: "usecases", label: "Four use-cases" },
      { id: "myths", label: "Myths busted" },
      { id: "best", label: "Best ways to buy today" },
      { id: "how-much", label: "How much gold is right" },
    ],
    intro: [
      "Gold as investment is misunderstood because most Indian households hold it as jewellery — which is part consumption, part ornament, and a costly way to access spot gold returns.",
    ],
    sections: [
      {
        id: "obsession",
        title: "India’s gold obsession (context)",
        blocks: [
          {
            kind: "p",
            text: "India is among the world’s largest gold consumers; private holdings are enormous in aggregate. Most is jewellery — typically the worst form for investment due to making charges and buy/sell spreads.",
          },
        ],
      },
      {
        id: "usecases",
        title: "Four use-cases for gold",
        blocks: [
          {
            kind: "ul",
            items: [
              "Inflation / currency debasement hedge over long horizons (not smooth yearly).",
              "Portfolio stabiliser: in some crashes gold rises while equities fall — not always.",
              "Geopolitical risk hedge — behaves like insurance, not cashflow.",
              "Weddings/tradition: treat as consumption with emotional value — not ROI.",
            ],
          },
        ],
      },
      {
        id: "myths",
        title: "Myths busted",
        blocks: [
          {
            kind: "ul",
            items: [
              "Myth: gold always rises — reality: long drawdowns happen (e.g., 2011–2015 global gold slump narrative).",
              "Myth: jewellery is investment — reality: making charges + resale spreads can destroy returns.",
              "Myth: physical bars are ‘safest’ — reality: storage/theft/purity friction; SGB/ETFs can be cleaner for portfolio gold.",
              "Myth: gold beats equity long-term — reality: broad Indian equity indices have often led over multi-decade windows — gold is usually a diversifier, not the growth engine.",
            ],
          },
        ],
      },
      {
        id: "best",
        title: "Best ways to buy gold today (product-neutral framing)",
        blocks: [
          {
            kind: "ul",
            items: [
              "Sovereign Gold Bonds (SGB): RBI-issued, tracks gold price + small fixed coupon historically; tax rules differ by exit/maturity — verify for your case. Note: new tranche issuance may pause; secondary market purchase is still a path for some investors.",
              "Gold ETFs: exchange-traded, transparent pricing, expense ratios ~0.5–1% typically.",
              "Digital gold apps: understand counterparty/regulatory protections — if unclear, prefer regulated exchange-traded routes.",
            ],
          },
        ],
      },
      {
        id: "how-much",
        title: "How much gold is right",
        blocks: [
          {
            kind: "p",
            text: "Many advisors cap gold at ~5–10% of an investment portfolio as a diversifier — beyond that, gold’s lack of coupons/cashflows can drag long-run growth vs equity-heavy plans.",
          },
        ],
      },
    ],
    finkoinTip:
      "If gold is ‘peace of mind’, size it like insurance in Finkoin — small, stable, not half your net worth.",
    finkoinTipHref: "/portfolio",
    related: [
      { id: "what-is-asset-allocation", title: "What is asset allocation?" },
      {
        id: "understanding-inflation-and-your-real-returns",
        title: "Understanding inflation and your real returns",
      },
      {
        id: "liquid-and-overnight-mutual-funds",
        title: "Liquid and overnight mutual funds",
      },
    ],
  },

  "prepayment-vs-tenure-reduction-home-loan": {
    seoTitle:
      "Home Loan Prepayment Calculator — Reduce EMI or Tenure? | Finkoin",
    seoDescription:
      "Home loan prepayment calculator India: reduce EMI vs cut tenure with live math. Illustrative interest savings. Educational only.",
    tags: ["Prepayment", "Home loan", "EMI", "Tenure", "prepayment calculator"],
    toc: [
      { id: "setup", label: "The setup" },
      { id: "math", label: "Math with real numbers" },
      { id: "when-emi", label: "When reducing EMI makes sense" },
      { id: "edge", label: "Edge case: invest the EMI savings" },
      { id: "frequency", label: "Prepayment frequency" },
      { id: "year", label: "Year of prepayment matters" },
      { id: "tax", label: "The tax angle" },
      { id: "rule", label: "Definitive rule-of-thumb" },
    ],
    intro: [
      "Home loan prepayment decisions are cashflow vs interest saved: banks often push EMI reduction because it feels good monthly — but keeping EMI constant and cutting tenure usually saves more total interest if you can afford it.",
    ],
    sections: [
      {
        id: "setup",
        title: "The setup",
        blocks: [
          {
            kind: "p",
            text: "You received ₹5L bonus. Bank offers: (A) reduce EMI, keep tenure, or (B) keep EMI, reduce tenure. Most pick A; maths often prefers B.",
          },
        ],
      },
      {
        id: "math",
        title: "The math with illustrative numbers",
        blocks: [
          {
            kind: "p",
            text: "₹50L at ~8.5% for 20 years → EMI ~₹43,391. After 5 years, outstanding might be ~₹44.7L. Prepay ₹5L → outstanding ~₹39.7L. Option A (reduce EMI) might drop EMI to ~₹38,548 for remaining 15 years and save ~₹8.7L interest (illustrative). Option B (cut tenure) keeping EMI ~₹43,391 might shorten remaining tenure toward ~12 years and save ~₹14.8L interest (illustrative). Option B can save materially more because principal dies faster.",
          },
        ],
      },
      {
        id: "when-emi",
        title: "When option A (reduce EMI) makes sense",
        blocks: [
          {
            kind: "ul",
            items: [
              "Cashflow is genuinely tight and EMI/income is high-risk.",
              "You must free cash to close costlier loans first.",
              "Large upcoming expense / income uncertainty.",
            ],
          },
        ],
      },
      {
        id: "edge",
        title: "Edge case: invest the EMI savings",
        blocks: [
          {
            kind: "p",
            text: "If option A saves ~₹4,843/month and you invest that at ~12% for 15 years, you can build a corpus — in some disciplined scenarios this can compete with option B’s interest saved. If you will spend the savings (common), option B wins cleanly.",
          },
        ],
      },
      {
        id: "frequency",
        title: "Prepayment frequency strategy",
        blocks: [
          {
            kind: "p",
            text: "Interest accrues on daily reducing balance — one large annual prepayment often beats spreading the same rupees into tiny monthly chunks (illustrative gap can be tens of thousands on ₹1L prepayment).",
          },
        ],
      },
      {
        id: "year",
        title: "The year of prepayment matters",
        blocks: [
          {
            kind: "p",
            text: "Prepaying early knocks down principal when interest component is highest. Late-tenure prepayments save less interest because EMI is mostly principal — sometimes investing surplus beats prepaying in final years.",
          },
        ],
      },
      {
        id: "tax",
        title: "The tax angle (24B)",
        blocks: [
          {
            kind: "p",
            text: "If you are optimising old-regime 24B interest deductions, aggressive prepayment can reduce interest below deduction thresholds — model after-tax savings, not only gross interest saved.",
          },
        ],
      },
      {
        id: "rule",
        title: "Definitive rule-of-thumb",
        blocks: [
          {
            kind: "ul",
            items: [
              "Early loan years + comfortable cashflow → prefer tenure reduction.",
              "Tight cashflow → EMI reduction for survival.",
              "Late tenure → consider investing surplus if interest saved is small.",
              "Old regime with large 24B value → check tax interaction before huge prepays.",
            ],
          },
        ],
      },
    ],
    finkoinTip:
      "Use the prepayment calculator above, then stress-test EMI affordability on Finkoin’s EMI tool — pick the option you’ll stick with for years.",
    finkoinTipHref: "/calculators/emi",
    related: [
      {
        id: "fixed-vs-floating-home-loan",
        title: "Fixed vs floating home loan",
      },
      {
        id: "how-home-loan-tax-benefits-work-80c-24b",
        title: "How home loan tax benefits work (80C, 24B)",
      },
      {
        id: "top-up-home-loan-when-it-makes-sense",
        title: "Top-up home loan — when it makes sense",
      },
    ],
  },
};

export function getRichLearnArticle(id: string): RichArticle | null {
  return LEARN_RICH_ARTICLES[id] ?? null;
}

export function isRichLearnArticle(id: string): boolean {
  return Boolean(LEARN_RICH_ARTICLES[id]);
}
