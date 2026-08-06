import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { Card } from "@/components/ui/Card";

const TOOLS = [
  { emoji: "📈", title: "SIP", desc: "Monthly investment returns" },
  { emoji: "🧾", title: "Tax regime", desc: "Old vs new 2025-26" },
  { emoji: "🏠", title: "EMI / home loan", desc: "Loan affordability" },
  { emoji: "🔥", title: "FIRE", desc: "Early retirement number" },
  { emoji: "🛡️", title: "Emergency fund", desc: "Months of runway" },
];

export default function CalculatorsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Calculators</Text>
        <Text style={styles.sub}>Full interactive tools next sprint</Text>
        {TOOLS.map((t) => (
          <Card key={t.title} style={styles.card}>
            <Text style={styles.emoji}>{t.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t.title}</Text>
              <Text style={styles.cardDesc}>{t.desc}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: Spacing.xl, paddingBottom: 40 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  sub: {
    marginTop: 6,
    marginBottom: Spacing.xl,
    fontSize: 14,
    color: Colors.textMuted,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  emoji: { fontSize: 28 },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cardDesc: {
    marginTop: 2,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
