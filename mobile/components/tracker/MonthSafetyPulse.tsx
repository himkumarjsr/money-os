import { useState, type ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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

/** Simple obligations + card summary nested under Safety Pulse */
export function TrackerNestedPanels({
  onCards,
  obligationsCount,
  amountsVisible,
  onAddFromCards,
}: {
  onCards: number;
  obligationsCount: number;
  amountsVisible: boolean;
  onAddFromCards?: () => void;
}) {
  const [openCards, setOpenCards] = useState(false);
  const [openObs, setOpenObs] = useState(false);

  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      {onCards > 0 ? (
        <View style={styles.nested}>
          <Pressable
            onPress={() => setOpenCards((o) => !o)}
            style={styles.nestedHead}
          >
            <Text style={styles.nestedTitle}>Credit card activity</Text>
            <Text style={styles.nestedChevron}>{openCards ? "▾" : "▸"}</Text>
          </Pressable>
          {openCards ? (
            <View style={styles.nestedBody}>
              <Text style={styles.nestedBodyText}>
                On cards this month:{" "}
                {amountsVisible
                  ? `₹${formatIndian(Math.round(onCards))}`
                  : "₹••••••"}
              </Text>
              <Text style={styles.nestedHint}>
                Card purchases don’t reduce Money Left until you pay the bill
                (Loans → Credit card payment).
              </Text>
              {onAddFromCards ? (
                <Pressable onPress={onAddFromCards}>
                  <Text style={styles.nestedLink}>Log a card bill pay →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.nested}>
        <Pressable
          onPress={() => setOpenObs((o) => !o)}
          style={styles.nestedHead}
        >
          <Text style={styles.nestedTitle}>
            Monthly obligations
            {obligationsCount > 0 ? ` · ${obligationsCount}` : ""}
          </Text>
          <Text style={styles.nestedChevron}>{openObs ? "▾" : "▸"}</Text>
        </Pressable>
        {openObs ? (
          <View style={styles.nestedBody}>
            {obligationsCount > 0 ? (
              <Text style={styles.nestedBodyText}>
                {obligationsCount} obligation
                {obligationsCount === 1 ? "" : "s"} saved on your account. Check
                off via Analyse / full checklist on finkoin.com if needed.
              </Text>
            ) : (
              <Text style={styles.nestedBodyText}>
                No obligations yet. Log recurring EMIs under Loans, or set bills
                on the web tracker checklist.
              </Text>
            )}
          </View>
        ) : null}
      </View>
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
  nested: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  nestedHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  nestedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111110",
  },
  nestedChevron: { color: Colors.primary, fontWeight: "700" },
  nestedBody: { paddingHorizontal: 12, paddingBottom: 12 },
  nestedBodyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  nestedHint: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  nestedLink: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
});
