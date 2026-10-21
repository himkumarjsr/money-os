import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { PriorityItem } from "@/lib/priorityEngine";
import { monthsForPriority } from "@/lib/fixPlanMerge";
import {
  Colors,
  Radius,
  Spacing,
  themedStyles,
  tintBg,
  getActiveTheme,
} from "@/constants/theme";
import { inr, loc, shared, urgencyColor } from "./shared";
import { openContentHref } from "@/lib/contentLinks";

type Props = {
  priority: PriorityItem;
  monthlySurplus: number;
  explanation?: string;
  /** User already said yes to a term top-up (lets them take it back). */
  termTopUpChosen?: boolean;
  onTermTopUpAnswer?: (yes: boolean) => Promise<void>;
};

export function PriorityCard({
  priority: p,
  monthlySurplus,
  explanation,
  termTopUpChosen,
  onTermTopUpAnswer,
}: Props) {
  const [saving, setSaving] = useState(false);
  const answer = async (yes: boolean) => {
    if (!onTermTopUpAnswer) return;
    setSaving(true);
    try {
      await onTermTopUpAnswer(yes);
    } finally {
      setSaving(false);
    }
  };
  const quote = Number(p.quoteMonthly || p.monthlyContribution || 0);
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
        {p.reach ? (
          <View style={styles.cell}>
            <Text style={styles.cellText}>
              By {p.reach.targetYear}: ₹{loc(p.reach.projected)} of ₹
              {loc(p.reach.targetAmount)}
            </Text>
            <Text
              style={[
                styles.cellSub,
                {
                  fontWeight: "700",
                  color: p.reach.onTrack ? Colors.success : Colors.error,
                },
              ]}
            >
              {p.reach.onTrack
                ? "On track"
                : `₹${loc(p.reach.shortfall)} short (${p.reach.reachPct}%)`}
            </Text>
          </View>
        ) : (
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
        )}
      </View>

      {p.reach && !p.reach.onTrack ? (
        <View style={styles.reachBox}>
          <Text style={[styles.bold, { color: Colors.error }]}>
            You can&apos;t reach this by {p.reach.targetYear} with your current
            surplus.
          </Text>
          <Text style={[styles.thisWeekText, { marginTop: 4 }]}>
            At {p.reach.nominalReturnPct}% a year (about {p.reach.realReturnPct}
            % after inflation), ₹{loc(p.reach.monthly)}
            /month
            {p.reach.startMonth > 1
              ? ` from month ${p.reach.startMonth}`
              : ""}{" "}
            grows to ₹{loc(p.reach.projected)} in today&apos;s money by{" "}
            {p.reach.targetYear}.
          </Text>
          <Text style={[styles.bold, { marginTop: 8 }]}>What you can do</Text>
          {p.reach.suggestions.map((s: string) => (
            <Text key={s} style={[styles.thisWeekText, { marginTop: 4 }]}>
              • {s}
            </Text>
          ))}
        </View>
      ) : null}

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

      {p.id === "term_insurance" && onTermTopUpAnswer && p.needsAnswer ? (
        <View style={styles.choiceBox}>
          <Text style={styles.choiceQ}>
            Add this top-up to your plan
            {quote > 0 ? ` (about ₹${loc(quote)}/month)` : ""}?
          </Text>
          <View style={styles.choiceRow}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void answer(true)}
              style={[styles.choiceYes, saving && { opacity: 0.5 }]}
            >
              <Text style={styles.choiceYesText}>Yes, add it</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void answer(false)}
              style={[styles.choiceNo, saving && { opacity: 0.5 }]}
            >
              <Text style={styles.choiceNoText}>No, skip it</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {p.id === "term_insurance" &&
      onTermTopUpAnswer &&
      !p.needsAnswer &&
      termTopUpChosen ? (
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void answer(false)}
          style={styles.learn}
        >
          <Text style={styles.learnText}>Remove the top-up from my plan</Text>
        </Pressable>
      ) : null}

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
  choiceBox: { marginTop: Spacing.md, gap: Spacing.sm },
  choiceQ: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  choiceRow: { flexDirection: "row", gap: Spacing.sm },
  choiceYes: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceYesText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "700" },
  choiceNo: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceNoText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
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
  rankText: { fontSize: 14, color: Colors.primaryText, fontWeight: "600" },
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
  urgencyText: { fontSize: 11, color: Colors.primaryText },
  grid: { marginTop: Spacing.md, gap: Spacing.sm },
  cell: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  cellText: { fontSize: 14, color: Colors.textPrimary },
  cellSub: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
  instrument: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.primaryText,
  },
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
  reachBox: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: tintBg("#F3C9C9"),
    backgroundColor: tintBg("#FFF8F8"),
    padding: Spacing.md,
  },
  learn: {
    marginTop: Spacing.md,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor:
      getActiveTheme() === "premium"
        ? "rgba(212,175,55,0.3)"
        : "rgba(83,74,183,0.3)",
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
  },
  learnText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
}));
