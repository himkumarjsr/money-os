import { Pressable, Text, View, type TextStyle } from "react-native";
import { Colors, themedStyles, tintBg, tintFg } from "@/constants/theme";
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
      return { bg: tintBg("#EDE9FE"), fg: tintFg("#5B21B6") };
    case "health":
      return { bg: tintBg("#D1FAE5"), fg: tintFg("#065F46") };
    case "car":
      return { bg: tintBg("#E0F2FE"), fg: tintFg("#075985") };
    case "bike":
      return { bg: tintBg("#FEF3C7"), fg: "#92400E" };
    case "travel":
      return { bg: tintBg("#CFFAFE"), fg: "#155E75" };
    default:
      return { bg: tintBg("#F1F5F9"), fg: tintFg("#334155") };
  }
}

const MUTED = themedStyles(() => ({ text: { color: Colors.textMuted } }));

function renewalUi(policy: UserPolicy): { line: string; style: TextStyle } {
  if (!policy.renewalDate) {
    return {
      line: "Renewal date not added",
      style: { color: Colors.warningText },
    };
  }
  if (policy.status === "transferred_to_finkoin") {
    return {
      line: `Renews on ${formatRenewalDayMonth(policy.renewalDate)}`,
      style: MUTED.text,
    };
  }
  const today = startOfLocalDay(new Date());
  const rd = startOfLocalDay(parseLocalDate(policy.renewalDate));
  if (rd < today) {
    return {
      line: `Expired on ${formatRenewalDayMonth(policy.renewalDate)}`,
      style: { color: Colors.error, fontWeight: "500" },
    };
  }
  const d = daysUntilRenewal(policy.renewalDate);
  if (d <= 30)
    return {
      line: `Renews in ${d} day${d === 1 ? "" : "s"}`,
      style: { color: Colors.error, fontWeight: "600" },
    };
  if (d <= 90)
    return {
      line: `Renews in ${d} days`,
      style: { color: Colors.warningText, fontWeight: "500" },
    };
  return {
    line: `Renews on ${formatRenewalDayMonth(policy.renewalDate)}`,
    style: MUTED.text,
  };
}

function statusBadge(policy: UserPolicy): Badge & { label: string } {
  if (policy.status === "transferred_to_finkoin") {
    return {
      label: "Transferred to Finkoin",
      bg: tintBg("#EDE9FE"),
      fg: tintFg("#5B21B6"),
    };
  }
  if (!policy.insurerName.trim() || !policy.renewalDate) {
    return { label: "Details missing", bg: tintBg("#FEF3C7"), fg: "#92400E" };
  }
  const today = startOfLocalDay(new Date());
  const rd = startOfLocalDay(parseLocalDate(policy.renewalDate));
  if (rd < today)
    return { label: "Expired", bg: tintBg("#FEE2E2"), fg: tintFg("#B91C1C") };
  return { label: "Active", bg: tintBg("#D1FAE5"), fg: tintFg("#065F46") };
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

const styles = themedStyles(() => ({
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
    color: Colors.textPrimary,
  },
  plan: { fontSize: 14, color: Colors.textMuted },
  row: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  rowValue: { fontWeight: "600", color: Colors.textPrimary },
  renew: { marginTop: 4, fontSize: 14 },
  actions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceMuted,
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
}));
