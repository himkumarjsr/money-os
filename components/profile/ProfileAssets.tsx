"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import PrivateAmount from "@/components/ui/PrivateAmount";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import { formatIndian } from "@/lib/formatters";

type LineItem = {
  id: string;
  label: string;
  amount: number;
  icon: AppIconName;
  href?: string;
};

function n(v: number | undefined | null) {
  return Math.max(0, Number(v ?? 0));
}

function money(v: number) {
  return `₹${formatIndian(Math.round(v))}`;
}

function buildCashItems(p: FinancialProfile): LineItem[] {
  const rows: LineItem[] = [
    {
      id: "savings",
      label: "Bank / savings account",
      amount: n(p.savingsAccountBalance),
      icon: "bank",
      href: "/analyse",
    },
    {
      id: "liquid-mf",
      label: "Liquid mutual funds",
      amount: n(p.liquidMFValue),
      icon: "wallet",
      href: "/analyse",
    },
    {
      id: "other-liquid",
      label: "Other liquid savings",
      amount: n(p.otherLiquidSavings),
      icon: "rupee",
      href: "/analyse",
    },
  ];
  // Legacy emergency only if still present and not already counted elsewhere
  const emergency = n(p.emergencyFundCurrent);
  if (emergency > 0) {
    rows.push({
      id: "emergency-legacy",
      label: "Emergency fund (legacy)",
      amount: emergency,
      icon: "lifebuoy",
      href: "/analyse",
    });
  }
  return rows;
}

function buildInvestmentItems(p: FinancialProfile): LineItem[] {
  const stocksIn = n(p.indianStocksValue);
  const stocksUs = n(p.usStocksValueINR);
  const usMf = n(p.usMFValueINR);
  const rsu = n(p.rsuValueINR);
  const blended = n(p.totalEquityValue);
  const equity = blended > 0 ? blended : stocksIn + stocksUs + usMf + rsu;

  const rows: LineItem[] = [
    {
      id: "mf",
      label: "Mutual funds",
      amount: n(p.mfValue),
      icon: "trending",
      href: "/investments",
    },
    {
      id: "equity",
      label: "Equity / stocks / RSU",
      amount: equity,
      icon: "chart",
      href: "/investments",
    },
    {
      id: "fd",
      label: "Fixed deposits",
      amount: n(p.fdValue),
      icon: "bank",
      href: "/investments",
    },
    {
      id: "ppf",
      label: "PPF",
      amount: n(p.ppfBalance),
      icon: "briefcase",
      href: "/investments",
    },
    {
      id: "epf",
      label: "EPF / PF",
      amount: n(p.epfBalance),
      icon: "briefcase",
      href: "/investments",
    },
    {
      id: "nps",
      label: "NPS",
      amount: n(p.npsBalance),
      icon: "target",
      href: "/investments",
    },
    {
      id: "gold",
      label: "Gold",
      amount: n(p.goldValue),
      icon: "coin",
      href: "/analyse",
    },
  ];

  for (const [i, c] of Array.from((p.customInvestments ?? []).entries())) {
    const amt = n(c.currentValue);
    if (amt <= 0 && !(c.label ?? "").trim()) continue;
    rows.push({
      id: `custom-${i}`,
      label: c.label?.trim() || "Custom investment",
      amount: amt,
      icon: "sparkle",
      href: "/analyse",
    });
  }

  return rows;
}

function buildPhysicalAssetItems(p: FinancialProfile): LineItem[] {
  const rows: LineItem[] = [];
  if (p.ownsHome || n(p.homeMarketValue) > 0) {
    rows.push({
      id: "home",
      label: "Home / property",
      amount: n(p.homeMarketValue),
      icon: "home",
      href: "/analyse",
    });
  }
  if (p.ownsCar || n(p.carMarketValue) > 0) {
    rows.push({
      id: "car",
      label: "Car / vehicle",
      amount: n(p.carMarketValue),
      icon: "wallet",
      href: "/analyse",
    });
  }
  if (n(p.otherAssets) > 0) {
    rows.push({
      id: "other-assets",
      label: p.otherAssetLabel?.trim() || "Other assets",
      amount: n(p.otherAssets),
      icon: "briefcase",
      href: "/analyse",
    });
  }
  return rows;
}

