"use client";

import {
  BILL_CATEGORIES,
  BILL_CATEGORY_GROUPS,
  BILL_FREQUENCIES,
  categoryFromTitle,
  MONTH_NAMES,
  REMIND_DAY_CHOICES,
  defaultRemindDaysFor,
  endMonthAfter,
  isAmountOptionalCategory,
  monthsLeftUntil,
  parseYmd,
} from "@/lib/billsCalendar";
import { useEffect, useRef, useState } from "react";

export type ObligationFormPayload = {
  title: string;
  category: string;
  amount: number;
  frequency: string;
  due_day: number | null;
  due_month: number | null;
  /** One-time only: YYYY-MM-DD. */
  due_date?: string | null;
  /** Last month it falls due (YYYY-MM-01); null = keeps going. */
  end_month?: string | null;
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
  /** Prefill for a new entry (not edit mode). */
  defaults?: Partial<ObligationFormPayload> | null;
  /** Words for the heading, e.g. "bill" on the Bills page. */
  noun?: string;
};

const TITLE_HINTS: Record<string, string> = {
  bill_electricity: "e.g. BESCOM electricity",
  bill_internet: "e.g. Airtel broadband",
  bill_mobile: "e.g. Jio postpaid",
  vehicle_puc: "e.g. Swift PUC",
  document_expiry: "e.g. Passport, driving licence",
  fd_maturity: "e.g. SBI FD maturity",
  school_fees: "e.g. Riya school fees",
  tax: "e.g. Advance tax instalment",
  property_tax: "e.g. BBMP property tax",
};

