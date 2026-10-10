import "@/lib/cryptoPolyfill";
import { useEffect, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { Stack, router, type ErrorBoundaryProps, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "@/store/authStore";
import { hydrateSyncKv } from "@/lib/syncKv";
import { PushNotificationsManager } from "@/components/PushNotificationsManager";
import { MorningTipPopup } from "@/components/MorningTipPopup";
import { installCrashReporter } from "@/lib/crashReporter";
import {
  Colors,
  isDarkTheme,
  setActiveTheme,
  themedStyles,
} from "@/constants/theme";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { resolveTheme, useThemeStore } from "@/store/themeStore";

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
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const premiumUnlocked = useThemeStore((s) => s.premium?.unlocked ?? false);
  const returnTo = useThemeStore((s) => s.returnTo);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void initAuth();
    // Saved theme lives in syncKv; wait for it so the first frame is right.
    void hydrateSyncKv().then(() => {
      useThemeStore.getState().load(useAuthStore.getState().user?.id ?? null);
      setReady(true);
    });
  }, [initAuth]);

  useEffect(() => {
    if (!ready) return;
    const store = useThemeStore.getState();
    store.load(userId);
    void store.refreshPremium(userId);
  }, [ready, userId]);

  const theme = resolveTheme(preference, systemScheme, premiumUnlocked);
  // Set before children render so Colors and themedStyles read this palette.
  setActiveTheme(theme);

  // A theme change remounts the screens below; reopen the screen it came from.
  useEffect(() => {
    if (!returnTo) return;
    useThemeStore.getState().clearReturnTo();
    const t = setTimeout(() => router.push(returnTo as Href), 0);
    return () => clearTimeout(t);
  }, [theme, returnTo]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <SafeAreaProvider>
        <StatusBar style={isDarkTheme(theme) ? "light" : "dark"} />
        {ready ? (
          <View key={theme} style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
              }}
            >
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
          </View>
        ) : null}
        <AnimatedSplash
          ready={ready}
          accent={theme === "premium" ? Colors.accent : "#FFFFFF"}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = themedStyles(() => ({
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
  errorBtnText: { color: Colors.onPrimary, fontSize: 15, fontWeight: "700" },
}));
