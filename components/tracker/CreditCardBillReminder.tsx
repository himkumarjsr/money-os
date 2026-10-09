"use client";

import CollapsiblePanel from "@/components/tracker/CollapsiblePanel";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  buildCardBills,
  cardBillCycleText,
  cardLastBillText,
  creditCardBillPaymentDescription,
  deactivateAllCreditCardObligations,
  deleteSavedCreditCard,
  formatCreditCardLabel,
  hideCreditCardDueLine,
  isCreditCardDueLineHidden,
  markCardStatementPaid,
  suggestDueDayFromBilling,
  upsertSavedCreditCard,
  type CardBillSummary,
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

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

const SMALL_BUTTON = {
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

export default function CreditCardBillReminder({
  previousTransactions,
  currentTransactions = [],
  cards = [],
  onPayBill,
  onCardsChange,
  defaultOpen = false,
  optimisticPayments = [],
  asOf,
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
  /** Called after a saved card changes so the parent can reload the list. */
  onCardsChange?: () => void;
  defaultOpen?: boolean;
  /** Recent Pay saves not yet reflected in fetched txns (cardId → amount). */
  optimisticPayments?: Array<{ cardId: string; amount: number }>;
  /** First day of the selected tracker month (obligation cleanup). */
  asOf?: Date;
  /** Today (or the month's last day) for cycles, bills and limit usage. */
  today?: Date;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(defaultOpen);
  const [hiddenTick, setHiddenTick] = useState(0);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);
  const [cardEditError, setCardEditError] = useState("");

  const bills = useMemo(() => {
    const day = today ?? new Date();
    // Pay saves not fetched yet count as payments for that card today.
    const pending: Txn[] = optimisticPayments.map((p) => {
      const card = cards.find((c) => c.id === p.cardId);
      return {
        amount: p.amount,
        bucket: "loans",
        subcategory: "credit_card",
        category: "credit_card",
        payment_method: "upi",
        description: `${creditCardBillPaymentDescription(
          card ? formatCreditCardLabel(card) : "Credit card",
        )} [#${p.cardId}]`,
        date: localIso(day),
      };
    });
    const result = buildCardBills({
      cards,
      transactions: [
        ...previousTransactions,
        ...currentTransactions,
        ...pending,
      ],
      asOf: day,
    });
    const otherCards = userId
      ? result.otherCards.filter(
          (o) => !isCreditCardDueLineHidden(userId, o.key),
        )
      : result.otherCards;
    return {
      cards: result.cards,
      otherCards,
      totalUpcoming:
        result.cards.reduce((sum, c) => sum + c.upcoming, 0) +
        otherCards.reduce((sum, o) => sum + o.spent, 0),
    };
    // hiddenTick: re-read hidden lines after one is removed.
  }, [
    cards,
    previousTransactions,
    currentTransactions,
    optimisticPayments,
    today,
    userId,
    hiddenTick,
  ]);

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

  const startEditCard = (card: SavedCreditCard) => {
    setEditingCardId(card.id);
    setCardDraft(draftFromCard(card));
    setCardEditError("");
  };

  const closeEdit = () => {
    setEditingCardId(null);
    setCardDraft(null);
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
    closeEdit();
    onCardsChange?.();
  };

  const removeCard = (card: SavedCreditCard) => {
    if (!userId) return;
    const ok = window.confirm(
      `Remove “${formatCreditCardLabel(card)}”?\n\nThe saved card is deleted. Past expenses stay in your list.`,
    );
    if (!ok) return;
    deleteSavedCreditCard(userId, card.id);
    closeEdit();
    setHiddenTick((n) => n + 1);
    onCardsChange?.();
  };

  const hideOther = (key: string, label: string) => {
    if (!userId) return;
    const ok = window.confirm(
      `Hide “${label}” from Card bills?\n\nPast expenses stay in your list.`,
    );
    if (!ok) return;
    hideCreditCardDueLine(userId, key);
    setHiddenTick((n) => n + 1);
  };

  const markPaid = (c: CardBillSummary) => {
    if (!userId || !c.lastBill) return;
    markCardStatementPaid(userId, c.cardId, c.lastBill.statementEnd);
    onCardsChange?.();
  };

  if (cards.length === 0 && bills.otherCards.length === 0) return null;

  const total = bills.totalUpcoming;
  const subtitle =
    total >= 1 ? `${inr(total)} due on cards this cycle` : "No card bills due";

  return (
    <CollapsiblePanel
      title="Card bills"
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
        Card spends count in Needs, Wants and the rest when you buy. Your bank
        Spent goes down only when you pay the bill.
      </p>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {bills.cards.map((c) => {
          const card = cards.find((x) => x.id === c.cardId);
          if (!card) return null;
          const editing = editingCardId === card.id && cardDraft;
          const last = c.lastBill;
          const lastText = cardLastBillText(c);
          const lastPaid =
            last?.status === "paid" || last?.status === "marked_paid";
          const pct = c.usage ? Math.round(c.usage.ratio * 100) : 0;
          return (
            <li
              key={c.cardId}
              style={{ padding: "10px 0", borderTop: "1px solid #E8E6F0" }}
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
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111110",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${c.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editing) closeEdit();
                    else startEditCard(card);
                  }}
                  style={{
                    ...SMALL_BUTTON,
                    border: "1px solid #E8E6F0",
                    background: "#F7F7F4",
                    color: "#534AB7",
                    flexShrink: 0,
                  }}
                >
                  {editing ? "Close" : "Edit"}
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#5F5E5A", marginTop: 4 }}>
                <span style={{ fontWeight: 600 }}>This cycle:</span>{" "}
                {cardBillCycleText(c)}
              </div>
              {!c.hasBillingDay ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditCard(card);
                  }}
                  style={{
                    marginTop: 4,
                    padding: 0,
                    border: "none",
                    background: "none",
                    color: "#534AB7",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Set billing day
                </button>
              ) : null}

              {last && lastText ? (
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: lastPaid
                      ? "#1D9E75"
                      : last.clearlyUnpaid
                        ? "#E24B4A"
                        : "#5F5E5A",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#5F5E5A" }}>
                    Last bill:
                  </span>{" "}
                  {lastText}
                </div>
              ) : null}

              {last && !lastPaid && last.remaining > 0 ? (
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {last.unsure ? (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#5F5E5A",
                        flexBasis: "100%",
                      }}
                    >
                      Couldn&apos;t match a payment to this bill — mark as paid?
                    </span>
                  ) : last.clearlyUnpaid ? (
                    <span
                      role="alert"
                      style={{
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: "#791F1F",
                        background: "#FCEBEB",
                        border: "1px solid #F5C9C9",
                        borderRadius: 10,
                        padding: "6px 10px",
                        flexBasis: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {inr(last.remaining)} unpaid after the due date. Cards
                      charge about 36–45% a year interest on what you don&apos;t
                      pay in full. Already paid? Tap Mark paid.
                    </span>
                  ) : null}
                  {onPayBill ? (
                    <button
                      type="button"
                      aria-label={`Pay ${inr(last.remaining)} for ${c.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPayBill(last.remaining, c.label, c.cardId);
                      }}
                      style={{
                        ...SMALL_BUTTON,
                        border: "none",
                        background: "#534AB7",
                        color: "white",
                      }}
                    >
                      Pay {inr(last.remaining)}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markPaid(c);
                    }}
                    style={{
                      ...SMALL_BUTTON,
                      border: "1px solid #CDEBDF",
                      background: "#E1F5EE",
                      color: "#1D9E75",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <AppIcon name="check" size={13} color="#1D9E75" />
                    Mark paid
                  </button>
                </div>
              ) : null}

              {c.usage ? (
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
                      Limit used: {inr(c.usage.used)} of {inr(c.usage.limit)}
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
                        background: c.usage.overWarn ? "#E24B4A" : "#534AB7",
                      }}
                    />
                  </div>
                  {c.usage.overWarn ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#E24B4A",
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      Using over 30% of your limit can lower your credit score.
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
                      Billing day = the day your statement is made. Bills are
                      worked out again from the new dates.
                    </span>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                        closeEdit();
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
                    <button
                      type="button"
                      aria-label={`Remove ${c.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCard(card);
                      }}
                      style={{
                        minHeight: 36,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: "1px solid #F0DEDE",
                        background: "#FFF7F7",
                        color: "#E24B4A",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        marginLeft: "auto",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <AppIcon name="trash" size={14} color="#E24B4A" />
                      Remove card
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}

        {bills.otherCards.map((o) => (
          <li
            key={`other-${o.key}`}
            style={{ padding: "10px 0", borderTop: "1px solid #E8E6F0" }}
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
                  style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}
                >
                  {o.label}
                </div>
                <div style={{ fontSize: 12, color: "#5F5E5A", marginTop: 4 }}>
                  {inr(o.spent)} spent this month · not a saved card
                </div>
              </div>
              <button
                type="button"
                aria-label={`Hide ${o.label} from card bills`}
                onClick={(e) => {
                  e.stopPropagation();
                  hideOther(o.key, o.label);
                }}
                style={{
                  width: 32,
                  height: 32,
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
                <AppIcon name="trash" size={14} color="#E24B4A" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: 4,
          paddingTop: 10,
          borderTop: "1px solid #E8E6F0",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 700,
          color: "#111110",
        }}
      >
        <span>Upcoming card bills</span>
        <span>{inr(total)}</span>
      </div>
    </CollapsiblePanel>
  );
}
