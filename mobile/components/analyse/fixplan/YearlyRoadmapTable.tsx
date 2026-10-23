/**
 * Year by year until the last goal: monthly SIP, goal money, EPF etc.,
 * savings, loans left and net worth, what happens - then "Can you retire?".
 * Port of web `components/analyse/YearlyRoadmapTable.tsx`.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { GoalFundingItem } from "@/lib/goalFunding";
import { buildYearlyRoadmap, retirementCheck } from "@/lib/goalStrategies";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import { inr, shared } from "./shared";

const PREVIEW_ROWS = 6;
const W = { year: 60, money: 120, events: 260 };

export function YearlyRoadmapTable({
  profile,
  items,
}: {
  profile: FinancialProfile;
  items: GoalFundingItem[] | undefined;
}) {
  const rows = useMemo(
    () => buildYearlyRoadmap(profile, items ?? []),
    [profile, items],
  );
  const retire = useMemo(
    () => retirementCheck(profile, items ?? [], new Date(), rows),
    [profile, items, rows],
  );
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, PREVIEW_ROWS);
  const last = rows[rows.length - 1].year;
  const showPf = rows.some((r) => r.pf > 0);
  const showSavings = rows.some((r) => r.savings > 0);
  const showLoans = rows.some((r) => r.loansLeft > 0);
  const num = [styles.td, styles.num, { width: W.money }];
  const head = [styles.th, styles.num, { width: W.money }];

  return (
    <>
      <View style={shared.card}>
        <Text style={shared.cardTitle}>Year by year to {last}</Text>
        <Text style={styles.hint}>
          What to invest each month, what your money grows to, and what happens
          each year until your last goal. Goal money
          {showPf ? " + EPF / PPF / NPS" : ""}
          {showSavings ? " + other savings" : ""}
          {showLoans ? " − loans left" : ""} = net worth (home and car not
          counted). When a loan ends or a goal is paid for, its EMI or SIP keeps
          going into your next goal. Today&apos;s rupees; the SIP rises with
          your salary.
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.scroll}
          contentContainerStyle={styles.table}
        >
          <View>
            <View style={[styles.tr, styles.thead]}>
              <Text style={[styles.th, { width: W.year }]}>Year</Text>
              <Text style={head}>Invest / month</Text>
              <Text style={head}>Goal money</Text>
              {showPf ? <Text style={head}>EPF / PPF / NPS</Text> : null}
              {showSavings ? <Text style={head}>Other savings</Text> : null}
              {showLoans ? <Text style={head}>Loans left</Text> : null}
              <Text style={head}>Net worth</Text>
              <Text style={[styles.th, { width: W.events }]}>What happens</Text>
            </View>
            {shown.map((r) => (
              <View key={r.year} style={[styles.tr, styles.trBody]}>
                <Text style={[styles.td, styles.tdYear, { width: W.year }]}>
                  {r.year}
                </Text>
                <Text style={num}>₹{inr(r.monthly)}</Text>
                <Text style={num}>₹{inr(r.worth)}</Text>
                {showPf ? <Text style={num}>₹{inr(r.pf)}</Text> : null}
                {showSavings ? (
                  <Text style={num}>₹{inr(r.savings)}</Text>
                ) : null}
                {showLoans ? (
                  <Text style={[...num, styles.tdLoan]}>
                    {r.loansLeft > 0 ? `−₹${inr(r.loansLeft)}` : "₹0"}
                  </Text>
                ) : null}
                <Text style={[...num, styles.tdYear]}>
                  {r.netWorth < 0 ? "−" : ""}₹{inr(Math.abs(r.netWorth))}
                </Text>
                <Text style={[styles.td, styles.tdNote, { width: W.events }]}>
                  {r.events.length > 0 ? r.events.join(" · ") : "Keep going"}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        {rows.length > PREVIEW_ROWS ? (
          <Pressable
            onPress={() => setAll((v) => !v)}
            style={styles.more}
            accessibilityRole="button"
            accessibilityState={{ expanded: all }}
          >
            <Text style={styles.moreText}>
              {all ? "Show fewer years ↑" : `Show all ${rows.length} years ↓`}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {retire ? (
        <View
          style={[
            shared.card,
            retire.canRetire ? styles.retireYes : styles.retireNo,
          ]}
        >
          <Text style={shared.cardTitle}>
            Can you retire in {retire.year}?{" "}
            <Text style={retire.canRetire ? styles.answerYes : styles.answerNo}>
              {retire.canRetire ? "Yes" : "Not yet"}
            </Text>
          </Text>
          <View style={styles.facts}>
            {(
              [
                [`Money at ${retire.age}`, retire.corpus],
                [
                  `Pays a month (${Math.round(retire.withdrawalRate * 1000) / 10}% a year)`,
                  retire.monthlyIncome,
                ],
                ["Costs a month then", retire.monthlyCosts],
                ["Money needed", retire.corpusNeeded],
              ] as Array<[string, number]>
            ).map(([label, v]) => (
              <View key={label} style={styles.fact}>
                <Text style={styles.factLabel}>{label}</Text>
                <Text style={styles.factValue}>₹{inr(v)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.retireLine}>{retire.line}</Text>
        </View>
      ) : null}
    </>
  );
}

const styles = themedStyles(() => ({
  scroll: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  table: { flexGrow: 1 },
  hint: { marginTop: 4, fontSize: 12, color: Colors.textSecondary },
  tr: { flexDirection: "row" },
  thead: { backgroundColor: Colors.background },
  trBody: { borderTopWidth: 1, borderTopColor: Colors.surfaceMuted },
  th: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  td: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  num: { textAlign: "right" },
  tdYear: { fontWeight: "500" },
  tdNote: { fontSize: 12, color: Colors.textSecondary },
  tdLoan: { color: Colors.errorText },
  retireYes: { borderWidth: 1, borderColor: Colors.success },
  retireNo: { borderWidth: 1, borderColor: Colors.warning },
  answerYes: { color: Colors.successText },
  answerNo: { color: Colors.warningText },
  facts: {
    marginTop: Spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: Spacing.md,
  },
  fact: { width: "50%", paddingRight: 8 },
  factLabel: { fontSize: 12, color: Colors.textSecondary },
  factValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  retireLine: {
    marginTop: Spacing.md,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  more: { minHeight: 44, justifyContent: "center" },
  moreText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
}));
