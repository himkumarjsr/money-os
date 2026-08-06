import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors, FontSize, Spacing, Radius } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AppHeader } from "@/components/AppHeader";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const signOut = useAuthStore((s) => s.signOut);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.pad}>
          <BrandLogo size={64} />
          <Text style={[styles.title, { textAlign: "center", marginTop: 16 }]}>
            Your Finkoin account
          </Text>
          <Text style={styles.gateSub}>
            Same login as finkoin.com — email or Google.
          </Text>
          <Button label="Log in" onPress={() => router.push("/(auth)/login")} />
          <Button
            label="Create account"
            variant="secondary"
            onPress={() => router.push("/(auth)/signup")}
            style={{ marginTop: 12 }}
          />
          <Pressable onPress={() => router.push("/(tabs)")} style={styles.link}>
            <Text style={styles.linkText}>← Back to home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.pad}>
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
          variant="ghost"
          onPress={() => {
            Alert.alert("Sign out?", "You can log in again anytime.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: () => {
                  void signOut().then(() => router.replace("/(tabs)"));
                },
              },
            ]);
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pad: { flexGrow: 1, padding: Spacing.xl, paddingBottom: 120 },
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
  gateSub: {
    textAlign: "center",
    color: Colors.textMuted,
    marginBottom: 24,
    lineHeight: 22,
  },
  link: { marginTop: 24, alignItems: "center" },
  linkText: { color: Colors.primary, fontWeight: "700" },
});
