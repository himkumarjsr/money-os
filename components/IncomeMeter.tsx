"use client";

import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import {
  getUniversalCaps,
  getUnallocatedIncome,
  getUniversalBucketActuals,
  getUniversalBucketRows,
} from "@/lib/universal-buckets";

type IncomeMeterProps = {
  totalIncome: number;
  profile: Partial<FinancialProfile>;
};

const segmentStyles = {
  needs: {
    base: "bg-violet-500",
    danger: "bg-red-500",
  },
  wants: {
    base: "bg-amber-400",
    danger: "bg-red-500",
  },
  security: {
    base: "bg-sky-500",
    danger: "bg-red-500",
  },
  loans: {
    base: "bg-rose-500",
    danger: "bg-red-500",
  },
  investment: {
    base: "bg-emerald-500",
    danger: "bg-red-500",
  },
} as const;

export function IncomeMeter({ totalIncome, profile }: IncomeMeterProps) {
  const caps = getUniversalCaps(profile);
  const rows = getUniversalBucketRows(profile);
  const actuals = getUniversalBucketActuals(profile);
  const unallocated = getUnallocatedIncome(profile);
  const orderedKeys: Array<keyof typeof caps> = [
    "needs",
    "wants",
    "security",
    "loans",
    "investment",
  ];

  const filledWidth =
    totalIncome > 0
      ? Math.min(
          100,
          (
            (actuals.needs +
              actuals.wants +
              actuals.security +
              actuals.loans +
              actuals.investment) /
            totalIncome
          ) * 100,
        )
      : 0;

  return (
    <section className="pointer-events-none select-none rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="relative h-5 overflow-hidden rounded-full bg-slate-200">
        <div className="flex h-full w-full">
          {orderedKeys.map((key) => {
            const row = rows.find((item) => item.key === key)!;
            const width = totalIncome > 0 ? (row.actual / totalIncome) * 100 : 0;
            return (
              <div
                key={key}
                className={cn(
                  "h-full shrink-0",
                  row.status === "good"
                    ? segmentStyles[key].base
                    : segmentStyles[key].danger,
                )}
                style={{ width: `${Math.max(0, width)}%` }}
              />
            );
          })}
        </div>
        <div
          className="absolute inset-y-0 right-0 bg-slate-300"
          style={{ width: `${Math.max(0, 100 - filledWidth)}%` }}
        />
        {(() => {
          const needs = caps.needs * 100;
          const wants = (caps.needs + caps.wants) * 100;
          const security = (caps.needs + caps.wants + caps.security) * 100;
          const loans = (caps.needs + caps.wants + caps.security + caps.loans) * 100;
          return [needs, wants, security, loans, 100];
        })().map((threshold) => (
          <div
            key={threshold}
            className="pointer-events-none absolute inset-y-0 w-px bg-slate-900/60"
            style={{ left: threshold === 100 ? "calc(100% - 1px)" : `${threshold}%` }}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <div
            key={row.key}
            className={cn(
              "rounded-2xl border px-3 py-2 text-sm",
              row.status === "good"
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            <p className="font-medium">{row.label}</p>
            <p className="mt-1 text-xs">
              {formatCurrency(row.actual, "en-IN", "INR")} / {formatCurrency(row.capAmount, "en-IN", "INR")} cap
            </p>
          </div>
        ))}
      </div>

      {unallocated > 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {formatCurrency(unallocated, "en-IN", "INR")} unallocated
        </p>
      ) : null}
    </section>
  );
}
