/** Native port of components/learn/tools/SipCroreCalculatorEmbed.tsx. */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SliderField } from "@/components/ui/SliderField";
import { ContentBlocks } from "@/components/content/ContentBlocks";
import { Colors } from "@/constants/theme";
import { formatIndian } from "@/lib/formatters";
import { CRORE, monthlySipForGoal, sipMaturityAmount } from "@/lib/sipGoal";

const YEAR_OPTIONS = [10, 15, 20] as const;

export function SipCroreTool() {
  const [years, setYears] = useState<(typeof YEAR_OPTIONS)[number]>(15);
  const [rate, setRate] = useState(12);
  const [goalLakh, setGoalLakh] = useState(100);

  const goal = goalLakh * 1_00_000;
  const monthly = useMemo(() => monthlySipForGoal(goal, rate, years), [goal, rate, years]);
  const check = useMemo(() => sipMaturityAmount(monthly, rate, years), [monthly, rate, years]);
  const invested = monthly * years * 12;
  const gain = Math.max(0, check - invested);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>SIP for your goal — live calculator</Text>
        <Text style={styles.sub}>
          Target keyword: sip calculator 1 crore. Change years and return to see the monthly SIP
          you need.
        </Text>
      </View>
      <View style={styles.body}>
        <View style={styles.chips}>
          {YEAR_OPTIONS.map((y) => {
            const active = years === y;
            return (
              <Pressable
                key={y}
                onPress={() => setYears(y)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{y} years</Text>
              </Pressable>
            );
          })}
        </View>

        <SliderField
          label="Goal corpus (₹ lakh)"
          value={goalLakh}
          min={50}
          max={500}
          step={10}
          onChange={(v) => setGoalLakh(Math.round(v))}
          format={() => `₹${formatIndian(goal)}${goal === CRORE ? " (₹1 crore)" : ""}`}
        />
        <SliderField
          label="Expected return (% p.a.)"
          value={rate}
          min={8}
          max={15}
          step={0.5}
          onChange={(v) => setRate(Math.round(v * 2) / 2)}
          format={(v) => `${v}% p.a.`}
        />

        <View style={styles.results}>
          <View style={[styles.result, styles.resultPrimary]}>
            <Text style={[styles.resultLabel, { color: Colors.primary }]}>Monthly SIP needed</Text>
            <Text style={styles.resultBig}>₹{formatIndian(Math.round(monthly))}</Text>
          </View>
          <View style={styles.resultRow}>
            <View style={[styles.result, styles.resultOutline]}>
              <Text style={styles.resultLabel}>Total invested</Text>
              <Text style={styles.resultValue}>₹{formatIndian(Math.round(invested))}</Text>
            </View>
            <View style={[styles.result, styles.resultOutline]}>
              <Text style={styles.resultLabel}>Estimated gain</Text>
              <Text style={styles.resultValue}>₹{formatIndian(Math.round(gain))}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.foot}>
        <Text style={styles.footText}>
          Educational estimate — not investment advice. Know it. Fix it. Grow it.
        </Text>
        <ContentBlocks
          blocks={[
            {
              kind: "actions",
              tone: "grey",
              actions: [
                { label: "Open SIP calculator →", href: "/calculators/sip", primary: true },
                { label: "Full health check →", href: "/analyse" },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  head: {
    backgroundColor: "#FAFAFE",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEDFE",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
  sub: { marginTop: 4, fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  body: { padding: 16, gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: "#FFFFFF" },
  results: { gap: 10 },
  resultRow: { flexDirection: "row", gap: 10 },
  result: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  resultPrimary: { backgroundColor: "#EEEDFE" },
  resultOutline: { borderWidth: 1, borderColor: Colors.border },
  resultLabel: { fontSize: 11, fontWeight: "600", color: Colors.textMuted },
  resultBig: { marginTop: 4, fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  resultValue: { marginTop: 4, fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  foot: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 12,
    gap: 8,
  },
  footText: { fontSize: 11, color: Colors.textMuted },
});
