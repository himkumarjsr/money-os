import { Pressable, StyleSheet, Text, View } from "react-native";
import type { GoalAdvice } from "@/lib/fixPlanMerge";
import { formatStartMonth, type GoalPlanProgress } from "@/lib/plannedInvestments";
import type { GoalItem } from "@/lib/priorityEngine";
import { Colors, Spacing } from "@/constants/theme";
import { loc, shared } from "./shared";

/** Every goal funded in parallel (weighted split from goalFunding), largest share first. */
export function GoalPlanCard({
  goals,
  plans,
  progress,
  onStart,
}: {
  goals: GoalItem[];
  plans?: Record<string, GoalAdvice>;
  progress?: Record<string, GoalPlanProgress>;
  onStart?: () => void;
}) {
  const parallel = goals.some((g) => g.monthlyAllocated != null);
  const budget = goals.reduce((s, g) => s + (g.monthlyAllocated ?? 0), 0);
  const shortfall = goals.reduce(
    (s, g) =>
      s +
      Math.max(0, g.monthlyRequired - (g.monthlyAllocated ?? g.monthlyRequired)),
    0,
  );
  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>Goal plan</Text>
      {parallel ? (
        <Text style={styles.intro}>
          ₹{loc(budget)}/month, split across {goals.length}{" "}
          {goals.length === 1 ? "goal" : "goals"} at the same time — nearer
          deadlines get more, long-horizon goals are never left at zero.
        </Text>
      ) : null}
      <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
        {goals.map((g) => {
          const monthly = g.monthlyAllocated ?? g.monthlyRequired;
          const funded =
            g.monthlyRequired > 0
              ? Math.min(100, Math.round((monthly / g.monthlyRequired) * 100))
              : 100;
          return (
            <View key={g.goalId ?? g.goalType} style={styles.row}>
              <View style={styles.head}>
                <Text style={styles.title}>{g.label ?? g.goalType}</Text>
                <Text style={styles.amount}>
                  ₹{loc(monthly)}/mo
                  {g.sharePct != null ? (
                    <Text style={styles.share}> {g.sharePct}%</Text>
                  ) : null}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${funded}%` }]} />
              </View>
              <Text style={styles.line}>
                Target ₹{loc(g.targetAmount)} in {g.yearsToGoal}{" "}
                {g.yearsToGoal === 1 ? "year" : "years"} ·{" "}
                {funded >= 100
                  ? "fully funded"
                  : `${funded}% of the ₹${loc(g.monthlyRequired)}/mo needed`}
              </Text>
              {g.allocation?.slices.length ? (
                <View style={styles.split}>
                  <Text style={styles.splitTitle}>
                    Where it goes
                    {g.allocation.riskAssumed ? (
                      <Text style={styles.muted}>
                        {" "}
                        · assumes a moderate risk profile
                      </Text>
                    ) : null}
                  </Text>
                  {g.allocation.slices.map((s) => (
                    <View key={s.key} style={styles.splitRow}>
                      <Text style={styles.splitLabel}>{s.label}</Text>
                      <Text style={styles.splitAmount}>
                        ₹{loc(s.monthly)}/mo · {s.pct}%
                      </Text>
                    </View>
                  ))}
                  {g.allocation.realEstateNote ? (
                    <Text style={[styles.line, styles.muted]}>
                      {g.allocation.realEstateNote}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.line, styles.muted]}>
                  Instrument: {g.instrument}
                </Text>
              )}
              {g.goalId && progress?.[g.goalId] ? (
                <Text style={styles.progress}>
                  {progress[g.goalId].started >= progress[g.goalId].total
                    ? "✓ Started"
                    : progress[g.goalId].started > 0
                      ? `${progress[g.goalId].started} of ${progress[g.goalId].total} started`
                      : `Reminder set · starts ${formatStartMonth(progress[g.goalId].nextStart ?? "")}`}
                </Text>
              ) : null}
              {g.goalId && plans?.[g.goalId] ? (
                <View style={styles.advice}>
                  <Text style={styles.adviceText}>{plans[g.goalId].why}</Text>
                  <Text style={styles.adviceText}>
                    {plans[g.goalId].instrumentRationale}
                  </Text>
                  <Text style={[styles.adviceText, styles.watch]}>
                    Watch out: {plans[g.goalId].watchOut}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      {shortfall > 0 ? (
        <Text style={[styles.line, styles.muted, { marginTop: Spacing.md }]}>
          Another ₹{loc(shortfall)}/month would fund every goal on time.
        </Text>
      ) : null}
      {onStart && goals.some((g) => g.allocation?.slices.length) ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={onStart}
            style={styles.startBtn}
          >
            <Text style={styles.startText}>
              {progress && Object.keys(progress).length > 0
                ? "Update reminders"
                : "Start this plan"}
            </Text>
          </Pressable>
          <Text style={styles.startHint}>
            Creates reminders and Tracker items only. Nothing is invested
            automatically.
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: Spacing.xs,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
    color: "#454442",
  },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECEAF5",
    padding: Spacing.md,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
    fontVariant: ["tabular-nums"],
  },
  share: { fontSize: 12, fontWeight: "600", color: "#7A7871" },
  track: {
    marginTop: Spacing.sm,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#ECEAF5",
  },
  fill: { height: "100%", backgroundColor: Colors.primary },
  line: { marginTop: 6, fontSize: 12, fontWeight: "500", color: "#454442" },
  muted: { marginTop: 2, color: "#7A7871" },
  split: { marginTop: Spacing.sm, gap: 2 },
  progress: { marginTop: Spacing.sm, fontSize: 12, fontWeight: "600", color: "#1D9E75" },
  startBtn: {
    marginTop: Spacing.lg,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  startText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  startHint: { marginTop: 6, fontSize: 11, color: "#7A7871", textAlign: "center" },
  splitTitle: { fontSize: 12, fontWeight: "600", color: "#454442" },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  splitLabel: { flex: 1, fontSize: 12, color: "#454442" },
  splitAmount: { fontSize: 12, color: "#454442", fontVariant: ["tabular-nums"] },
  advice: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#ECEAF5",
    gap: 4,
  },
  adviceText: { fontSize: 13, lineHeight: 18, color: "#454442" },
  watch: { color: "#8C5A0A" },
});
