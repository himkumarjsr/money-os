"use client";

import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useMemo, useState } from "react";
import { Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

function sipMaturity(monthly: number, annualPct: number, years: number) {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  if (r <= 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() =>
    Math.min(max, Math.max(min, initial)),
  );
  const set = useCallback(
    (nv: number) => setV(Math.min(max, Math.max(min, nv))),
    [min, max],
  );
  return [v, set] as const;
}

export function SIPCalculator() {
  const [monthly, setMonthly] = useClamped(10_000, 500, 100_000);
  const [rate, setRate] = useClamped(12, 6, 20);
  const [years, setYears] = useClamped(15, 1, 30);

  const fv = sipMaturity(monthly, rate, years);
  const invested = monthly * years * 12;
  const gain = fv - invested;
  const mult = invested > 0 ? fv / invested : 0;
  const insightTone: InsightTone =
    mult >= 2.5 ? "good" : mult >= 1.8 ? "warn" : "bad";

  const chartCard = "rounded-xl border border-[#F0EFF8] bg-white p-5";
  const tooltipStyle = {
    backgroundColor: "#111110",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "white",
  } as const;

  const yearlyData = useMemo(() => {
    const out: Array<{
      year: number;
      invested: number;
      portfolio: number;
      gain: number;
      gainPct: number;
    }> = [];
    for (let y = 1; y <= years; y += 1) {
      const inv = monthly * 12 * y;
      const port = sipMaturity(monthly, rate, y);
      const g = port - inv;
      out.push({
        year: y,
        invested: inv,
        portfolio: port,
        gain: g,
        gainPct: inv > 0 ? (g / inv) * 100 : 0,
      });
    }
    return out;
  }, [monthly, rate, years]);

  return (
    <div className="space-y-6">
      <SliderField
        label="Monthly SIP"
        unitType="money"
        value={monthly}
        min={500}
        max={100_000}
        step={500}
        onChange={setMonthly}
        format={(val) => formatCurrency(val, "en-IN", "INR")}
      />
      <SliderField
        label="Expected annual return"
        unitType="percent"
        value={rate}
        min={6}
        max={20}
        step={0.5}
        onChange={setRate}
        format={(val) => `${val}% p.a.`}
      />
      <SliderField
        label="Investment period"
        unitType="years"
        value={years}
        min={1}
        max={30}
        step={1}
        onChange={setYears}
        format={(val) => `${val} years`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Maturity value"
          value={formatCurrency(Math.round(fv), "en-IN", "INR")}
        />
        <ResultStat
          label="Invested"
          value={formatCurrency(invested, "en-IN", "INR")}
        />
        <ResultStat
          label="Total gain"
          value={formatCurrency(Math.round(gain), "en-IN", "INR")}
        />
      </div>

      <div className={chartCard}>
        <p className="text-sm font-semibold text-slate-900">Growth over time</p>
        <div className="mt-4 h-[200px] md:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={yearlyData}>
                  <CartesianGrid stroke="#F4F2FC" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#9B9A94" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#9B9A94" }} tickFormatter={(v) => formatIndianCompact(Number(v))} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const inv = Number(payload.find((x) => x.dataKey === "invested")?.value ?? 0);
                      const port = Number(payload.find((x) => x.dataKey === "portfolio")?.value ?? 0);
                      const g = port - inv;
                      const pct = inv > 0 ? (g / inv) * 100 : 0;
                      return (
                        <div style={tooltipStyle}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>{`Year ${label}`}</div>
                          <div>Invested: ₹{formatIndian(inv)}</div>
                          <div>Portfolio value: ₹{formatIndian(port)}</div>
                          <div>
                            Gain: ₹{formatIndian(g)} ({pct.toFixed(0)}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* Stacked areas: invested + gain (visual wealth created) */}
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
                    dataKey="gain"
                    stackId="a"
                    stroke="transparent"
                    fill="#EEEDFE"
                    fillOpacity={0.4}
                    isAnimationActive
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="invested"
                    stroke="#AFA9EC"
                    strokeDasharray="6 6"
                    dot={false}
                    isAnimationActive
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="portfolio"
                    stroke="#534AB7"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => (value === "invested" ? "Invested" : "Portfolio value")}
                  />
                </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Insight tone={insightTone}>
        Your money grows <strong>{mult.toFixed(1)}×</strong> — roughly ₹
        {mult.toFixed(1)} for every ₹1 put in (at {rate}% p.a.).
      </Insight>
    </div>
  );
}
