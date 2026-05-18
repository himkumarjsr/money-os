"use client";

import { computeFireNumbers } from "@/lib/fireCalculator";
import { formatCurrency } from "@/lib/finance";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.min(max, Math.max(min, nv))), [min, max]);
  return [v, set] as const;
}

function formatYearsMonths(years: number | null, months: number | null): string {
  if (years === null || months === null) return "50+ years";
  if (years <= 0) return "Already there";
  const y = Math.floor(years);
  const m = months !== null ? months % 12 : Math.round((years - y) * 12);
  if (y === 0) return `${m} months`;
  if (m === 0) return `${y} years`;
  return `${y}y ${m}mo`;
}

export function FIRECalculator() {
  const [expensesExEmi, setExpensesExEmi] = useClamped(70_000, 15_000, 5_00_000);
  const [monthlyEmi, setMonthlyEmi] = useClamped(0, 0, 2_00_000);
  const [debtOutstanding, setDebtOutstanding] = useClamped(0, 0, 2_00_00_000);
  const [corpus, setCorpus] = useClamped(80_00_000, 0, 5_00_00_000);
  const [monthlySip, setMonthlySip] = useClamped(20_000, 0, 5_00_000);
  const [returnPct, setReturnPct] = useClamped(12, 4, 18);

  const result = useMemo(
    () =>
      computeFireNumbers({
        monthlyExpensesExEmi: expensesExEmi,
        monthlyEmi,
        totalDebtOutstanding: debtOutstanding,
        currentCorpus: corpus,
        monthlySip,
        expectedReturnPct: returnPct,
      }),
    [corpus, debtOutstanding, expensesExEmi, monthlyEmi, monthlySip, returnPct],
  );

  let tone: InsightTone = "good";
  let insight = "";

  if (result.isTargetMet) {
    insight =
      "Your corpus meets the total FIRE target (lifestyle corpus + outstanding loans). Focus on staying debt-free and keeping expenses stable.";
  } else if (result.yearsToTarget === null) {
    tone = "bad";
    insight =
      "At this SIP and return assumption, closing the gap may take decades. Increase monthly investing, reduce lifestyle expenses, or clear loans to lower the target.";
  } else if (result.yearsToTarget <= 7) {
    tone = "good";
    insight = `You may reach your total FIRE target in about ${formatYearsMonths(result.yearsToTarget, result.monthsToTarget)} — closer than the “₹10 crore” fear many people carry.`;
  } else if (result.yearsToTarget <= 15) {
    tone = "warn";
    insight = `Estimated ${formatYearsMonths(result.yearsToTarget, result.monthsToTarget)} to your target at ${returnPct}% growth. Clearing EMIs or raising SIP materially shortens this.`;
  } else {
    tone = "bad";
    insight = `Roughly ${formatYearsMonths(result.yearsToTarget, result.monthsToTarget)} away at current inputs. EMIs inflate the number you think you need — use expenses without EMIs.`;
  }

  if (result.debtPayoffFireSavings > 0 && monthlyEmi > 0) {
    insight += ` Clearing loans could lower your lifestyle FIRE number by about ${formatCurrency(Math.round(result.debtPayoffFireSavings), "en-IN", "INR")} (same life, no EMI).`;
  }

  const fmt = (n: number) => formatCurrency(Math.round(n), "en-IN", "INR");

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-600">
        Uses the <strong className="font-semibold text-slate-800">4% rule</strong> (25× annual lifestyle expenses) plus
        outstanding loan balances. Enter expenses <em>without</em> EMIs — add loans separately.
      </p>

      <SliderField
        label="Monthly expenses (excluding all EMIs)"
        unitType="money"
        value={expensesExEmi}
        min={15_000}
        max={5_00_000}
        step={1_000}
        onChange={setExpensesExEmi}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Total monthly EMIs (for comparison)"
        unitType="money"
        value={monthlyEmi}
        min={0}
        max={2_00_000}
        step={1_000}
        onChange={setMonthlyEmi}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Outstanding loans (home + car + personal)"
        unitType="money"
        value={debtOutstanding}
        min={0}
        max={2_00_00_000}
        step={50_000}
        onChange={setDebtOutstanding}
        format={(v) => fmt(v)}
      />

      <SliderField
        label="Current investments (corpus)"
        unitType="money"
        value={corpus}
        min={0}
        max={5_00_00_000}
        step={50_000}
        onChange={setCorpus}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Monthly SIP (to close the gap)"
        unitType="money"
        value={monthlySip}
        min={0}
        max={5_00_000}
        step={1_000}
        onChange={setMonthlySip}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Expected return (SIP + corpus)"
        unitType="percent"
        value={returnPct}
        min={4}
        max={18}
        step={0.5}
        onChange={setReturnPct}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ResultStat label="Lifestyle FIRE corpus (25×)" value={fmt(result.lifestyleFireCorpus)} />
        <ResultStat label="Total FIRE target (+ debt)" value={fmt(result.totalFireTarget)} />
        <ResultStat label="Gap to target" value={fmt(result.gap)} />
        <ResultStat label="Progress to target" value={`${result.progressPct.toFixed(0)}%`} />
        <ResultStat
          label="Time to target (est.)"
          value={formatYearsMonths(result.yearsToTarget, result.monthsToTarget)}
        />
        <ResultStat label="Safe monthly spend (4% rule)" value={fmt(result.safeMonthlyWithdrawal)} />
      </div>

      {monthlyEmi > 0 ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">If you counted EMIs in expenses</p>
          <p className="mt-1 leading-relaxed">
            Naive FIRE (expenses + EMI): {fmt(result.naiveFireCorpus)}. Loan-free lifestyle FIRE:{" "}
            {fmt(result.lifestyleFireCorpus)}. Difference:{" "}
            <strong>{fmt(result.debtPayoffFireSavings)}</strong> — same lifestyle once loans end.
          </p>
        </div>
      ) : null}

      <Insight tone={tone}>{insight}</Insight>

      <div className="rounded-xl border border-[#534AB7]/25 bg-[#F7F6FE] px-4 py-3 text-sm text-[#3C3489]">
        <p className="font-semibold text-[#534AB7]">Finkoin tip</p>
        <p className="mt-2 leading-relaxed">
          Map income, real spends, and loans in one pass with the{" "}
          <Link href="/analyse" className="font-semibold underline">
            financial health check
          </Link>
          . Read the full framework in our{" "}
          <Link
            href="/blog/your-fire-number-when-can-you-actually-retire-in-india"
            className="font-semibold underline"
          >
            FIRE number guide
          </Link>
          .
        </p>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Educational illustration only. The 4% withdrawal rule is based on historical US portfolio studies; Indian
        inflation, healthcare, and sequence-of-returns risk may require a larger corpus or lower withdrawals.
      </p>
    </div>
  );
}
