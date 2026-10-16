"use client";

import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#534AB7", "#AFA9EC", "#1D9E75"];

/** Year-by-year lines for up to three series. */
export function GrowthChart({
  title,
  data,
  series,
  xLabel = "Year",
}: {
  title: string;
  data: Array<Record<string, number>>;
  series: Array<{ key: string; label: string; dashed?: boolean }>;
  xLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-[#F0EFF8] bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 h-[210px] md:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid stroke="#F4F2FC" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#9B9A94" }} />
            <YAxis
              width={56}
              tick={{ fontSize: 11, fill: "#9B9A94" }}
              tickFormatter={(v) => formatIndianCompact(Number(v))}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111110",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                color: "white",
              }}
              labelStyle={{ color: "white", fontWeight: 700 }}
              itemStyle={{ color: "white" }}
              labelFormatter={(l) => `${xLabel} ${l}`}
              formatter={(v, name) => [
                `₹${formatIndian(Math.round(Number(v)))}`,
                String(name),
              ]}
            />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={i === 0 ? 2.5 : 2}
                strokeDasharray={s.dashed ? "6 6" : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
