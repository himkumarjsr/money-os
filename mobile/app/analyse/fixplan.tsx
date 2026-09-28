import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import Button from "@/components/ui/Button";

export default function FixPlanScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.center}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>Fix plan</Text>
        <Text style={styles.sub}>
          Full personalised fix plan ships in the next mobile release. Your
          health score on Report is ready now.
        </Text>
        <Button
          label="Back to health check"
          onPress={() => router.replace("/(tabs)/analyse")}
          style={{ marginTop: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  sub: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
