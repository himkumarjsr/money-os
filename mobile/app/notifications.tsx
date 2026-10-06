/**
 * Notifications inbox — port of web components/notifications/NotificationsClient.tsx.
 * `?id=` (from a push tap) spotlights that message and marks it read.
 */
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import {
  mapNotificationRow,
  useNotificationStore,
  type AppNotification,
} from "@/store/notificationStore";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function categoryLabel(category: string) {
  if (category === "split_expense" || category === "split_invite") {
    return "Split";
  }
  if (category === "obligation_reminder") return "Reminder";
  return "Finance tip";
}

export default function NotificationsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const focusId = (typeof params.id === "string" ? params.id : "").trim();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const notifications = useNotificationStore((s) => s.notifications);
  const loading = useNotificationStore((s) => s.loading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const [direct, setDirect] = useState<AppNotification | null>(null);
  const [directLoading, setDirectLoading] = useState(Boolean(focusId));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn || !user?.id) return;
    void fetchNotifications(user.id);
  }, [hasInitialized, isLoggedIn, user?.id, fetchNotifications]);

  // Push deep link: load that row even if it isn't in the store yet.
  useEffect(() => {
    if (!focusId || !isLoggedIn || !user?.id) {
      setDirectLoading(false);
      return;
    }
    let cancelled = false;
    setDirectLoading(true);

    const load = async () => {
      const fromStore = useNotificationStore.getState().getById(focusId);
      if (fromStore) {
        if (!cancelled) {
          setDirect(fromStore);
          setDirectLoading(false);
        }
        await markRead(focusId);
        return;
      }

      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("id", focusId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setDirect(null);
        setDirectLoading(false);
        return;
      }
      setDirect(mapNotificationRow(data as Record<string, unknown>));
      setDirectLoading(false);
      await markRead(focusId);
      await fetchNotifications(user.id);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [focusId, isLoggedIn, user?.id, markRead, fetchNotifications]);

  const focused = useMemo(() => {
    if (!focusId) return direct;
    return notifications.find((n) => n.id === focusId) ?? direct ?? null;
  }, [focusId, notifications, direct]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");

  if (!hasInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Pressable
          onPress={goBack}
          style={styles.back}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.gate}>
          <Text style={styles.gateText}>
            Sign in to read your notifications.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={styles.gateBtn}
            accessibilityRole="button"
          >
            <Text style={styles.gateBtnText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.primary}
            onRefresh={async () => {
              if (!user?.id) return;
              setRefreshing(true);
              await fetchNotifications(user.id);
              setRefreshing(false);
            }}
          />
        }
      >
        <Pressable
          onPress={goBack}
          style={styles.back}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>Notifications</Text>
            <Text style={styles.sub}>Tips and alerts from Finkoin</Text>
          </View>
          {notifications.some((n) => !n.is_read) ? (
            <Pressable
              onPress={() => user?.id && void markAllRead(user.id)}
              style={styles.markAll}
              accessibilityRole="button"
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        {focusId ? (
          <View style={styles.spotlight}>
            {directLoading && !focused ? (
              <View style={styles.opening}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.openingText}>Opening…</Text>
              </View>
            ) : focused ? (
              <>
                <View style={styles.spotHead}>
                  <View style={styles.spotEmoji}>
                    <Text style={{ fontSize: 24 }}>
                      {focused.emoji || "💡"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.spotCat}>
                      {categoryLabel(focused.category)}
                    </Text>
                    <Text style={styles.spotTitle}>{focused.title}</Text>
                  </View>
                </View>
                <Text style={styles.spotBody}>{focused.content}</Text>
                <Text style={styles.spotWhen}>
                  {formatWhen(focused.created_at)}
                </Text>
              </>
            ) : (
              <Text style={styles.notFound}>
                This notification was not found. It may have been removed.
              </Text>
            )}
          </View>
        ) : null}

        <Text style={styles.h2}>
          {focusId ? "All notifications" : "Recent"}
        </Text>

        {loading && notifications.length === 0 ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <AppIcon name="bell" size={40} color={Colors.primary} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              Daily finance tips and alerts will show up here.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {notifications.map((n) => {
              const isFocus = n.id === focusId;
              return (
                <Pressable
                  key={n.id}
                  onPress={() => router.setParams({ id: n.id })}
                  style={[
                    styles.row,
                    isFocus && styles.rowFocus,
                    !n.is_read && styles.rowUnread,
                  ]}
                  accessibilityRole="button"
                >
                  <View style={styles.rowEmoji}>
                    <Text style={{ fontSize: 18 }}>{n.emoji || "💡"}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.rowTitleWrap}>
                      <Text style={styles.rowTitle}>{n.title}</Text>
                      {!n.is_read ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.rowBody} numberOfLines={2}>
                      {n.content}
                    </Text>
                    <Text style={styles.rowWhen}>
                      {formatWhen(n.created_at)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 120 },
  back: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  backText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  gate: { padding: 24, alignItems: "center" },
  gateText: { color: "#5F5E5A", marginBottom: 16, fontSize: 15 },
  gateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  gateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  h1: { fontSize: 22, fontWeight: "800", color: "#111110" },
  sub: { marginTop: 4, fontSize: 13, color: "#9B9A94" },
  markAll: {
    backgroundColor: "#EEEDFE",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  markAllText: { color: Colors.primary, fontWeight: "700", fontSize: 12 },
  spotlight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  opening: { alignItems: "center", gap: 8, paddingVertical: 12 },
  openingText: { color: "#9B9A94", fontSize: 13 },
  spotHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  spotEmoji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  spotCat: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  spotTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "800",
    color: "#111110",
    lineHeight: 23,
  },
  spotBody: { fontSize: 15, lineHeight: 25, color: "#5F5E5A" },
  spotWhen: { marginTop: 14, fontSize: 12, color: "#9B9A94" },
  notFound: { color: "#5F5E5A", fontSize: 14 },
  h2: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111110",
    marginBottom: 10,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E6F0",
  },
  emptyTitle: { marginTop: 12, fontWeight: "700", color: "#111110" },
  emptySub: {
    fontSize: 13,
    color: "#9B9A94",
    marginTop: 6,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    backgroundColor: "#FFFFFF",
  },
  rowFocus: { borderWidth: 1.5, borderColor: Colors.primary },
  rowUnread: { backgroundColor: "#FAFAFE" },
  rowEmoji: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111110" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  rowBody: { marginTop: 4, fontSize: 13, color: "#5F5E5A", lineHeight: 19 },
  rowWhen: { marginTop: 6, fontSize: 11, color: "#9B9A94" },
});