function loanLabel(type: string): string {
  const map: Record<string, string> = {
    home_loan: "Home loan",
    personal_loan: "Personal loan",
    car_loan: "Car loan",
    bike_loan: "Bike loan",
    education_loan: "Education loan",
    pf_loan: "PF loan",
    overdraft: "Overdraft",
    gold_loan: "Gold loan",
    business_loan: "Business loan",
    credit_card: "Credit card",
    other: "Other loan",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

function buildLiabilityItems(p: FinancialProfile): LineItem[] {
  const rows: LineItem[] = [];
  const seen = new Set<string>();

  const push = (item: LineItem) => {
    if (item.amount <= 0) return;
    if (seen.has(item.id)) return;
    seen.add(item.id);
    rows.push(item);
  };

  // Prefer unified loans as source of truth when present
  const unified = p.unifiedLoans ?? [];
  if (unified.length > 0) {
    for (const [i, loan] of Array.from(unified.entries())) {
      const outstanding = n(loan.outstandingAmount);
      const odUsed = n(loan.odUsed);
      const amt =
        loan.loanType === "overdraft"
          ? odUsed || outstanding
          : outstanding || n(loan.monthlyEMI) * 24;
      const name = loan.lenderName?.trim();
      push({
        id: `unified-${loan.id ?? i}`,
        label: name
          ? `${loanLabel(loan.loanType)} · ${name}`
          : loanLabel(loan.loanType),
        amount: amt,
        icon: loan.loanType === "credit_card" ? "card" : "bank",
        href: "/analyse",
      });
    }
    return rows;
  }

  push({
    id: "home-loan",
    label: p.homeLoanLenderName
      ? `Home loan · ${p.homeLoanLenderName}`
      : "Home loan",
    amount: n(p.homeLoanOutstanding),
    icon: "home",
    href: "/analyse",
  });
  push({
    id: "car-loan",
    label: "Car loan",
    amount: n(p.carLoanOutstanding),
    icon: "wallet",
    href: "/analyse",
  });
  push({
    id: "bike-loan",
    label: "Bike loan",
    amount: n(p.bikeOutstanding),
    icon: "wallet",
    href: "/analyse",
  });
  push({
    id: "personal-loan",
    label: p.personalLoanLenderName
      ? `Personal loan · ${p.personalLoanLenderName}`
      : "Personal loan",
    amount:
      n(p.personalLoanOutstanding) ||
      (n(p.personalLoanEMI) > 0 ? n(p.personalLoanEMI) * 24 : 0),
    icon: "bank",
    href: "/analyse",
  });
  push({
    id: "cc",
    label: "Credit card (est. outstanding)",
    amount: n(p.creditCardBillMonthly) * 3,
    icon: "card",
    href: "/analyse",
  });

  for (const [i, o] of Array.from((p.additionalObligations ?? []).entries())) {
    const amt = n(o.outstandingAmount) || n(o.monthlyAmount) * 24;
    push({
      id: `obl-${o.id ?? i}`,
      label: o.lenderName
        ? `${o.type} · ${o.lenderName}`
        : o.type || "Obligation",
      amount: amt,
      icon: "alert",
      href: "/analyse",
    });
  }

  return rows;
}

function SectionCard({
  title,
  icon,
  total,
  items,
  emptyHint,
  accent = "#534AB7",
  defaultOpen = false,
}: {
  title: string;
  icon: AppIconName;
  total: number;
  items: LineItem[];
  emptyHint: string;
  accent?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const withData = items.filter((i) => i.amount > 0);
  const emptySlots = items.filter((i) => i.amount <= 0).slice(0, 4);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${accent}14` }}
          >
            <AppIcon name={icon} size={20} color={accent} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#111110]">{title}</div>
            <div className="text-xs text-[#9B9A94]">
              {withData.length > 0
                ? `${withData.length} item${withData.length === 1 ? "" : "s"}`
                : "Nothing added yet"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PrivateAmount value={total} label={title}>
            <span
              className="text-sm font-extrabold"
              style={{ color: accent === "#E24B4A" ? "#E24B4A" : "#111110" }}
            >
              {money(total)}
            </span>
          </PrivateAmount>
          <span
            className="text-[#534AB7] transition-transform"
            style={{ transform: open ? "rotate(180deg)" : undefined }}
            aria-hidden
          >
            ⌄
          </span>
        </div>
      </button>

      {open ? (
        <div className="border-t border-[#F0EFF8] px-4 pb-4 pt-2 sm:px-5">
          {withData.length === 0 ? (
            <p className="mb-3 text-sm text-[#5F5E5A]">{emptyHint}</p>
          ) : null}

          <ul className="space-y-2">
            {withData.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#F0EFF8] bg-[#FAFAFE] px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AppIcon name={item.icon} size={16} color="#534AB7" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#111110]">
                      {item.label}
                    </div>
                    <div className="text-[11px] font-medium text-[#9B9A94]">
                      Synced from your analysis
                    </div>
                  </div>
                </div>
                <PrivateAmount value={item.amount} label={item.label}>
                  <span className="text-sm font-bold text-[#111110]">
                    {money(item.amount)}
                  </span>
                </PrivateAmount>
              </li>
            ))}

            {emptySlots.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href || "/analyse"}
                  className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#E8E6F0] px-3 py-3 text-sm transition hover:border-[#534AB7] hover:bg-[#EEEDFE]/40"
                >
                  <span className="flex items-center gap-2.5 text-[#5F5E5A]">
                    <AppIcon name={item.icon} size={16} color="#9B9A94" />
                    {item.label}
                  </span>
                  <span className="font-bold text-[#534AB7]">Add</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/analyse"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#534AB7] px-3 py-2 text-xs font-bold text-white"
            >
              <AppIcon name="pencil" size={12} color="#FFFFFF" />
              Update in analysis
            </Link>
            {title === "Investments" ? (
              <Link
                href="/investments"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E6F0] bg-white px-3 py-2 text-xs font-bold text-[#534AB7]"
              >
                View investments
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProfileAssets({
  profile,
  analysis,
}: {
  profile: FinancialProfile | null;
  analysis: AnalysisResult | null;
}) {
  const cashItems = useMemo(
    () => (profile ? buildCashItems(profile) : []),
    [profile],
  );
  const investmentItems = useMemo(
    () => (profile ? buildInvestmentItems(profile) : []),
    [profile],
  );
  const physicalItems = useMemo(
    () => (profile ? buildPhysicalAssetItems(profile) : []),
    [profile],
  );
  const liabilityItems = useMemo(
    () => (profile ? buildLiabilityItems(profile) : []),
    [profile],
  );

  const cashTotal = cashItems.reduce((s, i) => s + i.amount, 0);
  const investmentTotal = investmentItems.reduce((s, i) => s + i.amount, 0);
  const physicalTotal = physicalItems.reduce((s, i) => s + i.amount, 0);
  const liabilityTotalFromLines = liabilityItems.reduce(
    (s, i) => s + i.amount,
    0,
  );

  const totalAssets =
    analysis?.totalAssets ?? cashTotal + investmentTotal + physicalTotal;
  const totalLiabilities =
    analysis?.totalLiabilities ?? liabilityTotalFromLines;
  const netWorth = analysis?.netWorth ?? totalAssets - totalLiabilities;

  if (!profile) {
    return (
      <section className="rounded-2xl border border-[#E8E6F0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEEDFE]">
            <AppIcon name="wallet" size={22} color="#534AB7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#111110]">Assets</h2>
            <p className="text-xs text-[#9B9A94]">
              Investments · Cash · Liabilities
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[#5F5E5A]">
          Complete your financial analysis once — we&apos;ll sync bank balance,
          investments, and loans here automatically.
        </p>
        <Link
          href="/analyse"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#534AB7] px-4 py-2.5 text-sm font-bold text-white"
        >
          Start analysis →
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-[#534AB7] p-5 text-white shadow-[0_14px_40px_rgba(83,74,183,0.25)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
              Your assets
            </p>
            <p className="mt-1 text-sm text-white/80">
              Synced from your last analysis
            </p>
          </div>
          <AppIcon name="wallet" size={22} color="#FFFFFF" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <div className="text-[11px] font-semibold text-white/75">
              Net worth
            </div>
            <div className="mt-1">
              <PrivateAmount
                value={Math.abs(netWorth)}
                label="Net worth"
                eyeColor="#FFFFFF"
              >
                <span
                  className={`text-lg font-extrabold ${netWorth < 0 ? "text-[#FFB4B4]" : "text-white"}`}
                >
                  {netWorth < 0 ? "−" : ""}
                  {money(Math.abs(netWorth))}
                </span>
              </PrivateAmount>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <div className="text-[11px] font-semibold text-white/75">
              Total assets
            </div>
            <div className="mt-1">
              <PrivateAmount
                value={totalAssets}
                label="Total assets"
                eyeColor="#FFFFFF"
              >
                <span className="text-lg font-extrabold text-white">
                  {money(totalAssets)}
                </span>
              </PrivateAmount>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
            <div className="text-[11px] font-semibold text-white/75">
              Liabilities
            </div>
            <div className="mt-1">
              <PrivateAmount
                value={totalLiabilities}
                label="Liabilities"
                eyeColor="#FFFFFF"
              >
                <span className="text-lg font-extrabold text-white">
                  {money(totalLiabilities)}
                </span>
              </PrivateAmount>
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Available cash"
        icon="wallet"
        total={cashTotal}
        items={cashItems}
        emptyHint="Add your bank balance and liquid funds in the analysis form."
        defaultOpen
      />
      <SectionCard
        title="Investments"
        icon="trending"
        total={investmentTotal}
        items={investmentItems}
        emptyHint="Add mutual funds, FDs, PPF, EPF, equity and more in analysis."
        defaultOpen
      />
      {physicalItems.length > 0 || physicalTotal > 0 ? (
        <SectionCard
          title="Other assets"
          icon="home"
          total={physicalTotal}
          items={
            physicalItems.length > 0
              ? physicalItems
              : [
                  {
                    id: "home",
                    label: "Home / property",
                    amount: 0,
                    icon: "home",
                    href: "/analyse",
                  },
                ]
          }
          emptyHint="Add home, car or other tangible assets in analysis."
        />
      ) : (
        <SectionCard
          title="Other assets"
          icon="home"
          total={0}
          items={[
            {
              id: "home",
              label: "Home / property",
              amount: 0,
              icon: "home",
              href: "/analyse",
            },
            {
              id: "car",
              label: "Car / vehicle",
              amount: 0,
              icon: "wallet",
              href: "/analyse",
            },
            {
              id: "gold",
              label: "Gold",
              amount: 0,
              icon: "coin",
              href: "/analyse",
            },
          ]}
          emptyHint="Add home, car or other tangible assets in analysis."
        />
      )}
      <SectionCard
        title="Liabilities"
        icon="card"
        total={totalLiabilities}
        items={
          liabilityItems.length > 0
            ? liabilityItems
            : [
                {
                  id: "home-loan",
                  label: "Home loan",
                  amount: 0,
                  icon: "home",
                  href: "/analyse",
                },
                {
                  id: "personal-loan",
                  label: "Personal loan",
                  amount: 0,
                  icon: "bank",
                  href: "/analyse",
                },
                {
                  id: "cc",
                  label: "Credit card",
                  amount: 0,
                  icon: "card",
                  href: "/analyse",
                },
              ]
        }
        emptyHint="Add loans and credit card dues in the analysis form."
        accent="#E24B4A"
      />

      <p className="px-1 text-center text-[11px] text-[#9B9A94]">
        Figures sync from your last analysis — not live broker/bank feeds.{" "}
        <Link href="/analyse" className="font-semibold text-[#534AB7]">
          Update analysis
        </Link>
      </p>
    </section>
  );
}
