import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors, FontSize, Spacing, Radius } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { appStorage } from "@/lib/storage";
import {
  TRACKER_CONSENT_VERSION,
  TRACKER_CONSENT_STORAGE_KEY,
} from "@/lib/trackerCreditCards";
import { useAuthStore } from "@/store/authStore";

const TRACK_ITEMS = [
  "Needs / mandatory expenses — rent, groceries, utilities",
  "Wants / non-mandatory expenses — dining, entertainment",
  "Habit expenses — tea, coffee, cigarettes",
  "Loans & credit card payments",
  "Investments & savings",
  "Medical, transport, shopping & more",
] as const;

type Props = {
  onAccept: () => void;
};

/** Matches web TrackerConsent (v2). */
export function TrackerConsent({ onAccept }: Props) {
  const user = useAuthStore((s) => s.user);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAccept() {
    if (!checked || !user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tracker_consent").upsert({
        user_id: user.id,
        consent_given: true,
        consent_at: new Date().toISOString(),
        consent_version: TRACKER_CONSENT_VERSION,
      });
      if (error) console.warn("tracker_consent upsert:", error.message);
      await appStorage.setItem(
        TRACKER_CONSENT_STORAGE_KEY,
        TRACKER_CONSENT_VERSION,
      );
      onAccept();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <AppIcon name="chart" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Start your money tracker</Text>
          <Text style={styles.sub}>
            Track every rupee you spend. See where your money goes. Get insights
            to spend better.
          </Text>

          <View style={styles.listBox}>
            <Text style={styles.listHead}>WHAT YOU CAN TRACK</Text>
            {TRACK_ITEMS.map((label) => (
              <Text key={label} style={styles.listItem}>
                · {label}
              </Text>
            ))}
          </View>

          <View style={styles.privacyBox}>
            <AppIcon name="shield" size={16} color={Colors.primary} />
            <Text style={styles.privacyText}>
              Your expenses stay private to your account. Sensitive amounts are
              encrypted. Delete anytime from settings.
            </Text>
          </View>

          <Pressable
            style={styles.checkRow}
            onPress={() => setChecked((c) => !c)}
          >
            <View style={[styles.checkbox, checked && styles.checkboxOn]}>
              {checked ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>
              I understand that Finkoin will store my expense entries to power
              spend tracking. I can delete this data anytime.
            </Text>
          </Pressable>

          <Pressable
            disabled={!checked || saving}
            onPress={() => void handleAccept()}
            style={[styles.startBtn, (!checked || saving) && styles.startOff]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={[styles.startText, !checked && styles.startTextOff]}>
                Start tracking
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)")}
            style={styles.later}
          >
            <Text style={styles.laterText}>Maybe later</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    padding: 24,
    paddingBottom: 120,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  iconWrap: { alignItems: "center", marginBottom: 20 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111110",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: "#5F5E5A",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  listBox: {
    backgroundColor: "#F7F7F4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  listHead: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 12,
    letterSpacing: 0.4,
  },
  listItem: {
    fontSize: 13,
    color: "#5F5E5A",
    marginBottom: 8,
    lineHeight: 18,
  },
  privacyBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkMark: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: "#5F5E5A",
    lineHeight: 20,
  },
  startBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  startOff: { backgroundColor: Colors.border },
  startText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  startTextOff: { color: Colors.textMuted },
  later: { marginTop: 10, padding: 8, alignItems: "center" },
  laterText: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
});
