import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, FontSize } from "@/constants/theme";
import { StepIndicator } from "@/components/analyse/StepIndicator";
import { ResultCard } from "@/components/analyse/ResultCard";
import { useFinancialStore } from "@/store/financialStore";

export default function AnalyseScreen() {
  const result = useFinancialStore((s) => s.result);
  const step = useFinancialStore((s) => s.currentStep);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.pad}>
        <Text style={styles.title}>Health Check</Text>
        <Text style={styles.sub}>
          Know · Fix · Grow — full form next sprint
        </Text>
        <StepIndicator
          current={step}
          total={5}
          labels={["You", "Income", "Spend", "Goals", "Result"]}
        />
        {result ? (
          <ResultCard
            score={result.overallScore}
            subtitle={result.teaser || "From your last analysis on this device"}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.emoji}>📊</Text>
            <Text style={styles.placeholderTitle}>Health Check</Text>
            <Text style={styles.placeholderSub}>Coming in next sprint</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pad: { flex: 1, padding: 20 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  sub: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
    color: Colors.textMuted,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emoji: { fontSize: 64 },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  placeholderSub: { fontSize: 14, color: Colors.textMuted },
});
