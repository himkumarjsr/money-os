import { useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import {
  router,
  useLocalSearchParams,
  useGlobalSearchParams,
} from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore, createSessionFromUrl } from "@/store/authStore";
import { Colors, FontSize } from "@/constants/theme";

/**
 * Deep-link landing after Google OAuth.
 * Expo Go: exp://…/--/auth/callback?code=…
 * Standalone: finkoin://auth/callback?code=…
 */
export default function AuthCallbackScreen() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const params = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;

    (async () => {
      try {
        // Close any auth browser still on screen.
        try {
          WebBrowser.dismissAuthSession();
        } catch {
          try {
            await WebBrowser.dismissBrowser();
          } catch {
            /* ignore */
          }
        }

        const linkingUrl = await Linking.getInitialURL();
        let handled = false;

        if (
          linkingUrl &&
          (linkingUrl.includes("code=") ||
            linkingUrl.includes("access_token") ||
            linkingUrl.includes("auth/callback"))
        ) {
          await createSessionFromUrl(linkingUrl);
          handled = true;
        }

        if (!handled) {
          const code =
            (params.code as string) || (globalParams.code as string) || "";
          const access =
            (params.access_token as string) ||
            (globalParams.access_token as string) ||
            "";
          const refresh =
            (params.refresh_token as string) ||
            (globalParams.refresh_token as string) ||
            "";

          if (code) {
            await createSessionFromUrl(
              `${Linking.createURL("auth/callback")}?code=${encodeURIComponent(code)}`,
            );
            handled = true;
          } else if (access) {
            await createSessionFromUrl(
              `${Linking.createURL("auth/callback")}#access_token=${encodeURIComponent(access)}&refresh_token=${encodeURIComponent(refresh)}`,
            );
            handled = true;
          }
        }

        if (handled) {
          await refreshUser();
        }
      } catch (e) {
        console.warn("auth/callback:", e);
      } finally {
        if (!cancelled) {
          const loggedIn = useAuthStore.getState().isLoggedIn;
          router.replace(loggedIn ? "/(tabs)" : "/(auth)/login");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, globalParams, refreshUser]);

  return (
    <View style={styles.box}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Completing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 12,
  },
  text: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
});
