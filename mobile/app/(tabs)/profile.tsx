import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { uploadAvatar } from "@/lib/avatarUpload";
import { deleteMyAccount } from "@/lib/accountDeletion";
import { Colors, FontSize, Spacing, Radius } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AppHeader } from "@/components/AppHeader";
import { AppIcon } from "@/components/ui/AppIcon";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const signOut = useAuthStore((s) => s.signOut);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const initials = (user?.name?.trim()?.charAt(0) || "U").toUpperCase();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account permanently?",
      "This removes your profile, tracker history, analyse results, and all other Finkoin data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDeleteBusy(true);
            void deleteMyAccount()
              .then(async ({ error }) => {
                if (error) {
                  Alert.alert("Could not delete account", error);
                  return;
                }
                await signOut();
                router.replace("/(tabs)");
              })
              .finally(() => setDeleteBusy(false));
          },
        },
      ],
    );
  };

  const handlePickPhoto = async () => {
    if (!user?.id || photoBusy) return;
    // Android uses the system photo picker, which needs no permission (Play
    // blocks READ_MEDIA_IMAGES for one-off picks, see app.json).
    if (Platform.OS !== "android") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo access to set a profile picture.",
        );
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setPhotoBusy(true);
    try {
      const { publicUrl, error } = await uploadAvatar(
        user.id,
        result.assets[0].uri,
      );
      if (error) {
        Alert.alert("Upload failed", error);
        return;
      }
      if (publicUrl) updateUser({ photoURL: publicUrl });
    } finally {
      setPhotoBusy(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.pad}>
          <BrandLogo size={64} />
          <Text style={[styles.title, { textAlign: "center", marginTop: 16 }]}>
            Your Finkoin account
          </Text>
          <Text style={styles.gateSub}>
            Same login as finkoin.com — email or Google.
          </Text>
          <Button label="Log in" onPress={() => router.push("/(auth)/login")} />
          <Button
            label="Create account"
            variant="secondary"
            onPress={() => router.push("/(auth)/signup")}
            style={{ marginTop: 12 }}
          />
          <Pressable onPress={() => router.push("/(tabs)")} style={styles.link}>
            <Text style={styles.linkText}>← Back to home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Pressable
              onPress={() => void handlePickPhoto()}
              disabled={photoBusy}
              style={styles.avatarEditBadge}
            >
              {photoBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppIcon name="camera" size={15} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name || "—"}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
          <Text style={styles.value}>{user?.email || "—"}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Plan</Text>
          <Text style={styles.value}>{user?.subscriptionTier || "free"}</Text>
          <View style={styles.fk}>
            <Text style={styles.fkText}>⚡ {user?.fkBalance ?? 0} FK</Text>
          </View>
        </Card>

        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            Alert.alert("Sign out?", "You can log in again anytime.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: () => {
                  void signOut().then(() => router.replace("/(tabs)"));
                },
              },
            ]);
          }}
        />

        <Button
          label={deleteBusy ? "Deleting…" : "Delete account permanently"}
          variant="ghost"
          disabled={deleteBusy}
          onPress={handleDeleteAccount}
          style={{ marginTop: 8 }}
          textStyle={{ color: Colors.error }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pad: { flexGrow: 1, padding: Spacing.xl, paddingBottom: 120 },
  avatarRow: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatarWrap: {
    width: 88,
    height: 88,
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  card: { marginBottom: Spacing.xl },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  fk: {
    marginTop: Spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.round,
  },
  fkText: { fontWeight: "700", color: Colors.primary },
  gateSub: {
    textAlign: "center",
    color: Colors.textMuted,
    marginBottom: 24,
    lineHeight: 22,
  },
  link: { marginTop: 24, alignItems: "center" },
  linkText: { color: Colors.primary, fontWeight: "700" },
});
