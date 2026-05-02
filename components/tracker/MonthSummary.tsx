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
    <div
      style={{
        background: "white",
        border: "1px solid #E8E6F0",
        borderRadius: 16,
        padding: "16px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#9B9A94",
          marginBottom: 14,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {Object.entries(TRACKER_CATEGORIES)
        .filter(([key]) => key !== "income")
        .map(([key, cat]) => {
          const amount = bucketTotals[key] || 0;
          const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
          const isOverBudget = cat.cap > 0 && percentage > cat.cap;

          return (
            <div key={key} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span>{cat.emoji}</span>
                  <span style={{ fontWeight: 500, color: "#111110" }}>{cat.label}</span>
                  {cat.cap > 0 ? (
                    <span style={{ fontSize: 11, color: "#9B9A94" }}>(cap {cat.cap}%)</span>
                  ) : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isOverBudget ? (
                    <span
                      style={{
                        fontSize: 10,
                        background: "#FCEBEB",
                        color: "#E24B4A",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontWeight: 700,
                      }}
                    >
                      OVER BUDGET
                    </span>
                  ) : null}
                  <span style={{ fontSize: 14, fontWeight: 700, color: isOverBudget ? "#E24B4A" : "#111110" }}>
                    ₹{amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div style={{ height: 6, background: "#F7F7F4", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(percentage, 100)}%`,
                    background: isOverBudget ? "#E24B4A" : cat.color,
                    borderRadius: 3,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}
