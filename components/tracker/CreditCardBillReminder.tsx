"use client";

import { useMemo, useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  dismissCreditCardBillReminder,
  isCreditCardBillDismissed,
  summarizeCreditCardBills,
} from "@/lib/trackerCreditCards";

type Txn = {
  amount: number;
  bucket?: string | null;
  payment_method?: string | null;
};

export default function CreditCardBillReminder({
  previousTransactions,
  monthName,
  year,
  monthlySalary,
  onPayBill,
}: {
  previousTransactions: Txn[];
  monthName: string;
  year: number;
  monthlySalary?: number;
  /** Opens add-expense prefilled for paying the bill (loans / credit card). */
  onPayBill?: (amount: number, label: string) => void;
}) {
  const [dismissed, setDismissed] = useState(() =>
    isCreditCardBillDismissed(year, monthName),
  );

  const bills = useMemo(
    () => summarizeCreditCardBills(previousTransactions),
    [previousTransactions],
  );

  const total = bills.reduce((s, b) => s + b.amount, 0);

  if (dismissed || bills.length === 0 || total <= 0) return null;

  const salaryHint =
    monthlySalary && monthlySalary > 0
      ? ` Aim to clear this from your ~₹${Math.round(monthlySalary).toLocaleString("en-IN")} salary.`
      : " Pay these from this month’s salary so interest doesn’t pile up.";

  return (
    <div
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
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#111110",
              }}
            >
              Pay last month’s credit card bills
            </div>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                lineHeight: 1.45,
                color: "#5F5E5A",
              }}
            >
              You spent{" "}
              <strong style={{ color: "#111110" }}>
                ₹{Math.round(total).toLocaleString("en-IN")}
              </strong>{" "}
              on credit cards last month.{salaryHint}
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
            color: "#9B9A94",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
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
                Due from salary this month
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
                  onClick={() => onPayBill(b.amount, b.label)}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "#534AB7",
                    color: "white",
                    fontSize: 12,
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
    </div>
  );
}
