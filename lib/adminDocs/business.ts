import type { DocSection } from "./types";

/**
 * The business plan: what Finkoin is for, who it is up against and how it
 * grows and earns. Product facts (features, prices, FK rules) are taken
 * from the code; targets and market claims are marked as plans or
 * assumptions so nobody mistakes them for measured numbers.
 */

export const visionSection: DocSection = {
  id: "vision",
  title: "Mission and vision",
  group: "Business plan",
  summary:
    "What Finkoin is, the problem it solves, the mission and vision, and the principles behind product decisions.",
  blocks: [
    {
      kind: "p",
      text: "Finkoin is a personal-finance companion for Indian households. You tell it about your money once, and it tells you how healthy your finances are, what to fix first, and keeps you on track every month with a tracker, bill reminders, a policy vault and bill splitting with friends.",
    },
    { kind: "h", text: "The problem" },
    {
      kind: "list",
      items: [
        "Most Indian earners have no plan, only products. They hold an LIC policy, a few SIPs, a credit card and an EMI, but nobody has told them whether the mix is right: is the emergency fund big enough, is term cover adequate, which loan to close first.",
        "Good advice is expensive or conflicted. A fee-only adviser costs thousands of rupees a year; free advice usually comes from someone selling a product (an agent, a bank RM, a broker app).",
        "Existing apps solve one slice: investing apps want you to invest, expense apps track spend, Splitwise splits bills, insurance sites sell policies. Nobody joins them into one picture with one next step.",
        "Money anxiety is high and literacy is low. Jargon (XIRR, CAGR, 80C, old vs new regime) stops people from acting even when the right move is simple.",
      ],
    },
    { kind: "h", text: "Mission" },
    {
      kind: "callout",
      tone: "info",
      text: "Give every Indian household a clear, honest money plan, and help them follow it month after month, without needing to be a finance expert or pay for an adviser.",
    },
    { kind: "h", text: "Vision" },
    {
      kind: "p",
      text: "Finkoin becomes the first app an Indian family opens when they think about money: the place that knows their whole financial picture, scores it, says what to do next and nudges them to do it. Over time it is the trusted, unbiased layer that sits above banks, brokers and insurers and helps people choose between them.",
    },
    { kind: "h", text: "Principles" },
    {
      kind: "list",
      items: [
        "Numbers from code, words from AI. Every score, gap and amount is computed by deterministic engines (`lib/financialEngine.ts`, `lib/priorityEngine.ts`); the LLM only explains. Advice must be reproducible and auditable.",
        "Useful before signup. The health check and 15+ calculators work without an account, and the core check needs no PAN or Aadhaar.",
        "Privacy first. Row Level Security on every table, an encrypted vault for sensitive fields (`user_financial_data`, when `ENCRYPTION_KEY` is set), and no bank-statement scraping.",
        "Plan, then act, then repeat. The product is built around a monthly loop (track, pay bills, review score), not a one-off report.",
        "Unbiased by design. The fix plan never ranks a product because it pays a commission; any future distribution revenue must be disclosed and kept out of the ranking.",
      ],
    },
    { kind: "h", text: "Who it is for" },
    {
      kind: "table",
      head: ["Segment", "Who", "What they need from Finkoin"],
      rows: [
        [
          "Primary: young salaried earners",
          "22–35, metro and tier-2 India, first or second job, ₹4–25 lakh a year",
          "Where do I stand, how much emergency fund and term cover, which loan to close, which tax regime, a monthly budget that sticks.",
        ],
        [
          "Young families",
          "30–45, home loan, kids, parents to support",
          "Insurance gaps (health for parents, term for the earner), goal plans for education and retirement, renewal reminders.",
        ],
        [
          "Friends, flatmates, travellers",
          "Anyone sharing costs",
          "FK Split: groups, settle-up over UPI. This is also how most new users first hear of Finkoin.",
        ],
        [
          "Later: self-employed and freelancers",
          "Irregular income",
          "Cash-flow buffers, advance tax, ITR choice (the tax calculator already hints at the ITR form).",
        ],
      ],
    },
  ],
};

