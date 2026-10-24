import type { DocSection } from "./types";

/**
 * The market-leader plan (24 Oct 2026, six docs) turned into tick boxes for
 * /admin/plan-checklist. Ticks live in private.plan_checklist_ticks
 * (migration 060), keyed by item id, so keep ids stable: rewording an item
 * is fine, changing its id drops its tick. Server-only like the rest of
 * lib/adminDocs; the client component gets the items as props.
 */

export type PlanChecklistItem = { id: string; text: string };

export type PlanChecklistStep = {
  title: string;
  items: readonly PlanChecklistItem[];
};

export type PlanChecklistDoc = {
  id: string;
  title: string;
  steps: readonly PlanChecklistStep[];
};

export const PLAN_CHECKLIST: readonly PlanChecklistDoc[] = [
  {
    id: "licences",
    title: "1. Licences and regulatory path",
    steps: [
      {
        title: "Step 0: Clear your Walmart job first",
        items: [
          {
            id: "lic-walmart-contract",
            text: "Read the employment contract: moonlighting, conflict of interest and IP assignment clauses",
          },
          {
            id: "lic-walmart-noc",
            text: "Disclose Finkoin to the manager or ethics team and get a written OK (NOC)",
          },
          {
            id: "lic-walmart-personal",
            text: "Build only on personal time and devices; never use Walmart data, contacts or tools",
          },
        ],
      },
      {
        title: "Step 1: Register the company",
        items: [
          {
            id: "lic-company-pvtltd",
            text: "Form a Private Limited company through SPICe+ (two directors, one Indian address)",
          },
          {
            id: "lic-company-pan-bank",
            text: "PAN, TAN and a current bank account in the company name",
          },
          { id: "lic-company-gst", text: "GST registration" },
          { id: "lic-company-dpiit", text: "DPIIT Startup India recognition" },
          { id: "lic-company-udyam", text: "Udyam (MSME) registration" },
          {
            id: "lic-company-play-org",
            text: "D-U-N-S number, then a Google Play organization account",
          },
          {
            id: "lic-company-trademark",
            text: 'Trademark filing for "Finkoin" in Classes 9 and 36',
          },
        ],
      },
      {
        title: "Step 2: Ship now, no licence needed",
        items: [
          {
            id: "lic-ship-ai-educational",
            text: "AI explanations kept educational, not personal investment advice",
          },
          { id: "lic-ship-cas", text: "Portfolio from CAS upload" },
          {
            id: "lic-ship-import",
            text: "Statement / SMS / email import (file the Play SMS permission declaration)",
          },
          { id: "lic-ship-upi-intent", text: '"Pay" via UPI intent' },
          {
            id: "lic-ship-challan",
            text: "Challan check linking to Parivahan",
          },
          {
            id: "lic-ship-renewals",
            text: "Renewal reminders (insurance, PUC, FASTag, licence, cards)",
          },
        ],
      },
      {
        title: "Step 3: Bill payments through BBPS",
        items: [
          {
            id: "lic-bbps-aggregator",
            text: "Sign with a BBPOU aggregator (Cashfree, Razorpay, Setu or a bank)",
          },
          {
            id: "lic-bbps-kyc",
            text: "Submit company KYC, PAN, GST, financials and promoter KYC",
          },
          {
            id: "lic-bbps-certify",
            text: "Build on their API and pass NPCI certification",
          },
        ],
      },
      {
        title: "Step 4: Referral partnerships",
        items: [
          {
            id: "lic-ref-cards",
            text: "Credit card / loan referral or DSA agreement with banks or aggregators",
          },
          { id: "lic-ref-demat", text: "Join a broker partner programme" },
          {
            id: "lic-ref-insurance",
            text: "Partner with an IRDAI-licensed broker; check payouts against IRDAI rules",
          },
        ],
      },
      {
        title: "Step 5: Mutual fund distribution (AMFI ARN)",
        items: [
          { id: "lic-arn-nism", text: "Pass the NISM Series V-A exam" },
          {
            id: "lic-arn-individual",
            text: "Get an individual ARN from AMFI",
          },
          {
            id: "lic-arn-corporate",
            text: "Get a corporate ARN for the company",
          },
          {
            id: "lic-arn-platform",
            text: "Transact through BSE StAR MF or MF Utilities",
          },
        ],
      },
      {
        title: "Step 6: SEBI Registered Investment Adviser",
        items: [
          {
            id: "lic-ria-certs",
            text: "NISM certifications for RIA",
          },
          {
            id: "lic-ria-register",
            text: "Register as an individual RIA (deposit, part-time disclosures)",
          },
          {
            id: "lic-ria-corporate",
            text: "Move to a corporate RIA past 300 clients or ₹3 crore fees",
          },
        ],
      },
      {
        title: "Step 7: Bank linking with Account Aggregator",
        items: [
          {
            id: "lic-aa-route",
            text: "Pick a route: partner FIU (fast) or own FIU via RIA",
          },
          {
            id: "lic-aa-sign",
            text: "Sign with one or more AAs through a provider like Setu",
          },
        ],
      },
      {
        title: "Step 8: In-app UPI payments",
        items: [
          {
            id: "lic-upi-gateway",
            text: "Payment gateway for Finkoin and partner bills",
          },
          { id: "lic-upi-psp", text: "PSP bank UPI SDK / plugin" },
          { id: "lic-upi-tpap", text: "TPAP (own UPI app), after funding" },
        ],
      },
      {
        title: "Step 9: Your own insurance licence",
        items: [
          {
            id: "lic-ins-final-rules",
            text: "Check the final IRDAI intermediary rules (draft June 2026)",
          },
          {
            id: "lic-ins-licence",
            text: "Apply as corporate agent or web aggregator",
          },
        ],
      },
      {
        title: "Always-on compliance",
        items: [
          {
            id: "lic-comp-dpdp",
            text: "DPDP: consent screen, privacy policy, grievance officer, deletion, breach reporting",
          },
          {
            id: "lic-comp-play",
            text: "Play Store: financial features declaration, Data safety form, Play Billing for Pro",
          },
          {
            id: "lic-comp-localisation",
            text: "Keep payment data in India (RBI data localisation)",
          },
          {
            id: "lic-comp-ads",
            text: "No guaranteed-return claims; follow ASCI and SEBI ad rules",
          },
        ],
      },
    ],
  },
  {
    id: "rollout",
    title: "2. Feature rollout order",
    steps: [
      {
        title: "Phase 0: Get launch-ready (weeks 0 to 4)",
        items: [
          {
            id: "roll-p0-audit",
            text: "Close the open items in the pre-launch audit (security, consent, SEBI/IRDAI wording)",
          },
          { id: "roll-p0-trust-page", text: "Publish the Trust page" },
          {
            id: "roll-p0-done",
            text: "Done when: Play organization account live, privacy policy and grievance officer published",
          },
        ],
      },
      {
        title: 'Phase 1: "See all my money" (months 1 to 3)',
        items: [
          {
            id: "roll-p1-cas",
            text: "Portfolio from CAS upload with XIRR, asset mix, overlap, expense ratio, regular vs direct savings",
          },
          {
            id: "roll-p1-import",
            text: "Auto expense import from statements and Android SMS, auto-categorised",
          },
          {
            id: "roll-p1-pay",
            text: 'Bills calendar with a "Pay" button (UPI intent)',
          },
          { id: "roll-p1-renewals", text: "Renewals hub with reminders" },
          { id: "roll-p1-challan", text: "Challan check" },
          {
            id: "roll-p1-report-card",
            text: "Monthly money report and health score share card",
          },
          {
            id: "roll-p1-done",
            text: "Done when: 40% of new users import a statement or CAS in week one",
          },
        ],
      },
      {
        title: 'Phase 2: "Pay and save" through partners (months 3 to 6)',
        items: [
          {
            id: "roll-p2-bbps",
            text: "BBPS bill pay inside Finkoin, credit cards first",
          },
          {
            id: "roll-p2-tracker",
            text: "Every payment lands in the tracker automatically",
          },
          {
            id: "roll-p2-card-referral",
            text: '"Best card for your spending" referral',
          },
          {
            id: "roll-p2-insurance",
            text: "Insurance check-up with broker partner",
          },
          { id: "roll-p2-demat", text: "Demat referral" },
          {
            id: "roll-p2-done",
            text: "Done when: 20% of monthly actives pay a bill in Finkoin",
          },
        ],
      },
      {
        title: 'Phase 3: "Grow my money" (months 6 to 12)',
        items: [
          {
            id: "roll-p3-mf",
            text: "Mutual fund investing (start, stop, switch SIPs)",
          },
          { id: "roll-p3-folio", text: "Folio-number lookup with consent" },
          {
            id: "roll-p3-pro-plan",
            text: "Paid personal plan (Pro) once RIA is in place",
          },
          { id: "roll-p3-credit-score", text: "Credit score and report" },
          { id: "roll-p3-goals", text: "Goals tracker with linked SIPs" },
          {
            id: "roll-p3-done",
            text: "Done when: 5% of actives invest through Finkoin; Pro conversion 3%",
          },
        ],
      },
      {
        title: 'Phase 4: "Fully automatic" (months 9 to 15)',
        items: [
          { id: "roll-p4-aa", text: "Account Aggregator bank linking" },
          { id: "roll-p4-networth", text: "Real-time net worth" },
          {
            id: "roll-p4-alerts",
            text: "Smart alerts (low balance, unusual spends, idle cash)",
          },
          { id: "roll-p4-family", text: "Family / household view" },
          {
            id: "roll-p4-done",
            text: "Done when: 50% of actives have a linked account",
          },
        ],
      },
      {
        title: 'Phase 5: "One app for everything" (months 15 to 24)',
        items: [
          { id: "roll-p5-upi", text: "In-app UPI through a PSP bank SDK" },
          { id: "roll-p5-agency", text: "Own insurance corporate agency" },
          {
            id: "roll-p5-tax",
            text: "Tax filing via ERI partner and capital gains statement",
          },
          { id: "roll-p5-vault", text: "Document vault and nominee file" },
          {
            id: "roll-p5-rewards",
            text: "Rewards funded by partner commissions",
          },
        ],
      },
    ],
  },
  {
    id: "trust",
    title: "3. Building trust",
    steps: [
      {
        title: "Step 1: Look like a real company",
        items: [
          {
            id: "trust-footer",
            text: "Company name, CIN, GST and address in app footer and website",
          },
          {
            id: "trust-about",
            text: 'Named founder with photo and LinkedIn on an "About" page',
          },
          {
            id: "trust-grievance",
            text: "Grievance officer with email and response time published",
          },
          { id: "trust-email", text: "Business email on own domain" },
          { id: "trust-dpiit-badge", text: "Startup India (DPIIT) badge" },
        ],
      },
      {
        title: "Step 2: Show every licence and partner",
        items: [
          {
            id: "trust-licences-page",
            text: '"Licences and partners" page live',
          },
          {
            id: "trust-bharat-connect",
            text: "Bharat Connect logo on bill pay screens",
          },
        ],
      },
      {
        title: "Step 3: Make privacy visible",
        items: [
          {
            id: "trust-data-promise",
            text: "Data promise in plain words, published",
          },
          {
            id: "trust-consent-screen",
            text: "Consent screen before any import",
          },
          {
            id: "trust-delete-export",
            text: 'One-tap delete that really deletes, plus "Download my data"',
          },
        ],
      },
      {
        title: "Step 4: Prove security",
        items: [
          { id: "trust-app-lock", text: "App lock with biometric / PIN" },
          {
            id: "trust-encryption-note",
            text: "Encryption at rest and in transit stated on the Trust page",
          },
          {
            id: "trust-vapt",
            text: "Third-party security audit (VAPT) done, dated and summarised",
          },
          { id: "trust-iso", text: "ISO 27001 and RBI-style IT audit" },
          { id: "trust-bug-bounty", text: "Bug bounty / security email" },
        ],
      },
      {
        title: "Step 5: Be on the user's side",
        items: [
          {
            id: "trust-how-we-earn",
            text: '"How we earn" shown on every offer',
          },
          {
            id: "trust-rank-by-fit",
            text: "Products ranked by fit, never by commission",
          },
          {
            id: "trust-no-dark-patterns",
            text: "No dark patterns; easy Pro cancel",
          },
        ],
      },
      {
        title: "Step 6: Social proof",
        items: [
          {
            id: "trust-review-prompt",
            text: "In-app review prompt after a win",
          },
          { id: "trust-stories", text: "Real user stories with permission" },
          {
            id: "trust-savings-number",
            text: 'Monthly "users saved ₹X in late fees" number',
          },
          {
            id: "trust-advisor-board",
            text: "Advisor board (SEBI RIA, CA, ex-banker) on the site",
          },
          {
            id: "trust-pr",
            text: "PR in Mint, Moneycontrol, YourStory, Inc42",
          },
        ],
      },
      {
        title: "Step 7: Teach before you sell",
        items: [
          {
            id: "trust-explainers",
            text: "Weekly LinkedIn / Instagram explainers",
          },
          {
            id: "trust-reddit",
            text: "Answer questions in Reddit finance communities",
          },
        ],
      },
      {
        title: "Step 8: Support that answers",
        items: [
          {
            id: "trust-support",
            text: "WhatsApp and email support with a reply-time promise",
          },
          {
            id: "trust-payment-status",
            text: "Status page for bill payments",
          },
          {
            id: "trust-refund-rules",
            text: "Refund and failed-payment rules in simple words",
          },
        ],
      },
    ],
  },
  {
    id: "audience",
    title: "4. Target audience and competitors",
    steps: [
      {
        title: "Reach each group",
        items: [
          {
            id: "aud-salaried",
            text: 'Busy salaried planner: "See your real net worth in 2 minutes, from one CAS PDF"',
          },
          {
            id: "aud-first-salary",
            text: 'First salary: "Your first salary plan: where every rupee should go"',
          },
          {
            id: "aud-family",
            text: 'Family money manager: "Never miss a bill or renewal for your whole family"',
          },
        ],
      },
    ],
  },
  {
    id: "growth",
    title: "5. User acquisition and growth",
    steps: [
      {
        title: "Step 1: Free channels first (months 0 to 3)",
        items: [
          {
            id: "grow-seo-save",
            text: '"Save this to Finkoin" button on every calculator result',
          },
          {
            id: "grow-linkedin",
            text: "Founder LinkedIn posts, 3 a week",
          },
          { id: "grow-reddit", text: "Reddit and Quora answers" },
          { id: "grow-whatsapp", text: "WhatsApp channel: a tip a day" },
          {
            id: "grow-aso",
            text: "App Store Optimisation: title, screenshots, 30-second video",
          },
          {
            id: "grow-product-hunt",
            text: "Product Hunt and Indie Hackers launch",
          },
        ],
      },
      {
        title: "Step 2: Built-in growth loops (months 1 to 6)",
        items: [
          {
            id: "grow-split-invites",
            text: "One-tap Split join with a track-your-money nudge",
          },
          { id: "grow-referral", text: "Referral with FK coins" },
          {
            id: "grow-share-cards",
            text: 'Shareable cards (score, savings, "Money Wrapped")',
          },
          { id: "grow-family-invite", text: "Family invite" },
          {
            id: "grow-free-check",
            text: "Free health check with no signup",
          },
        ],
      },
      {
        title: "Step 3: Hooks (months 3 to 9)",
        items: [
          {
            id: "grow-hidden-money",
            text: '"Find your hidden money" CAS hook',
          },
          { id: "grow-late-fee", text: '"Never pay a late fee again" hook' },
          { id: "grow-tax-season", text: "Tax season campaign" },
          { id: "grow-festival", text: "Festival / bonus season campaign" },
        ],
      },
      {
        title: "Step 4: Creators and partnerships (months 6 to 18)",
        items: [
          {
            id: "grow-creators",
            text: "Finance micro-creators, paid per install",
          },
          {
            id: "grow-corporate",
            text: "Corporate financial wellness (with written approval)",
          },
          { id: "grow-colleges", text: "College first-salary workshops" },
          { id: "grow-co-marketing", text: "Partner co-marketing" },
          { id: "grow-newsletters", text: "Newsletter swaps" },
        ],
      },
      {
        title: "Step 5: Paid ads, carefully (from month 9)",
        items: [
          {
            id: "grow-ads-metrics",
            text: "Know CPI, import rate and 90-day revenue per user",
          },
          {
            id: "grow-ads-start",
            text: "Start ads only where 12-month revenue ≥ 3× acquisition cost",
          },
        ],
      },
      {
        title: "Step 6: Keep users",
        items: [
          { id: "grow-activation", text: "Week-1 activation 40%" },
          { id: "grow-retention", text: "Day-30 retention 25%" },
          { id: "grow-mau-ratio", text: "Monthly active / registered 25%" },
          { id: "grow-rating", text: "Play Store rating 4.5+" },
          {
            id: "grow-daily-summary",
            text: "Daily spending summary at a user-picked time",
          },
          { id: "grow-weekly-card", text: '"Your week in money" card' },
          {
            id: "grow-event-nudges",
            text: "Event nudges: bill due, renewal, SIP missed, salary credited",
          },
        ],
      },
    ],
  },
  {
    id: "business",
    title: "6. Business plan",
    steps: [
      {
        title: "Funding path",
        items: [
          {
            id: "biz-bootstrap",
            text: "Bootstrap with costs under ₹2 lakh a month",
          },
          {
            id: "biz-seed-fund",
            text: "Startup India Seed Fund / incubator",
          },
          {
            id: "biz-angel",
            text: "Angel round at 25,000 MAU and 30%+ day-30 retention",
          },
          { id: "biz-seed", text: "Pre-seed / Seed round" },
          {
            id: "biz-full-time",
            text: "Decide when to go full-time (12 months runway or ₹5 lakh+ monthly revenue)",
          },
        ],
      },
      {
        title: "Team to hire",
        items: [
          { id: "biz-hire-backend", text: "Backend / payments engineer" },
          {
            id: "biz-hire-compliance",
            text: "Compliance lead or fintech lawyer",
          },
          { id: "biz-hire-growth", text: "Growth marketer" },
          { id: "biz-hire-support", text: "Customer support" },
          { id: "biz-hire-adviser", text: "SEBI-certified adviser" },
          {
            id: "biz-hire-mobile",
            text: "Mobile engineer, designer, data analyst",
          },
        ],
      },
      {
        title: "Milestones",
        items: [
          { id: "biz-ms-company", text: "Company registered and Walmart OK" },
          { id: "biz-ms-10k", text: "10,000 users and 40% activation" },
          { id: "biz-ms-first-bbps", text: "First BBPS bill paid in-app" },
          {
            id: "biz-ms-first-commission",
            text: "First partner commission received",
          },
          { id: "biz-ms-1l-revenue", text: "₹1 lakh monthly revenue" },
          { id: "biz-ms-1l-users", text: "1 lakh users" },
          { id: "biz-ms-ria", text: "RIA registration" },
          { id: "biz-ms-aa", text: "Account Aggregator live" },
          { id: "biz-ms-25l-revenue", text: "₹25 lakh monthly revenue" },
        ],
      },
    ],
  },
];

