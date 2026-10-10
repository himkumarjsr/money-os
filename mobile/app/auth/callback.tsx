import { useEffect, useRef } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import {
  router,
  useLocalSearchParams,
  useGlobalSearchParams,
} from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore, createSessionFromUrl } from "@/store/authStore";
import { Colors, FontSize, themedStyles } from "@/constants/theme";

const OAUTH_WAIT_MS = 30_000;

function waitForOAuthToFinish(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, OAUTH_WAIT_MS);
    const unsubscribe = useAuthStore.subscribe((s) => {
      if (!s.oauthInFlight) done();
    });
    function done() {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    }
  });
}

/**
 * Deep-link landing after Google OAuth and password-recovery emails
 * (`type=recovery` → update-password).
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
    let isRecovery = false;

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

        // Google sign-in started in this session exchanges the code itself;
        // a second exchange of the same one-time code always fails.
        if (useAuthStore.getState().oauthInFlight) {
          await waitForOAuthToFinish();
          return;
        }

        const linkingUrl = await Linking.getInitialURL();
        let handled = false;
        const typeParam =
          (params.type as string) || (globalParams.type as string) || "";
        isRecovery =
          typeParam === "recovery" ||
          /[?&#]type=recovery\b/.test(linkingUrl ?? "");

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
          if (!loggedIn) router.replace("/(auth)/login");
          else if (isRecovery) router.replace("/auth/update-password");
          else router.replace("/(tabs)");
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

const styles = themedStyles(() => ({
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
}));
