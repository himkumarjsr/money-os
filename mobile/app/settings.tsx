/**
 * Settings — port of web app/settings/page.tsx.
 * Web Push is replaced by native Expo push (lib/pushNotifications), and the
 * JSON export goes through the OS share sheet instead of a browser download.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { syncKv } from "@/lib/syncKv";
import { uploadAvatar } from "@/lib/avatarUpload";
import {
  getPushPermission,
  registerPushToken,
  requestPushPermission,
  unregisterPushToken,
} from "@/lib/pushNotifications";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { SettingsToggle } from "@/components/settings/SettingsToggle";
import { ChangePasswordSheet } from "@/components/settings/ChangePasswordSheet";
import { DeleteAccountSheet } from "@/components/settings/DeleteAccountSheet";
import { FeedbackSheet } from "@/components/FeedbackSheet";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

type NotifPrefs = {
  morning_tips: boolean;
  weekly_summary: boolean;
  payment_alerts: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  morning_tips: false,
  weekly_summary: false,
  payment_alerts: true,
};

export default function SettingsScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);

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
        <BackButton />
        <View style={styles.gate}>
          <Text style={styles.gateText}>Sign in to manage your settings.</Text>
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

  return <SettingsInner />;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

function BackButton() {
  return (
    <Pressable onPress={goBack} style={styles.back} accessibilityRole="button">
      <Text style={styles.backText}>← Back</Text>
    </Pressable>
  );
}

function SettingsInner() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [photoBusy, setPhotoBusy] = useState(false);

  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [passwordSheet, setPasswordSheet] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [notifSavingKey, setNotifSavingKey] = useState<string | null>(null);
  const [emailConsent, setEmailConsent] = useState(false);
  const [pushConsent, setPushConsent] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushBlocked, setPushBlocked] = useState(false);
  const [loadingPref, setLoadingPref] = useState(true);
  const [savingPref, setSavingPref] = useState(false);

  const [exportBusy, setExportBusy] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);

  const pushSupported = Device.isDevice;

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setLoadingPref(false);
        return;
      }
      setLoadingPref(true);
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setEmailConsent(Boolean(data.email_consent));
        setPushConsent(Boolean(data.push_consent));
        setNotifPrefs({
          morning_tips: Boolean(data.morning_tips),
          weekly_summary: Boolean(data.weekly_summary),
          payment_alerts: Boolean(data.payment_alerts),
        });
      } else {
        setEmailConsent(false);
        setPushConsent(false);
        setNotifPrefs(DEFAULT_PREFS);
      }
      setLoadingPref(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const initials = useMemo(
    () => (user?.name?.trim()?.charAt(0) || "U").toUpperCase(),
    [user?.name],
  );

  const handleNameSave = async () => {
    if (!user?.id || !name.trim() || nameSaving) return;
    setNameSaving(true);
    setNameSaved(false);
    setNameError(null);
    try {
      const { error } = await supabase
        .from("users")
        .update({ name: name.trim() })
        .eq("id", user.id);
      if (error) {
        setNameError(error.message);
        return;
      }
      updateUser({ name: name.trim() });
      setNameSaved(true);
      await refreshUser();
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Could not save name");
    } finally {
      setNameSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!user?.id || photoBusy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to set a profile picture.",
      );
      return;
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

  const handlePasswordReset = async () => {
    if (!user?.email || resetBusy) return;
    setResetBusy(true);
    setResetError(null);
    const { error } = await resetPassword(user.email);
    setResetBusy(false);
    if (error) {
      setResetError(error);
      return;
    }
    setResetSent(true);
  };

  const toggleEmailConsent = async () => {
    if (!user?.id || savingPref || loadingPref) return;
    const newValue = !emailConsent;
    const now = new Date().toISOString();
    setEmailConsent(newValue);
    setSavingPref(true);
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        email_consent: newValue,
        morning_tips: newValue,
        weekly_summary: newValue,
        updated_at: now,
        email_consent_at: newValue ? now : null,
        declined_at: !newValue ? now : null,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.warn("notification_preferences upsert:", error.message);
      setEmailConsent(!newValue);
      setSavingPref(false);
      return;
    }
    setNotifPrefs((prev) => ({
      ...prev,
      morning_tips: newValue,
      weekly_summary: newValue,
    }));
    setSavingPref(false);
    syncKv.setItem("finkoin_notif_consent", newValue ? "accepted" : "declined");
  };

  const togglePushConsent = async () => {
    if (!user?.id || pushBusy || loadingPref) return;
    setPushBusy(true);
    setPushMessage(null);
    setPushBlocked(false);
    try {
      if (!pushConsent) {
        const granted = await requestPushPermission();
        if (!granted) {
          const status = await getPushPermission();
          setPushBlocked(status === "denied");
          setPushMessage(
            status === "denied"
              ? "Notification permission is blocked. Enable it in your phone's Settings for Finkoin."
              : "Notification permission wasn't granted. Try again.",
          );
          return;
        }
        const ok = await registerPushToken(user.id);
        if (!ok) {
          setPushMessage("Could not enable push notifications. Try again.");
          return;
        }
        setPushConsent(true);
        setNotifPrefs((prev) => ({ ...prev, morning_tips: true }));
        setPushMessage("Device push enabled for daily tips.");
      } else {
        await unregisterPushToken(user.id);
        const { error } = await supabase
          .from("notification_preferences")
          .upsert(
            {
              user_id: user.id,
              push_consent: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        if (error) {
          setPushMessage("Could not turn off push. Try again.");
          return;
        }
        setPushConsent(false);
        setPushMessage("Device push turned off.");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const updatePref = async (key: "payment_alerts", value: boolean) => {
    if (!user?.id || notifSavingKey) return;
    setNotifSavingKey(key);
    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        [key]: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (!error) setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    setNotifSavingKey(null);
  };

  const exportData = useCallback(async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Export failed", "Sharing isn't available on this device.");
        return;
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        user,
        lastSubmissionSnapshot: lastSubmission ? { ...lastSubmission } : null,
      };
      const file = new File(
        Paths.cache,
        `finkoin-export-${user?.id?.slice(0, 8) ?? "user"}.json`,
      );
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        UTI: "public.json",
        dialogTitle: "Export my data",
      });
    } catch {
      Alert.alert("Export failed", "Couldn't create the export file.");
    } finally {
      setExportBusy(false);
    }
  }, [exportBusy, user, lastSubmission]);

  const pushStatusText = !pushSupported
    ? "Push needs a physical phone — simulators can't receive notifications."
    : pushConsent
      ? "✓ Device push on — tips and Split expense alerts on this phone"
      : "Off — enable for tips and Split expense alerts on this phone";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />

        <Text style={styles.h1}>Settings</Text>
        <Text style={styles.sub}>Profile, security, and data preferences.</Text>

        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
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
              <Pressable
                onPress={() => void handlePickPhoto()}
                disabled={photoBusy}
                hitSlop={8}
                style={styles.avatarEdit}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                {photoBusy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppIcon name="pencil" size={15} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            <View style={styles.nameCol}>
              <Text style={styles.fieldLabel}>Display name</Text>
              <TextInput
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setNameSaved(false);
                }}
                style={styles.nameInput}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => void handleNameSave()}
              />
              <Pressable
                onPress={() => void handleNameSave()}
                disabled={nameSaving || !name.trim()}
                style={[
                  styles.primaryBtn,
                  (nameSaving || !name.trim()) && styles.dim,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>
                  {nameSaving ? "Saving…" : "Save name"}
                </Text>
              </Pressable>
              {nameSaved ? <Text style={styles.ok}>Saved.</Text> : null}
              {nameError ? <Text style={styles.err}>{nameError}</Text> : null}
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.miniTitle}>Email</Text>
          <Text style={styles.emailValue}>{user?.email ?? "—"}</Text>
          <Text style={styles.helper}>
            Email sign-in can't be changed here.{" "}
            <Text
              style={styles.link}
              onPress={() => void Linking.openURL("mailto:support@finkoin.com")}
              accessibilityRole="link"
            >
              support@finkoin.com
            </Text>
          </Text>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Pressable
            onPress={() => setPasswordSheet(true)}
            style={[styles.outlineBtn, { marginTop: 16 }]}
            accessibilityRole="button"
          >
            <AppIcon name="lock" size={18} color={Colors.primary} />
            <Text style={styles.outlineBtnText}>Change password</Text>
          </Pressable>
          {passwordChanged ? (
            <Text style={[styles.ok, { marginTop: 10 }]}>
              Password updated.
            </Text>
          ) : null}
          <Pressable
            onPress={() => void handlePasswordReset()}
            disabled={resetBusy}
            style={[
              styles.outlineBtn,
              { marginTop: 10 },
              resetBusy && styles.dim,
            ]}
            accessibilityRole="button"
          >
            <AppIcon name="mail" size={18} color={Colors.primary} />
            <Text style={styles.outlineBtnText}>
              {resetBusy ? "Sending…" : "Email me a password reset link"}
            </Text>
          </Pressable>
          {resetSent ? (
            <Text style={[styles.ok, { marginTop: 10 }]}>
              Password reset email sent to {user?.email}.
            </Text>
          ) : null}
          {resetError ? (
            <Text style={[styles.err, { marginTop: 10 }]}>{resetError}</Text>
          ) : null}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.helper}>
            Saved to your account and synced across devices.
          </Text>

          <View style={styles.notifBox}>
            <View style={styles.notifRow}>
              <View style={styles.notifText}>
                <Text style={styles.notifTitle}>Daily finance tips</Text>
                <Text style={styles.notifSub}>
                  One tip every morning at 8:30 AM
                </Text>
              </View>
              <SettingsToggle
                value={emailConsent}
                onToggle={() => void toggleEmailConsent()}
                disabled={loadingPref || savingPref}
                accessibilityLabel={
                  emailConsent
                    ? "Turn off daily finance tips"
                    : "Turn on daily finance tips"
                }
              />
            </View>
            <View style={styles.notifNote}>
              <Text style={styles.noteText}>
                {emailConsent
                  ? `✓ Email subscribed — tips sent to ${user?.email ?? "your email"}`
                  : "Not subscribed — toggle to receive daily tip emails"}
              </Text>
            </View>

            <View style={[styles.notifRow, styles.notifRowTop]}>
              <View style={styles.notifText}>
                <Text style={styles.notifTitle}>Device push notifications</Text>
                <Text style={styles.notifSub}>
                  OS alert at 8:30 AM even when the app is closed
                </Text>
              </View>
              {pushBusy ? (
                <View style={styles.toggleSpinner}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : (
                <SettingsToggle
                  value={pushConsent}
                  onToggle={() => void togglePushConsent()}
                  disabled={loadingPref || !pushSupported}
                  accessibilityLabel={
                    pushConsent
                      ? "Turn off device push notifications"
                      : "Turn on device push notifications"
                  }
                />
              )}
            </View>
            <View style={styles.notifNote}>
              <Text style={styles.noteText}>{pushStatusText}</Text>
              {pushMessage ? (
                <Text style={styles.pushMsg}>{pushMessage}</Text>
              ) : null}
              {pushBlocked ? (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  style={styles.openSettings}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>Open phone settings</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.checkRow}>
            <Text style={styles.checkLabel}>Payment & Split alerts</Text>
            <SettingsToggle
              value={notifPrefs.payment_alerts}
              onToggle={() =>
                void updatePref("payment_alerts", !notifPrefs.payment_alerts)
              }
              disabled={loadingPref || notifSavingKey === "payment_alerts"}
              accessibilityLabel="Payment and Split alerts"
            />
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <Pressable
            onPress={() => void exportData()}
            disabled={exportBusy}
            style={[styles.greyBtn, exportBusy && styles.dim]}
            accessibilityRole="button"
          >
            <Text style={styles.greyBtnText}>
              {exportBusy ? "Preparing…" : "Export my data (JSON)"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDeleteSheet(true)}
            style={styles.dangerBtn}
            accessibilityRole="button"
          >
            <Text style={styles.dangerBtnText}>Delete account permanently</Text>
          </Pressable>
          <Text style={[styles.helper, { marginTop: 8 }]}>
            Export includes your profile and the last analysis saved on this
            device. For full deletion from servers, email{" "}
            <Text
              style={styles.link}
              onPress={() => void Linking.openURL("mailto:privacy@finkoin.com")}
              accessibilityRole="link"
            >
              privacy@finkoin.com
            </Text>
            .
          </Text>
        </View>

        {/* App */}
        <View style={[styles.section, styles.appSection]}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.appList}>
            <Text style={styles.appLine}>
              Version: <Text style={styles.strong}>{APP_VERSION}</Text>
            </Text>
            <Text style={styles.appLine}>
              Last analysis draft:{" "}
              <Text style={styles.strong}>
                {lastSubmission ? "Saved on this device" : "None yet"}
              </Text>
            </Text>
            <View style={styles.fkRow}>
              <Text style={styles.appLine}>FK balance: </Text>
              <AppIcon name="coin" size={16} color={Colors.primary} />
              <Text style={styles.strong}> {user?.fkBalance ?? 0} · </Text>
              <Pressable
                onPress={() => router.push("/rewards" as Href)}
                hitSlop={12}
                accessibilityRole="link"
              >
                <Text style={[styles.strong, styles.link]}>Rewards</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={() => setFeedbackOpen(true)}
            style={styles.feedbackBtn}
            accessibilityRole="button"
          >
            <AppIcon name="mail" size={16} color={Colors.primary} />
            <Text style={styles.feedbackText}>Share feedback</Text>
          </Pressable>
        </View>
      </ScrollView>

      <FeedbackSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        source="app_settings"
      />
      <ChangePasswordSheet
        visible={passwordSheet}
        onClose={() => setPasswordSheet(false)}
        onDone={() => {
          setPasswordSheet(false);
          setPasswordChanged(true);
        }}
      />
      <DeleteAccountSheet
        visible={deleteSheet}
        onClose={() => setDeleteSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 120 },
  back: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingRight: 16,
  },
  backText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  gate: { padding: 24, alignItems: "center" },
  gateText: { color: Colors.textSecondary, marginBottom: 16, fontSize: 15 },
  gateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  gateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },

  h1: { fontSize: 28, fontWeight: "800", color: Colors.textPrimary },
  sub: { marginTop: 6, fontSize: 14, color: Colors.textSecondary },

  section: {
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  link: { color: Colors.primary, fontWeight: "700" },
  ok: { marginTop: 6, fontSize: 12, fontWeight: "600", color: Colors.success },
  err: { marginTop: 6, fontSize: 12, fontWeight: "600", color: Colors.error },
  dim: { opacity: 0.5 },

  profileRow: { flexDirection: "row", gap: 20, marginTop: 20 },
  avatarWrap: { width: 80, height: 80 },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 30, fontWeight: "800", color: "#FFFFFF" },
  avatarEdit: {
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
    borderColor: Colors.card,
  },
  nameCol: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  nameInput: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
  },
  primaryBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 20,
  },
  miniTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emailValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outlineBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },

  notifBox: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    backgroundColor: Colors.card,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  notifRowTop: { borderTopWidth: 1, borderTopColor: Colors.background },
  notifText: { flex: 1, minWidth: 0 },
  notifTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  notifSub: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
  notifNote: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noteText: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  pushMsg: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  openSettings: { minHeight: 44, justifyContent: "center" },
  toggleSpinner: {
    minHeight: 44,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  checkRow: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  greyBtn: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  greyBtnText: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
  dangerBtn: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: { fontSize: 14, fontWeight: "800", color: "#B91C1C" },

  appSection: {
    backgroundColor: Colors.background,
    shadowOpacity: 0,
    elevation: 0,
  },
  appList: { marginTop: 12, gap: 8 },
  appLine: { fontSize: 14, color: Colors.textSecondary },
  strong: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  fkRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  feedbackBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryMedium,
    alignSelf: "flex-start",
  },
  feedbackText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
});
