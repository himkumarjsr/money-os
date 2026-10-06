import { StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";

type Props = {
  attentionCount: number;
  overallSummary?: string;
  isFallback?: boolean;
};

export function FixPlanHero({ attentionCount, overallSummary, isFallback }: Props) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>FINKOIN AI</Text>
      <Text style={styles.greeting}>
        {attentionCount > 0
          ? `Based on your financial profile, we identified ${attentionCount} ${attentionCount === 1 ? "area" : "areas"} that need attention.`
          : "Your core safety and allocation buckets are currently on track."}
      </Text>
      <Text style={styles.summary}>
        {overallSummary ||
          "This plan improves your score by prioritising safety, debt and growth in sequence."}
      </Text>
      <Text style={styles.badge}>
        {isFallback
          ? "ℹ️ Showing estimated plan — AI analysis will load shortly"
          : "✓ AI personalised analysis"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.8)",
  },
  greeting: {
    marginTop: Spacing.sm,
    fontSize: 14,
    fontStyle: "italic",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  summary: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  badge: {
    marginTop: Spacing.xs,
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
});
