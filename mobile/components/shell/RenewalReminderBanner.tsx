/**
 * Port of web components/RenewalReminderBanner.tsx: amber strip under the
 * header for signed-in users with a policy renewal in the next 30 days.
 * Dismissed until the end of today.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Colors, contrastRatio, themedStyles } from "@/constants/theme";
import {
  fetchUserPolicies,
  formatRenewalDayMonth,
  getSupabaseAuthUserId,
  parseLocalDate,
  startOfLocalDay,
} from "@/lib/policyVault";
import { hydrateSyncKv, syncKv } from "@/lib/syncKv";
import { useAuthStore } from "@/store/authStore";

const STORAGE_KEY = "finkoin_renewal_banner_dismissed_until";

function endOfLocalTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function isDismissedActive(): boolean {
  const until = syncKv.getItem(STORAGE_KEY);
  if (!until) return false;
  return Date.now() < new Date(until).getTime();
}

export function RenewalReminderBanner() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authUserId = useAuthStore((s) => s.user?.id);
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);
  const [sampleName, setSampleName] = useState("");
  const [sampleDate, setSampleDate] = useState("");

  const check = useCallback(async () => {
    if (!isLoggedIn) {
      setShow(false);
      return;
    }
    await hydrateSyncKv();
    const uid = await getSupabaseAuthUserId();
    if (!uid || isDismissedActive()) {
      setShow(false);
      return;
    }
    const { policies, error } = await fetchUserPolicies(uid);
    const today = startOfLocalDay(new Date());
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const upcoming = policies.filter((p) => {
      if (!p.renewalDate) return false;
      const rd = parseLocalDate(p.renewalDate);
      return rd >= today && rd <= end;
    });
    if (error || upcoming.length === 0) {
      setShow(false);
      return;
    }
    const first = upcoming[0];
    setCount(upcoming.length);
    setSampleName(
      first.planName?.trim() ||
        `${first.insurerName || "Policy"} (${first.policyType.replace(/_/g, " ")})`,
    );
    setSampleDate(formatRenewalDayMonth(first.renewalDate ?? ""));
    setShow(true);
  }, [isLoggedIn]);

  useEffect(() => {
    void check();
  }, [check, authUserId]);

  const dismiss = () => {
    syncKv.setItem(STORAGE_KEY, endOfLocalTodayIso());
    setShow(false);
  };

  if (!show) return null;

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => router.push("/policies" as Href)}
        accessibilityRole="link"
        style={styles.textCol}
      >
        <View style={styles.titleRow}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke={Colors.primaryText}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.title}>
            {count} policy renewal{count === 1 ? "" : "s"} coming up
          </Text>
        </View>
        <Text style={styles.sub}>
          {sampleName} renews on {sampleDate}. Click to view options.
        </Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/policies" as Href)}
          style={styles.viewBtn}
          accessibilityRole="button"
        >
          <Text style={styles.viewText}>View policies</Text>
        </Pressable>
        <Pressable
          onPress={dismiss}
          style={styles.dismissBtn}
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  textCol: { gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 14, fontWeight: "600", color: Colors.warningText },
  sub: { fontSize: 12, color: Colors.warningText },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  viewBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  viewText: {
    fontSize: 12,
    fontWeight: "600",
    color: contrastRatio(Colors.warning, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#1A1405",
  },
  dismissBtn: {
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: { fontSize: 12, fontWeight: "500", color: Colors.warningText },
}));
