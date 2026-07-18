"use client";

import { useMemo, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import PrivateAmount from "@/components/ui/PrivateAmount";
import type {
  FinancialProfile,
  UnifiedLoanType,
} from "@/lib/analyse-form-schema";
import type { AnalysisResult } from "@/lib/financialEngine";
import { formatIndian } from "@/lib/formatters";
import {
  catalogForSection,
  getScalarAssetValue,
  patchScalarAsset,
  removeCustomInvestment,
  removeUnifiedLoan,
  upsertCustomInvestment,
  upsertUnifiedLoan,
  type AssetCatalogItem,
  type AssetFieldKey,
  type AssetSection,
} from "@/lib/profileAssetsPatch";
import {
  ensureEditableProfile,
  syncProfileAssets,
} from "@/lib/syncProfileAssets";
import { useAuthStore } from "@/store/authStore";

type LineItem = {
  id: string;
  label: string;
  amount: number;
  icon: AppIconName;
  kind: "scalar" | "loan" | "custom";
  field?: AssetFieldKey;
  loanId?: string;
  customIndex?: number;
  meta?: string;
};

function money(v: number) {
  return `₹${formatIndian(Math.round(v))}`;
}

function n(v: number | undefined | null) {
  return Math.max(0, Number(v ?? 0));
}

function buildCashItems(p: FinancialProfile): LineItem[] {
  return [
    {
      id: "savings",
      label: "Bank / savings account",
      amount: n(p.savingsAccountBalance),
      icon: "bank",
      kind: "scalar",
      field: "savingsAccountBalance",
    },
    {
      id: "liquid-mf",
      label: "Liquid mutual funds",
      amount: n(p.liquidMFValue),
      icon: "wallet",
      kind: "scalar",
      field: "liquidMFValue",
    },
    {
      id: "other-liquid",
      label: "Other liquid savings",
      amount: n(p.otherLiquidSavings),
      icon: "rupee",
      kind: "scalar",
      field: "otherLiquidSavings",
    },
  ];
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
      kind: "scalar",
      field: "mfValue",
    },
    {
      id: "equity",
      label: "Equity / stocks / RSU",
      amount: equity,
      icon: "chart",
      kind: "scalar",
      field: "totalEquityValue",
    },
    {
      id: "fd",
      label: "Fixed deposits",
      amount: n(p.fdValue),
      icon: "bank",
      kind: "scalar",
      field: "fdValue",
    },
    {
      id: "ppf",
      label: "PPF",
      amount: n(p.ppfBalance),
      icon: "briefcase",
      kind: "scalar",
      field: "ppfBalance",
    },
    {
      id: "epf",
      label: "EPF",
      amount: n(p.epfBalance),
      icon: "briefcase",
      kind: "scalar",
      field: "epfBalance",
    },
    {
      id: "nps",
      label: "NPS",
      amount: n(p.npsBalance),
      icon: "trending",
      kind: "scalar",
      field: "npsBalance",
    },
  ];

  (p.customInvestments ?? []).forEach((c, i) => {
    if (n(c.currentValue) <= 0 && !c.label) return;
    rows.push({
      id: `custom-${i}`,
      label: c.label || "Other investment",
      amount: n(c.currentValue),
      icon: "sparkle",
      kind: "custom",
      customIndex: i,
      meta: c.type,
    });
  });
  return rows;
}

function buildPhysicalItems(p: FinancialProfile): LineItem[] {
  return [
    {
      id: "home",
      label: "Home / property",
      amount: n(p.homeMarketValue),
      icon: "home",
      kind: "scalar",
      field: "homeMarketValue",
    },
    {
      id: "car",
      label: "Car / vehicle",
      amount: n(p.carMarketValue),
      icon: "wallet",
      kind: "scalar",
      field: "carMarketValue",
    },
    {
      id: "gold",
      label: "Gold",
      amount: n(p.goldValue),
      icon: "coin",
      kind: "scalar",
      field: "goldValue",
    },
    {
      id: "other-assets",
      label: p.otherAssetLabel?.trim() || "Other assets",
      amount: n(p.otherAssets),
      icon: "sparkle",
      kind: "scalar",
      field: "otherAssets",
    },
  ];
}

