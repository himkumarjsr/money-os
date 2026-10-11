/**
 * How users earn FK coins and leaderboard points. Keep in step with the
 * server: amounts and limits are enforced by the database (award_fk,
 * award_points and the activity triggers in supabase/migrations/050).
 *
 * Points rank the leaderboard and can never be spent. FK is the scarce coin:
 * it can only be used as a discount on Finkoin products, never cashed out.
 */

/** Discount value of FK: this many FK are worth ₹1. */
export const FK_PER_RUPEE = 10;

/** FK paid to the monthly leaderboard's 1st, 2nd and 3rd place. */
export const MONTHLY_PRIZES_FK = [500, 250, 100] as const;

export const FK_EARN_ACTIONS: ReadonlyArray<readonly [string, string]> = [
  ["Welcome bonus (once)", "+50 FK"],
  ["Your first feedback (once)", "+50 FK"],
  ["Finish setup: first expense and first health score (once)", "+100 FK"],
  ["Refer a friend who adds their first expense", "+200 FK"],
  ["Join with a friend's code and add your first expense", "+100 FK"],
  ["Every 30-day login streak", "+50 FK"],
  ["Monthly leaderboard top 3", "+500 / 250 / 100 FK"],
];

export const POINTS_EARN_ACTIONS: ReadonlyArray<readonly [string, string]> = [
  ["Daily login", "+5 / day"],
  ["Add an expense in Tracker", "+2 each, up to 20 / day"],
  ["Add a Split expense", "+3 each, up to 15 / day"],
  ["Add or update a policy, investment, card or bill", "+5 each, up to 20 / day"],
  ["Run Analyse for your health score", "+20 / week"],
  ["Use a feature for the first time", "+20 each"],
  ["7-day login streak", "+50"],
  ["Every 30-day login streak", "+200"],
  ["A friend you referred adds their first expense", "+100"],
];

/** Plain-language answers for the "What is FK?" section. */
export const FK_EXPLAINER: ReadonlyArray<readonly [string, string]> = [
  [
    "What is FK?",
    "FK (Finkoin coin) is our reward for managing your money well. You earn it for milestones like finishing setup, inviting friends and placing in the monthly top 3.",
  ],
  [
    "What can I use FK for?",
    `FK works as a discount when you buy from Finkoin: ${FK_PER_RUPEE} FK = ₹1 off. Paying for Finkoin Premium with FK is coming first, followed by other financial products. FK can't be withdrawn as cash.`,
  ],
  [
    "What are points?",
    "Points measure how actively you use Finkoin. They decide your leaderboard rank, reset on the 1st of every month, and can't be spent.",
  ],
  [
    "How is the leaderboard decided?",
    "By points earned this month. Everyone starts at 0 on the 1st, and the top 3 at month end win 500, 250 and 100 FK. The All-time tab shows points earned since you joined.",
  ],
];
