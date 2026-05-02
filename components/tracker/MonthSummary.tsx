"use client";

import { TRACKER_CATEGORIES } from "@/lib/tracker-categories";

export default function MonthSummary({
  title,
  bucketTotals,
  totalSpent,
}: {
  title: string;
  bucketTotals: Record<string, number>;
  totalSpent: number;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-[#E8E6F0] bg-white p-4 sm:p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#534AB7] sm:mb-[14px] sm:text-xs">
        {title}
      </div>
      {Object.entries(TRACKER_CATEGORIES)
        .filter(([key]) => key !== "income")
        .map(([key, cat]) => {
          const amount = bucketTotals[key] || 0;
          const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
          const isOverBudget = cat.cap > 0 && percentage > cat.cap;

          return (
            <div key={key} className="mb-3 last:mb-0 sm:mb-[14px]">
              <div className="mb-1.5 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] sm:text-sm">
                  <span className="shrink-0">{cat.emoji}</span>
                  <span className="min-w-0 font-medium leading-snug text-[#111110]">{cat.label}</span>
                  {cat.cap > 0 ? (
                    <span className="shrink-0 text-[10px] font-semibold text-[#5F5E5A] sm:text-[11px]">({cat.cap}% cap)</span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {isOverBudget ? (
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold leading-none text-[#991B1B] sm:text-[10px] bg-[#FDEDED]">
                      OVER
                    </span>
                  ) : null}
                  <span
                    className={`max-w-[100%] break-all text-right font-bold tabular-nums text-[length:clamp(13px,calc(10px + 1.6vw),15px)] sm:text-sm ${isOverBudget ? "text-[#B42323]" : "text-[#111110]"}`}
                  >
                    ₹{amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#F7F7F4] sm:h-[6px]">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                    background: isOverBudget ? "#E24B4A" : cat.color,
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}
