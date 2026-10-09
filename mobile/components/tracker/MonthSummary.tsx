import { StyleSheet, Text, View } from "react-native";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import { Colors } from "@/constants/theme";
import { TRACKER_CATEGORIES, type BucketType } from "@/lib/tracker-categories";
import { buildMonthSummaryRows } from "@/lib/trackerMonthSummary";
import type { UniversalBucketKey } from "@/lib/universal-buckets";

/** Per-bucket spend against the user's budget — port of web MonthSummary. */
export function MonthSummary({
  title,
  bucketTotals,
  totalSpent,
  income,
  caps,
}: {
  title: string;
  bucketTotals: Record<string, number>;
  totalSpent: number;
  /** Month income; budgets are a share of it (share of spend when 0). */
  income: number;
  /** Whole-percent caps from `monthSummaryCaps`. */
  caps: Record<UniversalBucketKey, number>;
}) {
  const rows = buildMonthSummaryRows({
    bucketTotals,
    totalSpent,
    income,
    caps,
  });
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {rows.map(
        (
          { key, amount, capPct, isTarget, fillPct, over: isOverBudget },
          i,
          arr,
        ) => {
          const cat = TRACKER_CATEGORIES[key as BucketType];
          return (
            <View
              key={key}
              style={i < arr.length - 1 ? styles.rowSpaced : undefined}
            >
              <View style={styles.rowHead}>
                <View style={styles.labelWrap}>
                  <TrackerIcon name={cat.icon} size={18} color={cat.color} />
                  <Text style={styles.label}>{cat.label}</Text>
                  {capPct > 0 ? (
                    <Text style={styles.cap}>
                      ({capPct}% {isTarget ? "target" : "cap"})
                    </Text>
                  ) : null}
                </View>
                <View style={styles.amountWrap}>
                  {isOverBudget ? (
                    <View style={styles.overChip}>
                      <Text style={styles.overText}>OVER</Text>
                    </View>
                  ) : null}
                  <Text
                    style={[
                      styles.amount,
                      isOverBudget && { color: "#B42323" },
                    ]}
                  >
                    ₹{amount.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${fillPct}%`,
                      backgroundColor: isOverBudget ? Colors.error : cat.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        },
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  title: {
    marginBottom: 12,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.primary,
  },
  rowSpaced: { marginBottom: 12 },
  rowHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  labelWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  cap: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textPrimary,
    opacity: 0.9,
  },
  amountWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  overChip: {
    borderRadius: 4,
    backgroundColor: "#FDEDED",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  overText: { fontSize: 9, fontWeight: "700", color: "#991B1B" },
  amount: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
});
