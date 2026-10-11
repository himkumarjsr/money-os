/**
 * Profile → Your assets. Ports web `components/profile/ProfileAssets.tsx`:
 * net worth hero, expandable asset/liability groups, add/edit sheets, and the
 * same save path (`syncProfileAssets`: local store + Supabase snapshot).
 */
import { useMemo, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import {
  Colors,
  FontSize,
  Radius,
  Spacing,
  themedStyles,
} from "@/constants/theme";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EyeIcon } from "@/components/ui/PrivacyEye";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
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

/** AppIcon names plus the PWA's "sparkle" (drawn from the tracker set). */
type LineIconName = AppIconName | "sparkle";

type LineItem = {
  id: string;
  label: string;
  amount: number;
  icon: LineIconName;
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

function LineIcon({
  name,
  size,
  color,
}: {
  name: LineIconName;
  size: number;
  color: string;
}) {
  if (name === "sparkle") {
    return <TrackerIcon name="sparkle" size={size} color={color} />;
  }
  return <AppIcon name={name} size={size} color={color} />;
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
  return unified.map((loan, i) => ({
    id: loan.id || `loan-${i}`,
    label: loan.lenderName?.trim()
      ? `${loanLabel(loan.loanType)} · ${loan.lenderName}`
      : loanLabel(loan.loanType),
    amount: n(loan.outstandingAmount),
    icon: loan.loanType === "credit_card" ? "card" : "bank",
    kind: "loan" as const,
    loanId: loan.id || `loan-${i}`,
    meta: loan.monthlyEMI
      ? `EMI ₹${formatIndian(Math.round(loan.monthlyEMI))}/mo`
      : undefined,
  }));
}

/** Placeholder rows shown in Liabilities until the user adds a loan. */
const EMPTY_LIABILITY_ITEMS: LineItem[] = [
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
  { id: "cc", label: "Credit card", amount: 0, icon: "card", kind: "loan" },
];

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

/** PWA PrivateAmount (tone="dark"): hidden by default, eye reveals. */
function HeroAmount({
  value,
  label,
  display,
  danger,
}: {
  value: number;
  label: string;
  display: string;
  danger: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const hasData = Number.isFinite(value) && Math.abs(value) > 0;
  const textStyle = [styles.heroValue, danger && styles.heroValueDanger];
  if (!hasData) return <Text style={textStyle}>{display}</Text>;
  return (
    <View style={styles.heroAmountRow}>
      <Text
        style={[textStyle, !visible && styles.masked]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {visible ? display : "₹••••••"}
      </Text>
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
        style={styles.heroEye}
      >
        <EyeIcon open={visible} size={18} color={Colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  total,
  items,
  danger = false,
  defaultOpen = false,
  onEdit,
  onAdd,
}: {
  title: string;
  icon: LineIconName;
  total: number;
  items: LineItem[];
  danger?: boolean;
  defaultOpen?: boolean;
  onEdit: (item: LineItem) => void;
  onAdd: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const withData = items.filter((i) => i.amount > 0);
  const emptySlots = items.filter((i) => i.amount <= 0).slice(0, 3);
  const accent = danger ? Colors.error : Colors.primary;

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.sectionHead}
      >
        <View style={styles.sectionHeadLeft}>
          <View
            style={[
              styles.sectionBadge,
              danger ? styles.sectionBadgeDanger : null,
            ]}
          >
            <LineIcon name={icon} size={20} color={accent} />
          </View>
          <View style={styles.flexShrink}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.sectionSub}>
              {withData.length > 0
                ? `${withData.length} item${withData.length === 1 ? "" : "s"}`
                : "Nothing added yet"}
            </Text>
          </View>
        </View>
        <View style={styles.sectionHeadRight}>
          <Text style={[styles.sectionTotal, danger && styles.dangerText]}>
            {money(total)}
          </Text>
          <View style={open ? styles.chevronOpen : null}>
            <AppIcon name="chevronDown" size={16} color={Colors.primary} />
          </View>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.sectionBody}>
          {withData.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onEdit(item)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.itemRow,
                pressed && styles.itemRowPressed,
              ]}
            >
              <View style={styles.itemLeft}>
                <LineIcon name={item.icon} size={16} color={Colors.primary} />
                <View style={styles.flexShrink}>
                  <Text style={styles.itemLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.meta || "Tap to edit"}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemAmount}>{money(item.amount)}</Text>
            </Pressable>
          ))}

          {emptySlots.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onEdit(item)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.emptyRow,
                pressed && styles.emptyRowPressed,
              ]}
            >
              <View style={styles.itemLeft}>
                <LineIcon name={item.icon} size={16} color={Colors.textMuted} />
                <Text style={styles.emptyLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>
              + Add to {title.toLowerCase()}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
      />
    </View>
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
        amount: String(getScalarAssetValue(working, item.field)),
      });
    }
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

  const heroTiles = [
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
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <View style={styles.flexShrink}>
            <Text style={styles.heroEyebrow}>YOUR ASSETS</Text>
            <Text style={styles.heroSub}>
              Edit anytime — syncs across Finkoin
            </Text>
          </View>
          <AppIcon name="wallet" size={22} color={Colors.onPrimary} />
        </View>
        <View style={styles.heroTiles}>
          {heroTiles.map((card) => (
            <View key={card.label} style={styles.heroTile}>
              <Text style={styles.heroTileLabel}>{card.label}</Text>
              <HeroAmount
                value={card.value}
                label={card.label}
                display={card.display}
                danger={card.danger}
              />
            </View>
          ))}
        </View>
      </View>

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <SectionCard
        title="Available cash"
        icon="wallet"
        total={cashTotal}
        items={cashItems}
        defaultOpen
        onEdit={(item) => openEditItem(item, "cash")}
        onAdd={() => setPickSection("cash")}
      />
      <SectionCard
        title="Investments"
        icon="trending"
        total={investmentTotal}
        items={investmentItems}
        defaultOpen
        onEdit={(item) => openEditItem(item, "investments")}
        onAdd={() => setPickSection("investments")}
      />
      <SectionCard
        title="Other assets"
        icon="home"
        total={physicalTotal}
        items={physicalItems}
        onEdit={(item) => openEditItem(item, "physical")}
        onAdd={() => setPickSection("physical")}
      />
      <SectionCard
        title="Liabilities"
        icon="card"
        total={totalLiabilities}
        items={
          liabilityItems.length > 0 ? liabilityItems : EMPTY_LIABILITY_ITEMS
        }
        danger
        onEdit={(item) => {
          if (item.kind === "loan" && item.loanId) {
            openEditItem(item, "liabilities");
            return;
          }
          // Empty placeholder → open picker for loan type
          setPickSection("liabilities");
        }}
        onAdd={() => setPickSection("liabilities")}
      />

      <BottomSheet
        visible={pickSection != null}
        onClose={() => setPickSection(null)}
        scroll
      >
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Add to {pickSection}</Text>
          <Pressable
            onPress={() => setPickSection(null)}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        {pickSection
          ? catalogForSection(pickSection).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => pickCatalog(c)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.pickRow,
                  pressed && styles.itemRowPressed,
                ]}
              >
                <Text style={styles.pickLabel}>{c.label}</Text>
                <Text style={styles.pickArrow}>→</Text>
              </Pressable>
            ))
          : null}
      </BottomSheet>

      <BottomSheet
        visible={edit != null}
        onClose={() => {
          if (!busy) setEdit(null);
        }}
        scroll
      >
        {edit ? (
          <>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{edit.catalog.label}</Text>
              <Pressable
                disabled={busy}
                onPress={() => setEdit(null)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            {edit.mode === "add-custom" || edit.mode === "edit-custom" ? (
              <>
                <Field
                  label="Name"
                  value={edit.label}
                  onChange={(v) => setEdit({ ...edit, label: v })}
                  placeholder="e.g. Sovereign gold bond"
                />
                <Field
                  label="Current value (₹)"
                  keyboardType="numeric"
                  value={edit.amount}
                  onChange={(v) => setEdit({ ...edit, amount: v })}
                />
                <Field
                  label="Monthly contribution (₹)"
                  keyboardType="numeric"
                  value={edit.monthly}
                  onChange={(v) => setEdit({ ...edit, monthly: v })}
                />
              </>
            ) : null}

            {edit.mode === "add-loan" || edit.mode === "edit-loan" ? (
              <>
                <Field
                  label="Outstanding (₹)"
                  keyboardType="numeric"
                  value={edit.outstanding}
                  onChange={(v) => setEdit({ ...edit, outstanding: v })}
                />
                <Field
                  label="Monthly EMI (₹)"
                  keyboardType="numeric"
                  value={edit.monthlyEMI}
                  onChange={(v) => setEdit({ ...edit, monthlyEMI: v })}
                />
                <Field
                  label="Lender"
                  value={edit.lenderName}
                  onChange={(v) => setEdit({ ...edit, lenderName: v })}
                  placeholder="e.g. HDFC"
                />
                <View style={styles.fieldPair}>
                  <View style={styles.flex1}>
                    <Field
                      label="Interest %"
                      keyboardType="decimal-pad"
                      value={edit.interestRate}
                      onChange={(v) => setEdit({ ...edit, interestRate: v })}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Field
                      label="Months left"
                      keyboardType="numeric"
                      value={edit.remainingMonths}
                      onChange={(v) => setEdit({ ...edit, remainingMonths: v })}
                    />
                  </View>
                </View>
              </>
            ) : null}

            {edit.mode === "add-scalar" || edit.mode === "edit-scalar" ? (
              <Field
                label="Amount (₹)"
                keyboardType="numeric"
                value={edit.amount}
                onChange={(v) => setEdit({ ...edit, amount: v })}
              />
            ) : null}

            <Pressable
              disabled={busy}
              onPress={() => void saveEdit()}
              accessibilityRole="button"
              style={[styles.saveBtn, busy && styles.disabled]}
            >
              <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
            </Pressable>
            {edit.mode.startsWith("edit") ? (
              <Pressable
                disabled={busy}
                onPress={() => void removeEdit()}
                accessibilityRole="button"
                style={[styles.removeBtn, busy && styles.disabled]}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = themedStyles(() => {
  // White text on brand purple; Premium's gold card carries dark text.
  const lightOnHero = Colors.onPrimary.toUpperCase() === "#FFFFFF";
  const veil = lightOnHero ? "255,255,255" : "26,20,5";
  return {
    wrap: { gap: Spacing.md, marginBottom: Spacing.lg },
    flexShrink: { flexShrink: 1, minWidth: 0 },
    flex1: { flex: 1 },
    hero: {
      backgroundColor: Colors.primary,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      overflow: "hidden",
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 6,
    },
    heroHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: Spacing.md,
    },
    heroEyebrow: {
      fontSize: FontSize.sm,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: Colors.onPrimary,
      opacity: 0.75,
    },
    heroSub: {
      marginTop: 4,
      fontSize: FontSize.md,
      color: Colors.onPrimary,
      opacity: 0.8,
    },
    heroTiles: { marginTop: Spacing.xl, gap: Spacing.md },
    heroTile: {
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      backgroundColor: `rgba(${veil},${lightOnHero ? 0.1 : 0.08})`,
      borderWidth: 1,
      borderColor: `rgba(${veil},0.15)`,
    },
    heroTileLabel: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: Colors.onPrimary,
      opacity: 0.75,
    },
    heroAmountRow: {
      marginTop: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    heroValue: {
      flexShrink: 1,
      marginTop: 4,
      fontSize: 18,
      fontWeight: "800",
      color: Colors.onPrimary,
    },
    heroValueDanger: { color: lightOnHero ? "#FFB4B4" : "#8B1A1A" },
    masked: { letterSpacing: 1 },
    heroEye: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: `rgba(${veil},0.55)`,
      backgroundColor: `rgba(${veil},0.22)`,
    },
    msg: {
      overflow: "hidden",
      borderRadius: Radius.md,
      backgroundColor: Colors.primaryLight,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      textAlign: "center",
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: Colors.primary,
    },
    section: {
      overflow: "hidden",
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    sectionHeadLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      flexShrink: 1,
      minWidth: 0,
    },
    sectionHeadRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      flexShrink: 0,
    },
    sectionBadge: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.primaryTint,
    },
    sectionBadgeDanger: { backgroundColor: Colors.errorLight },
    sectionTitle: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: Colors.textPrimary,
    },
    sectionSub: { fontSize: FontSize.sm, color: Colors.textMuted },
    sectionTotal: {
      fontSize: FontSize.md,
      fontWeight: "800",
      color: Colors.textPrimary,
    },
    dangerText: { color: Colors.error },
    chevronOpen: { transform: [{ rotate: "180deg" }] },
    sectionBody: {
      borderTopWidth: 1,
      borderTopColor: Colors.borderLight,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.borderLight,
      backgroundColor: Colors.surfaceMuted,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    itemRowPressed: { borderColor: Colors.primary },
    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexShrink: 1,
      minWidth: 0,
    },
    itemLabel: {
      fontSize: FontSize.md,
      fontWeight: "600",
      color: Colors.textPrimary,
    },
    itemMeta: {
      fontSize: FontSize.sm,
      fontWeight: "500",
      color: Colors.textMuted,
    },
    itemAmount: {
      flexShrink: 0,
      fontSize: FontSize.md,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: Colors.textPrimary,
    },
    emptyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: Colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    emptyRowPressed: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryLight,
    },
    emptyLabel: {
      flexShrink: 1,
      fontSize: FontSize.md,
      color: Colors.textSecondary,
    },
    addText: {
      flexShrink: 0,
      fontSize: FontSize.md,
      fontWeight: "700",
      color: Colors.primary,
    },
    addBtn: {
      marginTop: 4,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
    },
    addBtnText: {
      fontSize: FontSize.sm,
      fontWeight: "700",
      color: Colors.primary,
    },
    sheetHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    sheetTitle: {
      flexShrink: 1,
      fontSize: FontSize.base,
      fontWeight: "800",
      color: Colors.textPrimary,
    },
    closeBtn: {
      borderRadius: Radius.sm,
      backgroundColor: Colors.surfaceMuted,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
    },
    closeText: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: Colors.primary,
    },
    pickRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    pickLabel: {
      flexShrink: 1,
      fontSize: FontSize.md,
      fontWeight: "600",
      color: Colors.textPrimary,
    },
    pickArrow: { fontSize: FontSize.md, color: Colors.primary },
    field: { marginBottom: Spacing.md },
    fieldPair: { flexDirection: "row", gap: Spacing.md },
    fieldLabel: {
      fontSize: FontSize.sm,
      fontWeight: "600",
      color: Colors.textSecondary,
    },
    input: {
      marginTop: 4,
      height: 44,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
      paddingHorizontal: Spacing.md,
      fontSize: FontSize.base,
      color: Colors.textPrimary,
    },
    inputFocused: { borderColor: Colors.primary },
    saveBtn: {
      marginTop: Spacing.sm,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.md,
      backgroundColor: Colors.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    saveText: {
      fontSize: FontSize.md,
      fontWeight: "800",
      color: Colors.onPrimary,
    },
    removeBtn: {
      marginTop: Spacing.sm,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.errorLight,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    removeText: {
      fontSize: FontSize.md,
      fontWeight: "700",
      color: Colors.errorText,
    },
    disabled: { opacity: 0.5 },
  };
});
