"use client";

import FieldTooltip from "@/components/ui/FieldTooltip";

const MONTHS = [
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
] as const;

export function MonthDaySelects({
  month,
  day,
  onMonth,
  onDay,
  hint,
  label,
}: {
  month?: number;
  day?: number;
  onMonth: (m: number | undefined) => void;
  onDay: (d: number | undefined) => void;
  hint?: string;
  label: string;
}) {
  return (
    <div className="mt-4 space-y-2">
      <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5F5E5A]">
        <span>{label}</span>
        {hint ? <FieldTooltip text={hint} /> : null}
      </label>
      <div className="flex gap-2.5">
        <select
          value={month || ""}
          onChange={(e) =>
            onMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)
          }
          className="h-12 flex-1 rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none"
        >
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={day || ""}
          onChange={(e) =>
            onDay(e.target.value ? parseInt(e.target.value, 10) : undefined)
          }
          className="h-12 w-[100px] rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none"
        >
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Calendar date picker; stores only day-of-month (1–31) for recurring EMI. */
export function DayOfMonthPicker({
  value,
  onChange,
  label,
  hint,
}: {
  value?: number;
  onChange: (day: number | undefined) => void;
  label: string;
  hint?: string;
}) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const dateValue =
    value && value >= 1 && value <= 31
      ? `${y}-${m}-${String(value).padStart(2, "0")}`
      : "";

  return (
    <div className="mt-3 space-y-2">
      <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5F5E5A]">
        <span>{label}</span>
        {hint ? <FieldTooltip text={hint} /> : null}
      </label>
      <input
        type="date"
        value={dateValue}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            onChange(undefined);
            return;
          }
          const day = Number(raw.split("-")[2] || 0);
          onChange(day >= 1 && day <= 31 ? day : undefined);
        }}
        className="h-12 w-full rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none focus:border-[#534AB7]"
      />
      {value ? (
        <p className="text-[12px] text-[#534AB7]">
          Debit day each month: <strong>{value}</strong>
        </p>
      ) : null}
    </div>
  );
}

/** Premium due date: day picker for monthly, month+day for yearly. */
export function PremiumDueFields({
  frequency,
  month,
  day,
  onMonth,
  onDay,
  monthlyLabel = "Which date is the premium debited? (optional)",
  yearlyLabel = "When is your premium due each year? (optional)",
  hint = "We'll remind you before the due date so you can keep the amount ready",
}: {
  frequency?: "monthly" | "yearly";
  month?: number;
  day?: number;
  onMonth: (m: number | undefined) => void;
  onDay: (d: number | undefined) => void;
  monthlyLabel?: string;
  yearlyLabel?: string;
  hint?: string;
}) {
  if (frequency === "yearly") {
    return (
      <MonthDaySelects
        label={yearlyLabel}
        hint={hint}
        month={month}
        day={day}
        onMonth={onMonth}
        onDay={onDay}
      />
    );
  }
  return (
    <DayOfMonthPicker
      label={monthlyLabel}
      hint={hint}
      value={day}
      onChange={onDay}
    />
  );
}
