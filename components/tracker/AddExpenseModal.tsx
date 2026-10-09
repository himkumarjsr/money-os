"use client";

import MoneyInput from "@/components/ui/MoneyInput";
import { handleMoneyInput } from "@/lib/formatters";
import { localISODate, msUntilNextLocalMidnight } from "@/lib/localDate";
import { useKeyboardInset } from "@/lib/useKeyboardInset";
import { getSupabase } from "@/lib/supabase";
import {
  TRACKER_CATEGORIES,
  pickerSubcategories,
} from "@/lib/tracker-categories";
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
import {
  TrackerIcon,
  TrackerIconBadge,
} from "@/components/tracker/TrackerIcons";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import {
  isPaidFromSavings,
  RD_SAVINGS_PAYMENT_METHOD,
} from "@/lib/trackerSavingsPayment";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

interface AddExpenseModalProps {
  onClose: () => void;
  onSaved: (saved?: {
    amount: number;
    category: string;
    subcategory: string;
    bucket: string;
    description: string;
    date: string;
    isEdit: boolean;
    /** Card purchase, card purchase on EMI, or card refund / cashback. */
    cardMode?: CardEntryMode;
  }) => void;
  defaultDate?: string;
  /** Inclusive max selectable date (YYYY-MM-DD). Defaults to today. */
  maxDate?: string;
  defaultBucket?: string;
  defaultSubcategory?: string;
  defaultAmount?: number;
  defaultDescription?: string;
  defaultPaymentMethod?: string;
  editExpense?: {
    id: string;
    date: string;
    amount: number;
    bucket: string;
    subcategory: string | null;
    description: string | null;
    payment_method: string | null;
  };
}

export type CardEntryMode = "purchase" | "emi" | "refund";

const CARD_ENTRY_MODES: Array<{ id: CardEntryMode; label: string }> = [
  { id: "purchase", label: "Purchase" },
  { id: "emi", label: "Converted to EMI" },
  { id: "refund", label: "Refund / cashback" },
];

function initialPaymentKind(method: string | null | undefined) {
  if (isCreditCardPaymentMethod(method)) return "credit_card";
  if (method === "card") return "credit_card";
  return method || "upi";
}

const FIELD_LABEL_COLOR = "#111110";
const IOS_DATE_INPUT_STYLE: CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: "1.5px solid #E8E6F0",
  padding: "0 16px",
  fontSize: 16,
  boxSizing: "border-box",
  color: "#111110",
  WebkitTextFillColor: "#111110",
  backgroundColor: "#ffffff",
  opacity: 1,
};

