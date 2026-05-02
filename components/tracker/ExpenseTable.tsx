"use client";

import { TRACKER_CATEGORIES } from "@/lib/tracker-categories";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

export type TrackerTransactionRow = {
  id: string;
  date: string;
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  bucket: string;
  payment_method: string | null;
};

export default function ExpenseTable({
  transactions,
  onChanged,
}: {
  transactions: TrackerTransactionRow[];
  onChanged: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    setDeletingId(id);
    const supabase = getSupabase();
    await supabase.from("expense_transactions").delete().eq("id", id).eq("user_id", user.id);
    setDeletingId(null);
    onChanged();
  };

  if (transactions.length === 0) {
    return (
      <p style={{ padding: "24px", textAlign: "center", color: "#9B9A94", fontSize: 14, margin: 0 }}>
        No transactions for this month.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #F0EFF8", color: "#9B9A94", textAlign: "left" }}>
            <th style={{ padding: "10px 12px", fontWeight: 700 }}>Date</th>
            <th style={{ padding: "10px 12px", fontWeight: 700 }}>Category</th>
            <th style={{ padding: "10px 12px", fontWeight: 700 }}>Note</th>
            <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>Amount</th>
            <th style={{ padding: "10px 12px", fontWeight: 700 }} />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const bucket = TRACKER_CATEGORIES[t.bucket as keyof typeof TRACKER_CATEGORIES];
            const subId = t.subcategory ?? t.category;
            const sub = bucket?.subcategories.find((s) => s.id === subId);

            return (
              <tr key={t.id} style={{ borderBottom: "1px solid #F7F7F4" }}>
                <td style={{ padding: "12px", color: "#5F5E5A", whiteSpace: "nowrap" }}>
                  {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td style={{ padding: "12px", color: "#111110", fontWeight: 600 }}>
                  {sub?.label ?? t.category}
                </td>
                <td style={{ padding: "12px", color: "#9B9A94", maxWidth: 140 }}>{t.description || "—"}</td>
                <td
                  style={{
                    padding: "12px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: t.bucket === "investment" ? "#1D9E75" : t.bucket === "habits" ? "#E24B4A" : "#111110",
                  }}
                >
                  {t.bucket === "investment" ? "+" : "−"}₹{Number(t.amount).toLocaleString("en-IN")}
                </td>
                <td style={{ padding: "12px" }}>
                  <button
                    type="button"
                    onClick={() => void handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#E24B4A",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {deletingId === t.id ? "…" : "Remove"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
