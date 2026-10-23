import "@/lib/cryptoPolyfill";
import { applyInterDefault } from "@/lib/applyInter";
import { useEffect, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { Stack, router, type ErrorBoundaryProps, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { useAuthStore } from "@/store/authStore";
import { hydrateSyncKv } from "@/lib/syncKv";
import { pingDailyLogin } from "@/lib/dailyLogin";
import { PushNotificationsManager } from "@/components/PushNotificationsManager";
import { MorningTipPopup } from "@/components/MorningTipPopup";
import { IntroTourVideo } from "@/components/IntroTourVideo";
import { GlobalChrome } from "@/components/navigation/GlobalChrome";
import { PushPermissionPrompt } from "@/components/shell/PushPermissionPrompt";
import { FeedbackPopupManager } from "@/components/shell/FeedbackPopupManager";
import { Toast } from "@/components/shell/Toast";
import {
  FkToastWatcher,
  ReferralCapture,
} from "@/components/shell/ReferralCapture";
import { installCrashReporter } from "@/lib/crashReporter";
import {
  Colors,
  isDarkTheme,
  setActiveTheme,
  themedStyles,
} from "@/constants/theme";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { resolveTheme, useThemeStore } from "@/store/themeStore";

// Inter is the default font for all Text/TextInput (web: Tailwind font-sans).
applyInterDefault();
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
  const [hydrated, setHydrated] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });
  // A font failure falls back to the system font rather than blocking launch.
  const ready = hydrated && (fontsLoaded || fontError != null);

  useEffect(() => {
    void initAuth();
    // Saved theme lives in syncKv; wait for it so the first frame is right.
    void hydrateSyncKv().then(() => {
      useThemeStore.getState().load(useAuthStore.getState().user?.id ?? null);
      setHydrated(true);
    });
  }, [initAuth]);

  // Login streak and daily points, once per app session per user.
  useEffect(() => {
    pingDailyLogin(userId);
  }, [userId]);

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
            <GlobalChrome>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.background },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="index" />
                <Stack.Screen
                  name="(auth)"
                  options={{ presentation: "modal" }}
                />
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
                <Stack.Screen name="optimizer" />
                <Stack.Screen name="insurance" />
              </Stack>
            </GlobalChrome>
            <PushNotificationsManager />
            <ReferralCapture />
            <FkToastWatcher />
            <IntroTourVideo />
            <MorningTipPopup />
            <PushPermissionPrompt />
            <FeedbackPopupManager />
            <Toast />
          </View>
        ) : null}
        <AnimatedSplash ready={ready} theme={theme} />
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
