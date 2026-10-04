import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/Input";
import { Colors, Spacing, Radius, FontSize } from "@/constants/theme";
import {
  TRACKER_CATEGORIES,
  pickerSubcategories,
  type BucketType,
} from "@/lib/tracker-categories";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import {
  deleteSavedCreditCard,
  displayExpenseDescription,
  encodeCreditCardPaymentMethod,
  formatCreditCardLabel,
  loadCreditCardsMerged,
  loadSavedCreditCards,
  parseCreditCardPaymentMethod,
  suggestDueDayFromBilling,
  upsertSavedCreditCard,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";

const SAVE_TIMEOUT_MS = 15_000;

function parseDay(raw: string): number | undefined {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : undefined;
}

export type TrackerTxn = {
  id: string;
  date: string;
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  bucket: string;
  payment_method: string | null;
};

export type SavedExpense = {
  id: string;
  amount: number;
  bucket: string;
  category: string;
  subcategory: string;
  description: string | null;
  isEdit: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (saved: SavedExpense) => void;
  defaultDate: string;
  maxDate?: string;
  defaultBucket?: string;
  defaultSubcategory?: string;
  defaultAmount?: number;
  defaultDescription?: string;
  defaultPaymentMethod?: string;
  editExpense?: TrackerTxn | null;
};

const SPEND_BUCKETS: BucketType[] = [
  "needs",
  "wants",
  "habits",
  "loans",
  "investment",
  "income",
];

const PAYMENT_OPTIONS = [
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
  { id: "credit_card", label: "Credit card" },
  { id: "netbanking", label: "Net banking" },
  { id: "wallet", label: "Wallet" },
] as const;

function monthYearFromDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return {
    month: d.toLocaleString("en-IN", { month: "long" }),
    year: d.getFullYear(),
  };
}

