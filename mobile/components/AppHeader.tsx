/**
 * Top bar matching PWA GlobalNavbar (mobile):
 * FK coin + "Finkoin" link | NotificationBell (signed in) + profile avatar
 * Profile opens dropdown panel (not full profile page). The footer links live
 * in the page-bottom Footer, not a drawer.
 *
 * GlobalChrome renders the single instance (`root`); any other `<AppHeader />`
 * inside a screen renders nothing so it never doubles.
 */
import { useContext, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/AppIcon";
import { BrandTile, BrandWordmark } from "@/components/ui/BrandMark";
import { PremiumAvatarRing } from "@/components/ui/PremiumAvatarRing";
import { ChromeContext } from "@/components/shell/ChromeContext";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Colors, themedStyles } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

type Props = {
  homeOnLogo?: boolean;
  /** Only GlobalChrome sets this. */
  root?: boolean;
};

export function AppHeader({ homeOnLogo = true, root = false }: Props) {
  const insideChrome = useContext(ChromeContext);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const letter = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const premium = useThemeStore((s) => s.premium?.unlocked ?? false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (insideChrome && !root) return null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Pressable
            onPress={() => {
              if (homeOnLogo) router.push("/(tabs)");
            }}
            style={styles.wordmarkBtn}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="link"
            accessibilityLabel="Finkoin home"
          >
            <BrandTile size={32} />
            <BrandWordmark />
          </Pressable>
        </View>

        <View style={styles.right}>
          {isLoggedIn ? <NotificationBell /> : null}

          <PremiumAvatarRing premium={isLoggedIn && premium} size={36}>
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
                <AppIcon name="user" size={18} color={Colors.primaryText} />
              )}
            </Pressable>
          </PremiumAvatarRing>
        </View>
      </View>

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
  // Web navbar: a soft wash of the page colour with no border or shadow, so
  // the header is the page background itself.
  safe: {
    backgroundColor: Colors.background,
    zIndex: 40,
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
  wordmarkBtn: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
