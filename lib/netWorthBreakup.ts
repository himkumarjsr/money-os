import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { existingEquityValue } from "@/lib/financialEngine";
import { postOfficeHoldingsValue } from "@/lib/postOfficeHoldings";

/**
 * Line-by-line breakup behind the Net worth / Total assets / Liabilities
 * figures on the profile "Your assets" card. Mirrors the asset and liability
 * maths in `financialEngine` (totalAssets / totalLoanLiabilities) so the rows
 * add up to the headline numbers. Keep in sync with mobile/lib/netWorthBreakup.ts.
 */

export type BreakupRow = { id: string; label: string; amount: number };
export type BreakupGroup = {
  id: string;
  label: string;
  total: number;
  rows: BreakupRow[];
};
export type NetWorthBreakup = {
  assets: BreakupGroup[];
  liabilities: BreakupGroup[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

function n(v: number | undefined | null) {
  return Math.max(0, Number(v ?? 0) || 0);
}

function loanTypeLabel(type: string) {
  if (type === "credit_card") return "Credit card";
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function group(id: string, label: string, rows: BreakupRow[]): BreakupGroup {
  const kept = rows.filter((r) => Math.round(r.amount) !== 0);
  return {
    id,
    label,
    rows: kept,
    total: kept.reduce((s, r) => s + r.amount, 0),
  };
}

/** Adds a reconciling row when the shown total (e.g. from the last analysis) differs from the itemised sum. */
function reconcile(
  groups: BreakupGroup[],
  shownTotal: number | undefined,
  label: string,
): BreakupGroup[] {
  const sum = groups.reduce((s, g) => s + g.total, 0);
  if (shownTotal == null || !Number.isFinite(shownTotal)) return groups;
  const diff = shownTotal - sum;
  if (Math.abs(diff) < 1) return groups;
  return [
    ...groups,
    group("other", label, [{ id: "other", label, amount: diff }]),
  ];
}

export function buildNetWorthBreakup(
  p: FinancialProfile,
  shown?: { totalAssets?: number; totalLiabilities?: number },
): NetWorthBreakup {
  const ext = p as FinancialProfile & {
    hasPostOfficeSchemes?: boolean;
    postOfficeSchemes?: Array<{ amount?: number; schemeType?: string }>;
  };

  // ── Assets ──────────────────────────────────────────────────────────
  const blendedEquity = n(p.totalEquityValue) > 0;
  const poRows: BreakupRow[] =
    ext.hasPostOfficeSchemes && (ext.postOfficeSchemes?.length ?? 0) > 0
      ? [
          {
            id: "post-office",
            label: "Post office schemes",
            amount: postOfficeHoldingsValue(p.postOfficeSchemes),
          },
        ]
      : [{ id: "nsc", label: "NSC", amount: n(p.nscDepositAmount) }];

  const custom = (p.customInvestments ?? []).map((c, i) => ({
    id: `custom-${i}`,
    label: c.label?.trim() || "Other investment",
    amount: n(c.currentValue),
  }));

  let assets: BreakupGroup[] = [
    group("cash", "Available cash", [
      {
        id: "savings",
        label: "Bank / savings account",
        amount: n(p.savingsAccountBalance),
      },
      {
        id: "liquid-mf",
        label: "Liquid mutual funds",
        amount: n(p.liquidMFValue),
      },
      {
        id: "other-liquid",
        label: "Other liquid savings",
        amount: n(p.otherLiquidSavings),
      },
      {
        id: "emergency",
        label: "Emergency fund",
        amount: n(p.emergencyFundCurrent),
      },
    ]),
    group("investments", "Investments", [
      { id: "fd", label: "Fixed deposits", amount: n(p.fdValue) },
      { id: "mf", label: "Mutual funds", amount: n(p.mfValue) },
      {
        id: "equity",
        label: "Equity / stocks / RSU",
        amount: blendedEquity
          ? Math.max(
              0,
              existingEquityValue(p) -
                n(p.mfValue) -
                n(p.indianStocksValue) -
                n(p.usStocksValueINR) -
                n(p.usMFValueINR) -
                n(p.rsuValueINR),
            )
          : 0,
      },
      {
        id: "stocks-in",
        label: "Indian stocks",
        amount: n(p.indianStocksValue),
      },
      { id: "stocks-us", label: "US stocks", amount: n(p.usStocksValueINR) },
      { id: "us-mf", label: "US mutual funds", amount: n(p.usMFValueINR) },
      { id: "rsu", label: "RSU / ESOP", amount: n(p.rsuValueINR) },
      { id: "ppf", label: "PPF", amount: n(p.ppfBalance) },
      { id: "epf", label: "EPF", amount: n(p.epfBalance) },
      { id: "nps", label: "NPS", amount: n(p.npsBalance) },
      ...poRows,
      ...custom,
    ]),
    group("physical", "Other assets", [
      { id: "home", label: "Home / property", amount: n(p.homeMarketValue) },
      { id: "car", label: "Car / vehicle", amount: n(p.carMarketValue) },
      { id: "gold", label: "Gold", amount: n(p.goldValue) },
      {
        id: "other-assets",
        label: p.otherAssetLabel?.trim() || "Other assets",
        amount: n(p.otherAssets),
      },
    ]),
  ].filter((g) => g.rows.length > 0);
  assets = reconcile(assets, shown?.totalAssets, "Other / not itemised");

  // ── Liabilities ─────────────────────────────────────────────────────
  const creditRows: BreakupRow[] = [
    {
      id: "cc-bill",
      label: "Credit card (3× monthly bill)",
      amount: n(p.creditCardBillMonthly) * 3,
    },
    {
      id: "cc-carried",
      label: "Credit card carried balance",
      amount: n(p.creditCardCarriedBalance),
    },
  ];
  const unified = (p.unifiedLoans ?? []).filter(
    (l) => n(l.monthlyEMI) > 0 || n(l.outstandingAmount) > 0,
  );
  let loanRows: BreakupRow[];
  if (unified.length > 0) {
    const hasHome = unified.some((l) => l.loanType === "home_loan");
    const hasCar = unified.some((l) => l.loanType === "car_loan");
    loanRows = [
      ...unified.map((l, i) => ({
        id: l.id || `loan-${i}`,
        label: l.lenderName?.trim()
          ? `${loanTypeLabel(l.loanType)} · ${l.lenderName.trim()}`
          : loanTypeLabel(l.loanType),
        amount:
          n(l.outstandingAmount) > 0
            ? n(l.outstandingAmount)
            : n(l.monthlyEMI) * (n(l.remainingMonths) || 18),
      })),
      ...(hasHome
        ? []
        : [
            {
              id: "home-loan",
              label: "Home loan",
              amount: n(p.homeLoanOutstanding),
            },
          ]),
      ...(hasCar
        ? []
        : [
            {
              id: "car-loan",
              label: "Car loan",
              amount: n(p.carLoanOutstanding),
            },
          ]),
    ];
  } else {
    loanRows = [
      { id: "home-loan", label: "Home loan", amount: n(p.homeLoanOutstanding) },
      { id: "car-loan", label: "Car loan", amount: n(p.carLoanOutstanding) },
      {
        id: "personal-loan",
        label: "Personal loan",
        amount: n(p.personalLoanOutstanding) || n(p.personalLoanEMI) * 24,
      },
      { id: "bike-loan", label: "Bike loan", amount: n(p.bikeEMI) * 24 },
    ];
  }
  let liabilities: BreakupGroup[] = [
    group("loans", "Loans", loanRows),
    group("credit", "Credit cards", creditRows),
  ].filter((g) => g.rows.length > 0);
  liabilities = reconcile(
    liabilities,
    shown?.totalLiabilities,
    "Other / not itemised",
  );

  const totalAssets = assets.reduce((s, g) => s + g.total, 0);
  const totalLiabilities = liabilities.reduce((s, g) => s + g.total, 0);
  return {
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}
