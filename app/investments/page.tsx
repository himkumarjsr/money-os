"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { ButtonLink } from "@/components/ui/button";
import { formatIndian } from "@/lib/formatters";
import { useFinancialStore } from "@/store/financialStore";
import Link from "next/link";

function n(v: number | undefined | null) {
  return Math.max(0, Number(v ?? 0));
}

export default function InvestmentsPage() {
  const submission = useFinancialStore((s) => s.lastSubmission);

  const mf = n(submission?.mfValue);
  const fd = n(submission?.fdValue);
  const ppf = n(submission?.ppfBalance);
  const nps = n(submission?.npsBalance);
  const epf = n(submission?.epfBalance);
  const stocksIn = n(submission?.indianStocksValue);
  const stocksUs = n(submission?.usStocksValueINR);
  const usMf = n(submission?.usMFValueINR);
  const equity =
    n(submission?.totalEquityValue) > 0
      ? n(submission?.totalEquityValue)
      : stocksIn + stocksUs + usMf;

  const total = mf + fd + ppf + nps + epf + equity;

  return (
    <ProtectedGate>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-[#111110]">My Investments</h1>
        <p className="mt-2 text-sm text-[#5F5E5A]">Snapshot from your last financial analysis submission.</p>

        {!submission ? (
          <div className="mt-10 rounded-2xl border border-[#F0EFF8] bg-white px-6 py-14 text-center shadow-sm">
            <div className="text-4xl" aria-hidden>
              📈
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#111110]">No analysis yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#9B9A94]">
              Complete your financial analysis to see your mutual funds, FDs, PPF, equity and other holdings here.
            </p>
            <ButtonLink href="/analyse" variant="primary" className="mt-6 inline-flex bg-[#534AB7] text-white">
              Start analysis →
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3 rounded-2xl border border-[#F0EFF8] bg-white p-6 shadow-sm">
              <Row label="Mutual funds" value={mf} />
              <Row label="Fixed deposits" value={fd} />
              <Row label="PPF" value={ppf} />
              <Row label="NPS" value={nps} />
              <Row label="EPF / PF corpus" value={epf} />
              <Row label="Equity (stocks / RSU / blended)" value={equity} />
              <div className="border-t border-[#F0EFF8] pt-4">
                <div className="flex items-center justify-between text-base font-bold text-[#111110]">
                  <span>Estimated investment total</span>
                  <span>₹{formatIndian(total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[#EEEDFE] bg-[#EEEDFE]/40 p-6 text-center">
              <p className="text-sm font-semibold text-[#3C3489]">Portfolio analysis</p>
              <p className="mt-2 text-sm text-[#5F5E5A]">Deeper allocation insights and benchmarks are coming soon.</p>
              <button
                type="button"
                disabled
                className="mt-4 rounded-xl bg-[#534AB7]/40 px-5 py-2.5 text-sm font-bold text-white"
              >
                Notify me when live
              </button>
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-[#9B9A94]">
          Illustrative totals from your inputs — not live broker sync.{" "}
          <Link href="/portfolio" className="font-semibold text-[#534AB7]">
            Portfolio tracker
          </Link>
        </p>
      </main>
    </ProtectedGate>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#5F5E5A]">{label}</span>
      <span className="font-semibold text-[#111110]">₹{formatIndian(value)}</span>
    </div>
  );
}
