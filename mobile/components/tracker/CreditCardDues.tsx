import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import {
  CollapsiblePanel,
  animateNextPanelToggle,
} from "@/components/tracker/CollapsiblePanel";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors, themedStyles, tintBg } from "@/constants/theme";
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

/** Card bills panel — port of web CreditCardBillReminder. */
export function CreditCardDues({
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
  /** Today (or the month's last day) for cycles, bills and limit usage. */
  today?: Date;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(defaultOpen);
  const [hiddenTick, setHiddenTick] = useState(0);
  const [editingCard, setEditingCard] = useState<SavedCreditCard | null>(null);
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
    // hiddenTick re-reads the hidden-line set after a removal.
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

  const confirmRemoveCard = () => {
    if (!userId || !editingCard) return;
    const card = editingCard;
    Alert.alert(
      `Remove “${formatCreditCardLabel(card)}”?`,
      "The saved card is deleted. Past expenses stay in your list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deleteSavedCreditCard(userId, card.id);
            closeCardEdit();
            setHiddenTick((n) => n + 1);
            onCardsChange?.();
          },
        },
      ],
    );
  };

  const confirmHideOther = (key: string, label: string) => {
    if (!userId) return;
    Alert.alert(
      `Hide “${label}” from Card bills?`,
      "Past expenses stay in your list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hide",
          style: "destructive",
          onPress: () => {
            hideCreditCardDueLine(userId, key);
            setHiddenTick((n) => n + 1);
          },
        },
      ],
    );
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
    <>
      <CollapsiblePanel
        title="Card bills"
        subtitle={subtitle}
        icon="card"
        open={open}
        onToggle={() => setOpen((v) => !v)}
        defaultBorder={false}
      >
        <Text style={styles.helper}>
          Card spends count in Needs, Wants and the rest when you buy. Your bank
          Spent goes down only when you pay the bill.
        </Text>

        {bills.cards.map((c) => {
          const card = cards.find((x) => x.id === c.cardId);
          if (!card) return null;
          const last = c.lastBill;
          const lastText = cardLastBillText(c);
          const lastPaid =
            last?.status === "paid" || last?.status === "marked_paid";
          const pct = c.usage ? Math.round(c.usage.ratio * 100) : 0;
          return (
            <View key={c.cardId} style={styles.cardItem}>
              <View style={styles.cardHead}>
                <Text style={[styles.label, styles.rowText]} numberOfLines={1}>
                  {c.label}
                </Text>
                <Pressable
                  onPress={() => startEditCard(card)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${c.label}`}
                  style={styles.editBtn}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              </View>

              <Text style={styles.meta}>
                <Text style={styles.metaStrong}>This cycle: </Text>
                {cardBillCycleText(c)}
              </Text>
              {!c.hasBillingDay ? (
                <Pressable
                  onPress={() => startEditCard(card)}
                  accessibilityRole="button"
                  hitSlop={6}
                >
                  <Text style={styles.linkText}>Set billing day</Text>
                </Pressable>
              ) : null}

              {last && lastText ? (
                <Text
                  style={[
                    styles.meta,
                    lastPaid
                      ? { color: Colors.success }
                      : last.clearlyUnpaid
                        ? { color: Colors.error }
                        : null,
                  ]}
                >
                  <Text style={styles.metaStrong}>Last bill: </Text>
                  {lastText}
                </Text>
              ) : null}

              {last && !lastPaid && last.remaining > 0 ? (
                <View style={{ marginTop: 6, gap: 6 }}>
                  {last.unsure ? (
                    <Text style={styles.meta}>
                      Couldn&apos;t match a payment to this bill — mark as paid?
                    </Text>
                  ) : last.clearlyUnpaid ? (
                    <View style={styles.overdueBox} accessibilityRole="alert">
                      <Text style={styles.overdueText}>
                        {`${inr(last.remaining)} unpaid after the due date. Cards charge about 36–45% a year interest on what you don't pay in full. Already paid? Tap Mark paid.`}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.actionRow}>
                    {onPayBill ? (
                      <Pressable
                        onPress={() =>
                          onPayBill(last.remaining, c.label, c.cardId)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Pay ${inr(last.remaining)} for ${c.label}`}
                        style={styles.payBtn}
                      >
                        <Text style={styles.payText}>
                          Pay {inr(last.remaining)}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => markPaid(c)}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark the ${c.label} bill paid`}
                      style={styles.markBtn}
                    >
                      <AppIcon name="check" size={13} color={Colors.success} />
                      <Text style={styles.markText}>Mark paid</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {c.usage ? (
                <View style={{ marginTop: 8 }}>
                  <View style={styles.usageRow}>
                    <Text style={styles.usageText}>
                      {`Limit used: ${inr(c.usage.used)} of ${inr(c.usage.limit)}`}
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
                          backgroundColor: c.usage.overWarn
                            ? Colors.error
                            : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                  {c.usage.overWarn ? (
                    <Text style={styles.usageWarn}>
                      Using over 30% of your limit can lower your credit score.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {bills.otherCards.map((o) => (
          <View key={`other-${o.key}`} style={styles.cardItem}>
            <View style={styles.cardHead}>
              <View style={styles.rowText}>
                <Text style={styles.label} numberOfLines={1}>
                  {o.label}
                </Text>
                <Text style={styles.meta}>
                  {`${inr(o.spent)} spent this month · not a saved card`}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmHideOther(o.key, o.label)}
                accessibilityRole="button"
                accessibilityLabel={`Hide ${o.label} from card bills`}
                hitSlop={4}
                style={[styles.iconBtn, styles.iconBtnDanger]}
              >
                <AppIcon name="trash" size={15} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Upcoming card bills</Text>
          <Text style={styles.footerText}>{inr(total)}</Text>
        </View>
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
                Billing day = the day your statement is made. Bills are worked
                out again from the new dates.
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
        <Pressable
          onPress={confirmRemoveCard}
          accessibilityRole="button"
          style={styles.removeBtn}
        >
          <AppIcon name="trash" size={14} color={Colors.error} />
          <Text style={styles.removeText}>Remove card</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

const styles = themedStyles(() => ({
  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  rowText: { flex: 1, minWidth: 0 },
  label: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  meta: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  metaStrong: { fontWeight: "600", color: Colors.textSecondary },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 4,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  payBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  payText: { color: Colors.onPrimary, fontSize: 12, fontWeight: "700" },
  markBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tintBg("#CDEBDF"),
    backgroundColor: Colors.successLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markText: { color: Colors.success, fontSize: 12, fontWeight: "700" },
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
  iconBtnDanger: {
    borderColor: tintBg("#F0DEDE"),
    backgroundColor: tintBg("#FFF7F7"),
  },
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
  saveText: { fontSize: 14, fontWeight: "700", color: Colors.onPrimary },
  removeBtn: {
    marginTop: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  removeText: { fontSize: 13, fontWeight: "600", color: Colors.error },
  overdueBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: "#F5C9C9",
  },
  overdueText: { fontSize: 12, lineHeight: 18, color: Colors.errorText },
  cardItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: {
    minHeight: 34,
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
  footer: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
}));
