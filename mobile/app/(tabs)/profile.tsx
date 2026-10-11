import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Alert,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useFinancialStore } from "@/store/financialStore";
import { analyseFinances } from "@/lib/financialEngine";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useGamification } from "@/lib/useGamification";
import { supabase } from "@/lib/supabase";
import { uploadAvatar } from "@/lib/avatarUpload";
import { deleteMyAccount } from "@/lib/accountDeletion";
import {
  Colors,
  FontSize,
  Spacing,
  Radius,
  themedStyles,
  tintBg,
} from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PremiumAvatarRing } from "@/components/ui/PremiumAvatarRing";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { AppHeader } from "@/components/AppHeader";
import { AppIcon } from "@/components/ui/AppIcon";
import ProfileAssets from "@/components/profile/ProfileAssets";

const SITE = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://www.finkoin.com"
).replace(/\/$/, "");

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const signOut = useAuthStore((s) => s.signOut);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submission = useFinancialStore((s) => s.lastSubmission);
  const result = useFinancialStore((s) => s.result);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);
  const { stats } = useGamification(user?.id);

  // Same as the PWA: pull the latest analysis if this device has none yet.
  useEffect(() => {
    if (!user?.id || submission) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await fetchUserAnalyseSnapshot(user.id);
        if (cancelled || !snap?.lastSubmission) return;
        hydrateFromSnapshot(
          snap.lastSubmission,
          snap.result ?? analyseFinances(snap.lastSubmission),
          { analysisPatch: snap.analysis ?? undefined, aiPlan: snap.aiPlan },
        );
      } catch {
        /* profile still renders without it */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, submission, hydrateFromSnapshot]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("users")
        .select("referral_code, subscription_expiry")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      if (typeof data.referral_code === "string")
        setReferralCode(data.referral_code);
      setExpiry(data.subscription_expiry ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const analysis = useMemo(
    () => (submission ? (result ?? analyseFinances(submission)) : null),
    [submission, result],
  );
  const healthScore = analysis
    ? Math.max(
        0,
        100 -
          analysis.issues.filter((i) => i.severity === "critical").length * 15 -
          analysis.issues.filter((i) => i.severity === "warning").length * 7,
      )
    : null;
  const checklist = analysis?.securityChecklist ?? [];
  const checklistDone = checklist.filter((i) => i.status === "ok").length;

  const tier = user?.subscriptionTier || "free";
  const paid = tier !== "free";
  const planLabel =
    tier === "promax"
      ? "Pro Max Plan"
      : tier === "pro"
        ? "Pro Plan"
        : "Free Plan";
  const fk = stats?.fkBalance ?? user?.fkBalance ?? 0;

  const referralUrl = referralCode
    ? `${SITE}/?ref=${encodeURIComponent(referralCode)}`
    : "";
  const shareMessage = `I use Finkoin to manage my finances. Get your free AI financial health check: ${referralUrl}`;

  const copyReferral = async () => {
    if (!referralUrl) return;
    await Clipboard.setStringAsync(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = async () => {
    if (!referralUrl) return;
    try {
      await Linking.openURL(
        `whatsapp://send?text=${encodeURIComponent(shareMessage)}`,
      );
    } catch {
      await Share.share({ message: shareMessage });
    }
  };

  const initials = (user?.name?.trim()?.charAt(0) || "U").toUpperCase();
  const premium = useThemeStore((s) => s.premium?.unlocked ?? false);

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
        <Card style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            <PremiumAvatarRing premium={premium} size={88}>
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </PremiumAvatarRing>
            <Pressable
              onPress={() => void handlePickPhoto()}
              disabled={photoBusy}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={styles.avatarEditBadge}
            >
              {photoBusy ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <AppIcon name="camera" size={15} color={Colors.onPrimary} />
              )}
            </Pressable>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.name ?? "Finkoin user"}</Text>
            {premium ? <PremiumBadge size="md" /> : null}
          </View>
          <Text style={styles.sub}>{user?.email ?? "No phone/email"}</Text>
        </Card>

        <View style={[styles.plan, paid && styles.planPaid]}>
          <Text style={[styles.planTitle, paid && styles.onPrimary]}>
            {planLabel}
          </Text>
          <Text style={[styles.planSub, paid && styles.onPrimary]}>
            Expiry:{" "}
            {expiry
              ? new Date(expiry).toLocaleDateString("en-IN")
              : "No expiry"}
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Health score</Text>
              <Text style={styles.statValue}>{healthScore ?? "—"}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>FK tokens</Text>
              <View style={styles.inline}>
                <AppIcon name="coin" size={20} />
                <Text style={styles.statValue}>{fk}</Text>
              </View>
            </View>
          </View>
        </Card>

        <ProfileAssets profile={submission} analysis={analysis} />

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Your financial checklist</Text>
          <Text style={styles.muted}>
            {checklistDone} of {Math.max(1, checklist.length)} completed
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, (checklistDone / Math.max(1, checklist.length)) * 100)}%`,
                },
              ]}
            />
          </View>
          {checklist.slice(0, 8).map((item) => (
            <View key={item.label} style={styles.checkItem}>
              <AppIcon
                name={item.status === "ok" ? "check" : "close"}
                size={16}
                color={item.status === "ok" ? Colors.success : Colors.error}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.checkLabel}>{item.label}</Text>
                  <Text style={styles.checkStatus}>
                    {item.status === "ok" ? "Done" : "Pending"}
                  </Text>
                </View>
                {item.detail ? (
                  <Text style={styles.checkDetail}>{item.detail}</Text>
                ) : null}
              </View>
            </View>
          ))}
          {checklist.length === 0 ? (
            <Text style={[styles.muted, styles.centered, styles.spaced]}>
              Complete analysis to unlock your checklist.
            </Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.inline}>
            <Text style={styles.sectionTitle}>KYC verification</Text>
            <View style={styles.soon}>
              <Text style={styles.soonText}>Coming soon</Text>
            </View>
          </View>
          <Text style={styles.small}>
            PAN, Aadhaar, and full identity checks are on the way. We&apos;ll
            notify you when verification opens on Finkoin.
          </Text>
          <View style={styles.kycList}>
            <View style={styles.kycBox}>
              <Text style={styles.kycTitle}>PAN verification</Text>
              <Text style={styles.small}>Coming soon</Text>
            </View>
            <View style={styles.kycBox}>
              <Text style={styles.kycText}>
                Mobile verification:{" "}
                <Text style={styles.kycMuted}>Coming soon</Text>
              </Text>
              <Text style={[styles.kycMuted, { marginTop: 4 }]}>
                Aadhaar verification: Coming soon
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            Refer friends · Earn FK tokens
          </Text>
          <Text style={styles.refLink}>
            {referralUrl || "Generating link…"}
          </Text>
          <View style={styles.inline}>
            <Pressable
              style={[
                styles.refBtn,
                copied && styles.refBtnCopied,
                !referralUrl && { opacity: 0.5 },
              ]}
              disabled={!referralUrl}
              onPress={() => void copyReferral()}
            >
              {copied ? (
                <AppIcon name="check" size={14} color={Colors.primaryText} />
              ) : null}
              <Text style={[styles.refBtnText, copied && styles.copiedText]}>
                {copied ? "Copied" : "Copy link"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.waBtn, !referralUrl && { opacity: 0.5 }]}
              disabled={!referralUrl}
              onPress={() => void shareWhatsApp()}
            >
              <Text style={styles.waText}>Share on WhatsApp</Text>
            </Pressable>
          </View>
        </Card>

        <Card style={styles.accountCard}>
          <Text style={[styles.sectionTitle, styles.accountTitle]}>
            Account
          </Text>
          <View style={[styles.inline, { marginTop: Spacing.sm }]}>
            <Pressable
              style={[styles.accountBtn, styles.deleteBtn]}
              disabled={deleteBusy}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteText}>
                {deleteBusy ? "Deleting…" : "Delete all my data"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.accountBtn}
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
            >
              <Text style={styles.accountBtnText}>Sign out</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  pad: { flexGrow: 1, padding: Spacing.xl, paddingBottom: 120 },
  identityCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.xxl,
    alignItems: "center",
  },
  /** Sized by the avatar (plus the gold ring for Premium members). */
  avatarWrap: {
    marginBottom: Spacing.md,
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
    color: Colors.onPrimary,
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
  card: { marginBottom: Spacing.lg },
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  sub: {
    marginTop: 2,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: "center",
  },
  plan: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  planPaid: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  planTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  planSub: { marginTop: 4, fontSize: FontSize.sm, color: Colors.textMuted },
  onPrimary: { color: Colors.onPrimary },
  statsRow: { flexDirection: "row", gap: Spacing.lg },
  stat: { flex: 1 },
  statLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  statValue: {
    marginTop: 2,
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  muted: { fontSize: FontSize.md, color: Colors.textMuted, lineHeight: 19 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  track: {
    marginTop: Spacing.md,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceMuted,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  checkItem: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  checkLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  checkStatus: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  checkDetail: {
    marginTop: 2,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  soon: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.round,
    marginBottom: Spacing.xs,
  },
  soonText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  refLink: {
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceMuted,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  refBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refBtnText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  refBtnCopied: {
    borderColor: tintBg("#A7F3D0"),
    backgroundColor: Colors.successLight,
  },
  copiedText: { color: Colors.successText },
  waBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: "#25D366",
  },
  waText: { fontSize: FontSize.md, fontWeight: "700", color: "#FFFFFF" },
  small: { marginTop: 4, fontSize: FontSize.sm, color: Colors.textMuted },
  centered: { textAlign: "center" },
  spaced: { marginTop: Spacing.md },
  kycList: { marginTop: Spacing.md, gap: Spacing.md, opacity: 0.6 },
  kycBox: {
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  kycTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  kycText: { fontSize: FontSize.md, color: Colors.textSecondary },
  kycMuted: { fontSize: FontSize.md, color: Colors.textMuted },
  accountCard: { marginBottom: Spacing.lg, borderColor: Colors.errorLight },
  accountTitle: { color: Colors.errorText },
  accountBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountBtnText: { fontSize: FontSize.md, color: Colors.textPrimary },
  deleteBtn: { borderColor: tintBg("#FECACA") },
  deleteText: { fontSize: FontSize.md, color: Colors.error },
  gateSub: {
    textAlign: "center",
    color: Colors.textMuted,
    marginBottom: 24,
    lineHeight: 22,
  },
  link: { marginTop: 24, alignItems: "center" },
  linkText: { color: Colors.primaryText, fontWeight: "700" },
}));
