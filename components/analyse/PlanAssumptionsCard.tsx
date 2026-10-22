"use client";

import { useMemo } from "react";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  EQUITY_RETURN_OPTIONS,
  INFLATION_SHIFT_OPTIONS,
  assumptionChoices,
  planAssumptionRows,
  withAssumption,
} from "@/lib/planAssumptions";

function Pills<T extends string | number>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-[13px] font-semibold text-[#111110]">{label}</p>
      <div role="radiogroup" className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => !selected && onChange(o.value)}
              className={`min-h-[36px] rounded-full px-3 text-[13px] font-semibold disabled:opacity-60 ${
                selected
                  ? "bg-[#534AB7] text-white"
                  : "border border-[#DCD8F4] bg-white text-[#3C3489]"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "What we assumed": the plan's returns, inflation, tax and SIP raise, with the ones the user can change. */
export default function PlanAssumptionsCard({
  profile,
  saving,
  onChange,
}: {
  profile: FinancialProfile;
  saving?: boolean;
  onChange: (next: FinancialProfile) => void;
}) {
  const rows = useMemo(() => planAssumptionRows(profile), [profile]);
  const choice = assumptionChoices(profile);
  return (
    <div className="mt-4 rounded-xl border border-[#E8E6DF] bg-[#FAFAF7] p-4">
      <p className="text-sm font-semibold text-[#111110]">What we assumed</p>
      <p className="mt-0.5 text-[13px] font-medium text-[#5F5E5A]">
        Every amount above uses these numbers. Change one and the plan updates.
      </p>
      <dl className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="text-[13px] leading-snug">
            <dt className="font-semibold text-[#111110]">{r.label}</dt>
            <dd className="text-[#454442]">{r.value}</dd>
          </div>
        ))}
      </dl>
      <Pills
        label="Equity return to plan on"
        options={EQUITY_RETURN_OPTIONS.map((v) => ({
          value: v,
          label: v === 12 ? "12% (standard)" : `${v}%`,
        }))}
        value={choice.equityReturnPct}
        disabled={saving}
        onChange={(v) =>
          onChange(withAssumption(profile, { equityReturnPct: v }))
        }
      />
      <Pills
        label="How fast will costs rise?"
        options={INFLATION_SHIFT_OPTIONS}
        value={choice.inflationShiftPct}
        disabled={saving}
        onChange={(v) =>
          onChange(withAssumption(profile, { inflationShiftPct: v }))
        }
      />
      <Pills
        label="Raise your SIPs every year?"
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No, keep them flat" },
        ]}
        value={choice.raisesSips ? "yes" : "no"}
        disabled={saving}
        onChange={(v) =>
          onChange(withAssumption(profile, { raisesSips: v === "yes" }))
        }
      />
    </div>
  );
}
