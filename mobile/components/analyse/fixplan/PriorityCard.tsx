import { Pressable, Text, View } from "react-native";
import type { PriorityItem } from "@/lib/priorityEngine";
import { monthsForPriority } from "@/lib/fixPlanMerge";
import {
  Colors,
  Radius,
  Spacing,
  themedStyles,
  tintBg,
} from "@/constants/theme";
import { inr, loc, shared, urgencyColor } from "./shared";
import { openContentHref } from "@/lib/contentLinks";

type Props = {
  priority: PriorityItem;
  monthlySurplus: number;
  explanation?: string;
};

export function PriorityCard({
  priority: p,
  monthlySurplus,
  explanation,
}: Props) {
  const isTermTopUp = p.id === "term_insurance" && p.status === "partial";
  const urgency = isTermTopUp ? "high" : p.urgency;
  const isInsurance = p.id === "term_insurance" || p.id === "health_insurance";
  const learnPath =
    p.id === "term_insurance"
      ? "/learn/term-insurance-vs-endowment-why-most-indians-buy-wrong"
      : "/learn/what-is-health-insurance-floater";
  const learnLabel = isTermTopUp
    ? "How term top-ups work (educational) →"
    : p.id === "term_insurance"
      ? "Term cover guide (educational) →"
      : "Health cover guide (educational) →";

  return (
    <View
      style={[
        shared.card,
        styles.card,
        { borderLeftColor: urgencyColor(urgency) },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.rank}>
            <Text style={styles.rankText}>{p.rank}</Text>
          </View>
          <Text style={styles.title}>
            {isTermTopUp ? "Consider term top-up plan" : p.title}
          </Text>
        </View>
        <View style={styles.urgencyPill}>
          <Text style={styles.urgencyText}>{urgency.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.cellText}>Gap ₹{loc(p.gap)}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellText}>
            Monthly ₹{loc(p.monthlyContribution)}
          </Text>
          <Text style={styles.cellSub}>
            From your ₹{inr(monthlySurplus)} surplus · ₹
            {inr(p.surplusAfterThis)} left after this step
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellText}>
            Timeline{" "}
            {monthsForPriority(
              String(p.id || ""),
              Number(p.gap || 0),
              Number(p.monthlyContribution || 0),
            )}{" "}
            months
          </Text>
        </View>
      </View>

      <Text style={styles.instrument}>
        Where to invest: {p.instrument || "As recommended in your plan"}
      </Text>
      <Text style={styles.why}>
        {isTermTopUp
          ? `You have ₹${((p.currentAmount || 0) / 10000000).toFixed(1)}Cr term cover which is good. For your current income and family situation, ₹${((p.targetAmount || 0) / 10000000).toFixed(1)}Cr is recommended. IMPORTANT: Do NOT cancel your existing policy. Instead buy a separate top-up or additional term plan from a different insurer. This costs less than a new full policy and gives you the extra coverage needed.`
          : explanation || p.whyThisMatters}
      </Text>
      <View style={styles.thisWeek}>
        <Text style={styles.thisWeekText}>
          <Text style={styles.bold}>This week:</Text> {p.actionThisWeek}
        </Text>
      </View>

      {isInsurance ? (
        <Pressable
          onPress={() => openContentHref(learnPath)}
          style={styles.learn}
          accessibilityRole="link"
        >
          <Text style={styles.learnText}>{learnLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { borderLeftWidth: 4 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  urgencyPill: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.round,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  urgencyText: { fontSize: 11, color: Colors.primary },
  grid: { marginTop: Spacing.md, gap: Spacing.sm },
  cell: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  cellText: { fontSize: 14, color: Colors.textPrimary },
  cellSub: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
  instrument: { marginTop: Spacing.sm, fontSize: 14, color: Colors.primary },
  why: {
    marginTop: Spacing.sm,
    fontSize: 14,
    fontStyle: "italic",
    color: Colors.textMuted,
    lineHeight: 20,
  },
  thisWeek: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: tintBg("#E7F6F4"),
    padding: Spacing.md,
  },
  thisWeekText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  bold: { fontWeight: "700" },
  learn: {
    marginTop: Spacing.md,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.3)",
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
  },
  learnText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
}));
