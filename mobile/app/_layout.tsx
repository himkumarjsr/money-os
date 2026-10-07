import "@/lib/cryptoPolyfill";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "@/store/authStore";
import { hydrateSyncKv } from "@/lib/syncKv";
import { PushNotificationsManager } from "@/components/PushNotificationsManager";
import { MorningTipPopup } from "@/components/MorningTipPopup";
import { installCrashReporter } from "@/lib/crashReporter";
import { Colors } from "@/constants/theme";

void hydrateSyncKv();
installCrashReporter();

// Closes the OAuth browser when the app regains focus after redirect.
WebBrowser.maybeCompleteAuthSession();

export const unstable_settings = {
  // Prefer the tab shell as the main entry (not a blank stack index hop).
  initialRouteName: "(tabs)",
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <Pressable
          onPress={() => void retry()}
          style={styles.errorBtn}
          accessibilityRole="button"
        >
          <Text style={styles.errorBtnText}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="auth/update-password" />
          <Stack.Screen name="analyse/form" />
          <Stack.Screen name="analyse/fixplan" />
          <Stack.Screen
            name="analyse/consent"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="analyse/result" />
          <Stack.Screen name="tracker/[month]" />
          <Stack.Screen name="calculators/[id]" />
          <Stack.Screen name="split/[groupId]/index" />
          <Stack.Screen name="split/[groupId]/add-expense" />
          <Stack.Screen name="split/join" />
          <Stack.Screen name="notifications" />
        </Stack>
        <PushNotificationsManager />
        <MorningTipPopup />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: Colors.background,
  },
  errorTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  errorBtn: {
    minHeight: 44,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
