/**
 * Standard in-app page: back link, title + subtitle, scrollable body.
 * `requireAuth` shows a sign-in prompt instead of the body when logged out.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

type Props = {
  title: string;
  subtitle?: string;
  requireAuth?: boolean;
  right?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
};

export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

export function PageScaffold({
  title,
  subtitle,
  requireAuth = false,
  right,
  refreshing,
  onRefresh,
  children,
}: Props) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const gated = requireAuth && hasInitialized && !isLoggedIn;
  const waiting = requireAuth && !hasInitialized;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              tintColor={Colors.primary}
              onRefresh={onRefresh}
            />
          ) : undefined
        }
      >
        <Pressable
          onPress={goBackOrHome}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>{title}</Text>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>

        {waiting ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : gated ? (
          <View style={styles.gate}>
            <Text style={styles.gateTitle}>Sign in to continue</Text>
            <Text style={styles.gateSub}>
              Log in to your Finkoin account to see this page.
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={styles.gateBtn}
              accessibilityRole="button"
            >
              <Text style={styles.gateBtnText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          children
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export const pageStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EFF8",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  footnote: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 12,
    color: "#9B9A94",
    lineHeight: 18,
  },
  link: { color: Colors.primary, fontWeight: "600" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  backText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  h1: { fontSize: 26, fontWeight: "800", color: "#111110" },
  sub: { marginTop: 6, fontSize: 14, color: "#5F5E5A", lineHeight: 20 },
  gate: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EFF8",
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  gateTitle: { fontSize: 18, fontWeight: "700", color: "#111110" },
  gateSub: { fontSize: 14, color: "#5F5E5A", textAlign: "center" },
  gateBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  gateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
