import { StyleSheet, Text, View } from "react-native";
import type { PriorityItem } from "@/lib/priorityEngine";
import { Colors, Spacing } from "@/constants/theme";
import { inr, shared } from "./shared";

type Props = { priorities: PriorityItem[]; monthlySurplus: number };

export function SurplusAllocationSummary({ priorities, monthlySurplus }: Props) {
  const allocated = priorities.reduce(
    (s, p) => s + Number(p.monthlyContribution || 0),
    0,
  );
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
            </Text>
            <Text style={shared.rowValue}>-₹{inr(p.monthlyContribution)}</Text>
          </View>
        ))}
        <View style={[shared.row, shared.totalRow]}>
          <Text style={[shared.totalText, { flex: 1 }]}>Remaining buffer</Text>
          <Text style={shared.totalText}>
            ₹{inr(Math.max(0, (monthlySurplus || 0) - allocated))}
          </Text>
        </View>
        <Text style={styles.note}>
          (Available for debt extra payment + future SIP)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: Colors.border },
  body: { marginTop: Spacing.md },
  medium: { fontWeight: "500" },
  note: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
});
