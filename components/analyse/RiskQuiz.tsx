"use client";

import {
  RISK_QUESTIONS,
  RISK_TOLERANCE_LABELS,
  scoreRiskTolerance,
} from "@/lib/riskProfile";

export default function RiskQuiz({
  answers,
  onAnswer,
}: {
  answers: ReadonlyArray<number | null | undefined> | undefined;
  onAnswer: (questionIndex: number, score: number) => void;
}) {
  const tolerance = scoreRiskTolerance(answers);
  return (
    <div className="space-y-5">
      {RISK_QUESTIONS.map((q, qi) => (
        <fieldset key={q.id} className="space-y-2">
          <legend className="text-sm font-medium text-[#5F5E5A]">
            {q.question}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {q.options.map((label, score) => {
              const selected = answers?.[qi] === score;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswer(qi, score)}
                  className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors ${
                    selected
                      ? "border-[#534AB7] bg-[#534AB7]/10 text-slate-900"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p className="text-sm text-[#7A7871]">
        {tolerance
          ? `Your risk profile: ${RISK_TOLERANCE_LABELS[tolerance]}. We use it to pick instruments for each goal.`
          : "Optional — answer all three and we'll match instruments to how you handle ups and downs."}
      </p>
    </div>
  );
}