export default function AddExpenseModal({
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
}: AddExpenseModalProps) {
  const user = useAuthStore((s) => s.user);
  const [today, setToday] = useState(() => localISODate());
  const dateMax = maxDate && maxDate > today ? maxDate : today;
  const seedPayment =
    editExpense?.payment_method || defaultPaymentMethod || "upi";
  const seedParsed = parseCreditCardPaymentMethod(seedPayment);

  const [date, setDate] = useState(
    editExpense?.date || defaultDate || localISODate(),
  );
  const [amount, setAmount] = useState(
    editExpense?.amount ?? defaultAmount ?? 0,
  );
  const [bucket, setBucket] = useState(
    editExpense?.bucket || defaultBucket || "",
  );
  const [subcategory, setSubcategory] = useState(
    editExpense?.subcategory || defaultSubcategory || "",
  );
  const [description, setDescription] = useState(
    displayExpenseDescription(
      editExpense?.description || defaultDescription || "",
    ),
  );
  const seedEmi = parseCardEmiPlan(editExpense?.description);
  const [cardMode, setCardMode] = useState<CardEntryMode>(
    editExpense?.subcategory === CARD_REFUND_SUBCATEGORY
      ? "refund"
      : seedEmi
        ? "emi"
        : "purchase",
  );
  const [emiMonths, setEmiMonths] = useState(
    seedEmi ? String(seedEmi.months) : "6",
  );
  const [emiMonthly, setEmiMonthly] = useState(
    seedEmi ? String(seedEmi.monthly) : "",
  );
  const [emiFee, setEmiFee] = useState(seedEmi?.fee ? String(seedEmi.fee) : "");
  const [paymentMethod, setPaymentMethod] = useState(
    initialPaymentKind(seedPayment),
  );
  const [savedCards, setSavedCards] = useState<SavedCreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>(
    seedParsed.cardId || "",
  );
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardNickname, setNewCardNickname] = useState("");
  const [newCardBillingDay, setNewCardBillingDay] = useState("");
  const [newCardDueDay, setNewCardDueDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      // Always clear — stacked modals / PWA remounts can leave body stuck.
      document.body.style.overflow = "";
    };
  }, []);

  // Keep default date on the device's local calendar day (not UTC).
  useEffect(() => {
    let midnightTimer = 0;
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
      window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(syncToday, msUntilNextLocalMidnight());
    };
    syncToday();
    const onVis = () => {
      if (document.visibilityState === "visible") syncToday();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", syncToday);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", syncToday);
      window.clearTimeout(midnightTimer);
    };
  }, [editExpense?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const cards = await loadCreditCardsMerged(user.id);
      if (cancelled) return;
      setSavedCards(cards);
      if (
        !selectedCardId &&
        cards.length === 1 &&
        paymentMethod === "credit_card"
      ) {
        setSelectedCardId(cards[0].id);
      }
      if (
        paymentMethod === "credit_card" &&
        cards.length === 0 &&
        !seedParsed.cardId
      ) {
        setShowAddCard(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Loans → Credit card payment is a cash bill settle — don't leave "Paid via"
  // stuck on Credit card (that would mean charging another card).
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
    ? TRACKER_CATEGORIES[bucket as keyof typeof TRACKER_CATEGORIES]
    : null;
  // EMI / refund only for card spends (not income or Loans rows).
  const cardModesAllowed =
    paymentMethod === "credit_card" &&
    !!bucket &&
    bucket !== "income" &&
    bucket !== "loans";
  const entryMode: CardEntryMode = cardModesAllowed ? cardMode : "purchase";
  const emiMonthsNum = Number(emiMonths);
  const suggestedMonthly =
    amount > 0 && emiMonthsNum >= 1
      ? Math.round((amount / emiMonthsNum) * 100) / 100
      : 0;
  const isIncome = bucket === "income";
  const isSavings = bucket === "investment";
  const modalTitle = editExpense
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
    : editExpense
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

  const handleSave = async () => {
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

    const supabase = getSupabase();
    // Parse as local calendar date — avoid UTC shift from `new Date("yyyy-mm-dd")`.
    const [yStr, mStr, dStr] = date.split("-");
    const yNum = Number(yStr);
    const mNum = Number(mStr);
    const dNum = Number(dStr);
    const dateObj =
      Number.isFinite(yNum) && Number.isFinite(mNum) && Number.isFinite(dNum)
        ? new Date(yNum, mNum - 1, dNum)
        : new Date(date);

    // Clean note — never persist internal [#cardId] tokens.
    let descriptionToStore = displayExpenseDescription(description);
    if (
      bucket === "loans" &&
      subcategory === "credit_card" &&
      defaultDescription
    ) {
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
      const write = editExpense?.id
        ? supabase
            .from("expense_transactions")
            .update(payload)
            .eq("id", editExpense.id)
            .eq("user_id", user.id)
        : supabase.from("expense_transactions").insert(payload);

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

      const { error: dbError } = await Promise.race([write, timeout]);

      if (dbError) {
        setError(dbError.message);
        return;
      }

      onSaved({
        amount: Number(payload.amount),
        category: String(payload.category ?? ""),
        subcategory: String(payload.subcategory ?? ""),
        bucket: String(payload.bucket ?? ""),
        description: String(descriptionToStore ?? ""),
        date: String(payload.date ?? ""),
        isEdit: Boolean(editExpense?.id),
        cardMode: entryMode,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: keyboardInset,
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="add-expense-title"
        style={{
          background: "white",
          borderRadius: "20px 20px 0 0",
          padding: "24px",
          width: "100%",
          maxWidth: 480,
          maxHeight: `calc((100dvh - ${keyboardInset}px) * 0.92)`,
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h3
            id="add-expense-title"
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#111110",
              margin: 0,
            }}
          >
            {modalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#F7F7F4",
              border: "none",
              borderRadius: 8,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 700,
              color: "#111110",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <MoneyInput
            id="tracker-expense-amount"
            label={isIncome ? "Income amount (₹)" : "Expense amount (₹)"}
            placeholder="0"
            defaultValue={amount > 0 ? String(amount) : ""}
            onChange={(e) => {
              const parsed = handleMoneyInput(e.target.value, 0, 1_000_000_000);
              setAmount(parsed ?? 0);
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: FIELD_LABEL_COLOR,
              display: "block",
              marginBottom: 6,
            }}
          >
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={dateMax}
            style={IOS_DATE_INPUT_STYLE}
          />
        </div>

        {!defaultBucket ? (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: FIELD_LABEL_COLOR,
                display: "block",
                marginBottom: 8,
              }}
            >
              Category
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {Object.entries(TRACKER_CATEGORIES).map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setBucket(key);
                    setSubcategory("");
                  }}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: `1.5px solid ${bucket === key ? cat.color : "#E8E6F0"}`,
                    background: bucket === key ? `${cat.color}15` : "white",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    color: bucket === key ? cat.color : "#111110",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 6,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <TrackerIconBadge
                      name={cat.icon}
                      size={36}
                      iconSize={18}
                      color={cat.color}
                    />
                  </div>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selectedBucket && entryMode !== "refund" ? (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: FIELD_LABEL_COLOR,
                display: "block",
                marginBottom: 8,
              }}
            >
              Type
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pickerSubcategories(
                bucket as keyof typeof TRACKER_CATEGORIES,
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubcategory(sub.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${subcategory === sub.id ? selectedBucket.color : "#E8E6F0"}`,
                    background:
                      subcategory === sub.id
                        ? `${selectedBucket.color}15`
                        : "white",
                    cursor: "pointer",
                    fontSize: 12,
                    color:
                      subcategory === sub.id ? selectedBucket.color : "#111110",
                    fontWeight: subcategory === sub.id ? 700 : 400,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <TrackerIcon
                    name={sub.icon}
                    size={16}
                    color={selectedBucket.color}
                  />
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: FIELD_LABEL_COLOR,
              display: "block",
              marginBottom: 6,
            }}
          >
            Note (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Zomato dinner order"
            style={{
              ...IOS_DATE_INPUT_STYLE,
              color: "#111110",
              WebkitTextFillColor: "#111110",
            }}
          />
        </div>

        {bucket !== "income" ? (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: FIELD_LABEL_COLOR,
                display: "block",
                marginBottom: 8,
              }}
            >
              Paid via
            </label>
            {bucket === "loans" && subcategory === "credit_card" ? (
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "#5F5E5A",
                }}
              >
                Card spends already came off Money Left when you made them, so
                paying the bill{" "}
                <strong style={{ color: "#534AB7" }}>
                  doesn&apos;t reduce it again
                </strong>{" "}
                — only interest or fees above them do.
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(
                [
                  { id: "upi", label: "UPI", icon: "phone" },
                  { id: "cash", label: "Cash", icon: "rupee" },
                  { id: "credit_card", label: "Credit card", icon: "card" },
                  { id: "netbanking", label: "Net banking", icon: "bank" },
                  { id: "wallet", label: "Wallet", icon: "wallet" },
                ] as { id: string; label: string; icon: AppIconName }[]
              )
                .filter((pm) =>
                  bucket === "loans" && subcategory === "credit_card"
                    ? pm.id !== "credit_card"
                    : true,
                )
                .map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => {
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
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${paymentMethod === pm.id ? "#534AB7" : "#E8E6F0"}`,
                      background: paymentMethod === pm.id ? "#EEEDFE" : "white",
                      cursor: "pointer",
                      fontSize: 13,
                      color: paymentMethod === pm.id ? "#534AB7" : "#111110",
                      fontWeight: paymentMethod === pm.id ? 700 : 400,
                    }}
                  >
                    <AppIcon
                      name={pm.icon}
                      size={15}
                      color={paymentMethod === pm.id ? "#534AB7" : "#111110"}
                    />
                    {pm.label}
                  </button>
                ))}
            </div>

            {paymentMethod === "credit_card" ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #E8E6F0",
                  background: "#FAFAFE",
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#5F5E5A",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Which credit card?
                </label>
                {savedCards.length > 0 ? (
                  <div style={{ marginBottom: showAddCard ? 12 : 0 }}>
                    <ul
                      style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      {savedCards.map((c) => {
                        const selected = selectedCardId === c.id;
                        return (
                          <li
                            key={c.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              borderRadius: 12,
                              border: selected
                                ? "1.5px solid #534AB7"
                                : "1.5px solid #E8E6F0",
                              background: selected ? "#EEEDFE" : "white",
                              padding: "8px 10px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCardId(c.id);
                                setShowAddCard(false);
                              }}
                              style={{
                                flex: 1,
                                textAlign: "left",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                minHeight: 36,
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 14,
                                  color: "#111110",
                                }}
                              >
                                {formatCreditCardLabel(c)}
                              </div>
                              {c.billingDay || c.dueDay ? (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#9B9A94",
                                    marginTop: 2,
                                  }}
                                >
                                  {c.billingDay
                                    ? `Bill day ${c.billingDay}`
                                    : null}
                                  {c.billingDay && c.dueDay ? " · " : null}
                                  {c.dueDay ? `Due day ${c.dueDay}` : null}
                                </div>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${c.nickname}`}
                              onClick={() => handleDeleteCard(c.id)}
                              style={{
                                border: "none",
                                background: "#FCEBEB",
                                color: "#E24B4A",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "8px 10px",
                                cursor: "pointer",
                                minHeight: 36,
                              }}
                            >
                              Delete
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setShowAddCard(true)}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        height: 40,
                        borderRadius: 10,
                        border: "1px dashed #C9C4F2",
                        background: "white",
                        color: "#534AB7",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      + Add new card
                    </button>
                  </div>
                ) : null}

                {showAddCard || savedCards.length === 0 ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: FIELD_LABEL_COLOR,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Card name
                      </label>
                      <input
                        type="text"
                        value={newCardNickname}
                        onChange={(e) => setNewCardNickname(e.target.value)}
                        placeholder="e.g. HDFC Millennia"
                        style={IOS_DATE_INPUT_STYLE}
                      />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: FIELD_LABEL_COLOR,
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Billing day
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          inputMode="numeric"
                          value={newCardBillingDay}
                          onChange={(e) => {
                            setNewCardBillingDay(e.target.value);
                            const b = Number(e.target.value);
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
                          placeholder="e.g. 15"
                          style={IOS_DATE_INPUT_STYLE}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: FIELD_LABEL_COLOR,
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Due day
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          inputMode="numeric"
                          value={newCardDueDay}
                          onChange={(e) => setNewCardDueDay(e.target.value)}
                          placeholder={`~+${DEFAULT_DUE_OFFSET_DAYS}d`}
                          style={IOS_DATE_INPUT_STYLE}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCard}
                      style={{
                        height: 44,
                        borderRadius: 10,
                        border: "1.5px solid #534AB7",
                        background: "white",
                        color: "#534AB7",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Save card
                    </button>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "#9B9A94",
                        lineHeight: 1.4,
                      }}
                    >
                      Nickname + billing/due days sync to your account. No full
                      card number. Due day defaults to ~
                      {DEFAULT_DUE_OFFSET_DAYS} days after statement (not the
                      ~45-day interest-free period).
                    </p>
                  </div>
                ) : null}

                {cardModesAllowed ? (
                  <div style={{ marginTop: 12 }}>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#5F5E5A",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      This card entry is a
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {CARD_ENTRY_MODES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={cardMode === m.id}
                          onClick={() => {
                            setCardMode(m.id);
                            if (
                              m.id !== "refund" &&
                              subcategory === CARD_REFUND_SUBCATEGORY
                            ) {
                              setSubcategory("");
                            }
                          }}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: `1.5px solid ${cardMode === m.id ? "#534AB7" : "#E8E6F0"}`,
                            background: cardMode === m.id ? "#EEEDFE" : "white",
                            color: cardMode === m.id ? "#534AB7" : "#111110",
                            fontWeight: cardMode === m.id ? 700 : 400,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {entryMode === "emi" ? (
                      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: FIELD_LABEL_COLOR,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Months
                            </label>
                            <input
                              type="number"
                              min={2}
                              max={60}
                              inputMode="numeric"
                              value={emiMonths}
                              onChange={(e) => setEmiMonths(e.target.value)}
                              placeholder="e.g. 6"
                              style={IOS_DATE_INPUT_STYLE}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: FIELD_LABEL_COLOR,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Monthly EMI (₹)
                            </label>
                            <input
                              type="number"
                              min={1}
                              inputMode="decimal"
                              value={emiMonthly}
                              onChange={(e) => setEmiMonthly(e.target.value)}
                              placeholder={
                                suggestedMonthly > 0
                                  ? String(Math.round(suggestedMonthly))
                                  : "e.g. 2500"
                              }
                              style={IOS_DATE_INPUT_STYLE}
                            />
                          </div>
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: FIELD_LABEL_COLOR,
                              display: "block",
                              marginBottom: 4,
                            }}
                          >
                            Processing fee (₹, optional)
                          </label>
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={emiFee}
                            onChange={(e) => setEmiFee(e.target.value)}
                            placeholder="0"
                            style={IOS_DATE_INPUT_STYLE}
                          />
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            color: "#5F5E5A",
                            lineHeight: 1.4,
                          }}
                        >
                          Only the monthly EMI counts each month, under Loans,
                          until the last month. The fee counts once, in the
                          first month.
                        </p>
                      </div>
                    ) : entryMode === "refund" ? (
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: 11,
                          color: "#5F5E5A",
                          lineHeight: 1.4,
                        }}
                      >
                        Lowers this section and your card bill. It is not
                        counted as income.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {bucket === "security" ? (
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginTop: 12,
                  fontSize: 13,
                  color: "#111110",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPaidFromSavings({ payment_method: paymentMethod })}
                  onChange={(e) => {
                    setPaymentMethod(
                      e.target.checked ? RD_SAVINGS_PAYMENT_METHOD : "upi",
                    );
                    setShowAddCard(false);
                  }}
                  style={{ marginTop: 2 }}
                />
                <span>
                  Paid from my RD savings
                  <span
                    style={{ display: "block", fontSize: 12, color: "#5F5E5A" }}
                  >
                    Money you already set aside each month, so it won&apos;t
                    count again.
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              background: "#FCEBEB",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#791F1F",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            background: saving ? "#9B9A94" : "#534AB7",
            color: "white",
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {primaryCta}
        </button>
      </div>
    </div>
  );
}