function loanLabel(type: UnifiedLoanType) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildLiabilityItems(p: FinancialProfile): LineItem[] {
  const unified = p.unifiedLoans ?? [];
  if (unified.length > 0) {
    return unified.map((loan, i) => ({
      id: loan.id || `loan-${i}`,
      label: loan.lenderName?.trim()
        ? `${loanLabel(loan.loanType)} · ${loan.lenderName}`
        : loanLabel(loan.loanType),
      amount: n(loan.outstandingAmount),
      icon: (loan.loanType === "credit_card" ? "card" : "bank") as AppIconName,
      kind: "loan" as const,
      loanId: loan.id || `loan-${i}`,
      meta: loan.monthlyEMI
        ? `EMI ₹${formatIndian(Math.round(loan.monthlyEMI))}/mo`
        : undefined,
    }));
  }
  return [];
}

type EditState =
  | {
      mode: "edit-scalar" | "add-scalar";
      section: AssetSection;
      catalog: AssetCatalogItem;
      amount: string;
    }
  | {
      mode: "edit-loan" | "add-loan";
      section: "liabilities";
      catalog: AssetCatalogItem;
      loanId?: string;
      outstanding: string;
      monthlyEMI: string;
      lenderName: string;
      interestRate: string;
      remainingMonths: string;
    }
  | {
      mode: "edit-custom" | "add-custom";
      section: "investments";
      catalog: AssetCatalogItem;
      customIndex?: number;
      label: string;
      amount: string;
      monthly: string;
    };

