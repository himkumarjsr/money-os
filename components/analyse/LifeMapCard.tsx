"use client";

type LifeMapGoal = {
  goalType: string;
  goalId?: string;
  label?: string;
  yearsToGoal: number;
  targetAmount: number;
  monthlyRequired: number;
  monthlyAllocated?: number;
};

const MAX_YEARS = 35;

/** Every goal on one timeline, each funded from this month — not one goal at a time. */
export default function LifeMapCard({
  goals,
  selfAge,
}: {
  goals: LifeMapGoal[];
  selfAge?: number;
}) {
  const rows = goals
    .filter((g) => g.goalId && (g.monthlyAllocated ?? 0) > 0)
    .sort((a, b) => a.yearsToGoal - b.yearsToGoal);
  if (rows.length === 0) return null;

  const span = Math.min(MAX_YEARS, Math.max(5, ...rows.map((g) => g.yearsToGoal)));
  const thisYear = new Date().getFullYear();
  const total = rows.reduce((s, g) => s + (g.monthlyAllocated ?? 0), 0);
  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Your financial life map</h3>
      <p className="mt-1 text-sm text-[#454442]">
        Every goal starts this month, side by side: {inr(total)}/month across{" "}
        {rows.length} {rows.length === 1 ? "goal" : "goals"}.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((g) => {
          const monthly = g.monthlyAllocated ?? 0;
          const funded =
            g.monthlyRequired > 0
              ? Math.min(100, Math.round((monthly / g.monthlyRequired) * 100))
              : 100;
          const width = Math.max(4, (Math.min(g.yearsToGoal, span) / span) * 100);
          const year = thisYear + g.yearsToGoal;
          return (
            <div key={g.goalId}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold text-[#111110]">{g.label ?? g.goalType}</span>
                <span className="shrink-0 text-[#7A7871]">
                  {year}
                  {selfAge ? ` · age ${selfAge + g.yearsToGoal}` : ""}
                </span>
              </div>
              <div className="mt-1 h-3 w-full rounded-full bg-[#F1F0EC]">
                <div
                  className="relative h-3 overflow-hidden rounded-full bg-[#DCD9F5]"
                  style={{ width: `${width}%` }}
                >
                  <div
                    className="h-full bg-[#534AB7]"
                    style={{ width: `${funded}%` }}
                  />
                </div>
              </div>
              <p className="mt-1 text-[12px] text-[#5F5E5A]">
                {inr(monthly)}/mo now toward {inr(g.targetAmount)} ·{" "}
                {funded >= 100 ? "fully funded" : `${funded}% funded`}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-[#9B9A94]">
        <span>Today</span>
        <span>
          {span >= MAX_YEARS ? `${span}+ years` : `${span} years`}
        </span>
      </div>
    </section>
  );
}
