"use client";

import CollapsiblePanel from "@/components/tracker/CollapsiblePanel";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  buildCreditCardBillStatuses,
  syncCreditCardBillObligation,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState } from "react";

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
  defaultOpen = false,
  optimisticPayments = [],
}: {
  previousTransactions: Txn[];
  currentTransactions?: Txn[];
  cards?: SavedCreditCard[];
  monthName?: string;
  year?: number;
  monthlySalary?: number;
  /** Opens add-expense prefilled for paying the bill (cash out → loans / credit card). */
  onPayBill?: (amount: number, label: string, cardId: string) => void;
  defaultOpen?: boolean;
  /** Recent Pay saves not yet reflected in fetched txns (cardId → amount). */
  optimisticPayments?: Array<{ cardId: string; amount: number }>;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(defaultOpen);

  const statuses = useMemo(() => {
    const pool = [...previousTransactions, ...currentTransactions];
    const base = buildCreditCardBillStatuses({
      cards,
      transactions: pool,
    });
    if (!optimisticPayments.length) return base;
    return base.map((bill) => {
      const boost = optimisticPayments
        .filter((p) => p.cardId.toLowerCase() === bill.cardId.toLowerCase())
        .reduce((s, p) => s + p.amount, 0);
      if (boost <= 0) return bill;
      // Avoid double-count once the real payment is in the pool.
      const extra = Math.max(0, boost - bill.paid);
      if (extra <= 0) return bill;
      const paid = bill.paid + extra;
      const remaining = Math.max(
        0,
        Math.round((bill.charged - paid) * 100) / 100,
      );
      let status: typeof bill.status = "clear";
      if (remaining > 0) status = "due";
      else if (bill.charged > 0 || paid > 0) status = "paid";
      return {
        ...bill,
        paid,
        remaining,
        amount: remaining > 0 ? remaining : bill.amount,
        status,
      };
    });
  }, [previousTransactions, currentTransactions, cards, optimisticPayments]);

  useEffect(() => {
    if (optimisticPayments.length > 0) setOpen(true);
  }, [optimisticPayments]);

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

  const subtitle =
    dueTotal > 0
      ? `₹${Math.round(dueTotal).toLocaleString("en-IN")} still to pay`
      : paidCount > 0
        ? "All tracked bills paid"
        : "No balance due yet";

  return (
    <CollapsiblePanel
      title="Credit card dues"
      subtitle={subtitle}
      icon="card"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      defaultBorder={false}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          lineHeight: 1.5,
          color: "#5F5E5A",
        }}
      >
        {dueTotal > 0 ? (
          <>
            Unpaid balances stay here until you mark them paid.
            {salaryHint} Paying via UPI / net banking reduces purple LEFT (cash
            out). Purchases on the card do not.
          </>
        ) : paidCount > 0 ? (
          <>All tracked card bills are paid for now. Nice work.</>
        ) : (
          <>Card spends show up here; paying logs a cash expense under Loans.</>
        )}
      </p>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
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
                    flexShrink: 0,
                  }}
                >
                  {isPaid ? (
                    <AppIcon name="check" size={14} color="#FFFFFF" />
                  ) : null}
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
                      ? `Paid ₹${Math.round(b.paid).toLocaleString("en-IN")}`
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
                {isPaid ? (
                  <span
                    style={{
                      minHeight: 36,
                      padding: "0 12px",
                      borderRadius: 10,
                      background: "#E1F5EE",
                      color: "#1D9E75",
                      fontSize: 13,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <AppIcon name="check" size={14} color="#1D9E75" />
                    Paid
                  </span>
                ) : isDue && onPayBill ? (
                  <button
                    type="button"
                    aria-label={`Pay ₹${Math.round(b.remaining).toLocaleString("en-IN")} for ${b.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPayBill(b.remaining, b.label, b.cardId);
                    }}
                    style={{
                      minHeight: 36,
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
                    Pay ₹{Math.round(b.remaining).toLocaleString("en-IN")}
                  </button>
                ) : (
                  <span
                    style={{ fontSize: 13, fontWeight: 700, color: "#9B9A94" }}
                  >
                    —
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </CollapsiblePanel>
  );
}
