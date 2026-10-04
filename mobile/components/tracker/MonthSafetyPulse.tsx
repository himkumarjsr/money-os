import { useState, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { SafetyPulseResult } from "@/lib/trackerSafetyPulse";
import { SectionPrivacyEye } from "@/components/ui/PrivacyEye";
import { formatIndian } from "@/lib/formatters";
import { Colors } from "@/constants/theme";

const STATUS_STYLE = {
  safe: {
    bg: "#F3F1FC",
    border: "#D4D2F5",
    badgeBg: "#E8E6F8",
    badgeText: "#3C3489",
  },
  tight: {
    bg: "#F7F4FF",
    border: "#C9C2F0",
    badgeBg: "#EEE9FF",
    badgeText: "#534AB7",
  },
  over: {
    bg: "#FBF5F5",
    border: "#F0D4D4",
    badgeBg: "#FDEDED",
    badgeText: "#991B1B",
  },
  unknown: {
    bg: "#F7F7F4",
    border: "#E8E6F0",
    badgeBg: "#EEEDFE",
    badgeText: "#534AB7",
  },
} as const;

function maskOrShow(n: number, visible: boolean, signed = false): string {
  if (!visible) return "₹••••••";
  const prefix = signed && n > 0 ? "+" : "";
  const sign = n < 0 ? "-" : "";
  return `${prefix}${sign}₹${formatIndian(Math.round(Math.abs(n)))}`;
}

type Props = {
  pulse: SafetyPulseResult;
  previousMonthLabel?: string | null;
  forceVisible?: boolean;
  children?: ReactNode;
};

/** Matches web MonthSafetyPulse. */
export function MonthSafetyPulse({
  pulse,
  previousMonthLabel,
  forceVisible = false,
  children,
}: Props) {
  const [localVisible, setLocalVisible] = useState(false);
  const amountsVisible = localVisible || forceVisible;
  const style = STATUS_STYLE[pulse.status];
  const showComparison =
    pulse.previous != null &&
    (pulse.previous.totalSpent > 0 || pulse.previous.income > 0);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
    >
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>Month safety pulse</Text>
          <Text style={styles.headline}>{pulse.headline}</Text>
        </View>
        <View style={styles.headRight}>
          <View style={[styles.badge, { backgroundColor: style.badgeBg }]}>
            <Text style={[styles.badgeText, { color: style.badgeText }]}>
              {pulse.statusLabel}
            </Text>
          </View>
          <SectionPrivacyEye
            visible={amountsVisible}
            onToggle={() => setLocalVisible((v) => !v)}
          />
        </View>
      </View>

      {pulse.reasons.length > 0
        ? pulse.reasons.map((r) => (
            <Text key={r} style={styles.reason}>
              · {amountsVisible ? r : r.replace(/₹[\d,]+/g, "₹••••••")}
            </Text>
          ))
        : null}

      {pulse.action ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionLabel}>Do this</Text>
          <Text style={styles.actionText}>
            {amountsVisible
              ? pulse.action
              : pulse.action.replace(/₹[\d,]+/g, "₹••••••")}
          </Text>
        </View>
      ) : null}

      {showComparison && pulse.previous ? (
        <View style={styles.grid}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>This month spent</Text>
            <Text style={styles.statValue}>
              {maskOrShow(pulse.current.totalSpent, amountsVisible)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>
              {previousMonthLabel
                ? `${previousMonthLabel} spent`
                : "Last month spent"}
            </Text>
            <Text style={styles.statValue}>
              {maskOrShow(pulse.previous.totalSpent, amountsVisible)}
            </Text>
            {pulse.spentDelta != null && Math.abs(pulse.spentDelta) >= 1 ? (
              <Text
                style={[
                  styles.delta,
                  {
                    color: pulse.spentDelta > 0 ? "#991B1B" : "#1B7A4E",
                  },
                ]}
              >
                {maskOrShow(pulse.spentDelta, amountsVisible, true)}
                {amountsVisible && pulse.spentDeltaPct != null
                  ? ` (${pulse.spentDeltaPct > 0 ? "+" : ""}${pulse.spentDeltaPct.toFixed(0)}%)`
                  : ""}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {pulse.movers.length > 0 && amountsVisible ? (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.moversLabel}>Biggest movers</Text>
          {pulse.movers.map((m) => (
            <View key={`${m.bucket}:${m.subId}`} style={styles.moverRow}>
              <Text style={styles.moverName}>{m.label}</Text>
              <Text
                style={{
                  fontWeight: "700",
                  color: m.delta > 0 ? "#991B1B" : "#1B7A4E",
                }}
              >
                {maskOrShow(m.delta, true, true)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {pulse.dailySafeSpend != null &&
      pulse.daysLeftInMonth != null &&
      pulse.isCurrentCalendarMonth ? (
        <Text style={styles.dailySafe}>
          Safe daily spend: {maskOrShow(pulse.dailySafeSpend, amountsVisible)} ·{" "}
          {pulse.daysLeftInMonth} day
          {pulse.daysLeftInMonth === 1 ? "" : "s"} left
        </Text>
      ) : null}

      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  headRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  headline: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111110",
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  reason: {
    fontSize: 13,
    color: "#3C3489",
    lineHeight: 20,
    marginBottom: 4,
  },
  actionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111110",
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111110",
  },
  delta: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  moversLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  moverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  moverName: { fontSize: 12, fontWeight: "600", color: "#111110", flex: 1 },
  dailySafe: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#3C3489",
  },
  children: { marginTop: 4 },
});
