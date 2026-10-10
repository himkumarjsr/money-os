import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import {
  Colors,
  Spacing,
  Radius,
  FontSize,
  Shadow,
  themedStyles,
  tintBg,
} from "@/constants/theme";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";

/** Built per render so tile tints follow the active theme. */
export const quickTools = (): Array<{
  label: string;
  route: string;
  icon: AppIconName;
  bg: string;
}> => [
  {
    label: "Health Check",
    route: "/(tabs)/analyse",
    icon: "chart",
    bg: tintBg("#EEEDFE"),
  },
  {
    label: "Tax Calc",
    route: "/calculators/tax-regime",
    icon: "receipt",
    bg: tintBg("#E1F5EE"),
  },
  {
    label: "SIP Calc",
    route: "/calculators/sip",
    icon: "trending",
    bg: tintBg("#FFF3E0"),
  },
  {
    label: "Tracker",
    route: "/(tabs)/tracker",
    icon: "notebook",
    bg: tintBg("#FCEBEB"),
  },
  {
    label: "Home Loan",
    route: "/calculators/home",
    icon: "bank",
    bg: tintBg("#E8F5E9"),
  },
  {
    label: "Insurance",
    route: "/(tabs)/analyse",
    icon: "shield",
    bg: tintBg("#EDE7F6"),
  },
];

export function QuickTools() {
  return (
    <View style={styles.grid}>
      {quickTools().map((tool) => (
        <TouchableOpacity
          key={tool.label}
          style={styles.card}
          onPress={() => router.push(tool.route as any)}
          activeOpacity={0.85}
        >
          <View style={[styles.icon, { backgroundColor: tool.bg }]}>
            <AppIcon name={tool.icon} size={22} color={Colors.primary} />
          </View>
          <Text style={styles.label}>{tool.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = themedStyles(() => ({
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
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
}));
