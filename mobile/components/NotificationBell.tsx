/**
 * Notification bell — same UI/behavior as web NotificationBell.
 * Finance tips panel from user_notifications.
 */
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

function BellSvg({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NotificationBell() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAllRead,
  } = useNotificationStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    void fetchNotifications(user.id);
  }, [isLoggedIn, user?.id, fetchNotifications]);

  if (!isLoggedIn) return null;

  const handleOpen = async () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      if (user?.id) await fetchNotifications(user.id);
      if (user?.id && unreadCount > 0) await markAllRead(user.id);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => void handleOpen()}
        style={[styles.bellBtn, open && styles.bellBtnOpen]}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
      >
        <BellSvg color={open ? Colors.primary : "#5F5E5A"} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : String(unreadCount)}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHead}>
              <View style={styles.headLeft}>
                <Text style={styles.panelTitle}>Finance Tips</Text>
                {unreadCount > 0 ? (
                  <View style={styles.newPill}>
                    <Text style={styles.newPillText}>{unreadCount} new</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.dailyNote}>Daily at 8:30 AM</Text>
            </View>

            <ScrollView style={styles.list} bounces>
              {loading ? (
                <ActivityIndicator
                  color={Colors.primary}
                  style={{ marginVertical: 40 }}
                />
              ) : notifications.length === 0 ? (
                <View style={styles.empty}>
                  <AppIcon name="bell" size={44} color={Colors.primary} />
                  <Text style={styles.emptyTitle}>No tips yet</Text>
                  <Text style={styles.emptySub}>
                    Your daily finance tip will appear here every morning at
                    8:30 AM
                  </Text>
                </View>
              ) : (
                notifications.map((n, i) => (
                  <View
                    key={n.id}
                    style={[
                      styles.row,
                      i < notifications.length - 1 && styles.rowBorder,
                      !n.is_read && styles.rowUnread,
                    ]}
                  >
                    <View style={styles.iconBox}>
                      <AppIcon name="bulb" size={18} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.titleRow}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {n.title}
                        </Text>
                        {!n.is_read ? <View style={styles.dot} /> : null}
                      </View>
                      <Text style={styles.rowBody}>{n.content}</Text>
                      <Text style={styles.rowTime}>
                        {new Date(n.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {notifications.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Tips refresh daily · No spam ever
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  bellBtnOpen: {
    backgroundColor: Colors.primaryLight,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingHorizontal: 12,
  },
  panel: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  panelHead: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: "#FAFAFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111110",
  },
  newPill: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  dailyNote: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  list: { maxHeight: 400 },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#111110",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F7F7F4",
  },
  rowUnread: {
    backgroundColor: "#FAFAFE",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  rowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111110",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  rowBody: {
    fontSize: 12,
    color: "#5F5E5A",
    lineHeight: 18,
    marginBottom: 6,
  },
  rowTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  footer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: "#FAFAFE",
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
