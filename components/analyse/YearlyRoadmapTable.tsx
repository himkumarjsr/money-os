"use client";

import { useMemo, useState } from "react";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { formatIndian } from "@/lib/formatters";
import type { GoalFundingItem } from "@/lib/goalFunding";
import { buildYearlyRoadmap } from "@/lib/goalStrategies";

const PREVIEW_ROWS = 6;

/** Year by year until the last goal: monthly SIP, goal money, what happens. */
export default function YearlyRoadmapTable({
  profile,
  items,
}: {
  profile: FinancialProfile;
  items: GoalFundingItem[] | undefined;
}) {
  const rows = useMemo(
    () => buildYearlyRoadmap(profile, items ?? []),
    [profile, items],
  );
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, PREVIEW_ROWS);
  const last = rows[rows.length - 1].year;

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 sm:p-5">
      <h2 className="text-xl font-semibold">Year by year to {last}</h2>
      <p className="mt-1 text-sm font-medium leading-relaxed text-[#454442]">
        What to invest each month, what your goal money grows to, and what
        happens each year until your last goal. Amounts are today&apos;s rupees;
        the SIP rises with your salary.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[#E8E6F0]">
        <table className="w-full min-w-[520px] text-left text-sm tabular-nums">
          <thead className="bg-[#FAFAFE] text-xs text-[#5F5E5A]">
            <tr>
              <th className="px-3 py-2">Year</th>
              <th className="px-3 py-2 text-right">Invest / month</th>
              <th className="px-3 py-2 text-right">Goal money</th>
              <th className="px-3 py-2">What happens</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.year} className="border-t border-[#F0EFF8] align-top">
                <td className="px-3 py-2 font-medium">{r.year}</td>
                <td className="px-3 py-2 text-right">
                  ₹{formatIndian(r.monthly)}
                </td>
                <td className="px-3 py-2 text-right">
                  ₹{formatIndian(r.worth)}
                </td>
                <td className="px-3 py-2 text-xs leading-snug text-[#454442]">
                  {r.events.length > 0 ? r.events.join(" · ") : "Keep going"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_ROWS ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mt-2 min-h-[44px] text-sm font-semibold text-[#534AB7]"
        >
          {all ? "Show fewer years ↑" : `Show all ${rows.length} years ↓`}
        </button>
      ) : null}
    </section>
  );
}
