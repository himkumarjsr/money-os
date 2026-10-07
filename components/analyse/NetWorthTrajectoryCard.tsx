"use client";

import {
  formatLakhCrore,
  type NetWorthTrajectory,
} from "@/lib/netWorthTrajectory";

/** Net worth today and 5/10/20 years out, in today's rupees. */
export default function NetWorthTrajectoryCard({
  trajectory,
}: {
  trajectory: NetWorthTrajectory;
}) {
  const { points, spentGoals } = trajectory;
  if (points.length < 2) return null;
  const max = Math.max(1, ...points.map((p) => Math.abs(p.netWorth)));
  const last = points[points.length - 1];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Where your net worth is heading</h3>
      <p className="mt-1 text-sm text-[#454442]">
        Following this plan: {formatLakhCrore(points[0].netWorth)} today →{" "}
        <span className="font-semibold text-[#534AB7]">
          {formatLakhCrore(last.netWorth)}
        </span>{" "}
        in {last.year} years, in today&apos;s rupees.
      </p>
      <div className="mt-4 flex h-44 items-end gap-3" role="img" aria-label="Net worth projection">
        {points.map((p) => {
          const h = Math.max(4, (Math.abs(p.netWorth) / max) * 100);
          const negative = p.netWorth < 0;
          return (
            <div key={p.year} className="flex h-full flex-1 flex-col items-center justify-end">
              <span
                className={`mb-1 text-[12px] font-bold tabular-nums ${
                  negative ? "text-[#E24B4A]" : "text-[#111110]"
                }`}
              >
                {formatLakhCrore(p.netWorth)}
              </span>
              <div
                className={`w-full rounded-t-lg ${negative ? "bg-[#F4B9B8]" : "bg-[#534AB7]"}`}
                style={{ height: `${h}%`, opacity: p.year === 0 ? 0.55 : 1 }}
              />
              <span className="mt-1.5 text-[12px] font-semibold text-[#454442]">
                {p.year === 0 ? "Today" : `${p.year}y`}
              </span>
              {p.age != null ? (
                <span className="text-[11px] text-[#9B9A94]">age {p.age}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[#7A7871]">
        Includes EPF/PPF/NPS compounding, your current SIPs, this plan&apos;s goal
        SIPs and loans paying down on their EMIs.
        {spentGoals.length > 0
          ? ` Goal money is used when due: ${spentGoals
              .map((g) => `${g.label} (year ${g.year})`)
              .join(", ")}.`
          : ""}{" "}
        Assumes long-run returns of 12% equity, 6% FDs and cash, 8% gold, and
        6% inflation. These are projections, not guarantees.
      </p>
    </section>
  );
}
