/**
 * Short risk-tolerance questionnaire (folded into the Goals step). Age and
 * horizon alone don't decide an equity/debt split — two people the same age
 * can react very differently to a bad month. Deterministic scoring, no AI.
 */
export const RISK_TOLERANCE_VALUES = [
  "conservative",
  "moderate",
  "aggressive",
] as const;

export type RiskTolerance = (typeof RISK_TOLERANCE_VALUES)[number];

export const RISK_TOLERANCE_LABELS: Record<RiskTolerance, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Growth-focused",
};

export type RiskQuestion = {
  id: string;
  question: string;
  /** Index = score (0 cautious … 2 growth). */
  options: [string, string, string];
};

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "drawdown",
    question: "If your investments dropped 20% in a bad month, you would…",
    options: ["Sell to stop the loss", "Hold and wait", "Invest more while it's cheap"],
  },
  {
    id: "horizon",
    question: "How long could you leave invested money untouched?",
    options: ["Under 3 years", "3–7 years", "More than 7 years"],
  },
  {
    id: "priority",
    question: "Which matters more to you?",
    options: [
      "Protecting what I have",
      "A balance of safety and growth",
      "Maximising long-term growth",
    ],
  },
];

/** All three answered → a tolerance; otherwise undefined (the quiz is optional). */
export function scoreRiskTolerance(
  answers: ReadonlyArray<number | null | undefined> | null | undefined,
): RiskTolerance | undefined {
  if (!answers || answers.length < RISK_QUESTIONS.length) return undefined;
  let total = 0;
  for (let i = 0; i < RISK_QUESTIONS.length; i++) {
    const a = answers[i];
    if (a == null || !Number.isInteger(a) || a < 0 || a > 2) return undefined;
    total += a;
  }
  if (total <= 1) return "conservative";
  if (total <= 4) return "moderate";
  return "aggressive";
}
