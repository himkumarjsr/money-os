import { Text, View } from "react-native";
import type { PriorityItem, PriorityPlan } from "@/lib/priorityEngine";
import { remainingBuffer, stepStartLabel } from "@/lib/fixPlanMerge";
import { Colors, Spacing, themedStyles } from "@/constants/theme";
import { inr, shared } from "./shared";

type Props = {
  priorities: PriorityItem[];
  monthlySurplus: number;
  plan?: PriorityPlan;
};

export function SurplusAllocationSummary({
  priorities,
  monthlySurplus,
  plan,
}: Props) {
  const remaining = remainingBuffer(plan ?? { monthlySurplus }, priorities);
  return (
    <View style={[shared.card, styles.card]}>
      <Text style={shared.cardTitle}>Surplus Allocation Summary</Text>
      <View style={styles.body}>
        <View style={shared.row}>
          <Text style={[shared.rowLabel, styles.medium]}>Your surplus</Text>
          <Text style={[shared.rowValue, styles.medium]}>
            ₹{inr(monthlySurplus)}
          </Text>
        </View>
        {priorities.map((p, idx) => (
          <View key={`surplus-line-${p.id}-${idx}`} style={shared.row}>
            <Text style={shared.rowLabel}>
              Step {idx + 1} — {p.title}
              {stepStartLabel(p)}
            </Text>
            <Text style={shared.rowValue}>-₹{inr(p.monthlyContribution)}</Text>
          </View>
        ))}
        <View style={[shared.row, shared.totalRow]}>
          <Text style={[shared.totalText, { flex: 1 }]}>Remaining buffer</Text>
          <Text style={shared.totalText}>₹{inr(remaining)}</Text>
        </View>
        <Text style={styles.note}>
          (Available for debt extra payment + future SIP)
        </Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: { borderWidth: 1, borderColor: Colors.border },
  body: { marginTop: Spacing.md },
  medium: { fontWeight: "500" },
  note: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
}));
