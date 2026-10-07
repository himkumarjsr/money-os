import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import type { TrackerIconName } from "@/lib/tracker-categories";
import {
  TRACKER_CONSENT_VERSION,
  setTrackerConsentLocal,
} from "@/lib/trackerCreditCards";
import { useAuthStore } from "@/store/authStore";
import { openContentHref } from "@/lib/contentLinks";

type TrackItem =
  | { kind: "tracker"; icon: TrackerIconName; label: string }
  | { kind: "app"; icon: AppIconName; label: string };

const TRACK_ITEMS: TrackItem[] = [
  {
    kind: "tracker",
    icon: "home",
    label: "Needs / mandatory expenses — rent, groceries, utilities",
  },
  {
    kind: "tracker",
    icon: "party",
    label: "Wants / non-mandatory expenses — dining, entertainment",
  },
  {
    kind: "tracker",
    icon: "coffee",
    label: "Habit expenses — tea, coffee, cigarettes",
  },
  { kind: "app", icon: "card", label: "Loans & credit card payments" },
  { kind: "app", icon: "trending", label: "Investments & savings" },
  { kind: "app", icon: "hospital", label: "Medical & insurance" },
  { kind: "tracker", icon: "cab", label: "Transport & fuel" },
  { kind: "tracker", icon: "shirt", label: "Shopping & lifestyle" },
];

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
      setTrackerConsentLocal();
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
            {TRACK_ITEMS.map((item) => (
              <View key={item.label} style={styles.listRow}>
                {item.kind === "tracker" ? (
                  <TrackerIcon
                    name={item.icon}
                    size={16}
                    color={Colors.primary}
                  />
                ) : (
                  <AppIcon name={item.icon} size={16} color={Colors.primary} />
                )}
                <Text style={styles.listItem}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.privacyBox}>
            <AppIcon name="lock" size={16} color={Colors.primary} />
            <Text style={styles.privacyText}>
              Your expenses and credit-card nicknames, optional last-4 digits,
              and billing/due dates stay private to your account. Sensitive
              health-check amounts are encrypted. Delete anytime from settings.
            </Text>
          </View>

          <View style={styles.checkRow}>
            <Pressable
              onPress={() => setChecked((c) => !c)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel="I agree to store expense and card data for insights"
              style={[styles.checkbox, checked && styles.checkboxOn]}
            >
              {checked ? (
                <AppIcon
                  name="check"
                  size={12}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                />
              ) : null}
            </Pressable>
            <Text
              style={styles.checkLabel}
              onPress={() => setChecked((c) => !c)}
            >
              I understand that Finkoin will store my expense entries and saved
              card details (nickname, optional last 4, billing/due days) to
              power spend tracking and bill suggestions. I can delete this data
              anytime. I agree to the{" "}
              <Text
                style={styles.link}
                onPress={() => openContentHref("/legal/privacy")}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <Pressable
            disabled={!checked || saving}
            onPress={() => void handleAccept()}
            style={[styles.startBtn, !checked && styles.startOff]}
          >
            <Text style={[styles.startText, !checked && styles.startTextOff]}>
              {saving ? "Starting…" : "Start tracking"}
            </Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
    paddingBottom: 120,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
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
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  listBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  listHead: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  listItem: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  privacyBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    lineHeight: 21,
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
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  link: { color: Colors.primary, textDecorationLine: "underline" },
  startBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  startOff: { backgroundColor: Colors.border },
  startText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  startTextOff: { color: Colors.textMuted },
  later: {
    marginTop: 10,
    minHeight: 44,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  laterText: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
});
