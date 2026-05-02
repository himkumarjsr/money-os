"use client";

import MoneyInput from "@/components/ui/MoneyInput";
import { handleMoneyInput } from "@/lib/formatters";
import { getSupabase } from "@/lib/supabase";
import { TRACKER_CATEGORIES } from "@/lib/tracker-categories";
import { useAuthStore } from "@/store/authStore";
import { useState } from "react";

interface AddExpenseModalProps {
  onClose: () => void;
  onSaved: () => void;
  defaultDate?: string;
}

export default function AddExpenseModal({ onClose, onSaved, defaultDate }: AddExpenseModalProps) {
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(defaultDate || today);
  const [amount, setAmount] = useState(0);
  const [bucket, setBucket] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedBucket = bucket ? TRACKER_CATEGORIES[bucket as keyof typeof TRACKER_CATEGORIES] : null;

  const handleSave = async () => {
    if (!amount || !bucket || !subcategory) {
      setError("Please fill amount, category and type");
      return;
    }
    if (!user?.id) {
      setError("You must be signed in");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = getSupabase();
    const dateObj = new Date(date);

    const { error: dbError } = await supabase.from("expense_transactions").insert({
      user_id: user.id,
      date,
      amount,
      category: subcategory,
      subcategory,
      description,
      bucket,
      payment_method: paymentMethod,
      month: dateObj.toLocaleString("default", { month: "long" }),
      year: dateObj.getFullYear(),
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onSaved();
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
            Add expense
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#F7F7F4",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <MoneyInput
            id="tracker-expense-amount"
            label="Amount (₹)"
            placeholder="0"
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
              color: "#5F5E5A",
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
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1.5px solid #E8E6F0",
              padding: "0 16px",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#5F5E5A",
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
            {Object.entries(TRACKER_CATEGORIES)
              .filter(([key]) => key !== "income")
              .map(([key, cat]) => (
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
                    color: bucket === key ? cat.color : "#5F5E5A",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{cat.emoji}</div>
                  {cat.label}
                </button>
              ))}
          </div>
        </div>

        {selectedBucket ? (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#5F5E5A",
                display: "block",
                marginBottom: 8,
              }}
            >
              Type
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selectedBucket.subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubcategory(sub.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${subcategory === sub.id ? selectedBucket.color : "#E8E6F0"}`,
                    background: subcategory === sub.id ? `${selectedBucket.color}15` : "white",
                    cursor: "pointer",
                    fontSize: 12,
                    color: subcategory === sub.id ? selectedBucket.color : "#5F5E5A",
                    fontWeight: subcategory === sub.id ? 700 : 400,
                  }}
                >
                  {sub.emoji} {sub.label}
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
              color: "#5F5E5A",
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
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1.5px solid #E8E6F0",
              padding: "0 16px",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#5F5E5A",
              display: "block",
              marginBottom: 8,
            }}
          >
            Paid via
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "upi", label: "📱 UPI" },
              { id: "cash", label: "💵 Cash" },
              { id: "card", label: "💳 Card" },
              { id: "netbanking", label: "🏦 Net banking" },
              { id: "wallet", label: "👛 Wallet" },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${paymentMethod === pm.id ? "#534AB7" : "#E8E6F0"}`,
                  background: paymentMethod === pm.id ? "#EEEDFE" : "white",
                  cursor: "pointer",
                  fontSize: 13,
                  color: paymentMethod === pm.id ? "#534AB7" : "#5F5E5A",
                  fontWeight: paymentMethod === pm.id ? 700 : 400,
                }}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

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
          {saving ? "Saving..." : "Save expense"}
        </button>
      </div>
    </div>
  );
}