/** Full add/edit sheet — field order matches PWA AddExpenseModal. */
export function AddExpenseSheet({
  visible,
  onClose,
  onSaved,
  defaultDate,
  maxDate,
  defaultBucket,
  defaultSubcategory,
  defaultAmount,
  defaultDescription,
  defaultPaymentMethod,
  editExpense,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const isEdit = Boolean(editExpense?.id);

  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState<number | null>(null);
  const [bucket, setBucket] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [savedCards, setSavedCards] = useState<SavedCreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newBillingDay, setNewBillingDay] = useState("");
  const [newDueDay, setNewDueDay] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDate(editExpense?.date || defaultDate);
    setAmount(editExpense?.amount ?? defaultAmount ?? null);
    setBucket(editExpense?.bucket || defaultBucket || "");
    setSubcategory(editExpense?.subcategory || defaultSubcategory || "");
    setDescription(
      displayExpenseDescription(
        editExpense?.description || defaultDescription || "",
      ),
    );
    const rawPm = editExpense?.payment_method || defaultPaymentMethod || "upi";
    const { cardId } = parseCreditCardPaymentMethod(rawPm);
    setSelectedCardId(cardId ?? "");
    setPaymentMethod(rawPm.startsWith("credit_card") ? "credit_card" : rawPm);
    setShowAddCard(false);
    setNewCardName("");
    setNewBillingDay("");
    setNewDueDay("");
    setError("");
  }, [
    visible,
    editExpense,
    defaultDate,
    defaultBucket,
    defaultSubcategory,
    defaultAmount,
    defaultDescription,
    defaultPaymentMethod,
  ]);

  // Local cache first so the picker is instant; DB merge fills in after.
  useEffect(() => {
    if (!visible || !user?.id) return;
    const userId = user.id;
    setSavedCards(loadSavedCreditCards(userId));
    let cancelled = false;
    void loadCreditCardsMerged(userId).then((cards) => {
      if (!cancelled) setSavedCards(cards);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, user?.id]);

  function selectPayment(id: string) {
    setPaymentMethod(id);
    if (id !== "credit_card") return;
    if (savedCards.length === 0) {
      setShowAddCard(true);
    } else if (savedCards.length === 1 && !selectedCardId) {
      setSelectedCardId(savedCards[0].id);
    }
  }

  function onBillingDayChange(raw: string) {
    setNewBillingDay(raw);
    const billing = parseDay(raw);
    if (billing && !newDueDay.trim()) {
      setNewDueDay(String(suggestDueDayFromBilling(billing)));
    }
  }

  function addCard(): SavedCreditCard | null {
    if (!user?.id) return null;
    const nickname = newCardName.trim();
    if (!nickname) {
      setError("Enter a card name, e.g. HDFC Regalia.");
      return null;
    }
    const card = upsertSavedCreditCard(user.id, {
      nickname,
      billingDay: parseDay(newBillingDay),
      dueDay: parseDay(newDueDay),
    });
    setSavedCards(loadSavedCreditCards(user.id));
    setSelectedCardId(card.id);
    setShowAddCard(false);
    setNewCardName("");
    setNewBillingDay("");
    setNewDueDay("");
    setError("");
    return card;
  }

  function removeCard(cardId: string) {
    if (!user?.id) return;
    deleteSavedCreditCard(user.id, cardId);
    const next = loadSavedCreditCards(user.id);
    setSavedCards(next);
    if (selectedCardId === cardId) setSelectedCardId(next[0]?.id ?? "");
  }

  // Loans → credit card payment should use cash rails (UPI/cash), not card charge
  useEffect(() => {
    if (bucket === "loans" && subcategory === "credit_card") {
      if (paymentMethod === "credit_card") setPaymentMethod("upi");
    }
  }, [bucket, subcategory, paymentMethod]);

  const isIncome = bucket === "income";
  const cat = bucket ? TRACKER_CATEGORIES[bucket as BucketType] : null;
  const subs = useMemo(() => {
    if (!bucket || !(bucket in TRACKER_CATEGORIES)) return [];
    return pickerSubcategories(bucket as BucketType);
  }, [bucket]);

  const title = isEdit
    ? isIncome
      ? "Edit income"
      : bucket === "investment"
        ? "Edit savings"
        : "Edit expense"
    : isIncome
      ? "Add income"
      : bucket === "investment"
        ? "Add savings"
        : "Add expense";

  const paymentChoices = useMemo(() => {
    if (isIncome) return [];
    // Loans → CC bill pay: no "charge another card"
    if (bucket === "loans" && subcategory === "credit_card") {
      return PAYMENT_OPTIONS.filter((p) => p.id !== "credit_card");
    }
    return [...PAYMENT_OPTIONS];
  }, [isIncome, bucket, subcategory]);

  async function handleSave() {
    setError("");
    if (!user?.id) {
      setError("Sign in to save.");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!bucket) {
      setError("Pick a category.");
      return;
    }
    if (!subcategory) {
      setError("Pick a type.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setDate(defaultDate);
    }
    const finalDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : defaultDate;
    if (maxDate && finalDate > maxDate) {
      setError("Date cannot be in the future.");
      return;
    }

    let paymentToStore: string | null = isIncome
      ? null
      : paymentMethod || "upi";
    if (!isIncome && paymentMethod === "credit_card") {
      let card = savedCards.find((c) => c.id === selectedCardId) ?? null;
      // Typed a new card but didn't tap "Save card" — save it now.
      if (!card && showAddCard && newCardName.trim()) card = addCard();
      if (!card) {
        setError("Select a credit card or add a new one.");
        setShowAddCard(true);
        return;
      }
      paymentToStore = encodeCreditCardPaymentMethod(card);
    }

    // Keep "Pay bill · {card}" phrasing so the Credit card dues panel can
    // still match this payment if the user retyped the note.
    let descriptionToStore = displayExpenseDescription(description.trim());
    if (bucket === "loans" && subcategory === "credit_card" && defaultDescription) {
      const fallback = displayExpenseDescription(defaultDescription);
      if (
        fallback &&
        !/^pay bill/i.test(descriptionToStore || "") &&
        /^pay bill/i.test(fallback)
      ) {
        descriptionToStore = fallback;
      }
    }

    setSaving(true);
    try {
      const { month, year } = monthYearFromDate(finalDate);
      const payload = {
        user_id: user.id,
        date: finalDate,
        amount,
        category: subcategory,
        subcategory,
        description: descriptionToStore || null,
        bucket,
        payment_method: paymentToStore,
        month,
        year,
      };

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Save is taking too long. Check your connection and try again.",
              ),
            ),
          SAVE_TIMEOUT_MS,
        );
      });

      let savedId = editExpense?.id ?? "";
      try {
        if (isEdit && editExpense?.id) {
          const { error: err } = await Promise.race([
            supabase
              .from("expense_transactions")
              .update(payload)
              .eq("id", editExpense.id)
              .eq("user_id", user.id),
            timeout,
          ]);
          if (err) throw err;
        } else {
          const { data, error: err } = await Promise.race([
            supabase
              .from("expense_transactions")
              .insert(payload)
              .select("id")
              .single(),
            timeout,
          ]);
          if (err) throw err;
          savedId = String((data as { id?: string } | null)?.id ?? "");
        }
      } finally {
        clearTimeout(timer);
      }
      onSaved({
        id: savedId,
        amount,
        bucket,
        category: subcategory,
        subcategory,
        description: payload.description,
        isEdit,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            <MoneyInput
              label={isIncome ? "Income amount (₹)" : "Expense amount (₹)"}
              value={amount}
              onChangeValue={setAmount}
              placeholder="0"
            />

            <View style={{ height: Spacing.md }} />
            <Input
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder={defaultDate}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />

            {!defaultBucket && !editExpense ? (
              <>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.grid}>
                  {SPEND_BUCKETS.map((id) => {
                    const meta = TRACKER_CATEGORIES[id];
                    const on = bucket === id;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => {
                          setBucket(id);
                          setSubcategory("");
                        }}
                        style={[
                          styles.catCell,
                          on && {
                            borderColor: meta.color,
                            backgroundColor: `${meta.color}18`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catText,
                            on && { color: meta.color, fontWeight: "700" },
                          ]}
                          numberOfLines={2}
                        >
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {bucket ? (
              <>
                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.wrapChips}>
                  {subs.map((s) => {
                    const on = subcategory === s.id;
                    const accent = cat?.color ?? Colors.primary;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setSubcategory(s.id)}
                        style={[
                          styles.chip,
                          on && {
                            borderColor: accent,
                            backgroundColor: `${accent}18`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            on && { color: accent, fontWeight: "700" },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View style={{ height: Spacing.md }} />
            <Input
              label="Note (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
            />

            {!isIncome && bucket ? (
              <>
                <Text style={styles.fieldLabel}>Paid via</Text>
                <View style={styles.wrapChips}>
                  {paymentChoices.map((p) => {
                    const on = paymentMethod === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => selectPayment(p.id)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text
                          style={[styles.chipText, on && styles.chipTextOn]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {bucket === "loans" && subcategory === "credit_card" ? (
                  <Text style={styles.hint}>
                    Paying your card bill by UPI, cash, net banking or wallet
                    reduces Money Left.
                  </Text>
                ) : null}

                {paymentMethod === "credit_card" ? (
                  <View style={styles.cardBox}>
                    {savedCards.map((c) => {
                      const on = c.id === selectedCardId;
                      const sub = [
                        c.billingDay ? `Bill day ${c.billingDay}` : null,
                        c.dueDay ? `Due day ${c.dueDay}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <View
                          key={c.id}
                          style={[styles.cardRow, on && styles.cardRowOn]}
                        >
                          <Pressable
                            onPress={() => setSelectedCardId(c.id)}
                            style={styles.cardMain}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                          >
                            <View style={[styles.radio, on && styles.radioOn]}>
                              {on ? <View style={styles.radioDot} /> : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.cardLabel}>
                                {formatCreditCardLabel(c)}
                              </Text>
                              {sub ? (
                                <Text style={styles.cardSub}>{sub}</Text>
                              ) : null}
                            </View>
                          </Pressable>
                          <Pressable
                            onPress={() => removeCard(c.id)}
                            hitSlop={8}
                          >
                            <Text style={styles.cardDelete}>Delete</Text>
                          </Pressable>
                        </View>
                      );
                    })}

                    {showAddCard ? (
                      <View style={styles.addCardForm}>
                        <Input
                          label="Card name"
                          value={newCardName}
                          onChangeText={setNewCardName}
                          placeholder="e.g. HDFC Regalia"
                        />
                        <View style={styles.dayRow}>
                          <View style={{ flex: 1 }}>
                            <Input
                              label="Billing day"
                              value={newBillingDay}
                              onChangeText={onBillingDayChange}
                              placeholder="1–31"
                              keyboardType="number-pad"
                              maxLength={2}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Input
                              label="Due day"
                              value={newDueDay}
                              onChangeText={setNewDueDay}
                              placeholder="1–31"
                              keyboardType="number-pad"
                              maxLength={2}
                            />
                          </View>
                        </View>
                        <View style={styles.dayRow}>
                          <Pressable
                            onPress={() => void addCard()}
                            style={[styles.chip, styles.chipOn]}
                          >
                            <Text style={[styles.chipText, styles.chipTextOn]}>
                              Save card
                            </Text>
                          </Pressable>
                          {savedCards.length > 0 ? (
                            <Pressable
                              onPress={() => setShowAddCard(false)}
                              style={styles.chip}
                            >
                              <Text style={styles.chipText}>Cancel</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setShowAddCard(true)}
                        hitSlop={6}
                      >
                        <Text style={styles.addCardLink}>+ Add new card</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveText}>
                  {isEdit ? "Update" : "Save"}{" "}
                  {isIncome
                    ? "income"
                    : bucket === "investment"
                      ? "savings"
                      : "expense"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 10,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111110",
  },
  close: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  fieldLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: "#111110",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catCell: {
    width: "48%",
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 10,
    justifyContent: "center",
  },
  catText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  wrapChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipTextOn: { color: Colors.primary, fontWeight: "700" },
  hint: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  cardBox: { marginTop: 8, gap: 8 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cardRowOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  cardMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: Colors.primary },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  cardLabel: { fontSize: 14, fontWeight: "700", color: "#111110" },
  cardSub: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
  cardDelete: { fontSize: 12, fontWeight: "700", color: Colors.error },
  addCardForm: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  dayRow: { flexDirection: "row", gap: 10 },
  addCardLink: {
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  error: {
    marginTop: 12,
    color: Colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
