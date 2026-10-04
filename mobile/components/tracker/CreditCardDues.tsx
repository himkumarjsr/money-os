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
  deactivateAllCreditCardObligations,
  deleteSavedCreditCard,
  hideCreditCardDueLine,
  isCreditCardDueLineHidden,
  upsertSavedCreditCard,
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

  if (cards.length === 0 && dueStatuses.length === 0 && paidCount === 0) {
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
    dueTotal > 0
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
            ? `Unpaid balances stay here until you mark them paid.${salaryHint} Paying via UPI / net banking reduces purple LEFT (cash out). Purchases on the card do not.`
            : paidCount > 0
              ? "All tracked card bills are paid for now. Nice work."
              : "Card spends show up here; paying logs a cash expense under Loans."}
        </Text>

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
      </CollapsiblePanel>

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
});