export function allPlanChecklistIds(): string[] {
  return PLAN_CHECKLIST.flatMap((d) =>
    d.steps.flatMap((s) => s.items.map((i) => i.id)),
  );
}

export const planChecklistSection: DocSection = {
  id: "plan-checklist",
  title: "Plan checklist",
  group: "Business plan",
  summary:
    "Every step of the market-leader plan as a tick box. All admins can see it; only the super admin can tick.",
  blocks: [
    {
      kind: "callout",
      tone: "info",
      text: "Ticks are saved in Supabase (`private.plan_checklist_ticks`, migration 060). Only a super admin (himkumarjsr@gmail.com) can change them, and the database checks that on every write, so other admins see the boxes read-only.",
    },
    {
      kind: "api",
      api: {
        method: "GET/POST",
        path: "/api/admin/plan-checklist",
        summary:
          "GET returns the ticks. POST ticks or unticks one item and returns the ticks.",
        auth: "Session; console admin to read (others get 404), super admin to write (others get 403)",
        rateLimit: "300/hr per admin (POST)",
        request: `{ "itemId": "lic-company-gst", "done": true }`,
        response: `{ "ticks": [{ "itemId": "lic-company-gst", "doneBy": "himkumarjsr@gmail.com", "doneAt": "…" }], "canEdit": true }`,
        errors: [
          ["400", "Unknown item"],
          ["401", "Not authenticated"],
          ["403", "Only the super admin can tick items"],
          ["404", "Not an admin"],
          ["429", "Rate limited"],
        ],
      },
    },
    {
      kind: "api",
      api: {
        method: "RPC",
        path: "admin_console_is_super_admin() · admin_console_plan_ticks() · admin_console_set_plan_tick(p_item_id, p_done)",
        summary:
          "Invoker wrappers over SECURITY DEFINER functions in the private schema. Reads need a console admin; the write needs a super admin.",
        auth: "authenticated role only (anon has no EXECUTE)",
        errors: [
          ["42501", "Admins only / super admin only"],
          ["22023", "Invalid item id"],
        ],
      },
    },
  ],
};