export const userNeedSection: DocSection = {
  id: "user-need",
  title: "Why users need it",
  group: "Business plan",
  summary:
    "The evidence that this is a real need, and how to prove it with Finkoin's own numbers.",
  blocks: [
    {
      kind: "p",
      text: "A need is proven by what people do, not what they say. The case for Finkoin rests on three kinds of evidence: the behaviour we already see in the market, the jobs our features do today, and the metrics that will show product-market fit.",
    },
    { kind: "h", text: "1. Signals from the market" },
    {
      kind: "list",
      items: [
        "People already search for the jobs Finkoin does: SIP, EMI, income-tax and PPF calculators are among the most searched finance terms in India, which is why the calculators are Finkoin's SEO front door.",
        "Bill-splitting is a habit, not a niche: groups of friends, flatmates and trips split costs every week, and Splitwise's move to limit its free tier left room for a free alternative.",
        "Under-insurance is widespread: many families rely on employer health cover and endowment policies instead of term cover. The health check makes this gap visible in minutes.",
        "Each existing app owns one slice (investing, spending, splitting, insurance), so users juggle several apps and still have no single plan.",
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      text: "These are qualitative signals. Before using market-size numbers in a pitch, take them from a cited source (for example AMFI for mutual-fund investor counts, IRDAI for insurance penetration, RBI for credit-card numbers) and record the source here.",
    },
    { kind: "h", text: "2. Jobs the product does today" },
    {
      kind: "table",
      head: ["User job", "Feature that does it", "Proof it is used"],
      rows: [
        [
          "Tell me if my finances are OK",
          "Health check (`/analyse`), 0–100 score",
          "Health checks completed; share of visitors who finish all 7 steps.",
        ],
        [
          "Tell me what to do first",
          "Fix plan (`/analyse/fixplan`)",
          "Fix plans opened and PDFs downloaded; returning to tick items off.",
        ],
        [
          "Help me stick to a budget",
          "Tracker and Month Safety Pulse",
          "Users adding expenses in 3+ separate weeks of a month.",
        ],
        [
          "Don't let me miss a bill or renewal",
          "Bills & EMIs checklist, policy vault reminders",
          "Bills marked paid; renewal reminders opened.",
        ],
        [
          "Split costs with friends",
          "FK Split",
          "Groups created, members invited, settle-ups recorded.",
        ],
        [
          "Help me decide (tax regime, loan vs invest)",
          "Calculators",
          "Calculator sessions, especially from search traffic.",
        ],
      ],
    },
    {
      kind: "h",
      text: "3. How we will know it is a need (product-market fit)",
    },
    {
      kind: "list",
      items: [
        "Retention: 30-day retention of signed-up users at 25% or more, and a flattening retention curve (people who stay keep staying).",
        "Habit: weekly active users who add an expense or split item at least twice a week.",
        "Pull: at least 30% of new signups from referrals, Split invites or direct traffic rather than paid ads.",
        "Willingness to pay: free-to-paid conversion of 2–4% once payments are switched on.",
        "The Sean Ellis question (worth adding to the feedback popup): 40% or more answering 'very disappointed' if Finkoin went away.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "These are targets, not current numbers. The data to measure them already exists: Supabase tables (`users`, `expense_transactions`, `split_*`, `payments`, `feedback`), GA4 events (`lib/analytics.ts`) and Microsoft Clarity. A weekly metrics page in this console is a good next addition.",
    },
  ],
};

export const phasesSection: DocSection = {
  id: "phases",
  title: "Phase-wise roadmap",
  group: "Business plan",
  summary:
    "What each phase solves for the user, what ships and what has to be true before moving on.",
  blocks: [
    {
      kind: "table",
      head: ["Phase", "Problem it solves", "What ships", "Exit criteria"],
      rows: [
        [
          "Phase 0: Foundation (built)",
          "'I don't know where I stand.'",
          "Health check and score, AI fix plan with PDF, 15+ calculators, tracker, bills & EMIs, policy vault, FK Split, rewards, web + PWA + Expo app.",
          "Core flows stable on web and app; this console and its docs in place.",
        ],
        [
          "Phase 1: Launch and habit",
          "'I know what to do but I don't do it.'",
          "Play Store and App Store release, push reminders, Split invite loop, referral rewards, monthly score refresh, onboarding that ends in a first win.",
          "30-day retention ≥ 25%; Split and referrals bring ≥ 30% of signups.",
        ],
        [
          "Phase 2: Monetise",
          "'Give me a plan with real rupee amounts.'",
          "Switch on Razorpay for Pro and Pro Max (monthly and yearly), FK as a discount, Money Map, MF portfolio analysis, smarter debt advice.",
          "Free-to-paid ≥ 2%; refunds under 5%; payments verified only server-side (already the case).",
        ],
        [
          "Phase 3: Act on the plan",
          "'Now help me actually buy the right thing.'",
          "Compare and switch term or health cover, renewals and portability inside the policy vault, goal-based SIP set-up, tax filing hand-off. Every recommendation still ranked by the engine, not by commission.",
          "Licences or partners in place (see Revenue); first distribution revenue without hurting trust scores.",
        ],
        [
          "Phase 4: Family money platform",
          "'Manage money for my whole family.'",
          "Shared family profiles, parents' insurance and retirement, account-aggregator data import (with consent), a paid human-review tier.",
          "Revenue per paying household covers acquisition cost within 12 months.",
        ],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Phases overlap on purpose: retention work never stops, and each phase reuses the engines built in Phase 0. A phase ends when its exit criteria are met, not on a date.",
    },
  ],
};

export const competitionSection: DocSection = {
  id: "competition",
  title: "Competitors and positioning",
  group: "Business plan",
  summary:
    "Who else solves parts of this problem, how Finkoin is different and how it wins.",
  blocks: [
    { kind: "h", text: "Competitor map" },
    {
      kind: "table",
      head: ["Type", "Examples", "What they do well", "Where they leave a gap"],
      rows: [
        [
          "Wealth and investing apps",
          "INDmoney, ET Money, Groww, Kuvera, Zerodha Coin",
          "Investing, net-worth tracking, direct mutual funds.",
          "Built to get you to invest or trade; little on emergency funds, insurance gaps, debt order or monthly budgeting.",
        ],
        [
          "Expense trackers",
          "Walnut / Axio, Money Manager, bank apps",
          "Automatic spend tracking (often from SMS).",
          "Tell you what you spent, not whether your finances are healthy or what to fix.",
        ],
        [
          "Bill splitting",
          "Splitwise",
          "Group expenses and simplified debts.",
          "No link to your own budget or plan; free tier is limited.",
        ],
        [
          "Insurance marketplaces",
          "Policybazaar, Ditto, Acko, InsuranceDekho",
          "Comparing and buying policies.",
          "Sell one product line; advice is tied to the sale.",
        ],
        [
          "Credit and rewards",
          "CRED, card issuers' apps",
          "Paying credit-card bills, rewards.",
          "Focused on card spend, not overall financial health.",
        ],
        [
          "Tax",
          "ClearTax, Income Tax portal",
          "Filing returns.",
          "Once a year; no year-round planning.",
        ],
        [
          "People",
          "SEBI-registered advisers, insurance agents, the family CA",
          "Personal trust, judgement.",
          "Expensive or conflicted; not available every month for a ₹10 lakh earner.",
        ],
      ],
    },
    { kind: "h", text: "What makes Finkoin stand out" },
    {
      kind: "list",
      items: [
        "One plan across everything: income, loans, insurance, investments, goals and spending feed one score and one prioritised fix plan. Competitors each own one slice.",
        "Advice first, products later: the engine ranks what to do by financial impact, never by commission. This is the trust advantage incumbents with a sales model cannot copy easily.",
        "Explainable: numbers come from deterministic code and the AI explains them in plain language, grounded by a RAG knowledge base, so answers are consistent and auditable.",
        "Built for Indian rules: old vs new tax regime, 80C/80D, EPF and PPF, Indian loan and insurance products, ₹ everywhere.",
        "A habit, not a report: tracker, bills & EMIs, renewal reminders, daily tips and rewards bring users back monthly.",
        "A free viral engine: FK Split brings friends in through invites, and every invitee lands next to the health check.",
        "Low cost to serve: Supabase, Vercel and Groq keep the cost per user very low, so the free tier can stay generous.",
      ],
    },
    { kind: "h", text: "How we compete" },
    {
      kind: "table",
      head: ["Against", "Finkoin's move"],
      rows: [
        [
          "Investing apps",
          "Don't compete on trading or fund execution. Be the plan that sits above them: 'before you invest, check your health score'.",
        ],
        [
          "Expense trackers",
          "Turn tracking into a verdict: Month Safety Pulse and the score tell users whether this month's spend is safe for their goals.",
        ],
        [
          "Splitwise",
          "Free, unlimited Split with UPI settle-up, tied into the user's own budget.",
        ],
        [
          "Insurance marketplaces",
          "Show the gap first (how much cover is missing and why), then let the user compare. Neutral ranking is the selling point.",
        ],
        [
          "Advisers",
          "Cover the 80% of advice that is rules-based for free or ₹49 a month; later, a paid human-review tier for the rest.",
        ],
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      text: "Moat today is execution and trust, not technology: the engines are reproducible by others. The defensible assets to build are the user's longitudinal data (score history), habit loops, the Split network and a reputation for unbiased advice.",
    },
  ],
};

export const growthSection: DocSection = {
  id: "growth",
  title: "Growth plan",
  group: "Business plan",
  summary:
    "How Finkoin gets users, keeps them and turns them into advocates, with the metrics that matter at each stage.",
  blocks: [
    { kind: "h", text: "Growth loops" },
    {
      kind: "diagram",
      title: "Three loops that feed each other",
      code: `SEO loop                      Split loop                     Referral loop
─────────                     ──────────                     ─────────────
Search "SIP calculator"       User creates a trip group      User shares code /refer
  → calculator page             → invites friends (link,       → friend joins and adds
  → "check your health"           WhatsApp, email)               first expense
  → health check, signup        → friends join to settle up    → +200 FK / +100 FK
  → blog / learn content        → see the health check         → both climb leaderboard
  → more pages rank             → some become core users       → more sharing`,
    },
    { kind: "h", text: "Acquisition channels" },
    {
      kind: "table",
      head: ["Channel", "What exists today", "Next step"],
      rows: [
        [
          "SEO (calculators, learn, blog)",
          "15+ public calculators, tax-regime calculator, learn and blog pages, sitemap",
          "One calculator or guide per high-intent search term; internal links to the health check.",
        ],
        [
          "FK Split invites",
          "Open links, email invites, app deep links",
          "Make the invite page show the inviter's name and a one-tap join; measure invites per group.",
        ],
        [
          "Referrals",
          "+200 FK for the referrer, +100 FK for the friend once they add a first expense",
          "Show referral progress on the home screen; seasonal boosts (salary day, tax season).",
        ],
        [
          "App stores",
          "Expo app builds",
          "Store listing optimised for 'expense tracker', 'bill split', 'tax calculator'.",
        ],
        [
          "Content and community",
          "Daily tips (in-app, Web Push, Expo push)",
          "Short videos and WhatsApp-friendly cards made from the same tips.",
        ],
        [
          "Partnerships (later)",
          "None yet",
          "Employers (financial wellness benefit), colleges, and creators in personal finance.",
        ],
      ],
    },
    { kind: "h", text: "Retention" },
    {
      kind: "list",
      items: [
        "Monthly ritual: salary day reminder to log the month, review bills and refresh the score.",
        "Visible progress: score history, net-worth trend, fix-plan items ticked off.",
        "Rewards: FK coins (10 FK = ₹1 off Pro), streaks, monthly leaderboard prizes.",
        "Timely nudges: renewals, bill due dates and tips by push, never spam (one tip a day).",
      ],
    },
    { kind: "h", text: "Metrics" },
    {
      kind: "table",
      head: ["Metric", "Why it matters"],
      rows: [
        [
          "North star: households with an active plan",
          "Users with a health check in the last 90 days who did at least one tracked action (expense, bill paid, policy added) this month.",
        ],
        [
          "Activation",
          "Signup → first health score and first expense (the 'finish setup' bonus).",
        ],
        ["Retention", "D1, D7, D30 and monthly cohorts."],
        [
          "Virality",
          "Invites sent per active user; share of signups from Split or referral.",
        ],
        [
          "Monetisation",
          "Free-to-paid conversion, ARPPU, churn of paid plans.",
        ],
        ["Trust", "Feedback rating, refund rate, app-store rating."],
      ],
    },
  ],
};

export const revenueSection: DocSection = {
  id: "revenue",
  title: "Revenue model",
  group: "Business plan",
  summary:
    "How Finkoin makes money now and later, pricing, unit economics and the licences needed.",
  blocks: [
    { kind: "h", text: "Revenue streams" },
    {
      kind: "table",
      head: ["Stream", "Status in the code", "How it earns"],
      rows: [
        [
          "Subscriptions: Pro and Pro Max",
          "Plans page and `lib/planPricing.ts`: Pro ₹49/month or ₹399/year, Pro Max ₹99/month or ₹799/year. Payments are not switched on yet ('test without payment').",
          "Recurring revenue from the AI fix plan with ₹ amounts, goal roadmap, debt advice, Money Map, and (Pro Max) MF portfolio analysis.",
        ],
        [
          "One-time Pro unlock",
          "Razorpay order of ₹99 (`/api/razorpay/create-order`), verified server-side, sets the tier to `pro`.",
          "Low-friction first purchase for users who don't want a subscription.",
        ],
        [
          "FK discount",
          "10 FK = ₹1 off.",
          "Not revenue itself: a reward that lowers the price and pulls engaged users toward paying.",
        ],
        [
          "Insurance distribution (Phase 3)",
          "Policy vault, renewal and transfer intent flows, `insurance_clicks` table. No insurer integration yet.",
          "Commission or referral fee when a user buys or renews term, health or motor cover through a partner.",
        ],
        [
          "Mutual-fund distribution or advisory (Phase 3–4)",
          "Not built.",
          "Either a distributor model (regular plans, trail commission) or a fee-only advisory tier (direct plans). The two conflict; pick one.",
        ],
        [
          "B2B financial wellness (Phase 4)",
          "Not built.",
          "Employers pay per employee per year for Pro access as a benefit.",
        ],
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      text: "Pricing needs one decision: the plans page sells Pro at ₹49/month and Pro Max at ₹99/month, while the Razorpay order charges a flat ₹99 and sets the tier to `pro`. Settle which offer is live before payments are switched on.",
    },
    { kind: "h", text: "Unit economics (illustrative)" },
    {
      kind: "table",
      head: ["Item", "Assumption", "Note"],
      rows: [
        ["Price", "Pro yearly ₹399", "₹33/month effective."],
        [
          "Payment fees",
          "About 2% via Razorpay",
          "Check the current Razorpay rate card.",
        ],
        [
          "AI cost",
          "A few paise per fix plan",
          "Groq open-weights model; numbers come from code, so prompts are small.",
        ],
        [
          "Infra",
          "Supabase + Vercel, scales with usage",
          "Cost per active user stays low; watch database size and push volume.",
        ],
        [
          "Conversion",
          "2–4% of active users",
          "Target, to be measured once payments are on.",
        ],
        [
          "Payback",
          "Organic channels first",
          "Paid ads only once LTV is measured and above 3× acquisition cost.",
        ],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Everything in this table is an assumption to be replaced with real numbers from the `payments` table and provider invoices.",
    },
    { kind: "h", text: "Regulatory checklist (confirm with a lawyer)" },
    {
      kind: "list",
      items: [
        "Personalised investment advice for a fee can require SEBI Investment Adviser registration; general education and calculators usually do not. Keep the fix plan framed as education until this is settled.",
        "Earning insurance commission needs an IRDAI licence (corporate agent, broker or web aggregator) or a licensed partner.",
        "Mutual-fund distribution needs AMFI registration (ARN) and has disclosure rules; it cannot be mixed with fee-only advice for the same client.",
        "Data: the Digital Personal Data Protection Act 2023 applies to the financial data Finkoin stores; consent, deletion (`/api/account/delete`) and purpose limits are already partly in place.",
        "Payments: refunds and terms are published under `/legal/*`; keep them in step with the live pricing.",
      ],
    },
    { kind: "h", text: "Key risks" },
    {
      kind: "table",
      head: ["Risk", "Mitigation"],
      rows: [
        [
          "Users don't pay for advice",
          "Keep a generous free tier; lead with distribution revenue that does not cost the user extra.",
        ],
        [
          "Trust lost through commissions",
          "Rank by the engine, disclose earnings, keep a fee-only path.",
        ],
        [
          "Big players copy the health score",
          "Win on habit, Split network effects and an unbiased brand.",
        ],
        [
          "Regulatory change",
          "Partner with licensed entities first; keep compliance in this console.",
        ],
        [
          "Data breach",
          "RLS on every table, encrypted vault for sensitive fields, admin access limited to `private.console_admins`.",
        ],
      ],
    },
  ],
};
