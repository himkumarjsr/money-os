import { Pressable, Text, View } from "react-native";
import { TEACH } from "@/lib/taxTeachContent";
import type { RegimeBreakdown } from "@/lib/taxRegimeComparisonFY2026";
import { Insight } from "../calculator-ui";
import { TaxTeachTooltip } from "../TaxTeachTooltip";
import { inr, rupees } from "./format";
import {
  Disclosure,
  PrivateAmount,
  SectionBlurb,
  StepCard,
} from "./primitives";
import type { TaxCalcState } from "./useTaxCalculatorState";
import { openContentHref } from "@/lib/contentLinks";
import { themedStyles, Colors, tintBg } from "@/constants/theme";

const LEARN_TAX_LINKS = [
  {
    href: "/learn/old-vs-new-tax-regime-which-saves-you-more-money",
    label: "Old vs new regime — complete guide",
  },
  {
    href: "/learn/80c-complete-guide-tax-saving-india",
    label: "80C complete guide",
  },
  {
    href: "/learn/hra-exemption-complete-guide-india",
    label: "HRA exemption guide",
  },
  { href: "/learn/nps-tax-deductions-guide-india", label: "NPS tax guide" },
  {
    href: "/learn/rsu-esop-tax-india-explained",
    label: "RSU / ESOP tax guide",
  },
  {
    href: "/learn/hidden-tax-savings-salary-india",
    label: "Hidden tax savings",
  },
  {
    href: "/learn/tax-planning-calendar-india-fy",
    label: "Tax planning calendar",
  },
];

