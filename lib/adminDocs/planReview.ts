import type { DocSection } from "./types";

/**
 * The original v2 plan (Finkoin_Complete_Plan_v2.docx) compared with what
 * the code does today. Statuses were checked against `main` at PR #230
 * (15 Oct 2026); update them as items land.
 */

export const planReviewSection: DocSection = {
  id: "plan-review",
  title: "Original plan vs today",
  group: "Business plan",
  summary:
    "What the v2 plan set out to build, what shipped, what we built beyond it and what is still open.",
  blocks: [
    {
      kind: "p",
      text: "Compared against `Finkoin_Complete_Plan_v2.docx` as of 15 Oct 2026 (`main` at PR #230). Statuses come from the code, not the plan.",
    },
    { kind: "h", text: "What we planned at the start" },
    {
      kind: "list",
      items: [
        "Pitch: an AI personal-finance super app for 25–40 year old Indians, with gamification as the core loop: FK tokens for every money action, 15 tiered badges, weekly / city / age / friend leaderboards, and FK redeemable for discounts and perks.",
        "Money: Free, Pro ₹49 and Pro Max ₹99. The long-term bet was mutual fund distribution: pass NISM, get an ARN, pull real portfolios from CAMS/KFintech, migrate folios and earn trail commission.",
        "Build: a PWA live at finkoin.com in 7 days on Next.js, Supabase, Claude API and Razorpay, with phone OTP login, PostHog, Sentry and MSG91.",
        "Launch: WhatsApp, LinkedIn and Twitter on Day 7, Product Hunt in Week 3, first 100 users.",
      ],
    },
    { kind: "h", text: "Plan item by item" },
    {
      kind: "table",
      head: ["Plan item", "Status today", "Notes"],
      rows: [
        [
          "Financial health analysis",
          "Done, bigger than planned",
          "7-step Analyse, score, buckets, risk quiz, life map, net-worth trajectory, saved report with Retake.",
        ],
        [
          "AI fix plan behind Pro",
          "Done",
          "Runs on Groq, not Claude. Server-side Pro check exists behind `AI_PLAN_REQUIRES_PRO`.",
        ],
        [
          "Goal planning (SSY, education, car rule, retirement)",
          "Done",
          "Inside Analyse, plus a real Goals page with linked SIPs (PR #227).",
        ],
        [
          "15 free calculators",
          "Exceeded",
          "27 calculators, including tax regime FY26, EPF, FIRE and every Post Office scheme.",
        ],
        [
          "Learn: 30 articles",
          "Done",
          "About 38 articles, plus a blog, daily tips and FAQs.",
        ],
        [
          "Pricing ₹49 / ₹99, monthly and yearly",
          "Done exactly",
          "`lib/planPricing.ts`: Pro 49 / 399, Pro Max 99 / 799.",
        ],
        [
          "Razorpay for all 4 plans",
          "Built",
          "Ownership and replay checks added (PR #120). In the Play app, Pro must use Google Play Billing.",
        ],
        [
          "PWA and SEO",
          "Done",
          "Coin icons, offline page, sitemap, per-calculator SEO.",
        ],
        [
          "Legal pages, disclaimer, consent",
          "Mostly",
          "Privacy, terms and legal pages exist. A stored DPDP consent record is still missing.",
        ],
        [
          "Supabase auth",
          "Done, differently",
          "Email and Google sign-in instead of phone OTP; MSG91 not used.",
        ],
        [
          "FK tokens for every action",
          "Redesigned",
          "Two currencies: points (activity, rank the leaderboard, reset monthly) and FK (milestones only, 10 FK = ₹1 discount).",
        ],
        [
          "15 badges with tiers and a share card",
          "Not built",
          "Only the Premium badge exists.",
        ],
        [
          "Weekly, city, age and friend leaderboards",
          "Partly",
          "This month and All time; top 3 each month win 500 / 250 / 100 FK.",
        ],
        [
          "FK redemption (discount, free month, perks)",
          "Not built",
          "FK can't be spent yet; paying for Premium with FK is the first planned use.",
        ],
        [
          "Referrals (200 / 500 FK, 2-week Pro trial)",
          "Partly",
          "200 FK when the friend adds a first expense. No subscribe bonus or trial.",
        ],
        ["Login streaks", "Done", "Points at 7 days, FK every 30 days."],
        [
          "Badge and streak notifications",
          "Done, more",
          "Expo push, in-app notifications and daily tips.",
        ],
        [
          "MF portfolio analysis (Pro Max)",
          "Still a demo",
          "`/portfolio` shows sample funds. No CAMS/KFintech, fund verdicts or folio migration.",
        ],
        [
          "NISM → ARN → CAMS/KFintech → BSE StAR MF",
          "Not started",
          "Was the plan's main revenue line.",
        ],
        [
          "PostHog and Sentry",
          "Not used",
          "Analytics is GA and Microsoft Clarity; no error tracking.",
        ],
        [
          "Live in 7 days, Product Hunt in Week 3",
          "Live on web, not launched",
          "The PWA is at finkoin.com; Play Store release and the public marketing push are still to come.",
        ],
      ],
    },
    { kind: "h", text: "Built beyond the plan" },
    {
      kind: "list",
      items: [
        "Expense Tracker: Needs / Wants / Habits, learned budget caps, Month Safety Pulse, monthly report, cash audit and Money Map (Pro).",
        "Settle Up: groups, invites, settle via UPI, cash or bank.",
        "Bills & renewals calendar, obligations with push reminders, credit-card bill cycles.",
        "My Policies vault with import from Analyse and insurance RD tracking.",
        "Net worth breakup on Profile.",
        "Native Expo app at parity with the PWA (the plan only had a PWA).",
        "Premium themes (24K gold, Violet Satin), coin-flip splash, WCAG AA dark mode.",
        "This admin console.",
        "Security fixes from the pre-launch audit, about 950 unit tests and Playwright E2E.",
      ],
    },
    {
      kind: "callout",
      tone: "info",
      text: "The plan was a health check + gamification + MF distribution app. What exists is closer to a daily money manager (track, split, bills, goals, policies) with the health check on top. Good for retention, but the plan's revenue story (trail commission) hasn't moved.",
    },
    { kind: "h", text: "Still to do before a real launch" },
    {
      kind: "list",
      ordered: true,
      items: [
        "SEBI: keep the AI plan educational, or partner with an RIA. The paid personalised plan is the biggest regulatory risk.",
        "IRDAI: hide Transfer to Finkoin, the placeholder agent code and the commission text.",
        "DPDP: an unticked consent checkbox with a stored consent record; disclose Clarity and mask financial screens.",
        "Confirm RLS on every live table and move reward grants server-side.",
        "Add CI on every PR and error tracking (Sentry, as the plan intended).",
        "Google Play: personal vs organization account, Play Billing for Pro, Data safety form.",
      ],
    },
    { kind: "h", text: "Plan items worth finishing" },
    {
      kind: "list",
      items: [
        "Real portfolio via CAS PDF import. Needs no ARN and replaces the last demo screen.",
        "FK redemption against Premium, so FK has visible value.",
        "Badges and a share card: cheap, and the plan's own word-of-mouth engine.",
        "Referral subscribe bonus and a Pro trial for referred friends.",
      ],
    },
    { kind: "h", text: "Plan items worth re-deciding" },
    {
      kind: "list",
      items: [
        "MF distribution: become a distributor (ARN), an RIA, or partner. Selling funds sits awkwardly with the unbiased-by-design principle.",
        "City, age and friend leaderboards: monthly and all-time may be enough until each city has enough users.",
        "Phone OTP: email and Google work; OTP adds SMS cost and fraud risk.",
        "Revenue projections: reset Month 1–12 targets against real user numbers.",
      ],
    },
  ],
};
