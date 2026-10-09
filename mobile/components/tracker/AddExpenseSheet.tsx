import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  AppState,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardSheet } from "@/lib/useKeyboardSheet";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { DateField } from "@/components/tracker/DateField";
import {
  TrackerIcon,
  TrackerIconBadge,
} from "@/components/tracker/TrackerIcons";
import { Colors } from "@/constants/theme";
import {
  TRACKER_CATEGORIES,
  pickerSubcategories,
  type BucketType,
} from "@/lib/tracker-categories";
import { localISODate, msUntilNextLocalMidnight } from "@/lib/localDate";
import {
  isPaidFromSavings,
  RD_SAVINGS_PAYMENT_METHOD,
} from "@/lib/trackerSavingsPayment";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import {
  CARD_REFUND_SUBCATEGORY,
  DEFAULT_DUE_OFFSET_DAYS,
  deleteSavedCreditCard,
  displayExpenseDescription,
  encodeCardEmiToken,
  encodeCreditCardPaymentMethod,
  formatCreditCardLabel,
  isCreditCardPaymentMethod,
  loadCreditCardsMerged,
  loadSavedCreditCards,
  parseCardEmiPlan,
  parseCreditCardPaymentMethod,
  suggestDueDayFromBilling,
  upsertSavedCreditCard,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";

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
  date: string;
  isEdit: boolean;
  /** Card purchase, card purchase on EMI, or card refund / cashback. */
  cardMode?: CardEntryMode;
};

export type CardEntryMode = "purchase" | "emi" | "refund";

