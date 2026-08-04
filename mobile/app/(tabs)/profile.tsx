import { View, Text, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, FontSize, Spacing, Radius } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.pad}>
        <Text style={styles.title}>Profile</Text>
        <Card style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name || "—"}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
          <Text style={styles.value}>{user?.email || "—"}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Plan</Text>
          <Text style={styles.value}>{user?.subscriptionTier || "free"}</Text>
          <View style={styles.fk}>
            <Text style={styles.fkText}>⚡ {user?.fkBalance ?? 0} FK</Text>
          </View>
        </Card>

        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => {
            Alert.alert("Sign out?", "You can log in again anytime.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: () => {
                  void signOut().then(() => router.replace("/(auth)/login"));
                },
              },
            ]);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pad: { flex: 1, padding: Spacing.xl },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  card: { marginBottom: Spacing.xl },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  fk: {
    marginTop: Spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.round,
  },
  fkText: { fontWeight: "700", color: Colors.primary },
});
