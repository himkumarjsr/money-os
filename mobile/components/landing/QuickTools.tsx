import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { useAuthStore } from "@/store/authStore";

/** Same tools / order / icons as web HomeMobileQuickTools */
const TOOLS: Array<{
  id: string;
  label: string;
  route: string;
  icon: AppIconName;
  needsAuth?: boolean;
  calcTool?: string;
}> = [
  {
    id: "sip",
    label: "SIP",
    route: "/(tabs)/calculators",
    icon: "trending",
    calcTool: "sip",
  },
  {
    id: "swp",
    label: "SWP",
    route: "/(tabs)/calculators",
    icon: "wallet",
    calcTool: "swp",
  },
  { id: "split", label: "Split", route: "/(tabs)/split", icon: "users" },
  {
    id: "tax",
    label: "Tax",
    route: "/(tabs)/calculators",
    icon: "receipt",
    calcTool: "tax",
  },
  {
    id: "emi",
    label: "EMI",
    route: "/(tabs)/calculators",
    icon: "bank",
    calcTool: "emi",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    route: "/(tabs)/calculators",
    icon: "briefcase",
  },
  {
    id: "analyse",
    label: "Analyse",
    route: "/(tabs)/analyse",
    icon: "chart",
    needsAuth: true,
  },
];

export function QuickTools() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const go = (t: (typeof TOOLS)[number]) => {
    if (t.needsAuth && !isLoggedIn) {
      router.push("/(auth)/login");
      return;
    }
    router.push(t.route as any);
  };

  return (
    <View style={styles.section} accessibilityLabel="Quick tools">
      <Text style={styles.heading}>Quick tools</Text>
      <View style={styles.grid}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => go(t)}
            style={({ pressed }) => [
              styles.cell,
              pressed && styles.cellPressed,
            ]}
          >
            <View style={styles.iconBox}>
              <AppIcon name={t.icon} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.label}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  heading: {
    marginBottom: 8,
    textAlign: "left",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#9B9A94",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
  },
  cellPressed: {
    backgroundColor: "rgba(238,237,254,0.7)",
  },
  iconBox: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    color: "#111110",
  },
});
