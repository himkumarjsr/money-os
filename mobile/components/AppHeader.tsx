/**
 * Top bar matching PWA GlobalNavbar (mobile):
 * logo | NotificationBell + profile avatar
 * Profile opens dropdown panel (not full profile page).
 */
import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AppIcon } from "@/components/ui/AppIcon";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

type Props = {
  homeOnLogo?: boolean;
};

export function AppHeader({ homeOnLogo = true }: Props) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const letter = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.wash} pointerEvents="none" />
      <View style={styles.bar}>
        <Pressable
          onPress={() => {
            if (homeOnLogo) router.push("/(tabs)");
          }}
          style={styles.brand}
          accessibilityRole="link"
          accessibilityLabel="Finkoin home"
        >
          <BrandLogo size={32} withWordmark />
        </Pressable>

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

      {isLoggedIn ? (
        <ProfileMenu
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "rgba(244,242,252,0.92)",
    zIndex: 40,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(244,242,252,0.55)",
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
    minWidth: 0,
    flexShrink: 1,
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
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.75)",
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
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  avatarImg: {
    height: 36,
    width: 36,
    borderRadius: 999,
  },
});
