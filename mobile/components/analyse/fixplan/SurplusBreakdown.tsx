import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { PriorityPlan } from "@/lib/priorityEngine";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import { inr, shared } from "./shared";

type Props = { breakdown: PriorityPlan["surplusBreakdown"] };

export function SurplusBreakdown({ breakdown }: Props) {
  const [open, setOpen] = useState(false);
  const deductions: [string, number][] = [
    ["Living expenses (needs)", breakdown.needsActual],
    ["Loan EMIs", breakdown.loansActual],
    ["Insurance premiums", breakdown.existingInsurancePremiums],
    ["Lifestyle / wants", breakdown.wantsActual],
  ];

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.summary}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.summaryText}>
          Your monthly surplus: ₹{inr(breakdown.netSurplus)}
          <Text style={styles.hint}>{"  "}(tap to see breakdown)</Text>
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.body}>
          <View style={shared.row}>
            <Text style={shared.rowLabel}>Monthly income</Text>
            <Text style={[shared.rowValue, styles.bold]}>
              +₹{inr(breakdown.totalIncome)}
            </Text>
          </View>
          {deductions.map(([label, value]) => (
            <View key={label} style={shared.row}>
              <Text style={[shared.rowLabel, styles.neg]}>{label}</Text>
              <Text style={[shared.rowValue, styles.neg]}>-₹{inr(value)}</Text>
            </View>
          ))}
          <View style={[shared.row, shared.totalRow]}>
            <Text style={[shared.totalText, { flex: 1 }]}>
              Your available surplus
            </Text>
            <Text style={shared.totalText}>₹{inr(breakdown.netSurplus)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  summary: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  summaryText: { fontSize: 14, fontWeight: "600", color: Colors.primaryDark },
  hint: { fontWeight: "400", color: Colors.textMuted },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  bold: { fontWeight: "500" },
  neg: { color: Colors.errorText },
}));
