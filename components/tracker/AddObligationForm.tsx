"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "loan_emi", label: "Loan EMI", emoji: "🏦" },
  { value: "insurance_life", label: "Life Insurance", emoji: "🛡️" },
  { value: "insurance_health", label: "Health Insurance", emoji: "🏥" },
  { value: "insurance_vehicle", label: "Vehicle Insurance", emoji: "🚗" },
  { value: "investment_sip", label: "SIP", emoji: "📈" },
  { value: "investment_ppf", label: "PPF", emoji: "💰" },
  { value: "subscription", label: "Subscription", emoji: "📱" },
  { value: "rent", label: "Rent", emoji: "🏠" },
  { value: "other", label: "Other", emoji: "📌" },
] as const;

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One Time" },
] as const;

export type ObligationFormPayload = {
  title: string;
  category: string;
  amount: number;
  frequency: string;
  due_day: number | null;
  due_month: number | null;
  source: string;
  is_active: boolean;
  remind_days_before: number;
};

type Props = {
  onSave: (data: ObligationFormPayload) => Promise<void>;
  onClose: () => void;
  /** When set, form opens in edit mode with these values. */
  initial?: Partial<ObligationFormPayload> | null;
  submitLabel?: string;
};

export default function AddObligationForm({
  onSave,
  onClose,
  initial,
  submitLabel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "loan_emi");
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [frequency, setFrequency] = useState(initial?.frequency ?? "monthly");
  const [dueDay, setDueDay] = useState(
    initial?.due_day != null ? String(initial.due_day) : "",
  );
  const [dueMonth, setDueMonth] = useState(
    initial?.due_month != null ? String(initial.due_month) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  const canSave = Boolean(title.trim() && amount);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        title: title.trim(),
        category,
        amount: parseFloat(amount),
        frequency,
        due_day: dueDay ? parseInt(dueDay, 10) : null,
        due_month: dueMonth ? parseInt(dueMonth, 10) : null,
        source: "manual",
        is_active: true,
        remind_days_before: initial?.remind_days_before ?? 7,
      });
    } catch (err) {
      console.error("obligation save failed:", err);
      setSaveError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-[#111110]">
          {isEdit ? "Edit obligation" : "Add obligation"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold text-[#9B9A94]"
        >
          Close
        </button>
      </div>

      <div className="mb-3.5">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
          What is it?
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. LIC Premium, HDFC Home Loan"
          autoFocus
          className="box-border h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-3.5 text-[15px] outline-none"
        />
      </div>

      <div className="mb-3.5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`flex items-center gap-1 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                    : "border-[#E8E6F0] bg-white text-[#5F5E5A]"
                }`}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3.5">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
          Amount (₹)
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="box-border h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-3.5 text-base font-bold text-[#534AB7] outline-none"
        />
      </div>

      <div className="mb-3.5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
          How often?
        </label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCIES.map((f) => {
            const active = frequency === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={`rounded-full border-[1.5px] px-3.5 py-2 text-xs font-semibold ${
                  active
                    ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                    : "border-[#E8E6F0] bg-white text-[#5F5E5A]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {(frequency === "monthly" ||
        frequency === "quarterly" ||
        frequency === "half_yearly") && (
        <div className="mb-3.5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
            Due date (day of month)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const active = dueDay === String(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDueDay(String(day))}
                  className={`h-9 w-9 rounded-[10px] border-[1.5px] text-xs font-semibold ${
                    active
                      ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                      : "border-[#E8E6F0] bg-white text-[#5F5E5A]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {frequency === "yearly" ? (
        <div className="mb-3.5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
            Which month?
          </label>
          <select
            value={dueMonth}
            onChange={(e) => setDueMonth(e.target.value)}
            className="h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none"
          >
            <option value="">Select month</option>
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {saveError ? (
        <p className="mb-3 text-center text-[13px] font-medium text-[#E24B4A]">
          {saveError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!canSave || saving}
        className={`h-[52px] w-full rounded-[13px] text-[15px] font-bold ${
          !canSave || saving
            ? "cursor-not-allowed bg-[#E8E6F0] text-[#9B9A94]"
            : "bg-[#534AB7] text-white"
        }`}
      >
        {saving
          ? "Saving…"
          : submitLabel || (isEdit ? "Update obligation" : "Save obligation")}
      </button>
    </div>
  );
}
