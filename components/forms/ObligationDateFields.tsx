"use client";

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

const COMMON_DAYS = [1, 2, 3, 5, 7, 10, 15, 20, 25, 28] as const;

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
      <label className="block text-sm font-semibold text-[#5F5E5A]">
        {label}
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
      {hint ? <p className="text-[11px] text-[#9B9A94]">{hint}</p> : null}
    </div>
  );
}

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
  const isOther =
    value != null &&
    value > 0 &&
    !(COMMON_DAYS as readonly number[]).includes(value);

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-sm font-semibold text-[#5F5E5A]">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {COMMON_DAYS.map((day) => {
          const active = value === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day)}
              className={`h-12 w-12 rounded-xl border-[1.5px] text-sm font-semibold transition ${
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
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#9B9A94]">Other day</span>
        <input
          type="number"
          min={1}
          max={31}
          inputMode="numeric"
          placeholder="1–31"
          value={isOther ? value : ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (!raw) {
              onChange(undefined);
              return;
            }
            const n = Math.min(31, Math.max(1, parseInt(raw, 10) || 0));
            onChange(n || undefined);
          }}
          className={`h-12 w-24 rounded-xl border-[1.5px] px-3 text-sm font-semibold outline-none ${
            isOther
              ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
              : "border-[#E8E6F0] bg-white text-[#5F5E5A]"
          }`}
        />
      </div>
      {hint ? <p className="text-[11px] text-[#9B9A94]">{hint}</p> : null}
    </div>
  );
}
