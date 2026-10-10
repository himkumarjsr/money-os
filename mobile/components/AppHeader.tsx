/**
 * Top bar matching PWA GlobalNavbar (mobile):
 * hamburger + "Finkoin" | NotificationBell + profile avatar
 * Hamburger opens NavDrawer (PWA footer links).
 * Profile opens dropdown panel (not full profile page).
 */
import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/AppIcon";
import { NavDrawer } from "@/components/NavDrawer";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Colors, themedStyles } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

type Props = {
  homeOnLogo?: boolean;
};

export function AppHeader({ homeOnLogo = true }: Props) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const letter = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.wash} pointerEvents="none" />
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Pressable
            onPress={() => setMenuOpen(true)}
            style={styles.menuBtn}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <AppIcon
              name="menu"
              size={22}
              color={Colors.primary}
              strokeWidth={2}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              if (homeOnLogo) router.push("/(tabs)");
            }}
            style={styles.wordmarkBtn}
            accessibilityRole="link"
            accessibilityLabel="Finkoin home"
          >
            <Text style={styles.wordmark} numberOfLines={1}>
              Finkoin
            </Text>
          </Pressable>
        </View>

        <View style={styles.right}>
          {isLoggedIn ? <NotificationBell /> : null}

          <Pressable
            onPress={() => {
              if (!isLoggedIn) {
                router.push("/(auth)/login");
                return;
              }
              setProfileOpen(true);
            }}
            style={styles.avatarBtn}
            accessibilityLabel="Profile"
            accessibilityRole="button"
          >
            {isLoggedIn ? (
              <View style={styles.avatarFill}>
                {user?.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Text style={styles.avatarLetter}>{letter}</Text>
                )}
              </View>
            ) : (
              <AppIcon name="user" size={18} color={Colors.primary} />
            )}
          </Pressable>
        </View>
      </View>

      <NavDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />

      {isLoggedIn ? (
        <ProfileMenu
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: {
    backgroundColor: Colors.glass,
    zIndex: 40,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.glassSoft,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    flexShrink: 1,
  },
  menuBtn: {
    width: 44,
    height: 44,
    marginLeft: -10,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkBtn: { minHeight: 44, justifyContent: "center" },
  wordmark: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  /** White glass circle like PWA profile chip */
  avatarBtn: {
    height: 36,
    width: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassCard,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  avatarImg: {
    height: 36,
    width: 36,
    borderRadius: 999,
  },
}));
