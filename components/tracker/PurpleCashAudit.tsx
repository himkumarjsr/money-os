"use client";

import {
  buildCashAudit,
  logCashAudit,
  reasonLabel,
  type CashAuditResult,
} from "@/lib/trackerCashAudit";
import { useEffect, useMemo, useState } from "react";

type Txn = {
  id?: string;
  date?: string | null;
  amount: number | string;
  bucket?: string | null;
  subcategory?: string | null;
  category?: string | null;
  description?: string | null;
  payment_method?: string | null;
};

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function PurpleCashAudit({
  transactions,
  profileMonthlyIncome = 0,
}: {
  transactions: Txn[];
  profileMonthlyIncome?: number;
}) {
  const [open, setOpen] = useState(false);
  const audit: CashAuditResult = useMemo(
    () =>
      buildCashAudit({
        transactions,
        profileMonthlyIncome,
      }),
    [transactions, profileMonthlyIncome],
  );

  useEffect(() => {
    if (!open) return;
    logCashAudit(audit);
  }, [open, audit]);

  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 16,
        borderRadius: 12,
        border: "1px solid #E8E6F0",
        background: "#FAFAFE",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 14px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#534AB7" }}>
          How is LEFT calculated?
        </span>
        <span style={{ fontSize: 12, color: "#9B9A94" }}>
          {open ? "Hide" : "Show log"}
        </span>
      </button>

      {open ? (
        <div style={{ padding: "0 14px 14px", fontSize: 12, color: "#5F5E5A" }}>
          <div
            style={{
              background: "white",
              borderRadius: 10,
              border: "1px solid #E8E6F0",
              padding: "10px 12px",
              marginBottom: 10,
              lineHeight: 1.55,
            }}
          >
            <div>
              <strong>INCOME</strong> {inr(audit.incomeUsed)}{" "}
              <span style={{ color: "#9B9A94" }}>
                (
                {audit.incomeSource === "logged"
                  ? "from logged income this month"
                  : audit.incomeSource === "profile"
                    ? "from profile salary (no income logged)"
                    : "none"}
                )
              </span>
            </div>
            <div>
              <strong>− SPENT</strong> {inr(audit.purpleSpent)}{" "}
              <span style={{ color: "#9B9A94" }}>
                ({audit.included.length} expense
                {audit.included.length === 1 ? "" : "s"} · includes loan EMIs &
                investment; excludes Credit card section)
              </span>
            </div>
            <div>
              <strong>= LEFT</strong>{" "}
              <span
                style={{
                  fontWeight: 800,
                  color: audit.left < 0 ? "#E24B4A" : "#1D9E75",
                }}
              >
                {inr(audit.left)}
              </span>
            </div>
            {audit.onCards > 0 ? (
              <div style={{ marginTop: 6, color: "#534AB7" }}>
                On cards (not in SPENT): {inr(audit.onCards)}
              </div>
            ) : null}
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#534AB7",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            In purple SPENT
          </div>
          {audit.included.length === 0 ? (
            <div style={{ marginBottom: 10, color: "#9B9A94" }}>
              No cash expenses counted this month.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: "0 0 12px",
                padding: 0,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {audit.included.map((l) => (
                <li
                  key={l.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: "1px solid #F0EEF8",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: "#111110" }}>
                      {l.description}
                    </span>
                    <br />
                    <span style={{ color: "#9B9A94" }}>
                      {l.date} · {l.bucket}/{l.subcategory} · {l.paymentMethod}
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#111110",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {inr(l.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p style={{ margin: "0 0 10px", fontSize: 11, color: "#9B9A94" }}>
            Obligation checklist totals are planning only — they never reduce
            LEFT. Credit card dues / purchases are tracked under Bills &amp;
            calendar, not purple SPENT.
          </p>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#534AB7",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Excluded — Credit card section only
          </div>
          {audit.excluded.length === 0 ? (
            <div style={{ color: "#9B9A94" }}>
              No credit-card purchases or bill payments this month.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {audit.excluded.map((l) => (
                <li
                  key={l.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: "1px solid #F0EEF8",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: "#111110" }}>
                      {l.description}
                    </span>
                    <br />
                    <span style={{ color: "#BA7517" }}>
                      {reasonLabel(l.reason)}
                    </span>
                    <br />
                    <span style={{ color: "#9B9A94" }}>
                      {l.date} · {l.bucket}/{l.subcategory} · {l.paymentMethod}
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#5F5E5A",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {inr(l.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9B9A94" }}>
            Also printed to the browser console when you open this log.
          </p>
        </div>
      ) : null}
    </div>
  );
}
