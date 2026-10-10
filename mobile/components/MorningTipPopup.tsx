/**
 * Daily tip card — port of web components/MorningTipPopup.tsx.
 * Shown once per IST day (6 AM–11 PM), 3s after the app opens.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors, themedStyles } from "@/constants/theme";
import { timeGreeting } from "@/lib/greeting";
import { syncKv } from "@/lib/syncKv";
import { useAuthStore } from "@/store/authStore";
import {
  useNotificationStore,
  type AppNotification,
} from "@/store/notificationStore";
import { openContentHref } from "@/lib/contentLinks";

/** IST wall clock without relying on Intl time zones (UTC+5:30, no DST). */
function istNow(): Date {
  return new Date(Date.now() + 330 * 60 * 1000);
}

function tipPopupStorageKey(): string {
  return `finkoin_tip_popup_${istNow().toISOString().slice(0, 10)}`;
}

export function MorningTipPopup() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const getNextRelevantPopup = useNotificationStore(
    (s) => s.getNextRelevantPopup,
  );
  const markPopupShown = useNotificationStore((s) => s.markPopupShown);

  const [tip, setTip] = useState<AppNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn || !user?.id) return;
    const istHour = istNow().getUTCHours();
    if (istHour < 6 || istHour >= 23) return;
    if (syncKv.getItem(tipPopupStorageKey())) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const init = async () => {
      await fetchNotifications(user.id);
      if (cancelled) return;
      const todayTip = await getNextRelevantPopup(user.id);
      if (todayTip && !cancelled) {
        timer = setTimeout(() => {
          if (!cancelled) {
            setTip(todayTip);
            setVisible(true);
          }
        }, 3000);
      }
    };
    void init();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [
    hasInitialized,
    isLoggedIn,
    user?.id,
    fetchNotifications,
    getNextRelevantPopup,
  ]);

  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const handleClose = async () => {
    if (tip?.id) {
      syncKv.setItem(tipPopupStorageKey(), "1");
      await markPopupShown(tip.id);
    }
    setVisible(false);
  };

  const handleLearnMore = async () => {
    await handleClose();
    openContentHref("/learn");
  };

  if (!visible || !tip) return null;
  const greeting = timeGreeting();

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => void handleClose()}
    >
      <Pressable style={styles.backdrop} onPress={() => void handleClose()} />
      <Animated.View
        style={[
          styles.card,
          { bottom: 90 + insets.bottom },
          {
            opacity: slide,
            transform: [
              {
                translateY: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => void handleClose()}
          style={styles.close}
          hitSlop={8}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <AppIcon name="close" size={14} color={Colors.textMuted} />
        </Pressable>

        <View style={styles.head}>
          <View style={styles.iconBox}>
            <AppIcon name="bulb" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.kickerRow}>
              <Text style={styles.kicker}>{greeting}</Text>
              {greeting === "Good morning" ? (
                <AppIcon name="sunrise" size={14} color={Colors.primary} />
              ) : null}
            </View>
            <Text style={styles.title}>{tip.title}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.bodyText}>{tip.content}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void handleClose()}
            style={[styles.btn, styles.btnPrimary]}
            accessibilityRole="button"
          >
            <Text style={styles.btnPrimaryText}>Got it</Text>
          </Pressable>
          <Pressable
            onPress={() => void handleLearnMore()}
            style={[styles.btn, styles.btnSecondary]}
            accessibilityRole="button"
          >
            <Text style={styles.btnSecondaryText}>Learn more →</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 12,
  },
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  kicker: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 19,
    paddingRight: 32,
  },
  body: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  bodyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 24 },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "700" },
  btnSecondary: { backgroundColor: Colors.primaryLight },
  btnSecondaryText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
}));
