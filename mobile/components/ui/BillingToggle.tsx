import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import type { BillingPeriod } from "@/lib/planPricing";

const OPTIONS: Array<{ id: BillingPeriod; label: string }> = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

/** Monthly / Yearly switch for the Plans screen and the home Pricing section. */
export function BillingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (next: BillingPeriod) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Billing period"
      style={styles.wrap}
    >
      {OPTIONS.map((o) => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.opt, on && styles.optOn]}
          >
            <Text style={[styles.optText, on && styles.optTextOn]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    alignSelf: "center",
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 4,
  },
  opt: {
    minHeight: 40,
    minWidth: 96,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  optOn: { backgroundColor: Colors.primary },
  optText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  optTextOn: { color: Colors.onPrimary },
}));
