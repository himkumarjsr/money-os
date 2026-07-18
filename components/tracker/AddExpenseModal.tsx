"use client";

import MoneyInput from "@/components/ui/MoneyInput";
import { handleMoneyInput } from "@/lib/formatters";
import { getSupabase } from "@/lib/supabase";
import {
  TRACKER_CATEGORIES,
  pickerSubcategories,
} from "@/lib/tracker-categories";
import {
  encodeCreditCardPaymentMethod,
  isCreditCardPaymentMethod,
  loadSavedCreditCards,
  parseCreditCardPaymentMethod,
  upsertSavedCreditCard,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";
import {
  TrackerIcon,
  TrackerIconBadge,
} from "@/components/tracker/TrackerIcons";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

interface AddExpenseModalProps {
  onClose: () => void;
  onSaved: () => void;
  defaultDate?: string;
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
  defaultBucket,
  defaultSubcategory,
  defaultAmount,
  defaultDescription,
  defaultPaymentMethod,
  editExpense,
}: AddExpenseModalProps) {
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().split("T")[0];
  const seedPayment =
    editExpense?.payment_method || defaultPaymentMethod || "upi";
  const seedParsed = parseCreditCardPaymentMethod(seedPayment);

  const [date, setDate] = useState(editExpense?.date || defaultDate || today);
  const [amount, setAmount] = useState(
    editExpense?.amount || defaultAmount || 0,
  );
  const [bucket, setBucket] = useState(
    editExpense?.bucket || defaultBucket || "",
  );
  const [subcategory, setSubcategory] = useState(
    editExpense?.subcategory || defaultSubcategory || "",
  );
  const [description, setDescription] = useState(
    editExpense?.description || defaultDescription || "",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initialPaymentKind(seedPayment),
  );
  const [savedCards, setSavedCards] = useState<SavedCreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>(
    seedParsed.cardId || "",
  );
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardNickname, setNewCardNickname] = useState("");
  const [newCardLast4, setNewCardLast4] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      // Always clear — stacked modals / PWA remounts can leave body stuck.
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const cards = loadSavedCreditCards(user.id);
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
  }, [user?.id]);

  const selectedCard = useMemo(
    () => savedCards.find((c) => c.id === selectedCardId) ?? null,
    [savedCards, selectedCardId],
  );

  const selectedBucket = bucket
    ? TRACKER_CATEGORIES[bucket as keyof typeof TRACKER_CATEGORIES]
    : null;
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
    const last4 = newCardLast4.replace(/\D/g, "").slice(-4);
    if (!nick) {
      setError("Enter a card name (e.g. HDFC Millennia)");
      return;
    }
    if (last4.length !== 4) {
      setError("Enter the last 4 digits of the card");
      return;
    }
    const card = upsertSavedCreditCard(user.id, {
      nickname: nick,
      last4,
    });
    setSavedCards(loadSavedCreditCards(user.id));
    setSelectedCardId(card.id);
    setShowAddCard(false);
    setNewCardNickname("");
    setNewCardLast4("");
    setError("");
  };

  const handleSave = async () => {
    if (!amount || !bucket || !subcategory) {
      setError("Please fill amount, category and type");
      return;
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
    const dateObj = new Date(date);

    const payload = {
      user_id: user.id,
      date,
      amount,
      category: subcategory,
      subcategory,
      description,
      bucket,
      payment_method: paymentToStore,
      month: dateObj.toLocaleString("default", { month: "long" }),
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

      onSaved();
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
          maxHeight: "90vh",
          overflowY: "auto",
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
            max={today}
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

        {selectedBucket ? (
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(
                [
                  { id: "upi", label: "UPI", icon: "phone" },
                  { id: "cash", label: "Cash", icon: "rupee" },
                  { id: "credit_card", label: "Credit card", icon: "card" },
                  { id: "netbanking", label: "Net banking", icon: "bank" },
                  { id: "wallet", label: "Wallet", icon: "wallet" },
                ] as { id: string; label: string; icon: AppIconName }[]
              ).map((pm) => (
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
                  <select
                    value={selectedCardId}
                    onChange={(e) => {
                      if (e.target.value === "__add__") {
                        setShowAddCard(true);
                        return;
                      }
                      setSelectedCardId(e.target.value);
                      setShowAddCard(false);
                    }}
                    style={{
                      ...IOS_DATE_INPUT_STYLE,
                      marginBottom: showAddCard ? 12 : 0,
                    }}
                  >
                    <option value="" disabled>
                      Select a card
                    </option>
                    {savedCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nickname} ****{c.last4}
                      </option>
                    ))}
                    <option value="__add__">+ Add new card…</option>
                  </select>
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
                        Last 4 digits
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={newCardLast4}
                        onChange={(e) =>
                          setNewCardLast4(
                            e.target.value.replace(/\D/g, "").slice(0, 4),
                          )
                        }
                        placeholder="1234"
                        style={IOS_DATE_INPUT_STYLE}
                      />
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
                      Saved on this device. Next month we’ll remind you to pay
                      this card’s spend from salary.
                    </p>
                  </div>
                ) : null}
              </div>
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
