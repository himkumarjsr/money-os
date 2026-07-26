"use client";

import { useEffect, useMemo } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  buildCreditCardBillStatuses,
  syncCreditCardBillObligation,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";
import { useAuthStore } from "@/store/authStore";

type Txn = {
  amount: number;
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  payment_method?: string | null;
  description?: string | null;
  date?: string | null;
  created_at?: string | null;
};

function formatDueLabel(
  iso?: string,
  dueDay?: number,
  overdue?: boolean,
): string {
  if (overdue) {
    if (iso) {
      const d = new Date(`${iso}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        return `Overdue since ${d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}`;
      }
    }
    return "Overdue — unpaid balance carried forward";
  }
  if (iso) {
    const d = new Date(`${iso}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return `Pay by ${d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })}`;
    }
  }
  if (dueDay) return `Due around day ${dueDay}`;
  return "Due from salary this month";
}

export default function CreditCardBillReminder({
  previousTransactions,
  currentTransactions = [],
  cards = [],
  monthlySalary,
  onPayBill,
}: {
  previousTransactions: Txn[];
  currentTransactions?: Txn[];
  cards?: SavedCreditCard[];
  monthName?: string;
  year?: number;
  monthlySalary?: number;
  /** Opens add-expense prefilled for paying the bill (cash out → loans / credit card). */
  onPayBill?: (amount: number, label: string, cardId: string) => void;
}) {
  const userId = useAuthStore((s) => s.user?.id);

  const statuses = useMemo(() => {
    const pool = [...previousTransactions, ...currentTransactions];
    return buildCreditCardBillStatuses({
      cards,
      transactions: pool,
    });
  }, [previousTransactions, currentTransactions, cards]);

  // Keep obligation amounts fresh so cron notifications show ~₹ remaining
  useEffect(() => {
    if (!userId || cards.length === 0) return;
    const byId = new Map(cards.map((c) => [c.id, c]));
    for (const bill of statuses) {
      const card = byId.get(bill.cardId);
      if (!card?.dueDay) continue;
      void syncCreditCardBillObligation(
        userId,
        card,
        bill.remaining > 0 ? bill.remaining : 0,
      );
    }
  }, [userId, cards, statuses]);

  // Always show when user has saved cards; otherwise only if there is bill activity
  if (cards.length === 0 && statuses.length === 0) return null;

  const dueTotal = statuses
    .filter((b) => b.status === "due")
    .reduce((s, b) => s + b.remaining, 0);
  const paidCount = statuses.filter((b) => b.status === "paid").length;

  const salaryHint =
    monthlySalary && monthlySalary > 0 && dueTotal > 0
      ? ` Aim to clear this from your ~₹${Math.round(monthlySalary).toLocaleString("en-IN")} salary.`
      : dueTotal > 0
        ? " Pay from your account (UPI / net banking) so interest doesn’t pile up."
        : "";

  return (
    <section
      aria-labelledby="cc-bill-reminder-title"
      style={{
        marginBottom: 16,
        borderRadius: 16,
        border: "1px solid #E8E6F0",
        background: "linear-gradient(135deg, #EEEDFE 0%, #FFFFFF 70%)",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#534AB7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AppIcon name="card" size={18} color="#FFFFFF" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            id="cc-bill-reminder-title"
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#111110",
              margin: 0,
            }}
          >
            Credit card dues
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              lineHeight: 1.5,
              color: "#5F5E5A",
            }}
          >
            {dueTotal > 0 ? (
              <>
                Still to pay ~₹
                <strong style={{ color: "#111110" }}>
                  {Math.round(dueTotal).toLocaleString("en-IN")}
                </strong>
                . Unpaid balances stay here until you mark them paid.
                {salaryHint}
              </>
            ) : paidCount > 0 ? (
              <>All tracked card bills are paid for now. Nice work.</>
            ) : (
              <>
                No balance due yet. Card spends show up here; paying adds a cash
                expense (real money out).
              </>
            )}
          </p>
        </div>
      </div>

      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
        {statuses.map((b) => {
          const isPaid = b.status === "paid";
          const isDue = b.status === "due";
          return (
            <li
              key={b.cardId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 0",
                borderTop: "1px solid #E8E6F0",
                background: isPaid ? "rgba(29,158,117,0.04)" : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    border: isPaid
                      ? "2px solid #1D9E75"
                      : b.overdue
                        ? "2px solid #E24B4A"
                        : "2px solid #534AB7",
                    background: isPaid ? "#1D9E75" : "white",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {isPaid ? "✓" : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isPaid ? "#1D5C3A" : "#111110",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: b.overdue ? "#E24B4A" : "#9B9A94",
                      marginTop: 2,
                    }}
                  >
                    {isPaid
                      ? `Paid ₹${Math.round(b.paid).toLocaleString("en-IN")} · logged as cash expense`
                      : formatDueLabel(b.dueDate, b.dueDay, b.overdue)}
                    {isDue && b.charged > 0
                      ? ` · Charged ₹${Math.round(b.charged).toLocaleString("en-IN")}${
                          b.paid > 0
                            ? ` · Paid ₹${Math.round(b.paid).toLocaleString("en-IN")}`
                            : ""
                        }`
                      : null}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: isPaid
                      ? "#1D9E75"
                      : b.overdue
                        ? "#E24B4A"
                        : "#111110",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isPaid
                    ? "Paid"
                    : isDue
                      ? `₹${Math.round(b.remaining).toLocaleString("en-IN")}`
                      : "—"}
                </span>
                {isDue && onPayBill ? (
                  <button
                    type="button"
                    aria-label={`Pay ₹${Math.round(b.remaining).toLocaleString("en-IN")} for ${b.label}`}
                    onClick={() => onPayBill(b.remaining, b.label, b.cardId)}
                    style={{
                      minHeight: 44,
                      padding: "0 14px",
                      borderRadius: 10,
                      border: "none",
                      background: "#534AB7",
                      color: "white",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Pay
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
