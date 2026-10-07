/**
 * Profile dropdown — same content as PWA GlobalNavbar profile panel.
 */
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { openWebPage } from "@/lib/openWebPage";

const SITE = "https://finkoin.com";

const MENU: Array<{
  icon: AppIconName;
  label: string;
  /** In-app route or external path under finkoin.com */
  href: string;
  external?: boolean;
}> = [
  { icon: "user", label: "My Profile", href: "/(tabs)/profile" },
  { icon: "notebook", label: "Expense Tracker", href: "/(tabs)/tracker" },
  { icon: "users", label: "FK Split", href: "/(tabs)/split" },
  { icon: "chart", label: "My Analysis", href: "/(tabs)/analyse" },
  {
    icon: "shield",
    label: "My Policies",
    href: `${SITE}/policies`,
    external: true,
  },
  { icon: "target", label: "My Goals", href: `${SITE}/goals`, external: true },
  {
    icon: "trending",
    label: "My Investments",
    href: `${SITE}/investments`,
    external: true,
  },
  {
    icon: "trophy",
    label: "Leaderboard",
    href: `${SITE}/leaderboard`,
    external: true,
  },
  {
    icon: "gift",
    label: "Rewards",
    href: `${SITE}/rewards`,
    external: true,
  },
  {
    icon: "users",
    label: "Refer & Earn",
    href: `${SITE}/refer`,
    external: true,
  },
  {
    icon: "settings",
    label: "Settings",
    href: `${SITE}/settings`,
    external: true,
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileMenu({ visible, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const letter = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const tier = user?.subscriptionTier || "free";
  const fk = user?.fkBalance ?? 0;
  // PWA gamification store — use 0 until mobile ports badges/streaks
  const badges = 0;
  const streakDays = 0;

  const tierLabel =
    tier === "promax" ? "Pro Max" : tier === "pro" ? "Pro" : "Free plan";
  const tierStyle =
    tier === "promax"
      ? styles.tierProMax
      : tier === "pro"
        ? styles.tierPro
        : styles.tierFree;

  const go = (item: (typeof MENU)[number]) => {
    onClose();
    if (item.external) {
      openWebPage(item.href);
      return;
    }
    router.push(item.href as never);
  };

  const legal = (path: string) => {
    onClose();
    openWebPage(`${SITE}${path}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.identity}>
              <View style={styles.avatarLg}>
                <Text style={styles.avatarLgLetter}>{letter}</Text>
              </View>
              <Text style={styles.name}>{user?.name ?? "Finkoin user"}</Text>
              <Text style={styles.contact}>
                {user?.email ?? "No contact added"}
              </Text>
              <View style={[styles.tierPill, tierStyle]}>
                <Text
                  style={[
                    styles.tierText,
                    tier === "promax" && { color: "#FFFFFF" },
                    tier === "pro" && { color: Colors.primary },
                  ]}
                >
                  {tierLabel}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.stats}>
              <View style={styles.stat}>
                <View style={styles.statNumRow}>
                  <AppIcon name="coin" size={15} color={Colors.primary} />
                  <Text style={styles.statNum}>{fk}</Text>
                </View>
                <Text style={styles.statLabel}>tokens earned</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{badges}</Text>
                <Text style={styles.statLabel}>badges</Text>
              </View>
              <View style={styles.stat}>
                <View style={styles.statNumRow}>
                  <AppIcon name="flame" size={15} color={Colors.primary} />
                  <Text style={styles.statNum}>{streakDays}</Text>
                </View>
                <Text style={styles.statLabel}>day streak</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.nav}>
              {MENU.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => go(item)}
                  style={({ pressed }) => [
                    styles.menuRow,
                    pressed && { backgroundColor: "#F8FAFC" },
                  ]}
                >
                  <View style={styles.menuLeft}>
                    <AppIcon
                      name={item.icon}
                      size={17}
                      color={Colors.primary}
                    />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.chev}>›</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={() => {
                onClose();
                Alert.alert(
                  "Feedback",
                  "Share feedback at finkoin.com or email hello@finkoin.com",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Open site",
                      onPress: () => openWebPage(SITE),
                    },
                  ],
                );
              }}
              style={styles.feedbackBtn}
            >
              <Text style={styles.feedbackText}>Send feedback</Text>
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.legalRow}>
              {(
                [
                  ["Privacy", "/legal/privacy"],
                  ["Terms", "/legal/terms"],
                  ["Refunds", "/legal/refund"],
                  ["Disclaimer", "/legal/disclaimer"],
                  ["Delete account", "/legal/delete-account"],
                ] as const
              ).map(([label, path], i) => (
                <View key={label} style={styles.legalItem}>
                  {i > 0 ? <Text style={styles.dot}>·</Text> : null}
                  <Pressable onPress={() => legal(path)}>
                    <Text style={styles.legalLink}>{label}</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={() => {
                Alert.alert("Sign out?", "You can log in again anytime.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign out",
                    style: "destructive",
                    onPress: () => {
                      onClose();
                      void signOut().then(() => router.replace("/(tabs)"));
                    },
                  },
                ]);
              }}
              style={styles.signOut}
            >
              <AppIcon name="logout" size={16} color="#DC2626" />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
            <Text style={styles.signedAs}>
              Signed in as {user?.email ?? "user"}
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  panel: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  scroll: {
    padding: 16,
    paddingBottom: 20,
  },
  identity: { alignItems: "center" },
  avatarLg: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarLgLetter: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  contact: {
    marginTop: 2,
    fontSize: 12,
    color: "#475569",
  },
  tierPill: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierFree: { backgroundColor: "#F1F5F9" },
  tierPro: { backgroundColor: Colors.primaryLight },
  tierProMax: { backgroundColor: "#0F172A" },
  tierText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  statNumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 10,
    color: "#475569",
  },
  nav: { gap: 2 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuLabel: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  chev: {
    fontSize: 16,
    color: "#94A3B8",
  },
  feedbackBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  legalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  legalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legalLink: {
    fontSize: 11,
    color: "#475569",
  },
  dot: {
    fontSize: 11,
    color: "#CBD5E1",
    marginHorizontal: 2,
  },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  signedAs: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 11,
    color: "#475569",
  },
});
