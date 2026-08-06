import "@/lib/cryptoPolyfill";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "@/store/authStore";

// Closes the OAuth browser when the app regains focus after redirect.
WebBrowser.maybeCompleteAuthSession();

export const unstable_settings = {
  // Prefer the tab shell as the main entry (not a blank stack index hop).
  initialRouteName: "(tabs)",
};

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
          <Stack.Screen name="analyse/form" />
          <Stack.Screen name="analyse/fixplan" />
          <Stack.Screen name="split/[groupId]" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
