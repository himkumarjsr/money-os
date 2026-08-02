"use client";

import CollapsiblePanel from "@/components/tracker/CollapsiblePanel";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  buildCreditCardBillStatuses,
  deactivateAllCreditCardObligations,
  deleteSavedCreditCard,
  hideCreditCardDueLine,
  isCreditCardDueLineHidden,
  upsertSavedCreditCard,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";
import { useAuthStore } from "@/store/authStore";
import { useObligationStore } from "@/store/obligationStore";
import { useEffect, useMemo, useRef, useState } from "react";

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
  onCardsChange,
  defaultOpen = false,
  optimisticPayments = [],
  asOf,
}: {
  previousTransactions: Txn[];
  currentTransactions?: Txn[];
  cards?: SavedCreditCard[];
  monthName?: string;
  year?: number;
  monthlySalary?: number;
  /** Opens add-expense prefilled for paying the bill (cash out → loans / credit card). */
  onPayBill?: (amount: number, label: string, cardId: string) => void;
  /** Called after a saved card is deleted so parent can refresh the card list. */
  onCardsChange?: () => void;
  defaultOpen?: boolean;
  /** Recent Pay saves not yet reflected in fetched txns (cardId → amount). */
  optimisticPayments?: Array<{ cardId: string; amount: number }>;
  /** Anchor month for “last month’s charges” (usually 1st of selected tracker month). */
  asOf?: Date;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(defaultOpen);
  const [hiddenTick, setHiddenTick] = useState(0);
  const [editingDueId, setEditingDueId] = useState<string | null>(null);
  const [dueDayDraft, setDueDayDraft] = useState("");
  const [dueEditError, setDueEditError] = useState("");

  const statuses = useMemo(() => {
    const pool = [...previousTransactions, ...currentTransactions];
    // Include every card purchase in the pool (prior + this month) so an expense
    // paid via credit card shows in dues immediately — not only next month.
    const base = buildCreditCardBillStatuses({
      cards,
      transactions: pool,
      asOf,
      previousMonthChargesOnly: false,
    });
    const visible = userId
      ? base.filter((b) => !isCreditCardDueLineHidden(userId, b.cardId))
      : base;
    if (!optimisticPayments.length) return visible;
    return visible.map((bill) => {
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
  }, [
    previousTransactions,
    currentTransactions,
    cards,
    optimisticPayments,
    asOf,
    userId,
    hiddenTick,
  ]);

  const dueStatuses = useMemo(
    () => statuses.filter((b) => b.status === "due" && b.remaining > 0),
    [statuses],
  );
  const paidStatuses = useMemo(
    () => statuses.filter((b) => b.status === "paid"),
    [statuses],
  );

  useEffect(() => {
    if (optimisticPayments.length > 0) setOpen(true);
  }, [optimisticPayments]);

  // One-time cleanup: CC bills must not appear under Obligations.
  const cleanedCcObligations = useRef(false);
  useEffect(() => {
    if (!userId || cleanedCcObligations.current) return;
    cleanedCcObligations.current = true;
    void (async () => {
      const n = await deactivateAllCreditCardObligations(userId);
      if (n > 0) {
        const store = useObligationStore.getState();
        const month = asOf ?? new Date();
        await store.fetchObligations(userId);
        await store.generateChecklist(userId, month);
        await store.fetchChecklist(userId, month);
      }
    })();
  }, [userId, asOf]);

  const handleDeleteDue = (cardId: string, label: string) => {
    if (!userId) return;
    const isSaved = cards.some((c) => c.id === cardId);
    const ok = window.confirm(
      isSaved
        ? `Remove “${label}” from Credit card dues?\n\nThe saved card is deleted. Past expenses stay in your list.`
        : `Remove “${label}” from Credit card dues?\n\nPast expenses stay in your list; this due line is hidden.`,
    );
    if (!ok) return;
    if (isSaved) {
      deleteSavedCreditCard(userId, cardId);
      onCardsChange?.();
    } else {
      hideCreditCardDueLine(userId, cardId);
    }
    setEditingDueId(null);
    setHiddenTick((n) => n + 1);
  };

  const startEditDue = (cardId: string, dueDay?: number) => {
    setEditingDueId(cardId);
    setDueDayDraft(dueDay ? String(dueDay) : "");
    setDueEditError("");
  };

  const saveDueDay = (cardId: string, label: string) => {
    if (!userId) return;
    const n = Number(dueDayDraft);
    if (!Number.isFinite(n) || n < 1 || n > 31) {
      setDueEditError("Enter a day between 1 and 31");
      return;
    }
    const existing = cards.find((c) => c.id === cardId);
    upsertSavedCreditCard(userId, {
      id: cardId,
      nickname: existing?.nickname || label,
      last4: existing?.last4,
      billingDay: existing?.billingDay,
      dueDay: Math.round(n),
    });
    setEditingDueId(null);
    setDueEditError("");
    onCardsChange?.();
  };

  if (
    cards.length === 0 &&
    dueStatuses.length === 0 &&
    paidStatuses.length === 0
  ) {
    return null;
  }

  const dueTotal = dueStatuses.reduce((s, b) => s + b.remaining, 0);
  const paidCount = paidStatuses.length;

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

      {dueStatuses.length === 0 && paidCount > 0 ? (
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            color: "#1D9E75",
            fontWeight: 600,
          }}
        >
          Tracked card spends are settled — nothing due right now.
        </p>
      ) : null}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {dueStatuses.map((b) => {
          const isPaid = false;
          const isDue = true;
          const editing = editingDueId === b.cardId;
          return (
            <li
              key={b.cardId}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "10px 0",
                borderTop: "1px solid #E8E6F0",
                background: isPaid ? "rgba(29,158,117,0.04)" : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
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
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#9B9A94",
                      }}
                    >
                      —
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Edit due day for ${b.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditDue(b.cardId, b.dueDay);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid #E8E6F0",
                      background: "#F7F7F4",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <AppIcon name="pencil" size={15} color="#534AB7" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${b.label} from credit card dues`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDue(b.cardId, b.label);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid #F0DEDE",
                      background: "#FFF7F7",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <AppIcon name="trash" size={15} color="#E24B4A" />
                  </button>
                </div>
              </div>

              {editing ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "#F7F7F4",
                    border: "1px solid #E8E6F0",
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#5F5E5A",
                    }}
                  >
                    Due day of month
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    inputMode="numeric"
                    value={dueDayDraft}
                    onChange={(e) => {
                      setDueDayDraft(e.target.value);
                      setDueEditError("");
                    }}
                    placeholder="e.g. 5"
                    aria-label={`Due day for ${b.label}`}
                    style={{
                      width: 72,
                      minHeight: 36,
                      borderRadius: 10,
                      border: "1px solid #D8D6E8",
                      padding: "0 10px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#111110",
                      background: "white",
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveDueDay(b.cardId, b.label);
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
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDueId(null);
                      setDueEditError("");
                    }}
                    style={{
                      minHeight: 36,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      color: "#5F5E5A",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  {dueEditError ? (
                    <span
                      style={{
                        width: "100%",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#E24B4A",
                      }}
                    >
                      {dueEditError}
                    </span>
                  ) : (
                    <span
                      style={{
                        width: "100%",
                        fontSize: 11,
                        color: "#9B9A94",
                      }}
                    >
                      Monthly due day (1–31). Example: 28 → overdue/due around
                      the 28th each month.
                    </span>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </CollapsiblePanel>
  );
}
