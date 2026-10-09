"use client";

import CollapsiblePanel from "@/components/tracker/CollapsiblePanel";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  buildCreditCardBillStatuses,
  buildCreditCardUsage,
  deactivateAllCreditCardObligations,
  deleteSavedCreditCard,
  formatCreditCardLabel,
  hideCreditCardDueLine,
  isCreditCardDueLineHidden,
  suggestDueDayFromBilling,
  upsertSavedCreditCard,
  type CreditCardOverdue,
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

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type CardDraft = {
  nickname: string;
  last4: string;
  billingDay: string;
  dueDay: string;
  creditLimit: string;
};

function draftFromCard(card: SavedCreditCard): CardDraft {
  return {
    nickname: card.nickname,
    last4: card.last4 ?? "",
    billingDay: card.billingDay ? String(card.billingDay) : "",
    dueDay: card.dueDay ? String(card.dueDay) : "",
    creditLimit: card.creditLimit ? String(card.creditLimit) : "",
  };
}

const EDIT_INPUT_STYLE = {
  width: "100%",
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #D8D6E8",
  padding: "0 10px",
  fontSize: 14,
  fontWeight: 600,
  color: "#111110",
  background: "white",
  boxSizing: "border-box" as const,
};

const EDIT_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 600,
  color: "#5F5E5A",
  display: "block",
  marginBottom: 4,
} as const;

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
  overdue = [],
  today,
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
  /** Statements not paid in full by their due date (counted under Loans). */
  overdue?: CreditCardOverdue[];
  /** Today (or the month's last day) for limit usage. */
  today?: Date;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(defaultOpen);
  const [hiddenTick, setHiddenTick] = useState(0);
  const [editingDueId, setEditingDueId] = useState<string | null>(null);
  const [dueDayDraft, setDueDayDraft] = useState("");
  const [dueEditError, setDueEditError] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);
  const [cardEditError, setCardEditError] = useState("");

  const usageById = useMemo(() => {
    const usage = buildCreditCardUsage({
      cards,
      transactions: [...previousTransactions, ...currentTransactions],
      asOf: today,
    });
    return new Map(usage.map((u) => [u.cardId, u]));
  }, [cards, previousTransactions, currentTransactions, today]);

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

  const startEditCard = (card: SavedCreditCard) => {
    setEditingCardId(card.id);
    setCardDraft(draftFromCard(card));
    setCardEditError("");
  };

  const saveCard = (card: SavedCreditCard) => {
    if (!userId || !cardDraft) return;
    const nickname = cardDraft.nickname.trim();
    if (!nickname) {
      setCardEditError("Enter a card name");
      return;
    }
    const day = (raw: string, label: string): number | undefined | null => {
      if (!raw.trim()) return undefined;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1 || n > 31) {
        setCardEditError(`${label} must be between 1 and 31`);
        return null;
      }
      return Math.round(n);
    };
    const billingDay = day(cardDraft.billingDay, "Billing day");
    if (billingDay === null) return;
    const dueDay = day(cardDraft.dueDay, "Due day");
    if (dueDay === null) return;
    const digits = cardDraft.last4.replace(/\D/g, "");
    if (digits && digits.length !== 4) {
      setCardEditError("Last 4 digits must be 4 numbers");
      return;
    }
    const limitRaw = cardDraft.creditLimit.replace(/[,\s₹]/g, "");
    const limit = limitRaw ? Number(limitRaw) : null;
    if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
      setCardEditError("Credit limit must be more than 0");
      return;
    }
    upsertSavedCreditCard(userId, {
      id: card.id,
      nickname,
      last4: digits || undefined,
      billingDay,
      dueDay:
        dueDay ??
        (billingDay ? suggestDueDayFromBilling(billingDay) : undefined),
      creditLimit: limit,
    });
    setEditingCardId(null);
    setCardDraft(null);
    setCardEditError("");
    onCardsChange?.();
  };

  if (
    cards.length === 0 &&
    dueStatuses.length === 0 &&
    paidStatuses.length === 0 &&
    overdue.length === 0
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
    overdue.length > 0
      ? `${inr(overdue.reduce((s, o) => s + o.remaining, 0))} unpaid after due date`
      : dueTotal > 0
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
            {salaryHint} Card spends already came off LEFT when you made them,
            so paying the bill doesn&apos;t reduce it again.
          </>
        ) : paidCount > 0 ? (
          <>All tracked card bills are paid for now. Nice work.</>
        ) : (
          <>Card spends show up here; paying logs a cash expense under Loans.</>
        )}
      </p>

      {overdue.map((o) => (
        <div
          key={`overdue-${o.cardId}`}
          role="alert"
          style={{
            margin: "0 0 10px",
            padding: "10px 12px",
            borderRadius: 12,
            background: "#FCEBEB",
            border: "1px solid #F5C9C9",
            fontSize: 12,
            lineHeight: 1.5,
            color: "#791F1F",
          }}
        >
          <strong>
            {o.label}: {inr(o.remaining)} unpaid from the bill due{" "}
            {shortDate(o.dueDate)}.
          </strong>{" "}
          Cards charge about 36–45% a year interest on what you don&apos;t pay
          in full. This counts under Loans until you clear it.
        </div>
      ))}

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

      {cards.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#5F5E5A",
              margin: "0 0 6px",
            }}
          >
            Your cards
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {cards.map((card) => {
              const usage = usageById.get(card.id);
              const editing = editingCardId === card.id && cardDraft;
              const pct = usage ? Math.round(usage.ratio * 100) : 0;
              return (
                <li
                  key={`card-${card.id}`}
                  style={{
                    padding: "10px 0",
                    borderTop: "1px solid #E8E6F0",
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
                        {formatCreditCardLabel(card)}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#9B9A94", marginTop: 2 }}
                      >
                        {card.billingDay
                          ? `Bill on day ${card.billingDay}`
                          : "No billing day"}
                        {card.dueDay ? ` · Due day ${card.dueDay}` : ""}
                        {card.creditLimit
                          ? ` · Limit ${inr(card.creditLimit)}`
                          : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit ${formatCreditCardLabel(card)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editing) {
                          setEditingCardId(null);
                          setCardDraft(null);
                        } else {
                          startEditCard(card);
                        }
                      }}
                      style={{
                        minHeight: 36,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: "1px solid #E8E6F0",
                        background: "#F7F7F4",
                        color: "#534AB7",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {editing ? "Close" : "Edit"}
                    </button>
                  </div>

                  {usage ? (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "#5F5E5A",
                          marginBottom: 4,
                        }}
                      >
                        <span>
                          This statement: {inr(usage.used)} of{" "}
                          {inr(usage.limit)}
                        </span>
                        <span style={{ fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "#F0EFF8",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, pct)}%`,
                            background: usage.overWarn ? "#E24B4A" : "#534AB7",
                          }}
                        />
                      </div>
                      {usage.overWarn ? (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#E24B4A",
                            fontWeight: 600,
                            marginTop: 4,
                          }}
                        >
                          Using over 30% of your limit can lower your credit
                          score.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {editing && cardDraft ? (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "#F7F7F4",
                        border: "1px solid #E8E6F0",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr",
                          gap: 8,
                        }}
                      >
                        <label>
                          <span style={EDIT_LABEL_STYLE}>Card name</span>
                          <input
                            type="text"
                            value={cardDraft.nickname}
                            onChange={(e) =>
                              setCardDraft({
                                ...cardDraft,
                                nickname: e.target.value,
                              })
                            }
                            style={EDIT_INPUT_STYLE}
                          />
                        </label>
                        <label>
                          <span style={EDIT_LABEL_STYLE}>Last 4 digits</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={cardDraft.last4}
                            onChange={(e) =>
                              setCardDraft({
                                ...cardDraft,
                                last4: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            placeholder="1234"
                            style={EDIT_INPUT_STYLE}
                          />
                        </label>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1.4fr",
                          gap: 8,
                        }}
                      >
                        <label>
                          <span style={EDIT_LABEL_STYLE}>Billing day</span>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            inputMode="numeric"
                            value={cardDraft.billingDay}
                            onChange={(e) =>
                              setCardDraft({
                                ...cardDraft,
                                billingDay: e.target.value,
                              })
                            }
                            placeholder="15"
                            style={EDIT_INPUT_STYLE}
                          />
                        </label>
                        <label>
                          <span style={EDIT_LABEL_STYLE}>Due day</span>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            inputMode="numeric"
                            value={cardDraft.dueDay}
                            onChange={(e) =>
                              setCardDraft({
                                ...cardDraft,
                                dueDay: e.target.value,
                              })
                            }
                            placeholder="5"
                            style={EDIT_INPUT_STYLE}
                          />
                        </label>
                        <label>
                          <span style={EDIT_LABEL_STYLE}>Credit limit (₹)</span>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={cardDraft.creditLimit}
                            onChange={(e) =>
                              setCardDraft({
                                ...cardDraft,
                                creditLimit: e.target.value,
                              })
                            }
                            placeholder="Optional"
                            style={EDIT_INPUT_STYLE}
                          />
                        </label>
                      </div>
                      {cardEditError ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#E24B4A",
                          }}
                        >
                          {cardEditError}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#9B9A94" }}>
                          Bills are worked out again from the new dates.
                        </span>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveCard(card);
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
                            setEditingCardId(null);
                            setCardDraft(null);
                            setCardEditError("");
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
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </CollapsiblePanel>
  );
}
