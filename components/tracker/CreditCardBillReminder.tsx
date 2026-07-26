"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  buildCreditCardPaySuggestions,
  dismissCreditCardBillReminder,
  isCreditCardBillDismissed,
  summarizeCreditCardBills,
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
  date?: string | null;
  created_at?: string | null;
};

function formatDueLabel(iso?: string, dueDay?: number): string {
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
  monthName,
  year,
  monthlySalary,
  onPayBill,
}: {
  previousTransactions: Txn[];
  currentTransactions?: Txn[];
  cards?: SavedCreditCard[];
  monthName: string;
  year: number;
  monthlySalary?: number;
  /** Opens add-expense prefilled for paying the bill (loans / credit card). */
  onPayBill?: (amount: number, label: string) => void;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [dismissed, setDismissed] = useState(() =>
    isCreditCardBillDismissed(year, monthName),
  );

  const bills = useMemo(() => {
    const pool = [...previousTransactions, ...currentTransactions];
    if (cards.length > 0) {
      return buildCreditCardPaySuggestions({
        cards,
        transactions: pool,
      });
    }
    // Legacy: no saved cards with dates — previous calendar month totals
    return summarizeCreditCardBills(previousTransactions);
  }, [previousTransactions, currentTransactions, cards]);

  // Keep obligation amounts fresh so cron notifications show ~₹ suggested pay
  useEffect(() => {
    if (!userId || cards.length === 0 || bills.length === 0) return;
    const byId = new Map(cards.map((c) => [c.id, c]));
    for (const bill of bills) {
      const card = byId.get(bill.cardId);
      if (!card?.dueDay || bill.amount <= 0) continue;
      void syncCreditCardBillObligation(userId, card, bill.amount);
    }
  }, [userId, cards, bills]);

  const total = bills.reduce((s, b) => s + b.amount, 0);

  if (dismissed || bills.length === 0 || total <= 0) return null;

  const salaryHint =
    monthlySalary && monthlySalary > 0
      ? ` Aim to clear this from your ~₹${Math.round(monthlySalary).toLocaleString("en-IN")} salary.`
      : " Pay these from this month’s salary so interest doesn’t pile up.";

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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
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
          <div style={{ minWidth: 0 }}>
            <h2
              id="cc-bill-reminder-title"
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#111110",
                margin: 0,
              }}
            >
              Credit card bills due
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                lineHeight: 1.5,
                color: "#5F5E5A",
              }}
            >
              Suggested pay ~₹
              <strong style={{ color: "#111110" }}>
                {Math.round(total).toLocaleString("en-IN")}
              </strong>{" "}
              from your statement windows.{salaryHint}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss credit card bill reminder"
          onClick={() => {
            dismissCreditCardBillReminder(year, monthName);
            setDismissed(true);
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "#5F5E5A",
            fontSize: 22,
            fontWeight: 700,
            cursor: "pointer",
            lineHeight: 1,
            minWidth: 44,
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
        {bills.map((b) => (
          <li
            key={b.cardId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "8px 0",
              borderTop: "1px solid #E8E6F0",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111110",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {b.label}
              </div>
              <div style={{ fontSize: 12, color: "#9B9A94", marginTop: 2 }}>
                {formatDueLabel(b.dueDate, b.dueDay)}
                {b.amount > 0
                  ? ` · Pay ~₹${Math.round(b.amount).toLocaleString("en-IN")}`
                  : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#E24B4A",
                  whiteSpace: "nowrap",
                }}
              >
                ₹{Math.round(b.amount).toLocaleString("en-IN")}
              </span>
              {onPayBill ? (
                <button
                  type="button"
                  aria-label={`Pay ₹${Math.round(b.amount).toLocaleString("en-IN")} for ${b.label}`}
                  onClick={() => onPayBill(b.amount, b.label)}
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
        ))}
      </ul>
    </section>
  );
}
