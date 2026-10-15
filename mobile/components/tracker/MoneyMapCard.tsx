import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors, readable, themedStyles } from "@/constants/theme";
import {
  MONEY_MAP_COPY,
  natureLockedTeaser,
  natureMoverLine,
  natureRupees,
  natureSavingLine,
  natureTrendArrow,
  natureTrendText,
  natureTrendTone,
  type NatureReport,
  type NatureRow,
} from "@/lib/trackerNatureReport";
import { usePrivacyToggle } from "@/lib/usePrivacyToggle";

const FIRST_COL = 116;
const CELL_W = 84;
const TREND_W = 96;
const ROW_H = 52;
const SUB_H = 44;

const SKELETON_ROWS = [
  "Needs",
  "Wants",
  "Habits",
  "Insurance",
  "Loans",
  "Investment",
  "Credit card",
] as const;

function amountText(n: number, visible: boolean): string {
  if (!visible) return "₹••••••";
  return `${n < 0 ? "-" : ""}${natureRupees(n)}`;
}

function toneColor(tone: "good" | "bad" | "neutral"): string {
  if (tone === "good") return readable(Colors.successText);
  if (tone === "bad") return readable(Colors.errorText);
  return Colors.textSecondary;
}

function maskRupees(s: string, visible: boolean): string {
  return visible ? s : s.replace(/₹[\d,]+/g, "₹••••••");
}

