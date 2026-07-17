"use client";

import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import {
  TRACKER_CATEGORIES,
  findSubcategory,
  type BucketType,
} from "@/lib/tracker-categories";
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
  onEdit,
}: {
  transactions: TrackerTransactionRow[];
  onChanged: () => void;
  onEdit?: (txn: TrackerTransactionRow) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    if (!window.confirm("Remove this entry?")) return;
    setDeletingId(id);
    const supabase = getSupabase();
    await supabase
      .from("expense_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    setDeletingId(null);
    onChanged();
  };

  if (transactions.length === 0) {
    return (
      <p
        style={{
          padding: "24px",
          textAlign: "center",
          color: "#111110",
          fontSize: 14,
          margin: 0,
        }}
      >
        No transactions for this month.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "1px solid #F0EFF8",
              color: "#111110",
              textAlign: "left",
            }}
          >
            <th style={{ padding: "10px 12px", fontWeight: 700 }}>Date</th>
            <th style={{ padding: "10px 12px", fontWeight: 700 }}>Category</th>
            <th style={{ padding: "10px 12px", fontWeight: 700 }}>Note</th>
            <th
              style={{
                padding: "10px 12px",
                fontWeight: 700,
                textAlign: "right",
              }}
            >
              Amount
            </th>
            <th style={{ padding: "10px 12px", fontWeight: 700 }} />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const bucketKey = t.bucket as BucketType;
            const bucket = TRACKER_CATEGORIES[bucketKey];
            const subId = t.subcategory ?? t.category;
            const sub = bucket ? findSubcategory(bucketKey, subId) : null;
            const editVerb = t.bucket === "income" ? "income" : "expense";

            return (
              <tr key={t.id} style={{ borderBottom: "1px solid #F7F7F4" }}>
                <td
                  style={{
                    padding: "12px",
                    color: "#111110",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                  }}
                >
                  {new Date(t.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td
                  style={{ padding: "12px", color: "#111110", fontWeight: 600 }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {bucket ? (
                      <TrackerIcon
                        name={sub?.icon ?? bucket.icon}
                        size={16}
                        color={bucket.color}
                      />
                    ) : null}
                    {sub?.label ?? t.category}
                  </span>
                </td>
                <td
                  style={{ padding: "12px", color: "#111110", maxWidth: 140 }}
                >
                  {t.description || "—"}
                </td>
                <td
                  style={{
                    padding: "12px",
                    textAlign: "right",
                    fontWeight: 700,
                    color:
                      t.bucket === "investment"
                        ? "#1D9E75"
                        : t.bucket === "habits"
                          ? "#E24B4A"
                          : "#111110",
                  }}
                >
                  {t.bucket === "investment" ? "+" : "−"}₹
                  {Number(t.amount).toLocaleString("en-IN")}
                </td>
                <td style={{ padding: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    {onEdit ? (
                      <button
                        type="button"
                        aria-label={`Edit ${editVerb}`}
                        title={`Edit ${editVerb}`}
                        onClick={() => onEdit(t)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#534AB7",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Delete ${editVerb}`}
                      title={`Delete ${editVerb}`}
                      onClick={() => void handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#E24B4A",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {deletingId === t.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
