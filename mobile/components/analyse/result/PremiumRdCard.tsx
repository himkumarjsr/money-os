import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  applyRenewalMonths,
  buildPremiumRdObligations,
  buildPremiumRdPlan,
  MONTH_NAMES,
  premiumRdHeadline,
  premiumRdLine,
} from "@/lib/premiumRdPlan";
import { saveAnalyseProfile } from "@/lib/saveAnalyseProfile";
import { useObligationStore } from "@/store/obligationStore";

/**
 * Suggests one RD (or savings, when a renewal is under 6 months away) for
 * yearly insurance premiums, and can add it to the tracker's obligations.
 * Port of web `components/analyse/PremiumRdCard.tsx`.
 */
export function PremiumRdCard({
  profile,
  userId,
}: {
  profile: FinancialProfile;
  userId?: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");
  const plan = useMemo(() => buildPremiumRdPlan(profile), [profile]);
  const rows = useMemo(() => buildPremiumRdObligations(plan), [plan]);

  if (plan.items.length === 0 && plan.missing.length === 0) return null;

  const lines = premiumRdHeadline(plan);
  const afterRenewal = plan.items.reduce(
    (s, i) => s + i.afterRenewalMonthly,
    0,
  );
  const thisYear = plan.rdMonthly + plan.savingsMonthly;

  // Saved into the profile so we never ask twice.
  const pickMonth = (key: string, month: number) => {
    setStatus("idle");
    void saveAnalyseProfile(
      userId,
      applyRenewalMonths(profile, { [key]: month }),
    );
  };

  const add = async () => {
    if (!userId || rows.length === 0) return;
    setSaving(true);
    const ok = await useObligationStore
      .getState()
      .saveAnalyseRdObligations(userId, rows);
    setSaving(false);
    setStatus(ok ? "added" : "error");
  };

  const blocked = saving || plan.missing.length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Get ready for yearly premiums</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.body}>
          {line}
        </Text>
      ))}

      {plan.items.length > 1 ? (
        <View style={styles.breakdown}>
          {plan.items.map((item) => (
            <Text key={item.key} style={styles.breakdownText}>
              {premiumRdLine(item)}
              {item.mode === "savings" ? " (savings)" : ""}
            </Text>
          ))}
        </View>
      ) : null}

      {thisYear > 0 && afterRenewal !== thisYear ? (
        <Text style={styles.note}>
          After each renewal, ₹{afterRenewal.toLocaleString("en-IN")} a month
          keeps next year's premiums ready.
        </Text>
      ) : null}

      {plan.missing.map((m) => (
        <View key={m.key} style={{ marginTop: 12 }}>
          <Text style={styles.question}>
            When does your {m.label} premium of ₹
            {m.premium.toLocaleString("en-IN")} renew?
          </Text>
          <View style={styles.months}>
            {MONTH_NAMES.map((name, i) => (
              <Pressable
                key={name}
                onPress={() => pickMonth(m.key, i + 1)}
                accessibilityRole="button"
                accessibilityLabel={name}
                style={styles.monthChip}
              >
                <Text style={styles.monthText}>{name.slice(0, 3)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {status === "added" ? (
        <Text style={styles.added}>
          Added. You'll see it in your{" "}
          <Text
            style={{ textDecorationLine: "underline" }}
            onPress={() => router.push("/(tabs)/tracker")}
          >
            Tracker checklist
          </Text>{" "}
          with reminders.
        </Text>
      ) : userId && rows.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <Pressable
            onPress={() => void add()}
            disabled={blocked}
            accessibilityRole="button"
            style={[styles.button, blocked && { opacity: 0.5 }]}
          >
            <Text style={styles.buttonText}>
              {saving ? "Adding…" : "Yes, add to my monthly obligations"}
            </Text>
          </Pressable>
          {plan.missing.length > 0 ? (
            <Text style={styles.note}>Pick the renewal month above first.</Text>
          ) : null}
          {status === "error" ? (
            <Text style={[styles.note, { color: Colors.error }]}>
              Couldn't add it. Please try again.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCD8F4",
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  h2: { fontSize: 20, fontWeight: "600", color: Colors.textPrimary },
  body: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: "#454442",
  },
  breakdown: {
    marginTop: 12,
    gap: 4,
    borderRadius: 12,
    backgroundColor: "#FAFAFE",
    padding: 12,
  },
  breakdownText: { fontSize: 13, fontWeight: "500", color: "#454442" },
  note: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  question: { fontSize: 14, fontWeight: "500", color: Colors.textPrimary },
  months: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  monthChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthText: { fontSize: 13, color: Colors.textPrimary },
  added: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.success,
  },
  button: {
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
