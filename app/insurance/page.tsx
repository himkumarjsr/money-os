"use client";

import { ButtonLink } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

type ComparePrefill = {
  insurerName?: string;
  policyType?: string;
  coverAmount?: number;
  premiumAmount?: number;
  premiumFrequency?: string;
  planName?: string | null;
};

export default function InsuranceComparePage() {
  const [prefill, setPrefill] = useState<ComparePrefill | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("finkoin_compare_prefill");
      if (raw) setPrefill(JSON.parse(raw) as ComparePrefill);
    } catch {
      setPrefill(null);
    }
  }, []);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <Link href="/policies" className="text-sm text-[#534AB7] hover:underline">
          ← Back to policy vault
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Compare insurance plans</h1>
        <p className="mt-2 text-sm text-slate-600">
          This hub will match you to plans using your profile. Below is a snapshot from your vault request.
        </p>
      </div>

      {prefill ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Pre-filled from your policy</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>
              <span className="text-slate-500">Insurer:</span> {prefill.insurerName ?? "—"}
            </li>
            <li>
              <span className="text-slate-500">Type:</span> {prefill.policyType?.replace(/_/g, " ") ?? "—"}
            </li>
            {prefill.planName ? (
              <li>
                <span className="text-slate-500">Plan:</span> {prefill.planName}
              </li>
            ) : null}
            <li>
              <span className="text-slate-500">Cover (₹):</span>{" "}
              {prefill.coverAmount != null ? prefill.coverAmount.toLocaleString("en-IN") : "—"}
            </li>
            <li>
              <span className="text-slate-500">Premium:</span>{" "}
              {prefill.premiumAmount != null
                ? `₹${prefill.premiumAmount.toLocaleString("en-IN")} / ${prefill.premiumFrequency ?? "month"}`
                : "—"}
            </li>
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-dashed border-[#534AB7]/30 bg-[#F4F2FC]/50 p-6 text-center">
        <p className="text-sm text-slate-700">
          Full comparison engine and insurer APIs are coming next. For now, use your insurer renewal link from the vault
          or speak with a Finkoin advisor.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/policies" variant="primary">
            Return to policies
          </ButtonLink>
          <ButtonLink href="/analyse" variant="secondary">
            Update financial profile
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
