"use client";

import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  applyRenewalMonths,
  buildPremiumRdObligations,
  buildPremiumRdPlan,
  MONTH_NAMES,
  premiumRdHeadline,
  premiumRdLine,
} from "@/lib/premiumRdPlan";
import { saveAnalyseProfile } from "@/lib/saveAnalyseProfile";
import { useObligationStore } from "@/store/obligationStore";
import Link from "next/link";
import { useMemo, useState } from "react";

/** Save a renewal month picked here into the profile, so we never ask twice. */
function saveRenewalMonth(
  userId: string | undefined,
  profile: FinancialProfile,
  key: string,
  month: number,
) {
  void saveAnalyseProfile(
    userId,
    applyRenewalMonths(profile, { [key]: month }),
  );
}

/**
 * Suggests one RD (or savings, when a renewal is under 6 months away) for
 * yearly insurance premiums, and can add it to the tracker's obligations.
 */
export default function PremiumRdCard({
  profile,
  userId,
}: {
  profile: FinancialProfile;
  userId?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const plan = useMemo(() => buildPremiumRdPlan(profile), [profile]);
  const rows = useMemo(() => buildPremiumRdObligations(plan), [plan]);

  if (plan.items.length === 0 && plan.missing.length === 0) return null;

  const lines = premiumRdHeadline(plan);
  const afterRenewal = plan.items.reduce(
    (s, i) => s + i.afterRenewalMonthly,
    0,
  );
  const thisYear = plan.rdMonthly + plan.savingsMonthly;

  const add = async () => {
    if (!userId || rows.length === 0) return;
    setSaving(true);
    const error = await useObligationStore
      .getState()
      .saveAnalyseRdObligations(userId, rows);
    setSaving(false);
    setErrorDetail(error);
    setStatus(error ? "error" : "added");
  };

  return (
    <section className="rounded-2xl border border-[#DCD8F4] bg-white p-5">
      <h2 className="text-xl font-semibold">Get ready for yearly premiums</h2>
      {lines.map((line) => (
        <p
          key={line}
          className="mt-2 text-sm font-medium leading-relaxed text-[#454442]"
        >
          {line}
        </p>
      ))}

      {plan.items.length > 1 ? (
        <ul className="mt-3 space-y-1 rounded-xl bg-[#FAFAFE] p-3 text-[13px] font-medium text-[#454442]">
          {plan.items.map((item) => (
            <li key={item.key}>
              {premiumRdLine(item)}
              {item.mode === "savings" ? " (savings)" : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {thisYear > 0 && afterRenewal !== thisYear ? (
        <p className="mt-2 text-xs font-medium text-[#5F5E5A]">
          After each renewal, ₹{afterRenewal.toLocaleString("en-IN")} a month
          keeps next year&apos;s premiums ready.
        </p>
      ) : null}

      {plan.missing.length > 0 ? (
        <div className="mt-3 space-y-2">
          {plan.missing.map((m) => (
            <label
              key={m.key}
              className="flex flex-col gap-1 text-sm font-medium text-[#111110] sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                When does your {m.label} premium of ₹
                {m.premium.toLocaleString("en-IN")} renew?
              </span>
              <select
                className="h-10 rounded-lg border border-[#E8E6F0] bg-white px-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  const month = Number(e.target.value);
                  if (month >= 1 && month <= 12) {
                    saveRenewalMonth(userId, profile, m.key, month);
                    setStatus("idle");
                  }
                }}
              >
                <option value="" disabled>
                  Pick month
                </option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {status === "added" ? (
        <p className="mt-3 text-sm font-semibold text-[#1D9E75]">
          Added. You&apos;ll see it in your{" "}
          <Link href="/tracker" className="underline">
            Tracker checklist
          </Link>{" "}
          with reminders.
        </p>
      ) : userId && rows.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            disabled={saving || plan.missing.length > 0}
            onClick={() => void add()}
            className="rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Yes, add to my monthly obligations"}
          </button>
          {plan.missing.length > 0 ? (
            <p className="mt-1 text-xs text-[#5F5E5A]">
              Pick the renewal month above first.
            </p>
          ) : null}
          {status === "error" ? (
            <p className="mt-1 text-xs text-[#E24B4A]">
              Couldn&apos;t add it. Please try again.
              {errorDetail ? ` (${errorDetail})` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
