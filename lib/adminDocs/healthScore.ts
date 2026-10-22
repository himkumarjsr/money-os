import type { DocSection } from "./types";

/** How the 0–100 Money Score is worked out (lib/moneyScore.ts). */
export const healthScoreSection: DocSection = {
  id: "health-score",
  title: "Health score",
  group: "Features",
  summary:
    "How the 0–100 Money Score is calculated: six weighted pillars, each scored in proportion to the gap.",
  blocks: [
    {
      kind: "p",
      text: 'The score is `overallScore` from `analyseFinances(profile)` in `lib/financialEngine.ts`, which calls `computeMoneyScore()` in `lib/moneyScore.ts` (byte-identical copies in `mobile/lib/`). It runs on the device from the Analyse answers, with no API call. The breakdown is returned as `moneyScore` and shown on the report as "How your score is worked out" plus "Raise your score". Saved results are re-run with the current engine whenever the store loads them, so every screen shows the same number.',
    },
    { kind: "h", text: "The six pillars" },
    {
      kind: "table",
      head: ["Pillar", "Points", "How it is scored"],
      rows: [
        [
          "Safety net",
          "20",
          "Emergency fund vs target months of needs (14), medical fund vs `medicalEmergencyTarget` (6). Liquid money beyond the emergency fund counts toward the medical fund, as in the Fix Plan.",
        ],
        [
          "Protection",
          "20",
          "Health cover (own + company) vs `healthCoverTarget` (10; capped at 6 when all cover is from the employer). Term cover (10): full when it is a solid base (₹1Cr+ or half of today's need) or optional (no dependants and no loans); in proportion below the base; 0 when missing and needed.",
        ],
        [
          "Debt health",
          "15",
          "EMIs as a share of income (10: full up to 20%, 5 at 35%, 0 at 50%). EMIs on loans costing 12%+ a year (5: full at 0, 0 at 15% of income).",
        ],
        [
          "Saving and investing",
          "15",
          "Monthly investing vs 20% of income (10). Income with no plan (5: full up to 10% of income, 0 at 40%).",
        ],
        [
          "Goals and retirement",
          "20",
          "Share of each goal already covered by existing money (FD, funds, stocks, RSUs, gold, EPF/PPF/NPS for retirement) and running SIPs, via `earmarkExistingSavings`. Unplanned monthly money earns half credit. Retirement weighs 10 (20 when there are no other goals); other goals share 10.",
        ],
        [
          "Wealth and mix",
          "10",
          "Net worth vs a typical multiple of yearly income for the age, `max(0.5, (age − 25) / 5)` (6). Equity share vs a floor by age, and RSUs over half of equity (4).",
        ],
      ],
    },
    {
      kind: "list",
      items: [
        "Every pillar is proportional: a small gap costs a little, a big gap a lot.",
        "No income entered gives a score of 0.",
        "Colour bands (`SCORE_BANDS`): 70–100 green, 40–69 amber, 0–39 red.",
        'Each pillar carries the action worth the most points; the report lists the top three as "Raise your score" with the points each adds.',
      ],
    },
    { kind: "h", text: "Checks shown but not scored directly" },
    {
      kind: "list",
      items: [
        "Insurance premium reserve and bereavement fund are filled from liquid money left after the emergency and medical funds; they appear on the safety checklist only.",
        "The issues list (`buildIssues`) still drives the teaser line and the critical / warning counts, not the score.",
        "Tax-saving use is not scored: the app doesn't know the user's tax regime.",
      ],
    },
    { kind: "h", text: "Score after 12 months (Fix Plan)" },
    {
      kind: "p",
      text: "The Fix Plan's projected score is `min(100, scoreToday + round(0.7 × gain))`, where gain = 15 per open critical priority + 8 per high + 4 per medium (`lib/priorityEngine.ts`). The 0.7 assumes most, not all, fixes get done within a year.",
    },
    {
      kind: "callout",
      tone: "warn",
      text: "Changing any weight or threshold changes every user's score the next time their report loads. Update this page and `lib/moneyScore.test.ts` with it.",
    },
  ],
};
