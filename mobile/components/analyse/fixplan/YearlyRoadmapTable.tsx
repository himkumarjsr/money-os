/**
 * Year by year until the last goal: monthly SIP, goal money, what happens.
 * Port of web `components/analyse/YearlyRoadmapTable.tsx`.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { GoalFundingItem } from "@/lib/goalFunding";
import { buildYearlyRoadmap } from "@/lib/goalStrategies";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import { inr, shared } from "./shared";

const PREVIEW_ROWS = 6;
const W = { year: 60, monthly: 112, worth: 120, events: 260 };

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
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, PREVIEW_ROWS);
  const last = rows[rows.length - 1].year;

  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>Year by year to {last}</Text>
      <Text style={styles.hint}>
        What to invest each month, what your goal money grows to, and what
        happens each year until your last goal. Today&apos;s rupees; the SIP
        rises with your salary.
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
            <Text style={[styles.th, styles.num, { width: W.monthly }]}>
              Invest / month
            </Text>
            <Text style={[styles.th, styles.num, { width: W.worth }]}>
              Goal money
            </Text>
            <Text style={[styles.th, { width: W.events }]}>What happens</Text>
          </View>
          {shown.map((r) => (
            <View key={r.year} style={[styles.tr, styles.trBody]}>
              <Text style={[styles.td, styles.tdYear, { width: W.year }]}>
                {r.year}
              </Text>
              <Text style={[styles.td, styles.num, { width: W.monthly }]}>
                ₹{inr(r.monthly)}
              </Text>
              <Text style={[styles.td, styles.num, { width: W.worth }]}>
                ₹{inr(r.worth)}
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
  more: { minHeight: 44, justifyContent: "center" },
  moreText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
}));
