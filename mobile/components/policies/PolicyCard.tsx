import { Pressable, StyleSheet, Text, View, type TextStyle } from "react-native";
import { Colors } from "@/constants/theme";
import { formatIndian } from "@/lib/formatters";
import {
  POLICY_TYPE_LABELS,
  daysUntilRenewal,
  formatPolicyCover,
  formatRenewalDayMonth,
  parseLocalDate,
  startOfLocalDay,
  type PolicyType,
  type UserPolicy,
} from "@/lib/policyVault";

type Badge = { bg: string; fg: string };

function policyBadge(t: PolicyType): Badge {
  switch (t) {
    case "term_life":
      return { bg: "#EDE9FE", fg: "#5B21B6" };
    case "health":
      return { bg: "#D1FAE5", fg: "#065F46" };
    case "car":
      return { bg: "#E0F2FE", fg: "#075985" };
    case "bike":
      return { bg: "#FEF3C7", fg: "#92400E" };
    case "travel":
      return { bg: "#CFFAFE", fg: "#155E75" };
    default:
      return { bg: "#F1F5F9", fg: "#334155" };
  }
}

const MUTED: TextStyle = { color: "#64748B" };

function renewalUi(policy: UserPolicy): { line: string; style: TextStyle } {
  if (policy.status === "transferred_to_finkoin") {
    return {
      line: `Renews on ${formatRenewalDayMonth(policy.renewalDate)}`,
      style: MUTED,
    };
  }
  const today = startOfLocalDay(new Date());
  const rd = startOfLocalDay(parseLocalDate(policy.renewalDate));
  if (rd < today) {
    return {
      line: `Expired on ${formatRenewalDayMonth(policy.renewalDate)}`,
      style: { color: "#DC2626", fontWeight: "500" },
    };
  }
  const d = daysUntilRenewal(policy.renewalDate);
  if (d <= 30)
    return {
      line: `Renews in ${d} day${d === 1 ? "" : "s"}`,
      style: { color: "#DC2626", fontWeight: "600" },
    };
  if (d <= 90)
    return {
      line: `Renews in ${d} days`,
      style: { color: "#B45309", fontWeight: "500" },
    };
  return {
    line: `Renews on ${formatRenewalDayMonth(policy.renewalDate)}`,
    style: MUTED,
  };
}

function statusBadge(policy: UserPolicy): Badge & { label: string } {
  if (policy.status === "transferred_to_finkoin") {
    return { label: "Transferred to Finkoin", bg: "#EDE9FE", fg: "#5B21B6" };
  }
  const today = startOfLocalDay(new Date());
  const rd = startOfLocalDay(parseLocalDate(policy.renewalDate));
  if (rd < today) return { label: "Expired", bg: "#FEE2E2", fg: "#B91C1C" };
  return { label: "Active", bg: "#D1FAE5", fg: "#065F46" };
}

function SmallButton({
  label,
  onPress,
  ghost,
}: {
  label: string;
  onPress: () => void;
  ghost?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallBtn,
        ghost ? styles.smallBtnGhost : styles.smallBtnSecondary,
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
    >
      <Text style={styles.smallBtnText}>{label}</Text>
    </Pressable>
  );
}

export function PolicyCard({
  policy: p,
  onRenew,
  onTransfer,
  onEdit,
}: {
  policy: UserPolicy;
  onRenew: () => void;
  onTransfer: () => void;
  onEdit: () => void;
}) {
  const renew = renewalUi(p);
  const st = statusBadge(p);
  const type = policyBadge(p.policyType);
  const prem = `₹${formatIndian(p.premiumAmount)}${p.premiumFrequency === "yearly" ? "/year" : "/month"}`;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[styles.pill, { backgroundColor: type.bg }]}>
            <Text style={[styles.pillText, { color: type.fg }]}>
              {POLICY_TYPE_LABELS[p.policyType]}
            </Text>
          </View>
          <Text style={styles.insurer}>{p.insurerName || "—"}</Text>
          <Text style={styles.plan}>
            {p.planName?.trim() || "Plan not specified"}
          </Text>
          <Text style={[styles.row, { marginTop: 8 }]}>
            Cover:{" "}
            <Text style={styles.rowValue}>
              {formatPolicyCover(p.coverAmount)}
            </Text>
          </Text>
          <Text style={styles.row}>
            Premium: <Text style={styles.rowValue}>{prem}</Text>
          </Text>
          <Text style={[styles.renew, renew.style]}>{renew.line}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: st.bg }]}>
          <Text style={[styles.pillText, { color: st.fg }]}>{st.label}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <SmallButton label="Renew" onPress={onRenew} />
        <SmallButton label="Transfer to Finkoin" onPress={onTransfer} />
        <SmallButton label="Edit" onPress={onEdit} ghost />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
  status: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 130,
  },
  insurer: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  plan: { fontSize: 14, color: "#64748B" },
  row: { fontSize: 14, color: "#334155", lineHeight: 21 },
  rowValue: { fontWeight: "600", color: "#0F172A" },
  renew: { marginTop: 4, fontSize: 14 },
  actions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  smallBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnSecondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallBtnGhost: { backgroundColor: "transparent" },
  smallBtnText: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
});
