/**
 * Port of web components/PushPermissionPrompt.tsx: our own prompt, shown only
 * to signed-in users, before the OS notification permission dialog.
 * "Allow notifications" then triggers the OS request and registers the token.
 */
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors, themedStyles } from "@/constants/theme";
import {
  getNotifications,
  getPushPermission,
  registerPushToken,
  requestPushPermission,
} from "@/lib/pushNotifications";
import { hydrateSyncKv, syncKv } from "@/lib/syncKv";
import { useAuthStore } from "@/store/authStore";

const DISMISS_KEY = "finkoin_push_prompt_dismissed";
const ENABLED_KEY = "finkoin_push_enabled";

export function PushPermissionPrompt() {
  const insets = useSafeAreaInsets();
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userId = useAuthStore((s) => s.user?.id);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn || !userId) return;
    if (!getNotifications()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      await hydrateSyncKv();
      if (syncKv.getItem(ENABLED_KEY) === "1") return;
      const permission = await getPushPermission();
      if (cancelled) return;
      if (permission === "granted") {
        // Already allowed: silent re-register, no prompt.
        if (await registerPushToken(userId)) syncKv.setItem(ENABLED_KEY, "1");
        return;
      }
      if (permission === "denied") return;
      const dismissedAt = syncKv.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const days =
          (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
        if (days < 14) return;
      }
      timer = setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, 2500);
    })();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [hasInitialized, isLoggedIn, userId]);

  const handleAllow = async () => {
    if (!userId) return;
    setBusy(true);
    setError(null);
    const granted = await requestPushPermission();
    if (!granted) {
      setBusy(false);
      setError("Permission blocked. You can enable it later in Settings.");
      return;
    }
    const ok = await registerPushToken(userId);
    setBusy(false);
    if (!ok) {
      setError("Could not enable notifications. Try again from Settings.");
      return;
    }
    syncKv.setItem(ENABLED_KEY, "1");
    syncKv.removeItem(DISMISS_KEY);
    setVisible(false);
  };

  const handleLater = () => {
    syncKv.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleLater}
    >
      <View style={[styles.wrap, { paddingBottom: 88 + insets.bottom }]}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.head}>
            <View style={styles.iconBox}>
              <AppIcon name="bell" size={22} color={Colors.primaryText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                Get daily money tips on your phone?
              </Text>
              <Text style={styles.body}>
                Allow notifications and we’ll send one short finance tip every
                morning at 8:30 AM - even when Finkoin is closed.
              </Text>
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              onPress={handleLater}
              disabled={busy}
              style={[styles.secondary, busy && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleAllow()}
              disabled={busy}
              style={[styles.primary, busy && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>
                {busy ? "Enabling…" : "Allow notifications"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  wrap: { flex: 1, justifyContent: "flex-end", alignItems: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 448,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 16,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBox: {
    height: 44,
    width: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  body: { marginTop: 6, fontSize: 14, lineHeight: 22, color: Colors.textSecondary },
  error: { marginTop: 12, fontSize: 12, fontWeight: "500", color: Colors.errorText },
  actions: { marginTop: 16, flexDirection: "row", gap: 8 },
  secondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  primary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 14, fontWeight: "700", color: Colors.onPrimary },
}));
