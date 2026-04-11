"use client";

import { fmt } from "@/lib/optimizer-format";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type MonthlyAllocationPieSlice = {
  name: string;
  value: number;
  fill: string;
};

export function MonthlyAllocationPieChart({
  pieAgg,
  totalPie,
}: {
  pieAgg: MonthlyAllocationPieSlice[];
  totalPie: number;
}) {
  return (
    <div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieAgg} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
              {pieAgg.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => fmt(value)}
              contentStyle={{ borderRadius: 12, border: "1px solid #E8E6F0" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        {pieAgg.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: item.fill,
                border: item.fill === "#E8E6F0" ? "1px solid #D4D0E0" : undefined,
              }}
            />
            <span style={{ fontSize: 12, color: "#5F5E5A" }}>
              {item.name}: {fmt(item.value)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">Total shown: {fmt(totalPie)}</p>
    </div>
  );
}
