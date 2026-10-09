import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  CollapsiblePanel,
  animateNextPanelToggle,
} from "@/components/tracker/CollapsiblePanel";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors } from "@/constants/theme";
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

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

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

function formatDueLabel(
  iso?: string,
  dueDay?: number,
  overdue?: boolean,
): string {
  const short = (value: string) => {
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };
  if (overdue) {
    const s = iso ? short(iso) : null;
    return s
      ? `Overdue since ${s}`
      : "Overdue — unpaid balance carried forward";
  }
  const s = iso ? short(iso) : null;
  if (s) return `Pay by ${s}`;
  if (dueDay) return `Due around day ${dueDay}`;
  return "Due from salary this month";
}

/** Credit card dues panel — port of web CreditCardBillReminder. */
export function CreditCardDues({
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
  monthlySalary?: number;
  /** Opens add-expense prefilled for paying the bill (cash out → loans / credit card). */
  onPayBill?: (amount: number, label: string, cardId: string) => void;
  /** Called after a saved card changes so the parent can reload the card list. */
  onCardsChange?: () => void;
  defaultOpen?: boolean;
  /** Recent Pay saves not yet reflected in fetched txns. */
  optimisticPayments?: Array<{ cardId: string; amount: number }>;
  /** Anchor month (1st of the selected tracker month). */
  asOf?: Date;
  /** Statements not paid in full by their due date (counted under Loans). */
  overdue?: CreditCardOverdue[];
  /** Today (or the month's last day) for limit usage. */
  today?: Date;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(defaultOpen);
  const [hiddenTick, setHiddenTick] = useState(0);
  const [editing, setEditing] = useState<{
    cardId: string;
    label: string;
  } | null>(null);
  const [dueDayDraft, setDueDayDraft] = useState("");
  const [dueEditError, setDueEditError] = useState("");
  const [editingCard, setEditingCard] = useState<SavedCreditCard | null>(null);
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
    // hiddenTick re-reads the hidden-line set after a removal.
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
  const paidCount = useMemo(
    () => statuses.filter((b) => b.status === "paid").length,
    [statuses],
  );

  useEffect(() => {
    if (optimisticPayments.length > 0) {
      animateNextPanelToggle();
      setOpen(true);
    }
  }, [optimisticPayments]);

  // One-time cleanup: CC bills must never appear under Obligations.
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

  const confirmDeleteDue = (cardId: string, label: string) => {
    if (!userId) return;
    const isSaved = cards.some((c) => c.id === cardId);
    Alert.alert(
      `Remove “${label}” from Credit card dues?`,
      isSaved
        ? "The saved card is deleted. Past expenses stay in your list."
        : "Past expenses stay in your list; this due line is hidden.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (isSaved) {
              deleteSavedCreditCard(userId, cardId);
              onCardsChange?.();
            } else {
              hideCreditCardDueLine(userId, cardId);
            }
            setEditing(null);
            setHiddenTick((n) => n + 1);
          },
        },
      ],
    );
  };

  const startEditDue = (cardId: string, label: string, dueDay?: number) => {
    setEditing({ cardId, label });
    setDueDayDraft(dueDay ? String(dueDay) : "");
    setDueEditError("");
  };

  const saveDueDay = () => {
    if (!userId || !editing) return;
    const n = Number(dueDayDraft);
    if (!Number.isFinite(n) || n < 1 || n > 31) {
      setDueEditError("Enter a day between 1 and 31");
      return;
    }
    const existing = cards.find((c) => c.id === editing.cardId);
    upsertSavedCreditCard(userId, {
      id: editing.cardId,
      nickname: existing?.nickname || editing.label,
      last4: existing?.last4,
      billingDay: existing?.billingDay,
      dueDay: Math.round(n),
    });
    setEditing(null);
    setDueEditError("");
    onCardsChange?.();
  };

  const startEditCard = (card: SavedCreditCard) => {
    setEditingCard(card);
    setCardDraft(draftFromCard(card));
    setCardEditError("");
  };

  const closeCardEdit = () => {
    setEditingCard(null);
    setCardDraft(null);
    setCardEditError("");
  };

  const saveCard = () => {
    if (!userId || !editingCard || !cardDraft) return;
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
      id: editingCard.id,
      nickname,
      last4: digits || undefined,
      billingDay,
      dueDay:
        dueDay ??
        (billingDay ? suggestDueDayFromBilling(billingDay) : undefined),
      creditLimit: limit,
    });
    closeCardEdit();
    onCardsChange?.();
  };

  if (
    cards.length === 0 &&
    dueStatuses.length === 0 &&
    paidCount === 0 &&
    overdue.length === 0
  ) {
    return null;
  }

  const dueTotal = dueStatuses.reduce((s, b) => s + b.remaining, 0);
  const salaryHint =
    monthlySalary && monthlySalary > 0 && dueTotal > 0
      ? ` Aim to clear this from your ~${inr(monthlySalary)} salary.`
      : dueTotal > 0
        ? " Pay from your account (UPI / net banking) so interest doesn’t pile up."
        : "";
  const subtitle =
    overdue.length > 0
      ? `${inr(overdue.reduce((s, o) => s + o.remaining, 0))} unpaid after due date`
      : dueTotal > 0
        ? `${inr(dueTotal)} still to pay`
        : paidCount > 0
          ? "All tracked bills paid"
          : "No balance due yet";

  return (
    <>
      <CollapsiblePanel
        title="Credit card dues"
        subtitle={subtitle}
        icon="card"
        open={open}
        onToggle={() => setOpen((v) => !v)}
        defaultBorder={false}
      >
        <Text style={styles.helper}>
          {dueTotal > 0
            ? `Unpaid balances stay here until you mark them paid.${salaryHint} Card spends already came off LEFT when you made them, so paying the bill doesn't reduce it again.`
            : paidCount > 0
              ? "All tracked card bills are paid for now. Nice work."
              : "Card spends show up here; paying logs a cash expense under Loans."}
        </Text>

        {overdue.map((o) => (
          <View
            key={`overdue-${o.cardId}`}
            style={styles.overdueBox}
            accessibilityRole="alert"
          >
            <Text style={styles.overdueText}>
              <Text style={{ fontWeight: "700" }}>
                {`${o.label}: ${inr(o.remaining)} unpaid from the bill due ${shortDate(o.dueDate)}.`}
              </Text>{" "}
              Cards charge about 36–45% a year interest on what you don&apos;t
              pay in full. This counts under Loans until you clear it.
            </Text>
          </View>
        ))}

        {dueStatuses.length === 0 && paidCount > 0 ? (
          <Text style={styles.settled}>
            Tracked card spends are settled — nothing due right now.
          </Text>
        ) : null}

        {dueStatuses.map((b) => (
          <View key={b.cardId} style={styles.row}>
            <View
              style={[
                styles.dot,
                { borderColor: b.overdue ? Colors.error : Colors.primary },
              ]}
            />
            <View style={styles.rowText}>
              <Text style={styles.label} numberOfLines={1}>
                {b.label}
              </Text>
              <Text style={[styles.meta, b.overdue && { color: Colors.error }]}>
                {formatDueLabel(b.dueDate, b.dueDay, b.overdue)}
                {b.charged > 0
                  ? ` · Charged ${inr(b.charged)}${b.paid > 0 ? ` · Paid ${inr(b.paid)}` : ""}`
                  : ""}
              </Text>
            </View>
            {onPayBill ? (
              <Pressable
                onPress={() => onPayBill(b.remaining, b.label, b.cardId)}
                accessibilityRole="button"
                accessibilityLabel={`Pay ${inr(b.remaining)} for ${b.label}`}
                style={styles.payBtn}
              >
                <Text style={styles.payText}>Pay {inr(b.remaining)}</Text>
              </Pressable>
            ) : (
              <Text style={styles.dash}>—</Text>
            )}
            <Pressable
              onPress={() => startEditDue(b.cardId, b.label, b.dueDay)}
              accessibilityRole="button"
              accessibilityLabel={`Edit due day for ${b.label}`}
              hitSlop={4}
              style={styles.iconBtn}
            >
              <AppIcon name="pencil" size={15} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => confirmDeleteDue(b.cardId, b.label)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${b.label} from credit card dues`}
              hitSlop={4}
              style={[styles.iconBtn, styles.iconBtnDanger]}
            >
              <AppIcon name="trash" size={15} color={Colors.error} />
            </Pressable>
          </View>
        ))}

        {cards.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.cardsTitle}>Your cards</Text>
            {cards.map((card) => {
              const usage = usageById.get(card.id);
              const pct = usage ? Math.round(usage.ratio * 100) : 0;
              return (
                <View key={`card-${card.id}`} style={styles.cardItem}>
                  <View style={styles.cardHead}>
                    <View style={styles.rowText}>
                      <Text style={styles.label} numberOfLines={1}>
                        {formatCreditCardLabel(card)}
                      </Text>
                      <Text style={styles.meta}>
                        {card.billingDay
                          ? `Bill on day ${card.billingDay}`
                          : "No billing day"}
                        {card.dueDay ? ` · Due day ${card.dueDay}` : ""}
                        {card.creditLimit
                          ? ` · Limit ${inr(card.creditLimit)}`
                          : ""}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => startEditCard(card)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${formatCreditCardLabel(card)}`}
                      style={styles.editBtn}
                    >
                      <Text style={styles.editText}>Edit</Text>
                    </Pressable>
                  </View>
                  {usage ? (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.usageRow}>
                        <Text style={styles.usageText}>
                          {`This statement: ${inr(usage.used)} of ${inr(usage.limit)}`}
                        </Text>
                        <Text style={[styles.usageText, { fontWeight: "700" }]}>
                          {pct}%
                        </Text>
                      </View>
                      <View style={styles.usageTrack}>
                        <View
                          style={[
                            styles.usageFill,
                            {
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: usage.overWarn
                                ? Colors.error
                                : Colors.primary,
                            },
                          ]}
                        />
                      </View>
                      {usage.overWarn ? (
                        <Text style={styles.usageWarn}>
                          Using over 30% of your limit can lower your credit
                          score.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </CollapsiblePanel>

      <BottomSheet visible={editingCard != null} onClose={closeCardEdit}>
        <Text style={styles.sheetTitle}>Edit card</Text>
        {cardDraft ? (
          <View style={{ gap: 10 }}>
            <View>
              <Text style={styles.sheetLabel}>Card name</Text>
              <TextInput
                value={cardDraft.nickname}
                onChangeText={(v) =>
                  setCardDraft({ ...cardDraft, nickname: v })
                }
                style={styles.dueInput}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetLabel}>Last 4</Text>
                <TextInput
                  value={cardDraft.last4}
                  onChangeText={(v) =>
                    setCardDraft({
                      ...cardDraft,
                      last4: v.replace(/[^\d]/g, "").slice(0, 4),
                    })
                  }
                  keyboardType="number-pad"
                  placeholder="1234"
                  style={styles.dueInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetLabel}>Limit (₹)</Text>
                <TextInput
                  value={cardDraft.creditLimit}
                  onChangeText={(v) =>
                    setCardDraft({
                      ...cardDraft,
                      creditLimit: v.replace(/[^\d]/g, ""),
                    })
                  }
                  keyboardType="number-pad"
                  placeholder="Optional"
                  style={styles.dueInput}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetLabel}>Billing day</Text>
                <TextInput
                  value={cardDraft.billingDay}
                  onChangeText={(v) =>
                    setCardDraft({
                      ...cardDraft,
                      billingDay: v.replace(/[^\d]/g, "").slice(0, 2),
                    })
                  }
                  keyboardType="number-pad"
                  placeholder="15"
                  style={styles.dueInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetLabel}>Due day</Text>
                <TextInput
                  value={cardDraft.dueDay}
                  onChangeText={(v) =>
                    setCardDraft({
                      ...cardDraft,
                      dueDay: v.replace(/[^\d]/g, "").slice(0, 2),
                    })
                  }
                  keyboardType="number-pad"
                  placeholder="5"
                  style={styles.dueInput}
                />
              </View>
            </View>
            {cardEditError ? (
              <Text style={styles.dueError}>{cardEditError}</Text>
            ) : (
              <Text style={styles.dueHint}>
                Bills are worked out again from the new dates.
              </Text>
            )}
          </View>
        ) : null}
        <View style={styles.sheetActions}>
          <Pressable onPress={closeCardEdit} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={saveCard} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet visible={editing != null} onClose={() => setEditing(null)}>
        <Text style={styles.sheetTitle}>Due day · {editing?.label}</Text>
        <Text style={styles.sheetLabel}>Due day of month</Text>
        <TextInput
          value={dueDayDraft}
          onChangeText={(v) => {
            setDueDayDraft(v.replace(/[^\d]/g, "").slice(0, 2));
            setDueEditError("");
          }}
          placeholder="e.g. 5"
          keyboardType="number-pad"
          autoFocus
          accessibilityLabel={`Due day for ${editing?.label ?? "card"}`}
          style={styles.dueInput}
        />
        {dueEditError ? (
          <Text style={styles.dueError}>{dueEditError}</Text>
        ) : (
          <Text style={styles.dueHint}>
            Monthly due day (1–31). Example: 28 → overdue/due around the 28th
            each month.
          </Text>
        )}
        <View style={styles.sheetActions}>
          <Pressable onPress={() => setEditing(null)} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={saveDueDay} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  settled: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.success,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: Colors.card,
  },
  rowText: { flex: 1, minWidth: 0 },
  label: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  payBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  payText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  dash: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDanger: { borderColor: "#F0DEDE", backgroundColor: "#FFF7F7" },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dueInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  dueError: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.error,
    marginTop: 6,
  },
  dueHint: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  overdueBox: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: "#F5C9C9",
  },
  overdueText: { fontSize: 12, lineHeight: 18, color: "#791F1F" },
  cardsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  cardItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  usageText: { fontSize: 11, color: Colors.textSecondary },
  usageTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  usageFill: { height: "100%", borderRadius: 3 },
  usageWarn: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.error,
    marginTop: 4,
  },
});
