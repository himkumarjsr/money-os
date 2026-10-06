import { StyleSheet, Text, View } from "react-native";
import type { GoalItem } from "@/lib/priorityEngine";
import { Colors, Spacing } from "@/constants/theme";
import { loc, shared } from "./shared";

export function GoalPlanCard({ goal }: { goal: GoalItem }) {
  const pct = Math.min(
    100,
    (Number(goal.currentSaved || 0) /
      Math.max(Number(goal.targetAmount || 0), 1)) *
      100,
  );
  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>Goal plan</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, pct)}%` }]} />
      </View>
      <Text style={styles.line}>
        Target ₹{loc(goal.targetAmount)} · Saved ₹{loc(goal.currentSaved)}
      </Text>
      <Text style={[styles.line, styles.primary]}>
        Monthly required ₹{loc(goal.monthlyRequired)} · Timeline{" "}
        {goal.yearsToGoal} years
      </Text>
      <Text style={[styles.line, styles.muted]}>
        Instrument: {goal.instrument}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    marginTop: Spacing.md,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#ECEAF5",
  },
  fill: { height: "100%", backgroundColor: Colors.primary },
  line: { marginTop: Spacing.sm, fontSize: 14, color: Colors.textPrimary },
  primary: { marginTop: 2, color: Colors.primary },
  muted: { marginTop: 2, color: "#7A7871" },
});
