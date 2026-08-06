import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";

export const QUICK_TOOLS = [
  {
    emoji: "📊",
    label: "Health Check",
    route: "/(tabs)/analyse",
    bg: "#EEEDFE",
    color: "#534AB7",
  },
  {
    emoji: "🧾",
    label: "Tax Calc",
    route: "/(tabs)/calculators",
    bg: "#E1F5EE",
    color: "#1D9E75",
  },
  {
    emoji: "📈",
    label: "SIP Calc",
    route: "/(tabs)/calculators",
    bg: "#FFF3E0",
    color: "#BA7517",
  },
  {
    emoji: "📒",
    label: "Tracker",
    route: "/(tabs)/tracker",
    bg: "#FCEBEB",
    color: "#E24B4A",
  },
  {
    emoji: "🏠",
    label: "Home Loan",
    route: "/(tabs)/calculators",
    bg: "#E8F5E9",
    color: "#2E7D32",
  },
  {
    emoji: "🛡️",
    label: "Insurance",
    route: "/(tabs)/analyse",
    bg: "#EDE7F6",
    color: "#5E35B1",
  },
] as const;

export function QuickTools() {
  return (
    <View style={styles.grid}>
      {QUICK_TOOLS.map((tool) => (
        <TouchableOpacity
          key={tool.label}
          style={styles.card}
          onPress={() => router.push(tool.route as any)}
          activeOpacity={0.85}
        >
          <View style={[styles.icon, { backgroundColor: tool.bg }]}>
            <Text style={styles.emoji}>{tool.emoji}</Text>
          </View>
          <Text style={styles.label}>{tool.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  card: {
    width: "30%",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 22 },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
