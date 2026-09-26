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

/** Recurring EMI debit: month + day only (no year). */
export function DayOfMonthPicker({
  value,
  onChange,
  month,
  onMonth,
  label,
  hint,
}: {
  value?: number;
  onChange: (day: number | undefined) => void;
  month?: number;
  onMonth?: (m: number | undefined) => void;
  label: string;
  hint?: string;
}) {
  return (
    <MonthDaySelects
      label={label}
      hint={hint}
      month={month}
      day={value}
      onMonth={(m) => onMonth?.(m)}
      onDay={onChange}
    />
  );
}

const YEAR_SELECT_CLASS =
  "h-12 w-full min-w-0 rounded-xl border-[1.5px] border-[#E8E6F0] bg-white px-3.5 text-[15px] text-[#111110] outline-none focus:border-[#534AB7]";

/** Year dropdown (no free-typed rounding). */
export function YearSelect({
  label,
  value,
  onChange,
  helper,
  minYear,
  maxYear,
  placeholder = "Select year",
}: {
  label: string;
  value?: number;
  onChange: (year: number) => void;
  helper?: string;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
}) {
  const now = new Date().getFullYear();
  const min = minYear ?? now;
  const max = maxYear ?? now + 40;
  const years: number[] = [];
  for (let y = min; y <= max; y += 1) years.push(y);

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5F5E5A]">
        <span>{label}</span>
        {helper ? <FieldTooltip text={helper} /> : null}
      </label>
      <select
        value={value && value >= min && value <= max ? value : ""}
        onChange={(e) =>
          onChange(e.target.value ? parseInt(e.target.value, 10) : 0)
        }
        className={YEAR_SELECT_CLASS}
      >
        <option value="">{placeholder}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
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
      month={month}
      onMonth={onMonth}
    />
  );
}
