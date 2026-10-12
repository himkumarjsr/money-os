"use client";

import type { BillingPeriod } from "@/lib/planPricing";

const OPTIONS: Array<{ id: BillingPeriod; label: string }> = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

/** Monthly / Yearly switch for the Plans page and the home Pricing section. */
export function BillingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (next: BillingPeriod) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Billing period"
      className="mx-auto inline-flex rounded-xl border border-slate-200 bg-white p-1"
    >
      {OPTIONS.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold ${
              on ? "bg-[#534AB7] text-white" : "text-slate-600"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