/** Matches web MoneyMapCard: same copy, order and behaviour. */
export function MoneyMapCard({
  report,
  locked,
  forceVisible = false,
}: {
  /** Null while loading or with fewer than 2 months of data: renders nothing. */
  report: NatureReport | null;
  /** Free tier: skeleton + teaser only, no real amounts rendered. */
  locked: boolean;
  /** Master "Show all" privacy switch from the tracker. */
  forceVisible?: boolean;
}) {
  const [visible, toggleVisible] = usePrivacyToggle(forceVisible);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  if (!report) return null;

  if (locked) {
    return (
      <View
        style={styles.card}
        accessible={false}
        accessibilityLabel={MONEY_MAP_COPY.title}
      >
        <Text style={styles.title} accessibilityRole="header">
          {MONEY_MAP_COPY.title}
        </Text>
        <Text style={styles.subtitle}>{MONEY_MAP_COPY.lockedHeading}</Text>
        <View
          style={{ marginTop: 12 }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {SKELETON_ROWS.map((label) => (
            <View key={label} style={styles.skelRow}>
              <Text style={styles.rowLabelText}>{label}</Text>
              <View style={styles.skelBars}>
                <View style={styles.skelBar} />
                <View style={styles.skelBar} />
                <View style={styles.skelBar} />
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.teaser}>{natureLockedTeaser(report)}</Text>
        <Pressable
          onPress={() => router.push("/plans")}
          accessibilityRole="button"
          accessibilityHint={MONEY_MAP_COPY.ctaSoonApp}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.ctaText}>{MONEY_MAP_COPY.cta}</Text>
        </Pressable>
        <Text style={styles.soon}>{MONEY_MAP_COPY.ctaSoonApp}</Text>
      </View>
    );
  }

  const prevOk = report.prevIndex != null;
  const saving = report.possibleSaving;
  const toggleRow = (key: string) =>
    setExpanded((cur) => (cur === key ? null : key));

  const trendLabel = (row: NatureRow) => natureTrendText(row, prevOk);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} accessibilityRole="header">
            {MONEY_MAP_COPY.title}
          </Text>
          <Text style={styles.subtitle}>{MONEY_MAP_COPY.subtitle}</Text>
        </View>
        <View style={styles.headRight}>
          <Pressable
            onPress={toggleVisible}
            accessibilityRole="button"
            accessibilityState={{ selected: visible }}
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>
              {visible
                ? MONEY_MAP_COPY.hideAmounts
                : MONEY_MAP_COPY.showAmounts}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowReport(true)}
            accessibilityRole="button"
            style={styles.reportBtn}
          >
            <Text style={styles.reportBtnText}>
              {MONEY_MAP_COPY.reportButton}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 12 }}>
        {/* Sticky first column */}
        <View style={{ width: FIRST_COL }}>
          <View style={styles.headCell}>
            <Text style={styles.headText}>Nature</Text>
          </View>
          {report.rows.map((row) => {
            const open = expanded === row.key;
            const canOpen = row.subcategories.length > 0;
            return (
              <View key={row.key}>
                <Pressable
                  disabled={!canOpen}
                  onPress={() => toggleRow(row.key)}
                  accessibilityRole={canOpen ? "button" : "text"}
                  accessibilityState={canOpen ? { expanded: open } : undefined}
                  accessibilityLabel={`${row.label}, ${trendLabel(row)}`}
                  style={[styles.rowLabel, { height: ROW_H }]}
                >
                  <Text style={styles.rowLabelText} numberOfLines={1}>
                    {canOpen ? (open ? "▾ " : "▸ ") : ""}
                    {row.label}
                  </Text>
                  {!row.inTotal ? (
                    <Text style={styles.note} numberOfLines={2}>
                      {MONEY_MAP_COPY.cardNote}
                    </Text>
                  ) : null}
                </Pressable>
                {open
                  ? row.subcategories.map((sub) => (
                      <View
                        key={sub.id}
                        style={[styles.subLabel, { height: SUB_H }]}
                      >
                        <Text style={styles.subLabelText} numberOfLines={2}>
                          {sub.label}
                        </Text>
                      </View>
                    ))
                  : null}
              </View>
            );
          })}
          <View style={[styles.totalLabel, { height: ROW_H }]}>
            <Text style={styles.totalText}>{MONEY_MAP_COPY.totalRow}</Text>
          </View>
        </View>

        {/* Months + trend scroll sideways */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={{ flex: 1 }}
        >
          <View>
            <View style={{ flexDirection: "row" }}>
              {report.months.map((m) => (
                <View key={m.key} style={[styles.headCell, { width: CELL_W }]}>
                  <Text style={[styles.headText, { textAlign: "right" }]}>
                    {m.short}
                    {m.partial ? `\n${MONEY_MAP_COPY.partialNote}` : ""}
                  </Text>
                </View>
              ))}
              <View style={[styles.headCell, { width: TREND_W }]}>
                <Text style={[styles.headText, { textAlign: "right" }]}>
                  {MONEY_MAP_COPY.trendColumn}
                </Text>
              </View>
            </View>
            {report.rows.map((row) => {
              const open = expanded === row.key;
              const tone = natureTrendTone(row);
              return (
                <View key={row.key}>
                  <View style={{ flexDirection: "row", height: ROW_H }}>
                    {report.months.map((m, i) => (
                      <View
                        key={m.key}
                        style={[styles.cell, { width: CELL_W }]}
                      >
                        {m.hasData ? (
                          <>
                            <Text style={styles.amount} numberOfLines={1}>
                              {amountText(row.amounts[i], visible)}
                            </Text>
                            {row.shares[i] != null ? (
                              <Text style={styles.share}>
                                {Math.round(row.shares[i] as number)}%
                              </Text>
                            ) : null}
                          </>
                        ) : (
                          <Text
                            style={styles.amount}
                            accessibilityLabel="No data"
                          >
                            –
                          </Text>
                        )}
                      </View>
                    ))}
                    <View style={[styles.cell, { width: TREND_W }]}>
                      <Text
                        style={[styles.trend, { color: toneColor(tone) }]}
                        numberOfLines={1}
                      >
                        {prevOk ? `${natureTrendArrow(row.trend)} ` : ""}
                        {trendLabel(row)}
                      </Text>
                    </View>
                  </View>
                  {open
                    ? row.subcategories.map((sub) => (
                        <View
                          key={sub.id}
                          style={{
                            flexDirection: "row",
                            height: SUB_H,
                            backgroundColor: Colors.surfaceMuted,
                          }}
                        >
                          {report.months.map((m, i) => (
                            <View
                              key={m.key}
                              style={[styles.cell, { width: CELL_W }]}
                            >
                              <Text style={styles.subAmount} numberOfLines={1}>
                                {m.hasData
                                  ? amountText(sub.amounts[i], visible)
                                  : "–"}
                              </Text>
                            </View>
                          ))}
                          <View style={{ width: TREND_W }} />
                        </View>
                      ))
                    : null}
                </View>
              );
            })}
            <View style={{ flexDirection: "row", height: ROW_H }}>
              {report.months.map((m, i) => (
                <View key={m.key} style={[styles.cell, { width: CELL_W }]}>
                  <Text style={styles.totalText} numberOfLines={1}>
                    {m.hasData ? amountText(report.totals[i], visible) : "–"}
                  </Text>
                </View>
              ))}
              <View style={{ width: TREND_W }} />
            </View>
          </View>
        </ScrollView>
      </View>

      <BottomSheet
        visible={showReport}
        onClose={() => setShowReport(false)}
        scroll
      >
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {MONEY_MAP_COPY.reportTitle}
          </Text>
          <Pressable
            onPress={() => setShowReport(false)}
            accessibilityRole="button"
            style={styles.linkBtn}
          >
            <Text style={styles.linkBtnText}>{MONEY_MAP_COPY.close}</Text>
          </Pressable>
        </View>

        <Text style={styles.sheetKicker}>{MONEY_MAP_COPY.moverHeading}</Text>
        <Text style={styles.sheetBody}>
          {maskRupees(natureMoverLine(report), visible)}
        </Text>

        {report.insights.length > 0 ? (
          <>
            <Text style={styles.sheetKicker}>
              {MONEY_MAP_COPY.insightsHeading}
            </Text>
            {report.insights.map((line) => (
              <View key={line} style={styles.bulletRow}>
                <Text style={styles.sheetBody}>•</Text>
                <Text style={[styles.sheetBody, { flex: 1 }]}>
                  {maskRupees(line, visible)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {saving ? (
          <>
            <Text style={styles.sheetKicker}>
              {MONEY_MAP_COPY.savingHeading}
            </Text>
            <Text style={styles.sheetBody}>
              {maskRupees(natureSavingLine(saving), visible)}
            </Text>
          </>
        ) : null}

        {report.suggestedAction ? (
          <View style={styles.actionBox}>
            <Text style={styles.sheetKicker}>
              {MONEY_MAP_COPY.actionHeading}
            </Text>
            <Text style={[styles.sheetBody, { fontWeight: "600" }]}>
              {maskRupees(report.suggestedAction, visible)}
            </Text>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.card,
    padding: 16,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  headRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  title: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  linkBtn: { minHeight: 36, paddingHorizontal: 8, justifyContent: "center" },
  linkBtnText: { fontSize: 12, fontWeight: "600", color: Colors.primaryText },
  reportBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
  },
  reportBtnText: { fontSize: 12, fontWeight: "700", color: Colors.primaryText },
  headCell: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  rowLabel: {
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    paddingRight: 8,
    backgroundColor: Colors.card,
  },
  rowLabelText: { fontSize: 14, fontWeight: "500", color: Colors.textPrimary },
  note: { marginTop: 2, fontSize: 10, color: Colors.textSecondary },
  subLabel: {
    justifyContent: "center",
    paddingLeft: 12,
    paddingRight: 8,
    backgroundColor: Colors.surfaceMuted,
  },
  subLabelText: { fontSize: 12, color: Colors.textSecondary },
  totalLabel: {
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    backgroundColor: Colors.card,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "right",
  },
  cell: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  amount: { fontSize: 13, color: Colors.textPrimary },
  share: { marginTop: 2, fontSize: 10, color: Colors.textSecondary },
  subAmount: { fontSize: 12, color: Colors.textPrimary },
  trend: { fontSize: 12, fontWeight: "600" },
  skelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  skelBars: { flexDirection: "row", gap: 8 },
  skelBar: {
    width: 44,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceMuted,
  },
  teaser: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  cta: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  ctaText: { fontSize: 14, fontWeight: "600", color: Colors.onPrimary },
  soon: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sheetKicker: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primaryText,
  },
  sheetBody: { fontSize: 14, lineHeight: 21, color: Colors.textPrimary },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  actionBox: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    backgroundColor: Colors.primaryLight,
  },
}));
