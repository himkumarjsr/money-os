"use client";

import { useMemo, useState } from "react";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { formatIndian } from "@/lib/formatters";
import type { GoalFundingItem } from "@/lib/goalFunding";
import { buildYearlyRoadmap, retirementCheck } from "@/lib/goalStrategies";

const PREVIEW_ROWS = 6;

const money = (v: number) => `₹${formatIndian(v)}`;

/**
 * Year by year until the last goal: monthly SIP, goal money, EPF etc.,
 * savings, loans left and net worth, what happens - then "Can you retire?".
 */
export default function YearlyRoadmapTable({
  profile,
  items,
  retirementOnly = false,
}: {
  profile: FinancialProfile;
  items: GoalFundingItem[] | undefined;
  /** Report: just the "Can you retire?" answer, without the fix. */
  retirementOnly?: boolean;
}) {
  const rows = useMemo(
    () => buildYearlyRoadmap(profile, items ?? []),
    [profile, items],
  );
  const retire = useMemo(
    () => retirementCheck(profile, items ?? [], new Date(), rows),
    [profile, items, rows],
  );
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, PREVIEW_ROWS);
  const last = rows[rows.length - 1].year;
  const showPf = rows.some((r) => r.pf > 0);
  const showSavings = rows.some((r) => r.savings > 0);
  const showLoans = rows.some((r) => r.loansLeft > 0);

  return (
    <>
      {retirementOnly ? null : (
        <section className="mb-4 rounded-2xl bg-white p-4 sm:p-5">
          <h2 className="text-xl font-semibold">Year by year to {last}</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed text-[#454442]">
            What to invest each month, what your money grows to, and what
            happens each year until your last goal. Goal money
            {showPf ? " + EPF / PPF / NPS" : ""}
            {showSavings ? " + other savings" : ""}
            {showLoans ? " − loans left" : ""} = net worth (home and car not
            counted). When a loan ends or a goal is paid for, its EMI or SIP
            keeps going into your next goal. Today&apos;s rupees; the SIP rises
            with your salary.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#E8E6F0]">
            <table className="w-full min-w-[760px] text-left text-sm tabular-nums">
              <thead className="bg-[#FAFAFE] text-xs text-[#5F5E5A]">
                <tr>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2 text-right">Invest / month</th>
                  <th className="px-3 py-2 text-right">Goal money</th>
                  {showPf ? (
                    <th className="px-3 py-2 text-right">EPF / PPF / NPS</th>
                  ) : null}
                  {showSavings ? (
                    <th className="px-3 py-2 text-right">Other savings</th>
                  ) : null}
                  {showLoans ? (
                    <th className="px-3 py-2 text-right">Loans left</th>
                  ) : null}
                  <th className="px-3 py-2 text-right">Net worth</th>
                  <th className="px-3 py-2">What happens</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.year}
                    className="border-t border-[#F0EFF8] align-top"
                  >
                    <td className="px-3 py-2 font-medium">{r.year}</td>
                    <td className="px-3 py-2 text-right">{money(r.monthly)}</td>
                    <td className="px-3 py-2 text-right">{money(r.worth)}</td>
                    {showPf ? (
                      <td className="px-3 py-2 text-right">{money(r.pf)}</td>
                    ) : null}
                    {showSavings ? (
                      <td className="px-3 py-2 text-right">
                        {money(r.savings)}
                      </td>
                    ) : null}
                    {showLoans ? (
                      <td className="px-3 py-2 text-right text-[#A32D2D]">
                        {r.loansLeft > 0 ? `−${money(r.loansLeft)}` : "₹0"}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-right font-semibold">
                      {r.netWorth < 0 ? "−" : ""}
                      {money(Math.abs(r.netWorth))}
                    </td>
                    <td className="px-3 py-2 text-xs leading-snug text-[#454442]">
                      {r.events.length > 0
                        ? r.events.join(" · ")
                        : "Keep going"}
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
      )}
      {retire ? (
        <section
          className={`mb-4 rounded-2xl border p-4 sm:p-5 ${
            retire.canRetire
              ? "border-[#BFE3CF] bg-[#F1FAF5]"
              : "border-[#F2D9B0] bg-[#FDF7EC]"
          }`}
        >
          <h2 className="text-xl font-semibold">
            Can you retire in {retire.year}?{" "}
            <span
              className={retire.canRetire ? "text-[#0F6E56]" : "text-[#854F0B]"}
            >
              {retire.canRetire ? "Yes" : "Not yet"}
            </span>
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-[#5F5E5A]">Money at {retire.age}</dt>
              <dd className="font-semibold tabular-nums">
                {money(retire.corpus)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#5F5E5A]">
                Pays a month ({Math.round(retire.withdrawalRate * 1000) / 10}% a
                year)
              </dt>
              <dd className="font-semibold tabular-nums">
                {money(retire.monthlyIncome)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#5F5E5A]">Costs a month then</dt>
              <dd className="font-semibold tabular-nums">
                {money(retire.monthlyCosts)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#5F5E5A]">Money needed</dt>
              <dd className="font-semibold tabular-nums">
                {money(retire.corpusNeeded)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm font-medium leading-relaxed text-[#454442]">
            {retirementOnly ? retire.statusLine : retire.line}
          </p>
        </section>
      ) : null}
    </>
  );
}
