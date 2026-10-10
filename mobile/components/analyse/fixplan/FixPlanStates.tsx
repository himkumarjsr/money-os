import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import Button from "@/components/ui/Button";
import { LOADING_MESSAGES } from "@/lib/fixPlanMerge";
import { Colors, FontSize, Spacing, themedStyles } from "@/constants/theme";

export function FixPlanLoader({ label }: { label?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    if (label) return;
    const id = setInterval(
      () => setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      2500,
    );
    return () => clearInterval(id);
  }, [label]);
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loaderText}>
        {label ?? LOADING_MESSAGES[messageIndex] ?? "Loading…"}
      </Text>
    </View>
  );
}

export function FixPlanError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Unable to generate fix plan.</Text>
      {message ? <Text style={styles.sub}>{message}</Text> : null}
      <Button label="Try again" onPress={onRetry} style={styles.btn} />
    </View>
  );
}

export function FixPlanEmpty() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>No analysis found</Text>
      <Text style={styles.sub}>
        Complete a health check to see your personalised fix plan.
      </Text>
      <Button
        label="Start analysis →"
        onPress={() => router.replace("/analyse/form")}
        style={styles.btn}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  loaderText: {
    marginTop: Spacing.lg,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: { marginTop: Spacing.xl, minHeight: 52 },
}));
