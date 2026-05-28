"use client";

import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useMemo, useState } from "react";
import { CALCULATOR_MONEY_MAX, Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() =>
    Math.min(max, Math.max(min, initial)),
  );
  const set = useCallback(
    (nv: number) => setV(Math.max(min, nv)),
    [min],
  );
  return [v, set] as const;
}

function monthsCorpusLasts(
  corpus: number,
  withdraw: number,
  annualPct: number,
  maxMonths = 600,
): number {
  if (corpus <= 0 || withdraw <= 0) return 0;
  const r = annualPct / 100 / 12;
  let bal = corpus;
  for (let m = 0; m < maxMonths; m += 1) {
    bal = bal * (1 + r) - withdraw;
    if (bal <= 0) return m + 1;
  }
  return maxMonths;
}

/** Withdrawal that keeps balance ≈ flat (interest-only sustainability). */
function sustainableMonthly(corpus: number, annualPct: number) {
  const r = annualPct / 100 / 12;
  if (r <= 0) return 0;
  return corpus * r;
}

export function SWPCalculator() {
  const [corpus, setCorpus] = useClamped(50_00_000, 5_00_000, 5_00_00_000);
  const [withdraw, setWithdraw] = useClamped(40_000, 5_000, 5_00_000);
  const [rate, setRate] = useClamped(8, 3, 15);

  const lasts = monthsCorpusLasts(corpus, withdraw, rate);
  const sustain = sustainableMonthly(corpus, rate);
  const yearsLeft = lasts / 12;

  let tone: InsightTone = "good";
  if (lasts < 120 || withdraw > sustain * 1.1) tone = "bad";
  else if (lasts < 180 || withdraw > sustain) tone = "warn";

  const chartCard = "rounded-xl border border-[#F0EFF8] bg-white p-5";
  const tooltipStyle = {
    backgroundColor: "#111110",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "white",
  } as const;

  const isSustainable = withdraw <= sustain;
  const lineColor = isSustainable ? "#1D9E75" : "#E24B4A";

  const series = useMemo(() => {
    const r = rate / 100 / 12;
    const maxMonths = Math.min(600, Math.max(1, lasts));
    let bal = corpus;
    let withdrawnSoFar = 0;
    const out: Array<{ month: number; label: string; balance: number; withdrawn: number }> = [];
    for (let m = 1; m <= maxMonths; m += 1) {
      bal = bal * (1 + r) - withdraw;
      withdrawnSoFar += withdraw;
      out.push({
        month: m,
        label: m % 12 === 0 ? `Year ${m / 12}` : `M${m}`,
        balance: Math.max(0, bal),
        withdrawn: withdrawnSoFar,
      });
      if (bal <= 0) break;
    }
    return out;
  }, [corpus, lasts, rate, withdraw]);

  return (
    <div className="space-y-6">
      <SliderField
        label="Corpus"
        unitType="money"
        value={corpus}
        min={5_00_000}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setCorpus}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Monthly withdrawal"
        unitType="money"
        value={withdraw}
        min={5_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setWithdraw}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Expected return (pre-tax)"
        unitType="percent"
        value={rate}
        min={3}
        max={15}
        step={0.5}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ResultStat
          label="Corpus lasts"
          value={
            lasts >= 600
              ? "50+ years (at this rate)"
              : `${yearsLeft.toFixed(1)} years (${lasts} months)`
          }
        />
        <ResultStat
          label="Sustainable monthly (interest-only)"
          value={formatCurrency(Math.round(sustain), "en-IN", "INR")}
        />
      </div>

      <div className={chartCard}>
        <p className="text-sm font-semibold text-slate-900">Corpus over time</p>
        <div className="mt-4 h-[200px] md:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid stroke="#F4F2FC" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9B9A94" }}
                tickFormatter={(m) => {
                  const mm = Number(m);
                  return mm % 12 === 0 ? `Y${mm / 12}` : "";
                }}
              />
              <YAxis tick={{ fontSize: 12, fill: "#9B9A94" }} tickFormatter={(v) => formatIndianCompact(Number(v))} />
              <Tooltip
                contentStyle={tooltipStyle}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0]?.payload as { month: number; balance: number; withdrawn: number };
                  const period = point.month % 12 === 0 ? `Year ${point.month / 12}` : `Month ${point.month}`;
                  return (
                    <div style={tooltipStyle}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{period}</div>
                      <div>Corpus remaining: ₹{formatIndian(point.balance)}</div>
                      <div>Total withdrawn: ₹{formatIndian(point.withdrawn)}</div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={lineColor}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Insight tone={tone}>
        {withdraw <= sustain
          ? "Withdrawals are within the corpus’ natural yield — principal can stay intact."
          : lasts >= 600
            ? "Withdrawal pace is very conservative — corpus may outlive the plan."
            : `At this pace the corpus may run out in ~${yearsLeft.toFixed(1)} years. Consider lowering SWP toward ₹${Math.round(sustain).toLocaleString("en-IN")}/mo or growing equity share.`}
      </Insight>
    </div>
  );
}
