import { StyleSheet, Text, View } from "react-native";
import { Spacing } from "@/constants/theme";
import {
  formatLakhCrore,
  type NetWorthTrajectory,
} from "@/lib/netWorthTrajectory";
import { shared } from "./shared";

const CHART_HEIGHT = 140;

/** Matches web NetWorthTrajectoryCard: today and 5/10/20 years out, in today's rupees. */
export function NetWorthTrajectoryCard({
  trajectory,
}: {
  trajectory: NetWorthTrajectory;
}) {
  const { points, spentGoals } = trajectory;
  if (points.length < 2) return null;
  const max = Math.max(1, ...points.map((p) => Math.abs(p.netWorth)));
  const last = points[points.length - 1];

  return (
    <View style={shared.card}>
      <Text style={shared.cardTitle}>Where your net worth is heading</Text>
      <Text style={styles.intro}>
        Following this plan: {formatLakhCrore(points[0].netWorth)} today →{" "}
        <Text style={styles.highlight}>{formatLakhCrore(last.netWorth)}</Text> in{" "}
        {last.year} years, in today&apos;s rupees.
      </Text>
      <View
        style={styles.chart}
        accessible
        accessibilityLabel={`Net worth projection: ${points
          .map((p) => `${p.year === 0 ? "today" : `${p.year} years`} ${formatLakhCrore(p.netWorth)}`)
          .join(", ")}`}
      >
        {points.map((p) => {
          const negative = p.netWorth < 0;
          const h = Math.max(4, (Math.abs(p.netWorth) / max) * CHART_HEIGHT);
          return (
            <View key={p.year} style={styles.col}>
              <Text style={[styles.value, negative && { color: "#E24B4A" }]}>
                {formatLakhCrore(p.netWorth)}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: negative ? "#F4B9B8" : "#534AB7",
                    opacity: p.year === 0 ? 0.55 : 1,
                  },
                ]}
              />
              <Text style={styles.year}>{p.year === 0 ? "Today" : `${p.year}y`}</Text>
              {p.age != null ? <Text style={styles.age}>age {p.age}</Text> : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>
        Includes EPF/PPF/NPS compounding, your current SIPs, this plan&apos;s goal
        SIPs and loans paying down on their EMIs.
        {spentGoals.length > 0
          ? ` Goal money is used when due: ${spentGoals
              .map((g) => `${g.label} (year ${g.year})`)
              .join(", ")}.`
          : ""}{" "}
        Assumes long-run returns of 12% equity, 6% FDs and cash, 8% gold, and 6%
        inflation. These are projections, not guarantees.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: Spacing.xs, fontSize: 13, lineHeight: 19, color: "#454442" },
  highlight: { fontWeight: "700", color: "#534AB7" },
  chart: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.md,
  },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  value: { marginBottom: 4, fontSize: 12, fontWeight: "700", color: "#111110" },
  bar: { width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  year: { marginTop: 6, fontSize: 12, fontWeight: "600", color: "#454442" },
  age: { fontSize: 11, color: "#9B9A94" },
  note: { marginTop: Spacing.md, fontSize: 12, lineHeight: 18, color: "#7A7871" },
});