function SectionCard({
  title,
  icon,
  total,
  items,
  section,
  accent = "#534AB7",
  defaultOpen = false,
  onEdit,
  onAdd,
}: {
  title: string;
  icon: AppIconName;
  total: number;
  items: LineItem[];
  section: AssetSection;
  accent?: string;
  defaultOpen?: boolean;
  onEdit: (item: LineItem) => void;
  onAdd: (section: AssetSection) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const withData = items.filter((i) => i.amount > 0);
  const emptySlots = items.filter((i) => i.amount <= 0).slice(0, 3);

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
          <span
            className="text-sm font-extrabold"
            style={{ color: accent === "#E24B4A" ? "#E24B4A" : "#111110" }}
          >
            {money(total)}
          </span>
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
          <ul className="space-y-2">
            {withData.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[#F0EFF8] bg-[#FAFAFE] px-3 py-3 text-left transition hover:border-[#534AB7]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <AppIcon name={item.icon} size={16} color="#534AB7" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#111110]">
                        {item.label}
                      </div>
                      <div className="truncate text-[11px] font-medium text-[#9B9A94]">
                        {item.meta || "Tap to edit"}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-[#111110]">
                    {money(item.amount)}
                  </span>
                </button>
              </li>
            ))}

            {emptySlots.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-dashed border-[#E8E6F0] px-3 py-3 text-sm transition hover:border-[#534AB7] hover:bg-[#EEEDFE]/40"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-[#5F5E5A]">
                    <AppIcon name={item.icon} size={16} color="#9B9A94" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 font-bold text-[#534AB7]">Add</span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onAdd(section)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E8E6F0] bg-white px-3 py-2.5 text-xs font-bold text-[#534AB7]"
          >
            + Add to {title.toLowerCase()}
          </button>
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
  const userId = useAuthStore((s) => s.user?.id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [pickSection, setPickSection] = useState<AssetSection | null>(null);

  const working = useMemo(() => ensureEditableProfile(profile), [profile]);

  const cashItems = useMemo(() => buildCashItems(working), [working]);
  const investmentItems = useMemo(
    () => buildInvestmentItems(working),
    [working],
  );
  const physicalItems = useMemo(() => buildPhysicalItems(working), [working]);
  const liabilityItems = useMemo(() => buildLiabilityItems(working), [working]);

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

  const persist = async (next: FinancialProfile) => {
    setBusy(true);
    setMsg("");
    const res = await syncProfileAssets({ profile: next, userId });
    setBusy(false);
    if (res.error) setMsg(res.error);
    else setMsg("Saved — synced across your account");
    setEdit(null);
    setPickSection(null);
  };

  const openEditItem = (item: LineItem, section: AssetSection) => {
    if (item.kind === "loan") {
      const loan = (working.unifiedLoans ?? []).find(
        (l) => l.id === item.loanId,
      );
      const catalog =
        catalogForSection("liabilities").find(
          (c) => c.loanType === loan?.loanType,
        ) ?? catalogForSection("liabilities")[0];
      setEdit({
        mode: loan ? "edit-loan" : "add-loan",
        section: "liabilities",
        catalog,
        loanId: loan?.id,
        outstanding: String(n(loan?.outstandingAmount ?? item.amount)),
        monthlyEMI: String(n(loan?.monthlyEMI)),
        lenderName: loan?.lenderName ?? "",
        interestRate: String(loan?.interestRate ?? ""),
        remainingMonths: String(loan?.remainingMonths ?? ""),
      });
      return;
    }
    if (item.kind === "custom" && item.customIndex != null) {
      const c = working.customInvestments?.[item.customIndex];
      setEdit({
        mode: "edit-custom",
        section: "investments",
        catalog: catalogForSection("investments").find((x) => x.custom)!,
        customIndex: item.customIndex,
        label: c?.label ?? item.label,
        amount: String(n(c?.currentValue ?? item.amount)),
        monthly: String(n(c?.monthlyContribution)),
      });
      return;
    }
    if (item.field) {
      const catalog =
        catalogForSection(section).find((c) => c.field === item.field) ??
        catalogForSection(section)[0];
      setEdit({
        mode: item.amount > 0 ? "edit-scalar" : "add-scalar",
        section,
        catalog,
        amount: String(
          item.field ? getScalarAssetValue(working, item.field) : item.amount,
        ),
      });
    }
  };

  const openAdd = (section: AssetSection) => {
    setPickSection(section);
  };

  const pickCatalog = (catalog: AssetCatalogItem) => {
    setPickSection(null);
    if (catalog.loanType) {
      setEdit({
        mode: "add-loan",
        section: "liabilities",
        catalog,
        outstanding: "",
        monthlyEMI: "",
        lenderName: "",
        interestRate: "",
        remainingMonths: "",
      });
      return;
    }
    if (catalog.custom) {
      setEdit({
        mode: "add-custom",
        section: "investments",
        catalog,
        label: "",
        amount: "",
        monthly: "",
      });
      return;
    }
    setEdit({
      mode: "add-scalar",
      section: catalog.section,
      catalog,
      amount: catalog.field
        ? String(getScalarAssetValue(working, catalog.field))
        : "",
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    let next = working;

    if (edit.mode === "add-scalar" || edit.mode === "edit-scalar") {
      if (!edit.catalog.field) return;
      next = patchScalarAsset(next, edit.catalog.field, Number(edit.amount));
    } else if (edit.mode === "add-loan" || edit.mode === "edit-loan") {
      const loanType = edit.catalog.loanType ?? "other";
      next = upsertUnifiedLoan(next, {
        id: edit.loanId,
        loanType,
        lenderName: edit.lenderName,
        monthlyEMI: Number(edit.monthlyEMI) || 0,
        outstandingAmount: Number(edit.outstanding) || 0,
        interestRate: edit.interestRate ? Number(edit.interestRate) : undefined,
        remainingMonths: edit.remainingMonths
          ? Number(edit.remainingMonths)
          : undefined,
      });
    } else if (edit.mode === "add-custom" || edit.mode === "edit-custom") {
      next = upsertCustomInvestment(next, {
        index: edit.customIndex,
        label: edit.label,
        currentValue: Number(edit.amount) || 0,
        monthlyContribution: Number(edit.monthly) || 0,
      });
    }

    await persist(next);
  };

  const removeEdit = async () => {
    if (!edit) return;
    let next = working;
    if (edit.mode === "edit-loan" && edit.loanId) {
      next = removeUnifiedLoan(next, edit.loanId);
    } else if (edit.mode === "edit-custom" && edit.customIndex != null) {
      next = removeCustomInvestment(next, edit.customIndex);
    } else if (
      (edit.mode === "edit-scalar" || edit.mode === "add-scalar") &&
      edit.catalog.field
    ) {
      next = patchScalarAsset(next, edit.catalog.field, 0);
    } else {
      setEdit(null);
      return;
    }
    await persist(next);
  };

  return (
    <section className="min-w-0 space-y-3 overflow-x-hidden">
      <div className="overflow-hidden rounded-2xl bg-[#534AB7] p-5 text-white shadow-[0_14px_40px_rgba(83,74,183,0.25)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
              Your assets
            </p>
            <p className="mt-1 text-sm text-white/80">
              Edit anytime — syncs across Finkoin
            </p>
          </div>
          <AppIcon name="wallet" size={22} color="#FFFFFF" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Net worth",
              value: Math.abs(netWorth),
              display: `${netWorth < 0 ? "−" : ""}${money(Math.abs(netWorth))}`,
              danger: netWorth < 0,
            },
            {
              label: "Total assets",
              value: totalAssets,
              display: money(totalAssets),
              danger: false,
            },
            {
              label: "Liabilities",
              value: totalLiabilities,
              display: money(totalLiabilities),
              danger: false,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15"
            >
              <div className="text-[11px] font-semibold text-white/75">
                {card.label}
              </div>
              <div className="mt-1">
                <PrivateAmount
                  value={card.value}
                  label={card.label}
                  tone="dark"
                  eyeSize={18}
                >
                  <span
                    className={`text-lg font-extrabold ${card.danger ? "text-[#FFB4B4]" : "text-white"}`}
                  >
                    {card.display}
                  </span>
                </PrivateAmount>
              </div>
            </div>
          ))}
        </div>
      </div>

      {msg ? (
        <p className="rounded-xl bg-[#EEEDFE] px-3 py-2 text-center text-xs font-semibold text-[#534AB7]">
          {msg}
        </p>
      ) : null}

      <SectionCard
        title="Available cash"
        icon="wallet"
        total={cashTotal}
        items={cashItems}
        section="cash"
        defaultOpen
        onEdit={(item) => openEditItem(item, "cash")}
        onAdd={openAdd}
      />
      <SectionCard
        title="Investments"
        icon="trending"
        total={investmentTotal}
        items={investmentItems}
        section="investments"
        defaultOpen
        onEdit={(item) => openEditItem(item, "investments")}
        onAdd={openAdd}
      />
      <SectionCard
        title="Other assets"
        icon="home"
        total={physicalTotal}
        items={physicalItems}
        section="physical"
        onEdit={(item) => openEditItem(item, "physical")}
        onAdd={openAdd}
      />
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
                  kind: "loan",
                },
                {
                  id: "personal-loan",
                  label: "Personal loan",
                  amount: 0,
                  icon: "bank",
                  kind: "loan",
                },
                {
                  id: "cc",
                  label: "Credit card",
                  amount: 0,
                  icon: "card",
                  kind: "loan",
                },
              ]
        }
        section="liabilities"
        accent="#E24B4A"
        onEdit={(item) => {
          if (item.kind === "loan" && item.loanId) {
            openEditItem(item, "liabilities");
            return;
          }
          // Empty placeholder → open picker for loan type
          openAdd("liabilities");
        }}
        onAdd={openAdd}
      />

      {pickSection ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 sm:items-center"
          role="presentation"
          onClick={() => setPickSection(null)}
        >
          <div
            className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-xl sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-[#111110]">
                Add to {pickSection}
              </h3>
              <button
                type="button"
                onClick={() => setPickSection(null)}
                className="rounded-lg bg-[#F7F7F4] px-3 py-1.5 text-sm font-bold text-[#534AB7]"
              >
                Close
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {catalogForSection(pickSection).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pickCatalog(c)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#E8E6F0] px-3 py-3 text-left text-sm font-semibold text-[#111110] hover:border-[#534AB7]"
                  >
                    {c.label}
                    <span className="text-[#534AB7]">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {edit ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 sm:items-center"
          role="presentation"
          onClick={() => !busy && setEdit(null)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-xl sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-[#111110]">
                {edit.catalog.label}
              </h3>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEdit(null)}
                className="rounded-lg bg-[#F7F7F4] px-3 py-1.5 text-sm font-bold text-[#534AB7]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {edit.mode === "add-custom" || edit.mode === "edit-custom" ? (
                <>
                  <label className="block text-xs font-semibold text-[#5F5E5A]">
                    Name
                    <input
                      value={edit.label}
                      onChange={(e) =>
                        setEdit({ ...edit, label: e.target.value })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                      placeholder="e.g. Sovereign gold bond"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#5F5E5A]">
                    Current value (₹)
                    <input
                      inputMode="numeric"
                      value={edit.amount}
                      onChange={(e) =>
                        setEdit({ ...edit, amount: e.target.value })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#5F5E5A]">
                    Monthly contribution (₹)
                    <input
                      inputMode="numeric"
                      value={edit.monthly}
                      onChange={(e) =>
                        setEdit({ ...edit, monthly: e.target.value })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                    />
                  </label>
                </>
              ) : null}

              {edit.mode === "add-loan" || edit.mode === "edit-loan" ? (
                <>
                  <label className="block text-xs font-semibold text-[#5F5E5A]">
                    Outstanding (₹)
                    <input
                      inputMode="numeric"
                      value={edit.outstanding}
                      onChange={(e) =>
                        setEdit({ ...edit, outstanding: e.target.value })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#5F5E5A]">
                    Monthly EMI (₹)
                    <input
                      inputMode="numeric"
                      value={edit.monthlyEMI}
                      onChange={(e) =>
                        setEdit({ ...edit, monthlyEMI: e.target.value })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#5F5E5A]">
                    Lender
                    <input
                      value={edit.lenderName}
                      onChange={(e) =>
                        setEdit({ ...edit, lenderName: e.target.value })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                      placeholder="e.g. HDFC"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold text-[#5F5E5A]">
                      Interest %
                      <input
                        inputMode="decimal"
                        value={edit.interestRate}
                        onChange={(e) =>
                          setEdit({ ...edit, interestRate: e.target.value })
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[#5F5E5A]">
                      Months left
                      <input
                        inputMode="numeric"
                        value={edit.remainingMonths}
                        onChange={(e) =>
                          setEdit({ ...edit, remainingMonths: e.target.value })
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {edit.mode === "add-scalar" || edit.mode === "edit-scalar" ? (
                <label className="block text-xs font-semibold text-[#5F5E5A]">
                  Amount (₹)
                  <input
                    inputMode="numeric"
                    value={edit.amount}
                    onChange={(e) =>
                      setEdit({ ...edit, amount: e.target.value })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-[#E8E6F0] px-3 text-base outline-none focus:border-[#534AB7]"
                  />
                </label>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveEdit()}
                className="min-h-[44px] w-full rounded-xl bg-[#534AB7] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              {edit.mode.startsWith("edit") ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeEdit()}
                  className="min-h-[44px] w-full rounded-xl border border-[#F5D0D0] px-4 py-3 text-sm font-bold text-[#C0392B] disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
