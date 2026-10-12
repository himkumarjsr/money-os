import type { AppIconName } from "@/components/ui/AppIcon";

/**
 * Copy for the public /features page. Keep claims educational: Finkoin is not
 * a SEBI-registered adviser or an IRDAI-licensed intermediary, so no feature
 * here may promise investment advice, fund picks, or insurance selling.
 */

export const FEATURE_TAGS = [
  "Free",
  "Pro",
  "Planning",
  "Tracking",
  "Tax",
  "Calculators",
  "Groups",
  "Insurance",
  "Learning",
  "Rewards",
  "Privacy",
  "Mobile",
] as const;

export type FeatureTag = (typeof FEATURE_TAGS)[number];

export type FeatureCategory =
  | "Understand"
  | "Plan"
  | "Track"
  | "Share"
  | "Grow";

export type FinkoinFeature = {
  id: string;
  name: string;
  category: FeatureCategory;
  icon: AppIconName;
  /** One-line marketing hook. */
  headline: string;
  /** What it does, in plain words. */
  body: string;
  /** Why it is different (the USP), shown as bullets. */
  highlights: readonly string[];
  tags: readonly FeatureTag[];
  href: string;
  cta: string;
};

export const FEATURE_USPS = [
  {
    icon: "rupee",
    title: "Free to start",
    body: "The health check, calculators, tracker and Split cost nothing.",
  },
  {
    icon: "lock",
    title: "No PAN, no Aadhaar",
    body: "The core check runs on numbers you type. No KYC to get started.",
  },
  {
    icon: "target",
    title: "Built for India",
    body: "Old vs new tax regime, PPF, EPF, NPS, Post Office schemes and ₹ everywhere.",
  },
  {
    icon: "check",
    title: "Maths you can trust",
    body: "Scores and numbers come from fixed rules in code. AI only explains them.",
  },
] as const satisfies readonly {
  icon: AppIconName;
  title: string;
  body: string;
}[];