const CARD_ENTRY_MODES: Array<{ id: CardEntryMode; label: string }> = [
  { id: "purchase", label: "Purchase" },
  { id: "emi", label: "Converted to EMI" },
  { id: "refund", label: "Refund / cashback" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (saved: SavedExpense) => void;
  defaultDate: string;
  /** Inclusive max selectable date (YYYY-MM-DD). Defaults to today. */
  maxDate?: string;
  defaultBucket?: string;
  defaultSubcategory?: string;
  defaultAmount?: number;
  defaultDescription?: string;
  defaultPaymentMethod?: string;
  editExpense?: TrackerTxn | null;
};

const PAYMENT_OPTIONS: { id: string; label: string; icon: AppIconName }[] = [
  { id: "upi", label: "UPI", icon: "phone" },
  { id: "cash", label: "Cash", icon: "rupee" },
  { id: "credit_card", label: "Credit card", icon: "card" },
  { id: "netbanking", label: "Net banking", icon: "bank" },
  { id: "wallet", label: "Wallet", icon: "wallet" },
];

function initialPaymentKind(method: string | null | undefined) {
  if (isCreditCardPaymentMethod(method)) return "credit_card";
  if (method === "card") return "credit_card";
  return method || "upi";
}

/** Add / edit sheet — field-for-field port of PWA AddExpenseModal. */
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { keyboardHeight, scrollRef, onScroll, onFocusWithin } =
    useKeyboardSheet();

  const [today, setToday] = useState(() => localISODate());
  const dateMax = maxDate && maxDate > today ? maxDate : today;

  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState<number | null>(null);
  const [bucket, setBucket] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [savedCards, setSavedCards] = useState<SavedCreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardNickname, setNewCardNickname] = useState("");
  const [newCardBillingDay, setNewCardBillingDay] = useState("");
  const [newCardDueDay, setNewCardDueDay] = useState("");
  const [cardMode, setCardMode] = useState<CardEntryMode>("purchase");
  const [emiMonths, setEmiMonths] = useState("6");
  const [emiMonthly, setEmiMonthly] = useState("");
  const [emiFee, setEmiFee] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const seedPayment =
      editExpense?.payment_method || defaultPaymentMethod || "upi";
    setToday(localISODate());
    setDate(editExpense?.date || defaultDate || localISODate());
    setAmount(editExpense?.amount ?? defaultAmount ?? null);
    setBucket(editExpense?.bucket || defaultBucket || "");
    setSubcategory(editExpense?.subcategory || defaultSubcategory || "");
    setDescription(
      displayExpenseDescription(
        editExpense?.description || defaultDescription || "",
      ),
    );
    setPaymentMethod(initialPaymentKind(seedPayment));
    setSelectedCardId(parseCreditCardPaymentMethod(seedPayment).cardId || "");
    setShowAddCard(false);
    setNewCardNickname("");
    setNewCardBillingDay("");
    setNewCardDueDay("");
    const seedEmi = parseCardEmiPlan(editExpense?.description);
    setCardMode(
      editExpense?.subcategory === CARD_REFUND_SUBCATEGORY
        ? "refund"
        : seedEmi
          ? "emi"
          : "purchase",
    );
    setEmiMonths(seedEmi ? String(seedEmi.months) : "6");
    setEmiMonthly(seedEmi ? String(seedEmi.monthly) : "");
    setEmiFee(seedEmi?.fee ? String(seedEmi.fee) : "");
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

  // Keep the default date on the device's local calendar day across midnight / resume.
  useEffect(() => {
    if (!visible) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const syncToday = () => {
      const next = localISODate();
      setToday((prevToday) => {
        if (!editExpense?.id) {
          setDate((prevDate) =>
            !prevDate || prevDate === prevToday ? next : prevDate,
          );
        }
        return next;
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(syncToday, msUntilNextLocalMidnight());
    };
    timer = setTimeout(syncToday, msUntilNextLocalMidnight());
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") syncToday();
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [visible, editExpense?.id]);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let cancelled = false;
    const seedPayment =
      editExpense?.payment_method || defaultPaymentMethod || "upi";
    const seedCardId = parseCreditCardPaymentMethod(seedPayment).cardId;
    const seedKind = initialPaymentKind(seedPayment);
    void (async () => {
      const cards = await loadCreditCardsMerged(user.id);
      if (cancelled) return;
      setSavedCards(cards);
      if (!seedCardId && cards.length === 1 && seedKind === "credit_card") {
        setSelectedCardId(cards[0].id);
      }
      if (seedKind === "credit_card" && cards.length === 0 && !seedCardId) {
        setShowAddCard(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, user?.id, editExpense, defaultPaymentMethod]);

  // Loans → Credit card payment is a cash bill settle — "Paid via" can't be a card.
  useEffect(() => {
    if (
      bucket === "loans" &&
      subcategory === "credit_card" &&
      paymentMethod === "credit_card"
    ) {
      setPaymentMethod("upi");
      setShowAddCard(false);
    }
  }, [bucket, subcategory, paymentMethod]);

  // "Paid from RD savings" only applies to Security (insurance premiums).
  useEffect(() => {
    if (
      bucket &&
      bucket !== "security" &&
      isPaidFromSavings({ payment_method: paymentMethod })
    ) {
      setPaymentMethod("upi");
    }
  }, [bucket, paymentMethod]);

  const selectedCard = useMemo(
    () => savedCards.find((c) => c.id === selectedCardId) ?? null,
    [savedCards, selectedCardId],
  );
  const selectedBucket = bucket
    ? TRACKER_CATEGORIES[bucket as BucketType]
    : null;
  const subs = useMemo(
    () =>
      bucket && bucket in TRACKER_CATEGORIES
        ? pickerSubcategories(bucket as BucketType)
        : [],
    [bucket],
  );
  const isIncome = bucket === "income";
  const isSavings = bucket === "investment";
  const isCcBillPay = bucket === "loans" && subcategory === "credit_card";
  // EMI / refund only for card spends (not income or Loans rows).
  const cardModesAllowed =
    paymentMethod === "credit_card" &&
    !!bucket &&
    bucket !== "income" &&
    bucket !== "loans";
  const entryMode: CardEntryMode = cardModesAllowed ? cardMode : "purchase";
  const emiMonthsNum = Number(emiMonths);
  const suggestedMonthly =
    amount && amount > 0 && emiMonthsNum >= 1
      ? Math.round((amount / emiMonthsNum) * 100) / 100
      : 0;

  const title = isEdit
    ? isIncome
      ? "Edit income"
      : isSavings
        ? "Edit savings"
        : "Edit expense"
    : isIncome
      ? "Add income"
      : isSavings
        ? "Add savings"
        : "Add expense";
  const primaryCta = saving
    ? "Saving..."
    : isEdit
      ? isIncome
        ? "Update income"
        : isSavings
          ? "Update savings"
          : "Update expense"
      : isIncome
        ? "Save income"
        : isSavings
          ? "Save savings"
          : "Save expense";

  const handleAddCard = () => {
    if (!user?.id) {
      setError("You must be signed in");
      return;
    }
    const nick = newCardNickname.trim();
    if (!nick) {
      setError("Enter a card name (e.g. HDFC Millennia)");
      return;
    }
    const billingDay = newCardBillingDay
      ? Number(newCardBillingDay)
      : undefined;
    if (
      newCardBillingDay &&
      (!Number.isFinite(billingDay) ||
        (billingDay as number) < 1 ||
        (billingDay as number) > 31)
    ) {
      setError("Billing day must be between 1 and 31");
      return;
    }
    let dueDay = newCardDueDay ? Number(newCardDueDay) : undefined;
    if (
      newCardDueDay &&
      (!Number.isFinite(dueDay) ||
        (dueDay as number) < 1 ||
        (dueDay as number) > 31)
    ) {
      setError("Due day must be between 1 and 31");
      return;
    }
    if (billingDay && !dueDay) {
      dueDay = suggestDueDayFromBilling(billingDay);
    }
    const card = upsertSavedCreditCard(user.id, {
      nickname: nick,
      billingDay,
      dueDay,
    });
    setSavedCards(loadSavedCreditCards(user.id));
    setSelectedCardId(card.id);
    setShowAddCard(false);
    setNewCardNickname("");
    setNewCardBillingDay("");
    setNewCardDueDay("");
    setError("");
  };

  const handleDeleteCard = (cardId: string) => {
    if (!user?.id || !cardId) return;
    deleteSavedCreditCard(user.id, cardId);
    const next = loadSavedCreditCards(user.id);
    setSavedCards(next);
    if (selectedCardId === cardId) {
      setSelectedCardId(next[0]?.id ?? "");
    }
    setError("");
  };

  async function handleSave() {
    if (!amount || !bucket || (!subcategory && entryMode !== "refund")) {
      setError("Please fill amount, category and type");
      return;
    }
    let emiToken = "";
    if (entryMode === "emi") {
      const months = Math.round(emiMonthsNum);
      const monthly = emiMonthly ? Number(emiMonthly) : suggestedMonthly;
      const fee = emiFee ? Number(emiFee) : 0;
      if (!Number.isFinite(months) || months < 2 || months > 60) {
        setError("EMI months must be between 2 and 60");
        return;
      }
      if (!Number.isFinite(monthly) || monthly <= 0) {
        setError("Enter the monthly EMI amount");
        return;
      }
      if (!Number.isFinite(fee) || fee < 0) {
        setError("Processing fee can't be negative");
        return;
      }
      emiToken = encodeCardEmiToken({ months, monthly, fee });
    }
    if (!user?.id) {
      setError("You must be signed in");
      return;
    }

    let paymentToStore = paymentMethod;
    if (paymentMethod === "credit_card") {
      const card =
        selectedCard || savedCards.find((c) => c.id === selectedCardId) || null;
      if (!card) {
        setError("Select a credit card or add a new one");
        setShowAddCard(true);
        return;
      }
      paymentToStore = encodeCreditCardPaymentMethod(card);
    }

    setSaving(true);
    setError("");

    // Local calendar date — avoid UTC shift from `new Date("yyyy-mm-dd")`.
    const [yStr, mStr, dStr] = date.split("-");
    const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));

    // Never persist internal [#cardId] tokens.
    let descriptionToStore = displayExpenseDescription(description);
    if (isCcBillPay && defaultDescription) {
      const fallback = displayExpenseDescription(defaultDescription);
      if (
        fallback &&
        !/^pay bill/i.test(descriptionToStore || "") &&
        /^pay bill/i.test(fallback)
      ) {
        descriptionToStore = fallback;
      }
    }

    const subToStore =
      entryMode === "refund"
        ? CARD_REFUND_SUBCATEGORY
        : subcategory === CARD_REFUND_SUBCATEGORY
          ? "others"
          : subcategory;
    const payload = {
      user_id: user.id,
      date,
      amount,
      category: subToStore,
      subcategory: subToStore,
      // EMI terms ride along as a hidden token (no extra columns needed).
      description: emiToken
        ? `${descriptionToStore} ${emiToken}`.trim()
        : descriptionToStore,
      bucket,
      payment_method: paymentToStore,
      // Must match tracker fetch locale (`en-IN`) or the row won't load in-month.
      month: dateObj.toLocaleString("en-IN", { month: "long" }),
      year: dateObj.getFullYear(),
    };

    try {
      const write =
        isEdit && editExpense?.id
          ? supabase
              .from("expense_transactions")
              .update(payload)
              .eq("id", editExpense.id)
              .eq("user_id", user.id)
              .then((r) => ({ data: null, error: r.error }))
          : supabase
              .from("expense_transactions")
              .insert(payload)
              .select("id")
              .single();

      const timeout = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Save is taking too long. Check your connection and try again.",
              ),
            ),
          15000,
        );
      });

      const { data, error: dbError } = await Promise.race([write, timeout]);
      if (dbError) {
        setError(dbError.message);
        return;
      }

      onSaved({
        id: String(
          (data as { id?: string } | null)?.id ?? editExpense?.id ?? "",
        ),
        amount,
        bucket,
        category: subToStore,
        subcategory: subToStore,
        description: descriptionToStore,
        date,
        isEdit,
        cardMode: entryMode,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: (windowHeight - keyboardHeight - insets.top) * 0.94,
              paddingBottom:
                keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.headRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={4}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            <View onFocus={onFocusWithin}>
              <View style={{ marginBottom: 8 }}>
                <MoneyInput
                  label={isIncome ? "Income amount (₹)" : "Expense amount (₹)"}
                  value={amount}
                  onChangeValue={setAmount}
                  placeholder="0"
                />
              </View>

              <View style={styles.block}>
                <DateField value={date} onChange={setDate} max={dateMax} />
              </View>

              {!defaultBucket ? (
                <View style={styles.block}>
                  <Text style={styles.fieldLabelTight}>Category</Text>
                  <View style={styles.catGrid}>
                    {Object.entries(TRACKER_CATEGORIES).map(([key, cat]) => {
                      const on = bucket === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => {
                            setBucket(key);
                            setSubcategory("");
                          }}
                          style={[
                            styles.catCell,
                            on && {
                              borderColor: cat.color,
                              backgroundColor: `${cat.color}15`,
                            },
                          ]}
                        >
                          <TrackerIconBadge
                            name={cat.icon}
                            size={36}
                            iconSize={18}
                            color={cat.color}
                          />
                          <Text
                            style={[styles.catText, on && { color: cat.color }]}
                            numberOfLines={2}
                          >
                            {cat.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {selectedBucket && entryMode !== "refund" ? (
                <View style={styles.block}>
                  <Text style={styles.fieldLabelTight}>Type</Text>
                  <View style={styles.wrapChips}>
                    {subs.map((sub) => {
                      const on = subcategory === sub.id;
                      return (
                        <Pressable
                          key={sub.id}
                          onPress={() => setSubcategory(sub.id)}
                          style={[
                            styles.chip,
                            on && {
                              borderColor: selectedBucket.color,
                              backgroundColor: `${selectedBucket.color}15`,
                            },
                          ]}
                        >
                          <TrackerIcon
                            name={sub.icon}
                            size={16}
                            color={selectedBucket.color}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              on && {
                                color: selectedBucket.color,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {sub.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.block}>
                <Text style={styles.fieldLabel}>Note (optional)</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Zomato dinner order"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.textInput}
                />
              </View>

              {!isIncome ? (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.fieldLabelTight}>Paid via</Text>
                  {isCcBillPay ? (
                    <Text style={styles.ccHint}>
                      Card spends already came off Money Left when you made
                      them, so paying the bill{" "}
                      <Text style={styles.ccHintStrong}>
                        doesn&apos;t reduce it again
                      </Text>{" "}
                      — only interest or fees above them do.
                    </Text>
                  ) : null}
                  <View style={styles.wrapChips}>
                    {PAYMENT_OPTIONS.filter((pm) =>
                      isCcBillPay ? pm.id !== "credit_card" : true,
                    ).map((pm) => {
                      const on = paymentMethod === pm.id;
                      return (
                        <Pressable
                          key={pm.id}
                          onPress={() => {
                            setPaymentMethod(pm.id);
                            if (pm.id === "credit_card") {
                              if (savedCards.length === 0) setShowAddCard(true);
                              else if (!selectedCardId && savedCards[0]) {
                                setSelectedCardId(savedCards[0].id);
                              }
                            } else {
                              setShowAddCard(false);
                            }
                          }}
                          style={[styles.chip, on && styles.payChipOn]}
                        >
                          <AppIcon
                            name={pm.icon}
                            size={15}
                            color={on ? Colors.primary : Colors.textPrimary}
                          />
                          <Text
                            style={[styles.payChipText, on && styles.payTextOn]}
                          >
                            {pm.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {paymentMethod === "credit_card" ? (
                    <View style={styles.cardPanel}>
                      <Text style={styles.cardPanelLabel}>
                        Which credit card?
                      </Text>
                      {savedCards.length > 0 ? (
                        <View style={{ marginBottom: showAddCard ? 12 : 0 }}>
                          <View style={{ gap: 8 }}>
                            {savedCards.map((c) => {
                              const on = selectedCardId === c.id;
                              return (
                                <View
                                  key={c.id}
                                  style={[
                                    styles.cardRow,
                                    on && styles.cardRowOn,
                                  ]}
                                >
                                  <Pressable
                                    onPress={() => {
                                      setSelectedCardId(c.id);
                                      setShowAddCard(false);
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: on }}
                                    style={styles.cardPick}
                                  >
                                    <Text style={styles.cardName}>
                                      {formatCreditCardLabel(c)}
                                    </Text>
                                    {c.billingDay || c.dueDay ? (
                                      <Text style={styles.cardMeta}>
                                        {c.billingDay
                                          ? `Bill day ${c.billingDay}`
                                          : ""}
                                        {c.billingDay && c.dueDay ? " · " : ""}
                                        {c.dueDay ? `Due day ${c.dueDay}` : ""}
                                      </Text>
                                    ) : null}
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleDeleteCard(c.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Delete ${c.nickname}`}
                                    style={styles.cardDelete}
                                  >
                                    <Text style={styles.cardDeleteText}>
                                      Delete
                                    </Text>
                                  </Pressable>
                                </View>
                              );
                            })}
                          </View>
                          <Pressable
                            onPress={() => setShowAddCard(true)}
                            style={styles.addCardBtn}
                          >
                            <Text style={styles.addCardText}>
                              + Add new card
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}

                      {showAddCard || savedCards.length === 0 ? (
                        <View style={{ gap: 10, marginTop: 4 }}>
                          <View>
                            <Text style={styles.smallLabel}>Card name</Text>
                            <TextInput
                              value={newCardNickname}
                              onChangeText={setNewCardNickname}
                              placeholder="e.g. HDFC Millennia"
                              placeholderTextColor={Colors.textMuted}
                              style={styles.textInput}
                            />
                          </View>
                          <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.smallLabel}>Billing day</Text>
                              <TextInput
                                value={newCardBillingDay}
                                onChangeText={(v) => {
                                  const clean = v
                                    .replace(/[^\d]/g, "")
                                    .slice(0, 2);
                                  setNewCardBillingDay(clean);
                                  const b = Number(clean);
                                  if (
                                    Number.isFinite(b) &&
                                    b >= 1 &&
                                    b <= 31 &&
                                    !newCardDueDay
                                  ) {
                                    setNewCardDueDay(
                                      String(suggestDueDayFromBilling(b)),
                                    );
                                  }
                                }}
                                keyboardType="number-pad"
                                placeholder="e.g. 15"
                                placeholderTextColor={Colors.textMuted}
                                style={styles.textInput}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.smallLabel}>Due day</Text>
                              <TextInput
                                value={newCardDueDay}
                                onChangeText={(v) =>
                                  setNewCardDueDay(
                                    v.replace(/[^\d]/g, "").slice(0, 2),
                                  )
                                }
                                keyboardType="number-pad"
                                placeholder={`~+${DEFAULT_DUE_OFFSET_DAYS}d`}
                                placeholderTextColor={Colors.textMuted}
                                style={styles.textInput}
                              />
                            </View>
                          </View>
                          <Pressable
                            onPress={handleAddCard}
                            style={styles.saveCardBtn}
                          >
                            <Text style={styles.saveCardText}>Save card</Text>
                          </Pressable>
                          <Text style={styles.cardFootnote}>
                            Nickname + billing/due days sync to your account. No
                            full card number. Due day defaults to ~
                            {DEFAULT_DUE_OFFSET_DAYS} days after statement (not
                            the ~45-day interest-free period).
                          </Text>
                        </View>
                      ) : null}

                      {cardModesAllowed ? (
                        <View style={{ marginTop: 12 }}>
                          <Text style={styles.cardPanelLabel}>
                            This card entry is a
                          </Text>
                          <View style={styles.wrapChips}>
                            {CARD_ENTRY_MODES.map((m) => {
                              const on = cardMode === m.id;
                              return (
                                <Pressable
                                  key={m.id}
                                  onPress={() => {
                                    setCardMode(m.id);
                                    if (
                                      m.id !== "refund" &&
                                      subcategory === CARD_REFUND_SUBCATEGORY
                                    ) {
                                      setSubcategory("");
                                    }
                                  }}
                                  accessibilityRole="radio"
                                  accessibilityState={{ selected: on }}
                                  style={[styles.chip, on && styles.payChipOn]}
                                >
                                  <Text
                                    style={[
                                      styles.payChipText,
                                      on && styles.payTextOn,
                                    ]}
                                  >
                                    {m.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>

                          {entryMode === "emi" ? (
                            <View style={{ gap: 10, marginTop: 10 }}>
                              <View style={{ flexDirection: "row", gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.smallLabel}>Months</Text>
                                  <TextInput
                                    value={emiMonths}
                                    onChangeText={(v) =>
                                      setEmiMonths(
                                        v.replace(/[^\d]/g, "").slice(0, 2),
                                      )
                                    }
                                    keyboardType="number-pad"
                                    placeholder="e.g. 6"
                                    placeholderTextColor={Colors.textMuted}
                                    style={styles.textInput}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.smallLabel}>
                                    Monthly EMI (₹)
                                  </Text>
                                  <TextInput
                                    value={emiMonthly}
                                    onChangeText={(v) =>
                                      setEmiMonthly(v.replace(/[^\d.]/g, ""))
                                    }
                                    keyboardType="decimal-pad"
                                    placeholder={
                                      suggestedMonthly > 0
                                        ? String(Math.round(suggestedMonthly))
                                        : "e.g. 2500"
                                    }
                                    placeholderTextColor={Colors.textMuted}
                                    style={styles.textInput}
                                  />
                                </View>
                              </View>
                              <View>
                                <Text style={styles.smallLabel}>
                                  Processing fee (₹, optional)
                                </Text>
                                <TextInput
                                  value={emiFee}
                                  onChangeText={(v) =>
                                    setEmiFee(v.replace(/[^\d.]/g, ""))
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="0"
                                  placeholderTextColor={Colors.textMuted}
                                  style={styles.textInput}
                                />
                              </View>
                              <Text style={styles.cardFootnote}>
                                Only the monthly EMI counts each month, under
                                Loans, until the last month. The fee counts
                                once, in the first month.
                              </Text>
                            </View>
                          ) : entryMode === "refund" ? (
                            <Text
                              style={[styles.cardFootnote, { marginTop: 10 }]}
                            >
                              Lowers this section and your card bill. It is not
                              counted as income.
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {bucket === "security" ? (
                    <Pressable
                      onPress={() => {
                        setPaymentMethod(
                          isPaidFromSavings({ payment_method: paymentMethod })
                            ? "upi"
                            : RD_SAVINGS_PAYMENT_METHOD,
                        );
                        setShowAddCard(false);
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: isPaidFromSavings({
                          payment_method: paymentMethod,
                        }),
                      }}
                      style={styles.rdRow}
                    >
                      <View
                        style={[
                          styles.rdBox,
                          isPaidFromSavings({
                            payment_method: paymentMethod,
                          }) && styles.rdBoxOn,
                        ]}
                      >
                        {isPaidFromSavings({
                          payment_method: paymentMethod,
                        }) ? (
                          <Text style={styles.rdTick}>✓</Text>
                        ) : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.payChipText}>
                          Paid from my RD savings
                        </Text>
                        <Text style={styles.ccHint}>
                          Money you already set aside each month, so it won't
                          count again.
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                style={[styles.saveBtn, saving && styles.saveBtnBusy]}
              >
                <Text style={styles.saveText}>{primaryCta}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
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
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  body: { paddingHorizontal: 24, paddingBottom: 24 },
  block: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  fieldLabelTight: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: "#FFFFFF",
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catCell: {
    width: "31.5%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 6,
  },
  catText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  wrapChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
  },
  chipText: { fontSize: 12, color: Colors.textPrimary },
  payChipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  payChipText: { fontSize: 13, color: Colors.textPrimary },
  payTextOn: { color: Colors.primary, fontWeight: "700" },
  ccHint: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  ccHintStrong: { color: Colors.primary, fontWeight: "700" },
  rdRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
  },
  rdBox: {
    width: 18,
    height: 18,
    marginTop: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rdBoxOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  rdTick: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  cardPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FAFAFE",
  },
  cardPanelLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  cardRowOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  cardPick: { flex: 1, minHeight: 44, justifyContent: "center" },
  cardName: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  cardMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardDelete: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.errorLight,
    justifyContent: "center",
  },
  cardDeleteText: { fontSize: 12, fontWeight: "700", color: Colors.error },
  addCardBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C9C4F2",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  addCardText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  smallLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  saveCardBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveCardText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  cardFootnote: { fontSize: 11, lineHeight: 15, color: Colors.textMuted },
  errorBox: {
    backgroundColor: Colors.errorLight,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: "#791F1F" },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnBusy: { backgroundColor: Colors.textMuted },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
