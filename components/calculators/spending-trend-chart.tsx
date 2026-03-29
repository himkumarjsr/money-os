"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Jan", spend: 420 },
  { month: "Feb", spend: 380 },
  { month: "Mar", spend: 510 },
  { month: "Apr", spend: 460 },
  { month: "May", spend: 490 },
  { month: "Jun", spend: 440 },
];

export function SpendingTrendChart() {
  return (
    <div className="h-56 w-full min-w-0 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
          <YAxis
            width={32}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            }}
            labelStyle={{ color: "var(--color-text)" }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-primary)" }}
            activeDot={{ r: 5 }}
            name="Spending"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