export const FINKOIN_FEATURES: readonly FinkoinFeature[] = [
  {
    id: "health-check",
    name: "Financial Health Check",
    category: "Understand",
    icon: "chart",
    headline: "Know where you stand in about 5 minutes",
    body: "Answer a few questions about income, spends, savings, loans and cover. Finkoin gives you a health score and shows what is strong and what needs attention.",
    highlights: [
      "Emergency fund, insurance gap and net worth in one view",
      "Clear checklist of what to look at first",
      "No PAN or Aadhaar needed",
    ],
    tags: ["Free", "Planning"],
    href: "/analyse",
    cta: "Start free check",
  },
  {
    id: "fix-plan",
    name: "Personal Fix Plan",
    category: "Plan",
    icon: "sparkle",
    headline: "A step-by-step plan, explained in plain words",
    body: "Turn your health check into an ordered list of steps: build the emergency fund, close cover gaps, tackle costly debt, then plan goals. The order comes from fixed rules; AI explains each step simply.",
    highlights: [
      "Priority order computed in code, not guessed",
      "Plain-language explanations you can act on yourself",
      "Download your plan as a PDF",
    ],
    tags: ["Pro", "Planning"],
    href: "/plans",
    cta: "See plans",
  },
  {
    id: "tax-regime",
    name: "Old vs New Tax Regime",
    category: "Plan",
    icon: "receipt",
    headline: "See which regime leaves more in your pocket",
    body: "Compare both regimes side by side with HRA, 80C, NPS and capital gains, set up for FY 2025-26 planning.",
    highlights: [
      "Side-by-side tax under both regimes",
      "Covers HRA, 80C, 80D, NPS and equity gains",
      "Short explainers on every field",
    ],
    tags: ["Free", "Tax", "Calculators"],
    href: "/calculators/tax-regime-2026",
    cta: "Compare regimes",
  },
  {
    id: "calculators",
    name: "20+ Money Calculators",
    category: "Plan",
    icon: "bulb",
    headline: "Every Indian money question, one calculator away",
    body: "SIP, SWP, EMI, PPF, FIRE number, emergency fund, home and car loans, rent vs buy, and every Post Office scheme with current rates.",
    highlights: [
      "Post Office TD, RD, MIS, KVP, NSC, SCSS and Sukanya",
      "Loan schedules you can export to Excel",
      "Fast on mobile, no sign-in needed",
    ],
    tags: ["Free", "Calculators", "Planning"],
    href: "/calculators",
    cta: "Open calculators",
  },
  {
    id: "tracker",
    name: "Monthly Tracker",
    category: "Track",
    icon: "notebook",
    headline: "One monthly view of income, spends and dues",
    body: "Log spends by category and watch your month at a glance. The budget learns from how you actually spend, and a checklist keeps EMIs, rent, SIPs and card bills on time.",
    highlights: [
      "Smart budget that adapts to your spending",
      "Month Safety Pulse shows if the month is on track",
      "Reminders for bills, EMIs and credit card dues",
    ],
    tags: ["Free", "Tracking"],
    href: "/tracker",
    cta: "Open tracker",
  },
  {
    id: "split",
    name: "FK Split",
    category: "Share",
    icon: "users",
    headline: "Split trips, flats and dinners without awkward maths",
    body: "Create a group, share an invite link, and add who paid. Finkoin simplifies the balances so everyone knows who owes whom.",
    highlights: [
      "Invite friends with one link",
      "Split equally, by exact amounts, percentages or shares",
      "Simplified settle-up view",
    ],
    tags: ["Free", "Groups"],
    href: "/split",
    cta: "Start a group",
  },
  {
    id: "goals",
    name: "Goal Roadmap",
    category: "Plan",
    icon: "target",
    headline: "Give every rupee a job",
    body: "Map goals like a home, a car, your child's education or a dream trip, and see how much you would need to set aside each month to get there.",
    highlights: [
      "Ready-made goals for common life plans",
      "Monthly amount needed for each goal",
      "Fits around your emergency fund and loans",
    ],
    tags: ["Pro", "Planning"],
    href: "/plans",
    cta: "See plans",
  },
  {
    id: "policies",
    name: "My Policies",
    category: "Track",
    icon: "shield",
    headline: "All your insurance policies in one place",
    body: "Keep health, term, motor and other policies together with cover amounts, premiums and renewal dates, so nothing lapses by accident.",
    highlights: [
      "Renewal dates and premiums at a glance",
      "Cover amount and insurer for each policy",
      "Quick link to your insurer's renewal page",
    ],
    tags: ["Free", "Insurance", "Tracking"],
    href: "/policies",
    cta: "Add a policy",
  },
  {
    id: "net-worth",
    name: "Net Worth & Assets",
    category: "Track",
    icon: "wallet",
    headline: "See everything you own and owe",
    body: "Add mutual funds, FDs, PPF, EPF, NPS, gold and property once. Finkoin keeps your net worth up to date across the app.",
    highlights: [
      "Built for Indian assets like EPF, PPF and NPS",
      "Net worth projection over the years",
      "Hide amounts with one tap when others are around",
    ],
    tags: ["Free", "Tracking", "Privacy"],
    href: "/investments",
    cta: "Add assets",
  },
  {
    id: "learn",
    name: "Learn",
    category: "Grow",
    icon: "doc",
    headline: "Money basics, minus the jargon",
    body: "Short guides on tax, saving, loans, insurance and investing, written for Indian readers.",
    highlights: [
      "Bite-size articles with FAQs",
      "Linked to the calculator for each topic",
      "Free for everyone",
    ],
    tags: ["Free", "Learning"],
    href: "/learn",
    cta: "Start learning",
  },
  {
    id: "rewards",
    name: "Finkoin Keys (FK)",
    category: "Grow",
    icon: "coin",
    headline: "Build good money habits and get rewarded",
    body: "Earn FK for using Finkoin regularly, keep streaks going, climb the leaderboard and invite friends. FK are in-app rewards with no cash value.",
    highlights: [
      "Daily streaks and badges",
      "Leaderboard with friends",
      "Referral rewards when friends join",
    ],
    tags: ["Free", "Rewards"],
    href: "/rewards",
    cta: "See rewards",
  },
  {
    id: "app",
    name: "Installable App",
    category: "Grow",
    icon: "phone",
    headline: "Feels like an app, no app store needed",
    body: "Add Finkoin to your home screen on Android or iPhone. It opens full screen, sends helpful reminders, and shows a fallback page when you are offline.",
    highlights: [
      "Install from the browser in one tap",
      "Push reminders for bills and tips",
      "Light, fast and mobile-first",
    ],
    tags: ["Free", "Mobile"],
    href: "/",
    cta: "Get started",
  },
];
