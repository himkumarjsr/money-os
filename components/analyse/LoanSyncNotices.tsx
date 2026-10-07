"use client";

import { LOAN_DRIFT_LABELS } from "@/lib/fixPlanMerge";
import { loanObligationTitle } from "@/lib/loanObligationSync";
import type { LoanReportStatus } from "@/store/obligationStore";
import Link from "next/link";
import { useState } from "react";

type Details = { outstandingAmount?: number; interestRate?: number } | "skip";

type Props = {
  status: LoanReportStatus | null;
  onSaveDetails: (loanId: string, details: Details) => Promise<boolean>;
};

export function formatDataAsOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const digits = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

function LoanDetailsForm({
  loan,
  onSave,
}: {
  loan: LoanReportStatus["needDetails"][number];
  onSave: Props["onSaveDetails"];
}) {
  const [outstanding, setOutstanding] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = loanObligationTitle(loan).replace(/ EMI\b/, "");
  const submit = async (details: Details) => {
    if (details !== "skip" && !(details.outstandingAmount && details.outstandingAmount > 0)) {
      setError("Enter the outstanding balance, or skip for now.");
      return;
    }
    setBusy(true);
    setError("");
    const ok = await onSave(String(loan.id), details);
    setBusy(false);
    if (!ok) setError("Couldn't save. Please try again.");
  };
  return (
    <div className="rounded-xl border border-[#E8E6F0] bg-white p-3">
      <p className="text-sm font-semibold text-[#111110]">
        {name} · ₹{Number(loan.monthlyEMI || 0).toLocaleString("en-IN")}/mo
      </p>
      <p className="mt-1 text-xs text-[#5F5E5A]">
        Added from Tracker. Two details make its payoff date and interest saved
        exact instead of estimated.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-[#5F5E5A]">
          Outstanding balance (₹)
          <input
            inputMode="numeric"
            value={outstanding}
            onChange={(e) => setOutstanding(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E8E6F0] px-3 text-base"
            placeholder="e.g. 38,000"
          />
        </label>
        <label className="text-xs text-[#5F5E5A]">
          Interest rate (% a year)
          <input
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E8E6F0] px-3 text-base"
            placeholder="e.g. 14 (0 if interest-free)"
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-xs text-[#E24B4A]">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void submit({
              outstandingAmount: digits(outstanding),
              interestRate: digits(rate),
            })
          }
          className="min-h-[44px] rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("skip")}
          className="min-h-[44px] rounded-lg px-4 text-sm font-semibold text-[#534AB7]"
        >
          Skip — keep estimate
        </button>
      </div>
    </div>
  );
}

/** "Data as of", Tracker drift warning, and the one-time ask for imported loans. */
export default function LoanSyncNotices({ status, onSaveDetails }: Props) {
  if (!status) return null;
  const asOf = formatDataAsOf(status.submittedAt);
  return (
    <>
      {asOf ? (
        <p className="text-xs text-[#7A7871]">Numbers as of {asOf}</p>
      ) : null}
      {status.drift.length > 0 ? (
        <section className="rounded-2xl border border-[#F1D9A6] bg-[#FFF8E6] p-4">
          <h3 className="text-sm font-semibold text-[#7A5A12]">
            Your loans changed in Tracker
          </h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-[#7A5A12]">
            {status.drift.map((d, i) => (
              <li key={`${d.label}-${i}`}>
                {d.label} — {LOAN_DRIFT_LABELS[d.kind]}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[#7A5A12]">
            EMI totals, surplus and the debt plan below still use the old loans.
          </p>
          <Link
            href="/analyse"
            className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#534AB7]"
          >
            Update your Loans step →
          </Link>
        </section>
      ) : null}
      {status.needDetails.length > 0 ? (
        <section className="space-y-2 rounded-2xl bg-[#F7F6FE] p-4">
          <h3 className="text-sm font-semibold text-[#534AB7]">
            Finish {status.needDetails.length === 1 ? "a loan" : "loans"} from Tracker
          </h3>
          {status.needDetails.map((loan) => (
            <LoanDetailsForm
              key={String(loan.id)}
              loan={loan}
              onSave={onSaveDetails}
            />
          ))}
        </section>
      ) : null}
    </>
  );
}
