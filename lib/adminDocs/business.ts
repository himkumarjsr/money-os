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
        "Useful before signup. The health check and 65+ calculators work without an account, and the core check needs no PAN or Aadhaar.",
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
          "Settle Up: groups, settle-up over UPI. This is also how most new users first hear of Finkoin.",
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
          "Settle Up",
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
          "Health check and score, AI fix plan with PDF, 65+ calculators, tracker, bills & EMIs, policy vault, Settle Up, rewards, web + PWA + Expo app.",
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
        "A free viral engine: Settle Up brings friends in through invites, and every invitee lands next to the health check.",
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
          "Settle Up invites",
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
  title: "Pricing and revenue",
  group: "Business plan",
  summary:
    "What Indians pay for money help today, the recommended plans and prices, what Finkoin keeps per sale, running costs and revenue scenarios.",
  blocks: [
    {
      kind: "callout",
      tone: "info",
      text: "Recommendation in one line: keep the core free, sell a ₹399/year Pro and a ₹799/year Family plan, add a one-time ₹99 report, and earn most of the money later from neutral insurance distribution through a licensed partner. Subscriptions build trust and cover costs; distribution builds the business.",
    },
    { kind: "h", text: "What the Indian market pays today" },
    {
      kind: "table",
      head: ["Product", "Price (research, Oct 2026)", "What it tells us"],
      rows: [
        [
          "ET Money Genius",
          "₹249/month at launch (2022), billed quarterly; launch offer ₹49/month",
          "Indians will pay for personalised money guidance, but the anchor that sold was ₹49/month.",
        ],
        [
          "INDmoney Money Manager Plus",
          "About ₹2,500–5,000/year (third-party review, unconfirmed)",
          "A premium wealth tier for richer users; core app is free and earns from broking and distribution.",
        ],
        [
          "Splitwise Pro",
          "About $30–40/year abroad; India price varies by store",
          "Bill splitting alone can be sold, but a free alternative is a strong hook.",
        ],
        [
          "SEBI-registered adviser",
          "Fee cap of about ₹1.51 lakh per family per year (2026 master circular, secondary source)",
          "Human advice is expensive; Finkoin can sit far below this for rules-based advice.",
        ],
        [
          "Indian app spending overall",
          "Record $345M consumer app spend in one quarter, up 35% year on year (Sensor Tower)",
          "Indians are starting to pay for apps, but revenue per user is a fraction of the US. Price low, sell yearly.",
        ],
      ],
    },
    {
      kind: "p",
      text: "Pocket check: Finkoin's core user earns ₹4–25 lakh a year. ₹399 a year is about ₹33 a month, less than one food-delivery order, and under 0.1% of their income. Above ₹100 a month, conversion drops sharply for a product they have not yet seen save them money, so the higher plan must clearly serve a whole family.",
    },
    { kind: "h", text: "Recommended plans" },
    {
      kind: "table",
      head: ["Plan", "Price", "What's in it", "Why this price"],
      rows: [
        [
          "Free",
          "₹0",
          "Health check and score, 65+ calculators, tracker, bills & EMIs, policy vault with reminders, unlimited Settle Up, learn, rewards.",
          "The growth engine. Everything that brings users and friends in stays free.",
        ],
        [
          "Fix Plan report (one-time)",
          "₹99",
          "One AI Fix Plan with ₹ amounts and PDF, refreshable once within 30 days. This is the existing Razorpay ₹99 unlock.",
          "A no-commitment first purchase for people who don't want a subscription.",
        ],
        [
          "Pro",
          "₹49/month or ₹399/year (save 32%)",
          "Unlimited Fix Plan refreshes, goal roadmap, debt payoff plan, Money Map, tax-regime report, PDF and Excel exports.",
          "Matches the ₹49 anchor that worked for ET Money; yearly is the default on the plans page.",
        ],
        [
          "Family (rename Pro Max)",
          "₹99/month or ₹799/year",
          "Everything in Pro for up to 4 members, real mutual-fund portfolio import from a CAMS/KFintech statement (CAS), parents' insurance and retirement view, priority support.",
          "Same household budget split across 4 people: about ₹200 per person per year.",
        ],
        [
          "Expert review add-on (Phase 3)",
          "₹999–1,999 one-time",
          "A SEBI-registered adviser partner reviews the Fix Plan on a call. Finkoin keeps a revenue share.",
          "Far below adviser fees; only launched with a registered partner.",
        ],
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      text: "Before switching payments on: drop 'chat with an advisor' and 'automations, exports, priority support' from the home page until they exist, replace the sample funds on `/portfolio` with real CAS import (or hide the page), and wire both plan buttons to Razorpay instead of the client-only `setSubscription`.",
    },
    { kind: "h", text: "What Finkoin keeps from a ₹399 Pro sale" },
    {
      kind: "table",
      head: ["Step", "Web (Razorpay)", "Android app (Google Play)"],
      rows: [
        ["Price paid by user (GST inclusive)", "₹399", "₹399"],
        ["GST 18% to the government", "−₹61", "−₹61"],
        [
          "Payment fee",
          "−₹9 (about 2% + GST)",
          "−₹51 (15% subscription fee; 11% with user choice billing)",
        ],
        ["Finkoin keeps", "about ₹329", "about ₹287"],
      ],
    },
    {
      kind: "p",
      text: "Sell yearly plans on the web wherever store rules allow it. Razorpay adds about 0.99% for auto-renewing subscriptions; a one-time yearly payment avoids that.",
    },
    { kind: "h", text: "Running costs" },
    {
      kind: "table",
      head: ["Cost", "Estimate", "Per user"],
      rows: [
        [
          "AI (Groq, gpt-oss-20b)",
          "About $0.075 per million input tokens and $0.30 per million output tokens. A Fix Plan is about 3k in and 2k out.",
          "Under ₹0.10 per plan. Negligible.",
        ],
        [
          "Supabase Pro",
          "$25/month plus compute; realistically $40–100/month while growing",
          "About ₹0.30–1 per monthly active user at 10k MAU, falling with scale.",
        ],
        [
          "Vercel, Resend email, Expo push",
          "Roughly $20–60/month at early scale (estimate)",
          "Small.",
        ],
        [
          "Play Store and App Store accounts",
          "$25 once (Google) and $99/year (Apple)",
          "Fixed.",
        ],
        [
          "People: support, content, compliance",
          "The real cost. Budget it from revenue, not from infra savings.",
          "-",
        ],
      ],
    },
    {
      kind: "p",
      text: "So the infrastructure for 50,000 monthly users costs roughly ₹15,000–30,000 a month. One percent of those users paying ₹329 a year already covers it. Costs are not the problem; reaching enough paying users is.",
    },
    { kind: "h", text: "Insurance distribution (the bigger revenue line)" },
    {
      kind: "list",
      items: [
        "IRDAI caps first-year commission on term plans at 40% of the annual premium for all intermediaries, including web aggregators. A proposal would cut it to about 20–25% for long premium terms; plan on the lower number.",
        "Example: a ₹15,000/year term plan at 20% earns the licensed partner about ₹3,000; a lead-sharing deal might give Finkoin ₹1,000–2,000 per policy. Health and motor renewals add smaller, recurring amounts.",
        "Finkoin cannot take commission without its own IRDAI licence (corporate agent or web aggregator) or a licensed partner. Start with a partner.",
        "Keep advice neutral: the health check decides how much cover is needed; the partner's list only shows options. Disclose that Finkoin earns from the partner.",
      ],
    },
    { kind: "h", text: "Revenue scenarios (assumptions, not forecasts)" },
    {
      kind: "table",
      head: ["", "Year 1", "Year 2", "Year 3"],
      rows: [
        ["Signups", "50,000", "5 lakh", "20 lakh"],
        ["Monthly active users", "15,000", "1.5 lakh", "5 lakh"],
        ["Paying (share of MAU)", "2.5% → 375", "3% → 4,500", "4% → 20,000"],
        ["Net per payer per year", "₹330", "₹400 (some Family)", "₹450"],
        ["Subscription revenue", "≈ ₹1.2 lakh", "≈ ₹18 lakh", "≈ ₹90 lakh"],
        [
          "Insurance policies via partner (₹2,000 each)",
          "50 → ₹1 lakh",
          "1,000 → ₹20 lakh",
          "5,000 → ₹1 crore",
        ],
        [
          "Employer plans (₹400 per employee)",
          "-",
          "-",
          "10 firms × 500 → ₹20 lakh",
        ],
        ["Total", "≈ ₹2.2 lakh", "≈ ₹38 lakh", "≈ ₹2.1 crore"],
        ["Infra cost", "≈ ₹1.5–3 lakh", "≈ ₹6–10 lakh", "≈ ₹20–30 lakh"],
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "Year 1 covers infrastructure, not salaries. The business works once there are lakhs of active users, and roughly half the revenue then comes from distribution. Replace every number here with real ones from the `payments` table, GA4 and partner reports as they arrive.",
    },
    { kind: "h", text: "Keeping costs down while giving better service" },
    {
      kind: "list",
      items: [
        "Generate AI only on demand and reuse the saved plan (`user_analysis.ai_fix_plan`) instead of regenerating it; limit free refreshes.",
        "Sell yearly plans on the web to keep the 15% store fee off most revenue.",
        "Put 20–30% of revenue back into service: a support inbox, content, and the adviser partnership.",
        "Use FK coins as the discount lever instead of cash discounts (10 FK = ₹1), so engaged users pay less and casual users pay full price.",
        "Review costs monthly from the Supabase, Vercel and Groq dashboards and keep infra under 15% of revenue.",
      ],
    },
    { kind: "h", text: "Regulatory checklist (confirm with a lawyer)" },
    {
      kind: "list",
      items: [
        "Personalised investment advice for a fee can require SEBI Investment Adviser registration; general education and calculators usually do not. Keep the Fix Plan framed as education until this is settled.",
        "Earning insurance commission needs an IRDAI licence (corporate agent, broker or web aggregator) or a licensed partner.",
        "Mutual-fund distribution needs AMFI registration (ARN) and cannot be mixed with fee-only advice for the same client.",
        "The Digital Personal Data Protection Act 2023 applies to the financial data Finkoin stores; consent, deletion (`/api/account/delete`) and purpose limits are partly in place.",
        "Subscriptions carry 18% GST; refunds and terms under `/legal/*` must match the live pricing.",
      ],
    },
    { kind: "h", text: "Key risks" },
    {
      kind: "table",
      head: ["Risk", "Mitigation"],
      rows: [
        [
          "Users don't pay for advice",
          "Keep a generous free tier and lead with distribution revenue that costs the user nothing extra.",
        ],
        [
          "Trust lost through commissions",
          "Rank by the engine, disclose earnings, keep a fee-only path.",
        ],
        [
          "Commission cuts by IRDAI",
          "Plan on 20% not 40%; grow subscriptions and employer plans alongside.",
        ],
        [
          "Big players copy the health score",
          "Win on habit, Split network effects and an unbiased brand.",
        ],
        [
          "Data breach",
          "RLS on every table, encrypted vault for sensitive fields, admin access limited to `private.console_admins`.",
        ],
      ],
    },
    { kind: "h", text: "Sources" },
    {
      kind: "list",
      items: [
        "ET Money Genius pricing: devdiscourse.com and mediabrief.com launch coverage (2022).",
        "INDmoney Money Manager Plus: foliyo.ai INDmoney review (2026).",
        "SEBI adviser fee cap: cafemutual.com and taxmann.com summary of the 2026 master circular.",
        "IRDAI term commission: cafemutual.com (40% cap), 5paisa.com and upstox.com on the proposed cuts.",
        "Indian app spend: Sensor Tower via techbuzz.ai and Yahoo Finance (2026).",
        "Mutual-fund investors: 6.19 crore unique investors, June 2026 (AMFI data via angelone.in).",
        "Razorpay fees: razorpay.com pricing explainer. Google Play India fees: support.google.com.",
        "Groq and Supabase pricing: third-party trackers (computeprices.com, makerkit.dev); confirm on the vendors' pages.",
      ],
    },
  ],
};
