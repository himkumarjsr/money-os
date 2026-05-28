"use client";

import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
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

/** Year-end deposits, annual compounding — 15 equal contributions. */
function ppfv(yearly: number, annualPct: number) {
  const r = annualPct / 100;
  if (r <= 0) return yearly * 15;
  return yearly * ((Math.pow(1 + r, 15) - 1) / r) * (1 + r);
}

function ppfvYears(yearly: number, annualPct: number, years: number) {
  const r = annualPct / 100;
  if (years <= 0) return 0;
  if (r <= 0) return yearly * years;
  return yearly * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
}

export function PPFCalculator() {
  const [yearly, setYearly] = useClamped(1_50_000, 500, 1_50_000);
  const [rate, setRate] = useClamped(7.1, 6, 9);

  const fv = ppfv(yearly, rate);
  const invested = yearly * 15;
  const gain = fv - invested;
  const tone: InsightTone = gain / Math.max(invested, 1) > 0.85 ? "good" : "warn";

  const chartCard = "rounded-xl border border-[#F0EFF8] bg-white p-5";
  const tooltipStyle = {
    backgroundColor: "#111110",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "white",
  } as const;

  const data = useMemo(() => {
    const out: Array<{ year: number; invested: number; interest: number; total: number }> = [];
    for (let y = 1; y <= 15; y += 1) {
      const inv = yearly * y;
      const total = ppfvYears(yearly, rate, y);
      out.push({ year: y, invested: inv, interest: Math.max(0, total - inv), total });
    }
    return out;
  }, [rate, yearly]);

  return (
    <div className="space-y-6">
      <SliderField
        label="Yearly deposit"
        unitType="money"
        value={yearly}
        min={500}
        max={CALCULATOR_MONEY_MAX}
        step={500}
        onChange={setYearly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Assumed rate (illustrative)"
        unitType="percent"
        value={rate}
        min={6}
        max={9}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="15-year maturity (approx)"
          value={formatCurrency(Math.round(fv), "en-IN", "INR")}
        />
        <ResultStat
          label="Total invested"
          value={formatCurrency(invested, "en-IN", "INR")}
        />
        <ResultStat
          label="Tax-free gain (EEE)"
          value={formatCurrency(Math.round(gain), "en-IN", "INR")}
        />
      </div>

      <div className={chartCard}>
        <p className="text-sm font-semibold text-slate-900">15-year growth</p>
        <div className="mt-4 h-[200px] md:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid stroke="#F4F2FC" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#9B9A94" }} />
              <YAxis tick={{ fontSize: 12, fill: "#9B9A94" }} tickFormatter={(v) => formatIndianCompact(Number(v))} />
              <Tooltip
                contentStyle={tooltipStyle}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const investedVal = Number(payload.find((x) => x.dataKey === "invested")?.value ?? 0);
                  const interestVal = Number(payload.find((x) => x.dataKey === "interest")?.value ?? 0);
                  const totalVal = investedVal + interestVal;
                  return (
                    <div style={tooltipStyle}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{`Year ${label}`}</div>
                      <div>Invested: ₹{formatIndian(investedVal)}</div>
                      <div>Interest earned: ₹{formatIndian(interestVal)}</div>
                      <div>Total balance: ₹{formatIndian(totalVal)}</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="invested"
                stackId="a"
                stroke="transparent"
                fill="#EEEDFE"
                fillOpacity={1}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="interest"
                stackId="a"
                stroke="transparent"
                fill="#534AB7"
                fillOpacity={0.6}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
              <ReferenceLine
                x={7}
                stroke="#534AB7"
                strokeDasharray="6 6"
                ifOverflow="extendDomain"
                label={{ value: "Year 7 (partial withdrawal)", position: "insideTopLeft", fill: "#534AB7", fontSize: 12 }}
              />
              <ReferenceDot
                x={15}
                y={data[data.length - 1]?.total ?? 0}
                r={4}
                fill="#534AB7"
                stroke="none"
                label={{ value: "Year 15 (maturity)", position: "left", fill: "#534AB7", fontSize: 12 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Insight tone={tone}>
        PPF is EEE for qualifying contributions — extend beyond 15y in blocks
        of 5y if you still need tax-free debt-free compounding.
      </Insight>
    </div>
  );
}
