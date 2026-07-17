"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/ui/AppIcon";
import { useAuthStore } from "@/store/authStore";
import { usePortfolioStore, type PortfolioFund } from "@/store/portfolioStore";
import { useGamificationStore } from "@/store/gamificationStore";

const fallbackFunds: PortfolioFund[] = [
  {
    name: "HDFC Flexi Cap Fund",
    invested: 400000,
    value: 515000,
    xirr: 14.2,
    verdict: "CONTINUE",
    reason: "Strong and consistent risk-adjusted returns.",
  },
  {
    name: "Axis Bluechip Fund",
    invested: 300000,
    value: 312000,
    xirr: 6.8,
    verdict: "WATCH",
    reason: "Underperformance in recent cycles, monitor for 2 quarters.",
  },
  {
    name: "Old Midcap Opportunities",
    invested: 220000,
    value: 205000,
    xirr: 3.1,
    verdict: "SWITCH",
    reason: "High expense and weak alpha vs peers.",
  },
  {
    name: "Sectoral Infra Fund",
    invested: 150000,
    value: 128000,
    xirr: -2.2,
    verdict: "STOP",
    reason: "Concentrated thematic risk and prolonged drawdown.",
  },
  {
    name: "Nifty 50 Index Fund",
    invested: 280000,
    value: 335000,
    xirr: 11.6,
    verdict: "CONTINUE",
    reason: "Low cost core exposure is performing on mandate.",
  },
];

export default function PortfolioPage() {
  const tier = useAuthStore((s) => s.user?.subscriptionTier ?? "free");
  const setLastAnalysis = usePortfolioStore((s) => s.setLastAnalysis);
  const lastAnalysis = usePortfolioStore((s) => s.lastAnalysis);
  const awardBadge = useGamificationStore((s) => s.awardBadge);
  const hasEarnedAction = useGamificationStore((s) => s.hasEarnedAction);
  const markEarnedAction = useGamificationStore((s) => s.markEarnedAction);

  const [folio, setFolio] = useState("");
  const [pan, setPan] = useState("");
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    if (!lastAnalysis) return null;
    return {
      gain: lastAnalysis.currentValue - lastAnalysis.totalInvested,
    };
  }, [lastAnalysis]);

  if (tier === "free" || tier === "pro") {
    return (
      <div className="min-h-dvh bg-white px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 p-6">
          <AppIcon name="lock" size={28} color="#534AB7" />
          <h1 className="mt-2 text-2xl font-semibold">MF Portfolio Analysis</h1>
          <p className="mt-2 text-slate-600">
            Available in Pro Max — ₹99/month
          </p>
          <Link
            href="/plans"
            className="mt-6 inline-flex rounded-xl bg-[#534AB7] px-4 py-2 font-semibold text-white"
          >
            Upgrade to Pro Max
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold">MF Portfolio Analysis</h1>
        <div className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder="CAMS Folio Number"
              className="min-h-11 rounded-xl border border-slate-200 px-3"
            />
            <input
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="PAN Number"
              className="min-h-11 rounded-xl border border-slate-200 px-3"
            />
          </div>
          <button
            type="button"
            disabled={!folio || !pan || loading}
            onClick={async () => {
              setLoading(true);
              const funds = fallbackFunds;
              const totalInvested = funds.reduce(
                (sum, f) => sum + f.invested,
                0,
              );
              const currentValue = funds.reduce((sum, f) => sum + f.value, 0);
              const xirr = Number(
                ((currentValue / totalInvested - 1) * 100).toFixed(2),
              );
              setLastAnalysis({ totalInvested, currentValue, xirr, funds });
              if (!hasEarnedAction("portfolio-analysis")) {
                awardBadge("portfolio-pro");
                markEarnedAction("portfolio-analysis");
              }
              setLoading(false);
            }}
            className="mt-4 rounded-xl bg-[#534AB7] px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Analysing..." : "Analyse my portfolio →"}
          </button>
        </div>

        {lastAnalysis ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="text-lg font-semibold">Portfolio summary</h2>
              <p className="mt-2 text-sm text-slate-700">
                Invested: ₹
                {Math.round(lastAnalysis.totalInvested).toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-slate-700">
                Current value: ₹
                {Math.round(lastAnalysis.currentValue).toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-slate-700">
                XIRR: {lastAnalysis.xirr}%
              </p>
              {totals ? (
                <p className="text-sm text-slate-700">
                  Gain/Loss: ₹{Math.round(totals.gain).toLocaleString("en-IN")}
                </p>
              ) : null}
            </div>
            {lastAnalysis.funds.map((fund) => (
              <article
                key={fund.name}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{fund.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                    {fund.verdict}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{fund.reason}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
