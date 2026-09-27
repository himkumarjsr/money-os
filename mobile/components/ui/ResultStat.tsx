import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize, Radius, Spacing, Shadow } from "@/constants/theme";

type Props = {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
};

export function ResultStat({ label, value, hint, accent }: Props) {
  return (
    <View style={[styles.box, accent && styles.boxAccent]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.card,
  },
  boxAccent: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryMedium,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    marginTop: 4,
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  valueAccent: { color: Colors.primary },
  hint: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
