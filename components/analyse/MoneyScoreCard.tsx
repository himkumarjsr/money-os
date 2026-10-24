"use client";

import type { MoneyScore } from "@/lib/moneyScore";

/**
 * Why the score is what it is (six pillars) and, in the plan, the actions
 * worth the most points. The report shows the pillars only.
 */
export default function MoneyScoreCard({
  score,
  showActions = true,
}: {
  score: MoneyScore;
  showActions?: boolean;
}) {
  return (
    <section className="mb-4 rounded-2xl border border-[#E8E6F0] bg-white p-4 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#534AB7]">
        How your score is worked out
      </p>
      <div className="mt-3 space-y-3">
        {score.pillars.map((p) => {
          const pct = p.max > 0 ? (p.points / p.max) * 100 : 0;
          const tone =
            pct >= 70 ? "#1D9E75" : pct >= 40 ? "#BA7517" : "#E24B4A";
          return (
            <div key={p.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-[#111110]">
                  {p.label}
                </p>
                <p className="shrink-0 text-sm font-bold tabular-nums text-[#111110]">
                  {Math.round(p.points)}
                  <span className="font-medium text-[#5F5E5A]">/{p.max}</span>
                </p>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ECEAF5]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: tone }}
                />
              </div>
              <p className="mt-1 text-[13px] font-medium leading-snug text-[#454442]">
                {p.line}
              </p>
            </div>
          );
        })}
      </div>

      {showActions && score.topActions.length > 0 ? (
        <div className="mt-5 rounded-xl bg-[#F7F6FE] p-3">
          <p className="text-sm font-semibold text-[#111110]">
            Raise your score
          </p>
          <ol className="mt-2 space-y-2">
            {score.topActions.map((a, i) => (
              <li key={a.pillar} className="flex gap-3 text-[13px]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#534AB7] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium leading-snug text-[#454442]">
                  {a.text}
                </span>
                <span className="shrink-0 font-bold text-[#1D9E75]">
                  +{a.gain}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
