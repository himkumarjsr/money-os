"use client";

import { useState } from "react";
import { formatIndian } from "@/lib/formatters";
import { homeUpfrontShare, type DetectedGoal } from "@/lib/goalDetection";
import type { GoalStrategyPlan, StrategyKind } from "@/lib/goalStrategies";

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
  busy,
  onSetHomePrice,
}: {
  goal: DetectedGoal;
  plan?: GoalStrategyPlan;
  busy?: boolean;
  onSetHomePrice?: (price: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const unclear = goal.home?.unclearAmount && onSetHomePrice;
  const count = plan?.strategies.length ?? 0;
  if (!unclear && !plan?.summary && count === 0) return null;

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
      {plan?.summary ? (
        <p className="rounded-lg bg-[#E8F6F1] px-3 py-2 text-xs font-semibold leading-snug text-[#0F6E56]">
          {plan.summary}
        </p>
      ) : null}
      {count > 0 ? (
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
