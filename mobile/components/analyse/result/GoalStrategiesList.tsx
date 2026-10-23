/**
 * Smart routes to one goal (lib/goalStrategies) and, for an older home
 * amount, the one question that settles whether it was the price.
 * Port of web `components/analyse/GoalStrategiesList.tsx`.
 */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Colors, readable, themedStyles, tintBg } from "@/constants/theme";
import { formatIndian } from "@/lib/formatters";
import { homeUpfrontShare, type DetectedGoal } from "@/lib/goalDetection";
import {
  goalReachLine,
  goalReachPutInLine,
  goalReachTableNote,
  type GoalReach,
  type GoalStrategyPlan,
  type StrategyKind,
} from "@/lib/goalStrategies";

const KIND: Record<StrategyKind, { label: string; bg: string; fg: string }> = {
  smart: { label: "Smart move", bg: "#E8F6F1", fg: "#1D9E75" },
  tradeoff: { label: "Trade-off", bg: "#FFF3E6", fg: "#BA7517" },
  check: { label: "Reality check", bg: "#EEEDFE", fg: "#534AB7" },
};

export function GoalStrategiesList({
  goal,
  plan,
  reach,
  busy,
  onSetHomePrice,
}: {
  goal: DetectedGoal;
  plan?: GoalStrategyPlan;
  /** When the goal is reached at the plan's monthly amount. */
  reach?: GoalReach;
  busy?: boolean;
  onSetHomePrice?: (price: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [openYear, setOpenYear] = useState<number | null>(null);
  const unclear = goal.home?.unclearAmount && onSetHomePrice;
  const count = plan?.strategies.length ?? 0;
  if (!unclear && !plan?.summary && count === 0 && !reach) return null;

  return (
    <View style={styles.wrap}>
      {unclear ? (
        <View style={styles.ask}>
          <Text style={styles.askText}>
            Is ₹{formatIndian(goal.targetAmount)} the home&apos;s price or the
            cash you need upfront?
          </Text>
          <View style={styles.row}>
            <Pressable
              disabled={busy}
              onPress={() => onSetHomePrice(goal.targetAmount)}
              style={[styles.askBtn, busy && styles.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.askBtnText}>The home&apos;s price</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() =>
                onSetHomePrice(
                  goal.targetAmount /
                    homeUpfrontShare(goal.home?.includeInteriors),
                )
              }
              style={[styles.askBtn, busy && styles.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.askBtnText}>Cash upfront</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {reach ? (
        <View
          style={[
            styles.reach,
            { backgroundColor: tintBg(reach.onTime ? "#E8F6F1" : "#FFF3E6") },
          ]}
        >
          <Text
            style={[
              styles.reachText,
              { color: readable(reach.onTime ? "#0F6E56" : "#854F0B") },
            ]}
          >
            {goalReachLine(reach, goal)}
          </Text>
          {reach.rows.length > 0 ? (
            <Pressable
              onPress={() => setTableOpen((v) => !v)}
              style={styles.toggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: tableOpen }}
            >
              <Text style={styles.toggleText}>
                {tableOpen ? "Hide year by year ↑" : "Year by year ↓"}
              </Text>
            </Pressable>
          ) : null}
          {tableOpen ? (
            <View>
              <View style={styles.tr}>
                <Text style={[styles.th, styles.cYear]}>Year</Text>
                <Text style={[styles.th, styles.cNum]}>Put in</Text>
                <Text style={[styles.th, styles.cNum]}>Worth</Text>
              </View>
              {reach.rows.map((r) => {
                const hit = r.year === reach.reachYear;
                const mark = hit
                  ? " ✓"
                  : r.year === goal.targetYear
                    ? " ◎"
                    : "";
                const cell = [styles.td, hit && styles.tdHit];
                const shown = openYear === r.year;
                return (
                  <Pressable
                    key={r.year}
                    onPress={() => setOpenYear(shown ? null : r.year)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: shown }}
                    accessibilityHint="Shows what this amount is made of"
                    style={styles.trLine}
                  >
                    <View style={styles.tr}>
                      <Text style={[...cell, styles.cYear]}>
                        {r.year}
                        {mark}
                      </Text>
                      <Text style={[...cell, styles.cNum, styles.putIn]}>
                        ₹{formatIndian(r.invested)}
                      </Text>
                      <Text style={[...cell, styles.cNum]}>
                        ₹{formatIndian(r.value)}
                      </Text>
                    </View>
                    {shown ? (
                      <Text style={styles.putInLine}>
                        {goalReachPutInLine(r)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
              <Text style={styles.foot}>
                Tap a &quot;Put in&quot; amount to see what it is made of.{" "}
                {goalReachTableNote(reach, goal)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {plan?.summary ? (
        <Text style={styles.summary}>{plan.summary}</Text>
      ) : null}
      {count > 0 ? (
        <>
          <Pressable
            onPress={() => setOpen((v) => !v)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
          >
            <Text style={styles.toggleText}>
              {open ? "Hide" : "Smart ways to reach it"} ({count}){" "}
              {open ? "↑" : "↓"}
            </Text>
          </Pressable>
          {open
            ? plan!.strategies.map((s) => (
                <View key={s.id} style={styles.item}>
                  <View style={styles.itemHead}>
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: tintBg(KIND[s.kind].bg) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: readable(KIND[s.kind].fg) },
                        ]}
                      >
                        {KIND[s.kind].label}
                      </Text>
                    </View>
                    {s.monthlySaved ? (
                      <Text style={styles.saved}>
                        −₹{formatIndian(Math.round(s.monthlySaved))}/mo
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemTitle}>{s.title}</Text>
                  <Text style={styles.itemDetail}>{s.detail}</Text>
                </View>
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { marginTop: 8, gap: 8 },
  ask: {
    borderRadius: 8,
    backgroundColor: tintBg("#FFF3E6"),
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  askText: { fontSize: 12, fontWeight: "600", color: Colors.textPrimary },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  askBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  askBtnText: { fontSize: 13, fontWeight: "600", color: Colors.primaryText },
  disabled: { opacity: 0.6 },
  summary: {
    borderRadius: 8,
    backgroundColor: tintBg("#E8F6F1"),
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    color: readable("#0F6E56"),
  },
  toggle: { minHeight: 44, justifyContent: "center" },
  reach: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  reachText: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
  tr: { flexDirection: "row", paddingVertical: 4 },
  trLine: { borderTopWidth: 1, borderTopColor: Colors.surfaceMuted },
  th: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  td: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  tdHit: { fontWeight: "700", color: readable("#0F6E56") },
  putIn: {
    color: Colors.primaryText,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
  putInLine: {
    paddingBottom: 6,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textSecondary,
  },
  cYear: { flex: 1 },
  cNum: { flex: 1.4, textAlign: "right" },
  foot: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textSecondary,
  },
  toggleText: { fontSize: 13, fontWeight: "600", color: Colors.primaryText },
  item: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 10, fontWeight: "600" },
  saved: { fontSize: 12, fontWeight: "700", color: readable("#1D9E75") },
  itemTitle: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  itemDetail: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    color: Colors.textSecondary,
  },
}));