export default function AddObligationForm({
  onSave,
  onClose,
  initial,
  submitLabel,
  defaults,
  noun = "obligation",
}: Props) {
  const seed = initial ?? defaults ?? null;
  const [title, setTitle] = useState(seed?.title ?? "");
  const [category, setCategory] = useState(seed?.category ?? "loan_emi");
  const [categoryTouched, setCategoryTouched] = useState(
    initial?.category != null,
  );
  const [amount, setAmount] = useState(
    seed?.amount != null && seed.amount > 0 ? String(seed.amount) : "",
  );
  const [frequency, setFrequency] = useState(seed?.frequency ?? "monthly");
  const [dueDay, setDueDay] = useState(
    seed?.due_day != null ? String(seed.due_day) : "",
  );
  const [dueMonth, setDueMonth] = useState(
    seed?.due_month != null ? String(seed.due_month) : "",
  );
  const [dueDate, setDueDate] = useState(seed?.due_date ?? "");
  const [remindDays, setRemindDays] = useState<number>(
    seed?.remind_days_before ?? defaultRemindDaysFor(seed?.category),
  );
  const [remindTouched, setRemindTouched] = useState(
    seed?.remind_days_before != null,
  );
  const [monthsLeft, setMonthsLeft] = useState(() => {
    const n = monthsLeftUntil(seed?.end_month);
    return n != null && n > 0 ? String(n) : "";
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const categoryBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Bring the preselected category chip into view inside its scroll box.
    const box = categoryBox.current;
    const active = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (box && active)
      box.scrollTop = Math.max(0, active.offsetTop - box.offsetTop - 24);
  }, []);

  const amountOptional = isAmountOptionalCategory(category);
  const amountNum = amount ? parseFloat(amount) : 0;
  const hasAmount = Number.isFinite(amountNum) && amountNum > 0;
  const needsMonth = frequency === "yearly";
  const needsDate = frequency === "one_time";
  const showDayGrid = frequency !== "one_time";
  const showFirstMonth =
    frequency === "quarterly" || frequency === "half_yearly";
  const endMonth = needsDate ? null : endMonthAfter(Number(monthsLeft));
  const endDate = endMonth ? parseYmd(endMonth) : null;
  const canSave = Boolean(
    title.trim() &&
    (hasAmount || amountOptional) &&
    (!needsMonth || dueMonth) &&
    (!needsDate || dueDate),
  );

  const applyCategory = (value: string) => {
    setCategory(value);
    if (!remindTouched) setRemindDays(defaultRemindDaysFor(value));
  };

  const pickCategory = (value: string) => {
    setCategoryTouched(true);
    applyCategory(value);
  };

  // Until a chip is tapped, follow the title so "Car insurance" isn't a loan.
  const changeTitle = (value: string) => {
    setTitle(value);
    if (categoryTouched) return;
    const guess = categoryFromTitle(value) ?? defaults?.category ?? "loan_emi";
    if (guess !== category) applyCategory(guess);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        title: title.trim(),
        category,
        amount: hasAmount ? amountNum : 0,
        frequency,
        due_day: showDayGrid && dueDay ? parseInt(dueDay, 10) : null,
        due_month:
          (needsMonth || showFirstMonth) && dueMonth
            ? parseInt(dueMonth, 10)
            : null,
        due_date: needsDate ? dueDate || null : null,
        end_month: endMonth,
        source: "manual",
        is_active: true,
        remind_days_before: remindDays,
      });
    } catch (err) {
      console.error("obligation save failed:", err);
      setSaveError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) =>
    `rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
      active
        ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
        : "border-[#E8E6F0] bg-white text-[#5F5E5A]"
    }`;
  const label =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#9B9A94]";

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-[#111110]">
          {isEdit ? `Edit ${noun}` : `Add ${noun}`}
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
        <label className={label} htmlFor="obligation-title">
          What is it?
        </label>
        <input
          id="obligation-title"
          value={title}
          onChange={(e) => changeTitle(e.target.value)}
          placeholder={
            TITLE_HINTS[category] ?? "e.g. LIC Premium, HDFC Home Loan"
          }
          autoFocus
          className="box-border h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-3.5 text-[15px] outline-none"
        />
      </div>

      <div className="mb-3.5">
        <span className={label}>Category</span>
        <div
          ref={categoryBox}
          className="max-h-[220px] space-y-2.5 overflow-y-auto pr-1"
        >
          {BILL_CATEGORY_GROUPS.map((group) => {
            const items = BILL_CATEGORIES.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <div className="mb-1 text-[11px] font-semibold text-[#9B9A94]">
                  {group}
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={category === c.value}
                      onClick={() => pickCategory(c.value)}
                      className={`flex items-center gap-1 ${chip(category === c.value)}`}
                    >
                      <span aria-hidden>{c.emoji}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-3.5">
        <label className={label} htmlFor="obligation-amount">
          Amount (₹){amountOptional ? " · optional" : ""}
        </label>
        <input
          id="obligation-amount"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="box-border h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-3.5 text-base font-bold text-[#534AB7] outline-none"
        />
      </div>

      <div className="mb-3.5">
        <span className={label}>How often?</span>
        <div className="flex flex-wrap gap-2">
          {BILL_FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={frequency === f.value}
              onClick={() => setFrequency(f.value)}
              className={chip(frequency === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {needsMonth || showFirstMonth ? (
        <div className="mb-3.5">
          <label className={label} htmlFor="obligation-month">
            {needsMonth ? "Which month?" : "First due month"}
          </label>
          <select
            id="obligation-month"
            value={dueMonth}
            onChange={(e) => setDueMonth(e.target.value)}
            className="h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none"
          >
            <option value="">
              {needsMonth ? "Select month" : "Mar, Jun, Sep, Dec"}
            </option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {needsDate ? (
        <div className="mb-3.5">
          <label className={label} htmlFor="obligation-date">
            Due date
          </label>
          <input
            id="obligation-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="box-border h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none"
          />
        </div>
      ) : null}

      {showDayGrid ? (
        <div className="mb-3.5">
          <span className={label}>Due date (day of month)</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const active = dueDay === String(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={active}
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
      ) : null}

      {!needsDate ? (
        <div className="mb-3.5">
          <label htmlFor="obligation-months-left" className={label}>
            Months left · optional
          </label>
          <input
            id="obligation-months-left"
            type="text"
            inputMode="numeric"
            value={monthsLeft}
            onChange={(e) =>
              setMonthsLeft(e.target.value.replace(/\D/g, "").slice(0, 3))
            }
            placeholder="Keeps going"
            className="box-border h-[50px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-3.5 text-[15px] outline-none"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-[#5F5E5A]">
            {endDate
              ? `Last payment in ${MONTH_NAMES[endDate.getMonth()]} ${endDate.getFullYear()}, counting this month. Reminders stop after that.`
              : "For an RD, loan or anything with a fixed number of instalments. Leave empty if it doesn't end."}
          </p>
        </div>
      ) : null}

      <div className="mb-4">
        <span className={label}>Remind me</span>
        <div className="flex flex-wrap gap-2">
          {REMIND_DAY_CHOICES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={remindDays === d}
              onClick={() => {
                setRemindDays(d);
                setRemindTouched(true);
              }}
              className={chip(remindDays === d)}
            >
              {d === 1 ? "1 day" : `${d} days`} before
            </button>
          ))}
        </div>
      </div>

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
        {saving ? "Saving…" : submitLabel || (isEdit ? "Update" : "Save")}
      </button>
    </div>
  );
}
