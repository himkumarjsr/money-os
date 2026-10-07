/**
 * Per-goal reference content for the goal advisor. Source of truth for the
 * rows inserted into `finkoin_knowledge` by
 * supabase/migrations/039_goal_knowledge.sql (keywords `goal:<type>`), and the
 * bundled fallback when that table is missing or empty. Educational only —
 * Finkoin doesn't sell any of these products.
 */
import type { GoalType } from "@/lib/goalDetection";

export type GoalKnowledgeEntry = {
  title: string;
  content: string;
  /** `goal:<type>` tags; `goal:any` applies to every goal. */
  keywords: string[];
};

export const GOAL_KNOWLEDGE_CATEGORY = "goal_planning";

export const GOAL_KNOWLEDGE: GoalKnowledgeEntry[] = [
  {
    title: "Match the instrument to when the money is needed",
    content:
      "Money needed within 1 year belongs in a savings account, liquid fund or sweep-in FD — capital safety beats returns. 1–3 years: bank FDs, short-duration debt funds or arbitrage funds. 3–7 years: hybrid/balanced funds and bonds. 7+ years: equity index funds (Nifty 50 first, then flexi-cap) plus PPF/EPF/NPS. As a goal gets within 2–3 years of its date, shift its corpus step by step from equity to debt so a market fall can't derail it. Gold is a 5–10% hedge, never a goal of its own.",
    keywords: ["goal:any"],
  },
  {
    title: "How returns are taxed (FY2024-25 onwards)",
    content:
      "Equity funds: gains on units held over 12 months are long-term, taxed at 12.5% above ₹1.25 lakh a year; under 12 months, 20%. Debt funds bought after 1 April 2023 are taxed at your income slab regardless of holding period, like FD interest. Arbitrage funds are taxed as equity, which makes them more tax-efficient than FDs for people in higher slabs on holds of 1–3 years. PPF and SSY interest and maturity are tax-free.",
    keywords: ["goal:any"],
  },
  {
    title: "Child education: plan for education inflation",
    content:
      "Higher-education costs in India have historically risen around 8–10% a year, faster than general inflation, so a target in today's rupees grows quickly. For a child under 10, the fund has a long runway — equity index SIPs do most of the work, stepped up yearly with income. From about 3 years before college, move the accumulated corpus gradually to debt. For a daughter under 10, Sukanya Samriddhi Yojana gives a government-backed, tax-free return and can sit alongside equity SIPs. Avoid child ULIPs and endowment 'child plans' — high charges, low cover.",
    keywords: ["goal:kid_education"],
  },
  {
    title: "Child's marriage fund",
    content:
      "A marriage fund 15–25 years away is a long-horizon equity goal; starting early means a far smaller monthly amount than starting at 15. Keep it separate from the education fund so one doesn't quietly eat the other. Shift it to debt in the last 2–3 years. The amount is a family choice — Finkoin's default is a planning number, not a recommendation to spend it.",
    keywords: ["goal:kid_marriage"],
  },
  {
    title: "Home purchase: downpayment and the real cost of buying",
    content:
      "Banks typically fund up to 75–80% of a home's value, so plan a downpayment of at least 20% plus another 7–10% for stamp duty, registration and interiors. Keep the downpayment fund out of pure equity once the purchase is under 3 years away. Keep the EMI within about 30–35% of take-home income so the purchase doesn't crowd out every other goal. Don't drain the emergency fund for the downpayment.",
    keywords: ["goal:home_purchase"],
  },
  {
    title: "Vehicle purchase: save, don't finance depreciation",
    content:
      "A car loses value from day one, so financing it at 9–12% means paying interest on a depreciating asset. Saving for 2–3 years in an RD, FD or short-duration debt fund lets you buy with cash or a much smaller loan. Budget for insurance, fuel and maintenance on top of the sticker price. Equity is too volatile for a purchase under 3 years away.",
    keywords: ["goal:vehicle_purchase"],
  },
  {
    title: "Parents' eldercare: medical costs come first",
    content:
      "Senior health insurance is expensive and often has waiting periods and co-pays for pre-existing conditions, so a dedicated medical buffer matters even with cover. Keep the eldercare fund in low-volatility instruments — FDs, Senior Citizens' Savings Scheme in the parent's name (if eligible), or short-duration debt funds. Premiums paid for parents' health insurance qualify for an extra deduction under Section 80D.",
    keywords: ["goal:parents_eldercare"],
  },
  {
    title: "Retirement: the corpus has to last 25–30 years",
    content:
      "A common planning rule is a corpus of about 25 times your annual expenses at retirement. EPF, PPF and NPS compound with you and count toward it. For anyone over 15 years from retirement, equity index funds should do most of the growth; time in the market absorbs volatility. NPS adds an extra ₹50,000 deduction under Section 80CCD(1B) in the old tax regime. Never pause retirement saving entirely for shorter goals — every year skipped is a year of compounding lost.",
    keywords: ["goal:retirement"],
  },
  {
    title: "Wedding fund: a hard deadline",
    content:
      "A wedding 1–3 years out has a fixed date that can't move if markets fall, so keep the fund in FDs, RDs or short-duration debt funds, not equity. Agree a budget early and fund it monthly rather than borrowing — personal loans for weddings typically cost 12–16% and follow you into married life. Keep the emergency fund separate.",
    keywords: ["goal:marriage"],
  },
  {
    title: "Baby fund: delivery, first year, and insurance timing",
    content:
      "Delivery costs vary widely — a normal delivery at a private hospital in a metro can be under a lakh, a C-section or NICU stay several lakhs. Many health policies cover maternity only after a 2–4 year waiting period, so check your policy now. Keep this fund fully liquid (savings, liquid fund, FD). After the baby arrives, review term cover and add the child to the family floater.",
    keywords: ["goal:baby"],
  },
];

export function goalKnowledgeFor(type: GoalType): GoalKnowledgeEntry[] {
  const tag = `goal:${type}`;
  return GOAL_KNOWLEDGE.filter(
    (e) => e.keywords.includes(tag) || e.keywords.includes("goal:any"),
  );
}
