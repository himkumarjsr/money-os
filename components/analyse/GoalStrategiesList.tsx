"use client";

import { Fragment, useState } from "react";
import { formatIndian } from "@/lib/formatters";
import { homeUpfrontShare, type DetectedGoal } from "@/lib/goalDetection";
import {
  goalReachLine,
  goalReachPutInLine,
  goalReachTableNote,
  type GoalReach,
  type GoalStrategyPlan,
  type StrategyKind,
} from "@/lib/goalStrategies";

const KIND: Record<StrategyKind, { label: string; cls: string }> = {
  smart: { label: "Smart move", cls: "bg-[#E8F6F1] text-[#1D9E75]" },
  tradeoff: { label: "Trade-off", cls: "bg-[#FFF3E6] text-[#BA7517]" },
  check: { label: "Reality check", cls: "bg-[#EEEDFE] text-[#534AB7]" },
};

/**
 * Smart routes to one goal (lib/goalStrategies) and, for an older home
 * amount, the one question that settles whether it was the price.
 */
export default function GoalStrategiesList({
  goal,
  plan,
  reach,
  busy,
  onSetHomePrice,
  statusOnly = false,
}: {
  goal: DetectedGoal;
  plan?: GoalStrategyPlan;
  /** When the goal is reached at the plan's monthly amount. */
  reach?: GoalReach;
  busy?: boolean;
  onSetHomePrice?: (price: number) => void;
  /** Report: where the goal stands, no fixes or smart ways. */
  statusOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [openYear, setOpenYear] = useState<number | null>(null);
  const unclear = goal.home?.unclearAmount && onSetHomePrice;
  const count = plan?.strategies.length ?? 0;
  if (!unclear && (statusOnly || (!plan?.summary && count === 0)) && !reach)
    return null;

  return (
    <div className="mt-2 space-y-2">
      {unclear ? (
        <div className="rounded-lg bg-[#FFF3E6] px-3 py-2">
          <p className="text-xs font-semibold text-[#111110]">
            Is ₹{formatIndian(goal.targetAmount)} the home&apos;s price or the
            cash you need upfront?
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetHomePrice(goal.targetAmount)}
              className="min-h-[44px] rounded-lg bg-white px-3 text-[13px] font-semibold text-[#534AB7] disabled:opacity-60"
            >
              The home&apos;s price
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onSetHomePrice(
                  goal.targetAmount /
                    homeUpfrontShare(goal.home?.includeInteriors),
                )
              }
              className="min-h-[44px] rounded-lg bg-white px-3 text-[13px] font-semibold text-[#534AB7] disabled:opacity-60"
            >
              Cash upfront
            </button>
          </div>
        </div>
      ) : null}
      {reach ? (
        <div
          className={`rounded-lg px-3 py-2 ${reach.onTime ? "bg-[#E8F6F1]" : "bg-[#FFF3E6]"}`}
        >
          <p
            className={`text-xs font-semibold leading-snug ${reach.onTime ? "text-[#0F6E56]" : "text-[#854F0B]"}`}
          >
            {goalReachLine(reach, goal, { statusOnly })}
          </p>
          {reach.rows.length > 0 ? (
            <button
              type="button"
              onClick={() => setTableOpen((v) => !v)}
              aria-expanded={tableOpen}
              className="flex min-h-[44px] items-center text-[13px] font-semibold text-[#534AB7]"
            >
              {tableOpen ? "Hide year by year ↑" : "Year by year ↓"}
            </button>
          ) : null}
          {tableOpen ? (
            <table className="w-full text-left text-xs tabular-nums">
              <thead>
                <tr className="text-[#5F5E5A]">
                  <th className="py-1 font-semibold">Year</th>
                  <th className="py-1 text-right font-semibold">Put in</th>
                  <th className="py-1 text-right font-semibold">Worth</th>
                  <th className="w-7 py-1">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reach.rows.map((r) => {
                  const mark =
                    r.year === reach.reachYear
                      ? " ✓"
                      : r.year === goal.targetYear
                        ? " ◎"
                        : "";
                  const shown = openYear === r.year;
                  return (
                    <Fragment key={r.year}>
                      <tr
                        onClick={() => setOpenYear(shown ? null : r.year)}
                        aria-expanded={shown}
                        className={`cursor-pointer border-t border-black/5 ${r.year === reach.reachYear ? "font-bold text-[#0F6E56]" : !reach.onTime && r.year === goal.targetYear ? "font-semibold text-[#854F0B]" : "text-[#111110]"}`}
                      >
                        <td className="py-1">
                          {r.year}
                          {mark}
                        </td>
                        <td className="py-1 text-right text-[#534AB7] underline decoration-dotted underline-offset-2">
                          ₹{formatIndian(r.invested)}
                        </td>
                        <td className="py-1 text-right">
                          ₹{formatIndian(r.value)}
                        </td>
                        <td
                          aria-hidden
                          className="py-1 text-right text-sm leading-none text-[#534AB7]"
                        >
                          {shown ? "▴" : "▾"}
                        </td>
                      </tr>
                      {shown ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="pb-1.5 text-[11px] font-normal leading-snug text-[#5F5E5A]"
                          >
                            {goalReachPutInLine(r)}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : null}
          {tableOpen ? (
            <p className="mt-1 text-[11px] leading-snug text-[#5F5E5A]">
              Tap a row (▾) to see what its &quot;Put in&quot; is made of.{" "}
              {goalReachTableNote(reach, goal)}
            </p>
          ) : null}
        </div>
      ) : null}
      {plan?.summary && !statusOnly ? (
        <p className="rounded-lg bg-[#E8F6F1] px-3 py-2 text-xs font-semibold leading-snug text-[#0F6E56]">
          {plan.summary}
        </p>
      ) : null}
      {count > 0 && !statusOnly ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-h-[44px] items-center text-[13px] font-semibold text-[#534AB7]"
          >
            {open ? "Hide" : "Smart ways to reach it"} ({count}){" "}
            {open ? "↑" : "↓"}
          </button>
          {open ? (
            <ul className="space-y-2">
              {plan!.strategies.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-[#ECEAF5] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND[s.kind].cls}`}
                    >
                      {KIND[s.kind].label}
                    </span>
                    <p className="text-[13px] font-semibold text-[#111110]">
                      {s.title}
                    </p>
                    {s.monthlySaved ? (
                      <span className="text-xs font-bold text-[#1D9E75]">
                        −₹{formatIndian(Math.round(s.monthlySaved))}/mo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-snug text-[#454442]">
                    {s.detail}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