/** Exempt amounts memo shown between Step 4 and Step 5. */
export function ExemptMemo({ s }: { s: TaxCalcState }) {
  const { derived } = s;
  if (
    !(
      derived.leaveExemptRec > 0 ||
      derived.gratuityExemptRec > 0 ||
      derived.ltaExemptRec > 0
    )
  )
    return null;
  return (
    <View style={styles.memo}>
      <Text style={styles.memoText}>
        <Text style={styles.memoStrong}>Recorded exempt amounts (memo): </Text>
        {[
          derived.leaveExemptRec > 0
            ? `Leave ₹${inr(derived.leaveExemptRec)}`
            : null,
          derived.gratuityExemptRec > 0
            ? `Gratuity ₹${inr(derived.gratuityExemptRec)}`
            : null,
          derived.ltaExemptRec > 0 ? `LTA ₹${inr(derived.ltaExemptRec)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </View>
  );
}

function DeductionLines({
  title,
  rows,
  prefix,
}: {
  title: string;
  rows: RegimeBreakdown["deductionLines"];
  prefix: string;
}) {
  return (
    <View style={styles.dedBlock}>
      <Text style={styles.dedTitle}>{title}</Text>
      <View style={{ gap: 4 }}>
        {rows.map((d) => (
          <View key={`${prefix}-${d.label}`} style={styles.dedRow}>
            <Text style={styles.dedLabel}>{d.label}</Text>
            <Text style={styles.dedAmount}>{rupees(d.amount)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ComparisonTable({
  oldR,
  newR,
}: {
  oldR: RegimeBreakdown;
  newR: RegimeBreakdown;
}) {
  const oldPreCess = oldR.taxBeforeSurcharge + oldR.surcharge;
  const newPreCess = newR.taxBeforeSurcharge + newR.surcharge;
  const rows: { label: string; old: string; next: string; total?: boolean }[] =
    [
      {
        label: "Ordinary gross",
        old: rupees(oldR.ordinaryGrossIncome),
        next: rupees(newR.ordinaryGrossIncome),
      },
      {
        label: "Gross for surcharge",
        old: rupees(oldR.grossForSurcharge),
        next: rupees(newR.grossForSurcharge),
      },
      {
        label: "Deductions",
        old: rupees(oldR.deductionAmount),
        next: rupees(newR.deductionAmount),
      },
      {
        label: "Taxable income",
        old: rupees(oldR.taxableIncome),
        next: rupees(newR.taxableIncome),
      },
      {
        label: "Slab tax (pre 87A)",
        old: rupees(oldR.slabTaxBeforeRebate),
        next: rupees(newR.slabTaxBeforeRebate),
      },
      {
        label: "87A rebate",
        old: oldR.rebate87A ? "Applied" : "No",
        next: newR.rebate87A ? "Applied" : "No",
      },
      {
        label: "Slab tax (post 87A)",
        old: rupees(oldR.slabTaxNetOfRebate),
        next: rupees(newR.slabTaxNetOfRebate),
      },
      {
        label: "CG / specific-rate tax",
        old: rupees(oldR.equityCgTax),
        next: rupees(newR.equityCgTax),
      },
      {
        label: "Tax + surcharge",
        old: rupees(oldPreCess),
        next: rupees(newPreCess),
      },
      { label: "Cess (4%)", old: rupees(oldR.cess), next: rupees(newR.cess) },
      {
        label: "TOTAL TAX",
        old: rupees(oldR.totalTax),
        next: rupees(newR.totalTax),
        total: true,
      },
    ];

  return (
    <View style={{ marginTop: 16 }}>
      <View style={styles.table}>
        <View style={[styles.tRow, styles.tHead]}>
          <Text style={[styles.tHeadText, styles.cLabel]}>Category</Text>
          <Text style={[styles.tHeadText, styles.cVal]}>Old</Text>
          <Text style={[styles.tHeadText, styles.cVal]}>New</Text>
        </View>
        {rows.map((row, idx) => (
          <View
            key={row.label}
            style={[
              styles.tRow,
              idx > 0 && styles.tDivider,
              row.total && styles.tTotalRow,
            ]}
          >
            <Text
              style={[
                styles.tCell,
                styles.cLabel,
                { color: Colors.textSecondary },
                row.total && styles.tTotal,
              ]}
            >
              {row.label}
            </Text>
            <Text
              style={[styles.tCell, styles.cVal, row.total && styles.tTotal]}
            >
              {row.old}
            </Text>
            <Text
              style={[styles.tCell, styles.cVal, row.total && styles.tTotal]}
            >
              {row.next}
            </Text>
          </View>
        ))}
      </View>
      {oldR.deductionLines.length > 0 || newR.deductionLines.length > 0 ? (
        <Disclosure summary="Deduction detail" style={styles.dedDetails}>
          {oldR.deductionLines.length > 0 ? (
            <DeductionLines
              title="Old regime"
              rows={oldR.deductionLines}
              prefix="old"
            />
          ) : null}
          {newR.deductionLines.length > 0 ? (
            <DeductionLines
              title="New regime"
              rows={newR.deductionLines}
              prefix="new"
            />
          ) : null}
        </Disclosure>
      ) : null}
    </View>
  );
}

function TakeHomeCard({
  label,
  value,
  privateLabel,
}: {
  label: string;
  value: number;
  privateLabel?: string;
}) {
  return (
    <View style={styles.takeCard}>
      <Text style={styles.takeLabel}>{label}</Text>
      {privateLabel ? (
        <View style={{ marginTop: 4 }}>
          <PrivateAmount
            value={value}
            label={privateLabel}
            valueStyle={styles.takeValueText}
          >
            {rupees(value)}
          </PrivateAmount>
        </View>
      ) : (
        <Text style={[styles.takeValueText, { marginTop: 4 }]}>
          {rupees(value)}
        </Text>
      )}
    </View>
  );
}

export function ResultsStep({ s }: { s: TaxCalcState }) {
  const { oldR, newR, winner, saveAmount, itrSuggestion, tdsPrepaid } = s;
  const winningTotal = winner === "old" ? oldR.totalTax : newR.totalTax;
  const bal = s.taxBalanceVsTds(winningTotal);

  return (
    <StepCard
      title="Step 5 · Results"
      teach={TEACH.sections.deductions}
      blurb="Side-by-side slab math with surcharge & cess flags — exportable PDF mirrors these rounded totals."
      defaultOpen
    >
      <ComparisonTable oldR={oldR} newR={newR} />

      {winner === "new" ? (
        <View style={[styles.winner, styles.winnerNew]}>
          <Text style={[styles.winnerText, { color: "#022C22" }]}>
            Winner: New regime — about {rupees(saveAmount)} / year
          </Text>
        </View>
      ) : winner === "old" ? (
        <View style={[styles.winner, styles.winnerOld]}>
          <Text style={[styles.winnerText, { color: "#082F49" }]}>
            Winner: Old regime — about {rupees(saveAmount)} / year
          </Text>
        </View>
      ) : (
        <View style={[styles.winner, styles.winnerTie]}>
          <Text style={[styles.winnerText, { color: Colors.textPrimary }]}>
            Rough tie between regimes
          </Text>
        </View>
      )}

      <View style={styles.takeGrid}>
        <TakeHomeCard
          label="Old — monthly take-home"
          value={s.oldMonthly}
          privateLabel="old regime take-home"
        />
        <TakeHomeCard
          label="New — monthly take-home"
          value={s.newMonthly}
          privateLabel="new regime take-home"
        />
        <TakeHomeCard
          label="Monthly difference"
          value={Math.abs(s.oldMonthly - s.newMonthly)}
        />
      </View>

      {s.missedAlerts.length > 0 ? (
        <View style={styles.alerts}>
          <Text style={styles.alertsTitle}>
            Possible missed deductions / checks
          </Text>
          <View style={styles.alertList}>
            {s.missedAlerts.map((a) => (
              <View key={a} style={styles.bulletRow}>
                <Text style={styles.alertText}>•</Text>
                <Text style={[styles.alertText, { flex: 1 }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Insight tone="good" style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "600" }}>Plain-language next steps</Text>
        {s.tips.map((t, idx) => (
          <Text key={`tip-${idx}`} style={{ fontWeight: "400" }}>
            {"\n"}• {t}
          </Text>
        ))}
      </Insight>

      <View style={styles.itrCard}>
        <Text style={styles.eyebrow}>Suggested ITR form</Text>
        <Text style={styles.itrForm}>{itrSuggestion.form}</Text>
        <Text style={styles.itrWhy}>{itrSuggestion.why}</Text>
        <Text style={styles.itrNote}>{itrSuggestion.note}</Text>
        <Disclosure
          summary="Which ITR should I choose? (ITR-1 to ITR-4)"
          summaryStyle={{ fontWeight: "600" }}
          style={styles.itrGuide}
        >
          <View style={{ marginTop: 8, gap: 8 }}>
            {itrSuggestion.guide.map((row) => (
              <Text key={row.form} style={styles.guideText}>
                <Text style={styles.guideForm}>{row.form}: </Text>
                {row.when}
              </Text>
            ))}
          </View>
          <Text style={styles.guideFoot}>
            Educational guide only — eligibility rules change; confirm on the
            Income Tax portal / with a CA before filing.
          </Text>
        </Disclosure>
        {tdsPrepaid > 0 ? (
          <View style={styles.tdsBox}>
            <Text style={styles.tdsTitle}>
              TDS already deducted: {rupees(tdsPrepaid)}
            </Text>
            <Text style={styles.tdsBody}>
              vs winning regime tax ≈ {rupees(winningTotal)} →{" "}
              {bal > 0
                ? `approx payable ${rupees(bal)}`
                : bal < 0
                  ? `approx refund ${rupees(Math.abs(bal))}`
                  : "roughly matched"}
              . Match figures to Form 16 / 26AS.
            </Text>
          </View>
        ) : null}
      </View>

      {s.learnedToday.length > 0 ? (
        <View style={styles.learned}>
          <Text style={styles.learnedTitle}>What you learned today</Text>
          <View style={{ marginTop: 12, gap: 12 }}>
            {s.learnedToday.map((row) => (
              <View key={row.title}>
                <Text style={styles.learnedRowTitle}>
                  {row.emoji} {row.title}
                </Text>
                <Text style={styles.learnedBody}>{row.body}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.faq}>
        <View style={styles.faqHead}>
          <Text style={styles.eyebrow}>FAQ</Text>
          <TaxTeachTooltip
            content={TEACH.sections.deductions}
            ariaLabel="Tax glossary context"
          />
        </View>
        <SectionBlurb text="Quick clarifiers only — use deeper guides or your CA for filing-grade nuance." />
        <View style={{ marginTop: 12, gap: 8 }}>
          <Disclosure
            summary="How are RSU vest and sale taxed differently?"
            summaryStyle={styles.faqQ}
            style={styles.faqItem}
          >
            <Text style={styles.faqA}>
              Vesting is generally salary perquisite; sales later pick up
              capital gains — verify broker statements.
            </Text>
          </Disclosure>
          <Disclosure
            summary="Where can I read deeper guides?"
            summaryStyle={styles.faqQ}
            style={styles.faqItem}
          >
            <View style={{ marginTop: 4 }}>
              {LEARN_TAX_LINKS.map((l) => (
                <Pressable
                  key={l.href}
                  onPress={() => openContentHref(l.href)}
                  accessibilityRole="link"
                  style={styles.linkRow}
                >
                  <Text style={styles.linkText}>{l.label} →</Text>
                </Pressable>
              ))}
            </View>
          </Disclosure>
        </View>
      </View>
    </StepCard>
  );
}

const styles = themedStyles(() => ({
  memo: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memoText: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  memoStrong: { fontWeight: "600", color: Colors.textPrimary },
  table: { overflow: "hidden", borderRadius: 8, backgroundColor: Colors.card },
  tRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tHead: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  tHeadText: { fontSize: 11, fontWeight: "600", color: Colors.primary },
  tDivider: { borderTopWidth: 1, borderTopColor: tintBg("#F4F3FA") },
  tTotalRow: { backgroundColor: Colors.background },
  cLabel: { flex: 1.2 },
  cVal: { flex: 1, textAlign: "right" },
  tCell: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  tTotal: { fontWeight: "700", color: Colors.textPrimary },
  dedDetails: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dedBlock: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: tintBg("#F2F1F8"),
    paddingTop: 8,
  },
  dedTitle: {
    marginBottom: 4,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  dedRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  dedLabel: { flex: 1, fontSize: 12, color: Colors.textMuted },
  dedAmount: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  winner: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  winnerNew: {
    borderColor: Colors.successLight,
    backgroundColor: Colors.successLight,
  },
  winnerOld: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  winnerTie: { borderColor: Colors.border, backgroundColor: Colors.background },
  winnerText: { fontSize: 18, lineHeight: 26, fontWeight: "700" },
  takeGrid: { marginTop: 16, gap: 12 },
  takeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.glassCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  takeLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  takeValueText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  alerts: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warningLight,
    backgroundColor: Colors.warningLight,
    padding: 16,
  },
  alertsTitle: { fontSize: 14, fontWeight: "600", color: Colors.warningText },
  alertList: { marginTop: 8, gap: 6, paddingLeft: 4 },
  bulletRow: { flexDirection: "row", gap: 8 },
  alertText: { fontSize: 14, lineHeight: 20, color: Colors.warningText },
  itrCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primary,
  },
  itrForm: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  itrWhy: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  itrNote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
  },
  itrGuide: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  guideText: { fontSize: 12, lineHeight: 19, color: Colors.textSecondary },
  guideForm: { fontWeight: "600", color: Colors.textPrimary },
  guideFoot: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  tdsBox: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tdsTitle: { fontSize: 12, fontWeight: "600", color: Colors.textPrimary },
  tdsBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  learned: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.background,
    padding: 16,
  },
  learnedTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primary,
  },
  learnedRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  learnedBody: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  faq: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  faqHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  faqItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.glassCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  faqQ: { fontSize: 14, fontWeight: "500", color: Colors.textPrimary },
  faqA: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  linkRow: { minHeight: 44, justifyContent: "center" },
  linkText: { fontSize: 14, color: Colors.primary },
}));
