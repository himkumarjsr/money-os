import { StyleSheet, Text, View } from "react-native";
import type { GoalItem } from "@/lib/priorityEngine";
import { Spacing } from "@/constants/theme";
import { inr, shared } from "./shared";

const MAX_YEARS = 35;

/** Matches web LifeMapCard: every goal on one timeline, each funded from this month. */
export function LifeMapCard({
  goals,
  selfAge,
}: {
  goals: GoalItem[];
  selfAge?: number;
}) {
  const rows = goals
    .filter((g) => g.goalId && (g.monthlyAllocated ?? 0) > 0)
    .sort((a, b) => a.yearsToGoal - b.yearsToGoal);
  if (rows.length === 0) return null;

  const span = Math.min(MAX_YEARS, Math.max(5, ...rows.map((g) => g.yearsToGoal)));
  const thisYear = new Date().getFullYear();
  const total = rows.reduce((s, g) => s + (g.monthlyAllocated ?? 0), 0);

  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>Your financial life map</Text>
      <Text style={styles.intro}>
        Every goal starts this month, side by side: ₹{inr(total)}/month across{" "}
        {rows.length} {rows.length === 1 ? "goal" : "goals"}.
      </Text>
      <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
        {rows.map((g) => {
          const monthly = g.monthlyAllocated ?? 0;
          const funded =
            g.monthlyRequired > 0
              ? Math.min(100, Math.round((monthly / g.monthlyRequired) * 100))
              : 100;
          const width = Math.max(4, (Math.min(g.yearsToGoal, span) / span) * 100);
          return (
            <View key={g.goalId}>
              <View style={styles.head}>
                <Text style={styles.label}>{g.label ?? g.goalType}</Text>
                <Text style={styles.when}>
                  {thisYear + g.yearsToGoal}
                  {selfAge ? ` · age ${selfAge + g.yearsToGoal}` : ""}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.span, { width: `${width}%` }]}>
                  <View style={[styles.fill, { width: `${funded}%` }]} />
                </View>
              </View>
              <Text style={styles.meta}>
                ₹{inr(monthly)}/mo now toward ₹{inr(g.targetAmount)} ·{" "}
                {funded >= 100 ? "fully funded" : `${funded}% funded`}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>Today</Text>
        <Text style={styles.axisText}>
          {span >= MAX_YEARS ? `${span}+ years` : `${span} years`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: Spacing.xs, fontSize: 13, lineHeight: 19, color: "#454442" },
  head: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
  label: { flex: 1, fontSize: 13, fontWeight: "600", color: "#111110" },
  when: { fontSize: 13, color: "#7A7871" },
  track: { marginTop: 4, height: 12, borderRadius: 6, backgroundColor: "#F1F0EC" },
  span: { height: 12, borderRadius: 6, backgroundColor: "#DCD9F5", overflow: "hidden" },
  fill: { height: 12, backgroundColor: "#534AB7" },
  meta: { marginTop: 4, fontSize: 12, color: "#5F5E5A" },
  axis: { marginTop: Spacing.md, flexDirection: "row", justifyContent: "space-between" },
  axisText: { fontSize: 11, color: "#9B9A94" },
});
