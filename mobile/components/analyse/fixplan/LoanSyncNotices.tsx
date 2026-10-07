import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LOAN_DRIFT_LABELS } from "@/lib/fixPlanMerge";
import { loanObligationTitle } from "@/lib/loanObligationSync";
import type { LoanReportStatus } from "@/store/obligationStore";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { shared } from "./shared";

type Details = { outstandingAmount?: number; interestRate?: number } | "skip";

type Props = {
  status: LoanReportStatus | null;
  onSaveDetails: (loanId: string, details: Details) => Promise<boolean>;
};

export function formatDataAsOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const digits = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

function LoanDetailsForm({
  loan,
  onSave,
}: {
  loan: LoanReportStatus["needDetails"][number];
  onSave: Props["onSaveDetails"];
}) {
  const [outstanding, setOutstanding] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = loanObligationTitle(loan).replace(/ EMI\b/, "");

  const submit = async (details: Details) => {
    if (
      details !== "skip" &&
      !(details.outstandingAmount && details.outstandingAmount > 0)
    ) {
      setError("Enter the outstanding balance, or skip for now.");
      return;
    }
    setBusy(true);
    setError("");
    const ok = await onSave(String(loan.id), details);
    setBusy(false);
    if (!ok) setError("Couldn't save. Please try again.");
  };

  return (
    <View style={styles.loan}>
      <Text style={styles.loanTitle}>
        {name} · ₹{Number(loan.monthlyEMI || 0).toLocaleString("en-IN")}/mo
      </Text>
      <Text style={styles.loanSub}>
        Added from Tracker. Two details make its payoff date and interest saved
        exact instead of estimated.
      </Text>
      <Text style={styles.label}>Outstanding balance (₹)</Text>
      <TextInput
        value={outstanding}
        onChangeText={setOutstanding}
        keyboardType="number-pad"
        placeholder="e.g. 38,000"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        accessibilityLabel="Outstanding balance in rupees"
      />
      <Text style={styles.label}>Interest rate (% a year)</Text>
      <TextInput
        value={rate}
        onChangeText={setRate}
        keyboardType="decimal-pad"
        placeholder="e.g. 14 (0 if interest-free)"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        accessibilityLabel="Interest rate percent per year"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          disabled={busy}
          onPress={() =>
            void submit({
              outstandingAmount: digits(outstanding),
              interestRate: digits(rate),
            })
          }
          style={[styles.saveBtn, busy && styles.disabled]}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => void submit("skip")}
          style={styles.skipBtn}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip — keep estimate</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "Numbers as of", Tracker drift warning, and the one-time ask for imported loans. */
export function LoanSyncNotices({ status, onSaveDetails }: Props) {
  if (!status) return null;
  const asOf = formatDataAsOf(status.submittedAt);
  return (
    <>
      {asOf ? <Text style={styles.asOf}>Numbers as of {asOf}</Text> : null}
      {status.drift.length > 0 ? (
        <View style={styles.drift} accessibilityRole="alert">
          <Text style={styles.driftTitle}>Your loans changed in Tracker</Text>
          {status.drift.map((d, i) => (
            <Text key={`${d.label}-${i}`} style={styles.driftText}>
              • {d.label} — {LOAN_DRIFT_LABELS[d.kind]}
            </Text>
          ))}
          <Text style={styles.driftNote}>
            EMI totals, surplus and the debt plan below still use the old loans.
          </Text>
          <Pressable
            onPress={() => router.push("/analyse/form")}
            style={styles.link}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>Update your Loans step →</Text>
          </Pressable>
        </View>
      ) : null}
      {status.needDetails.length > 0 ? (
        <View style={[shared.card, styles.detailsCard]}>
          <Text style={styles.detailsTitle}>
            Finish {status.needDetails.length === 1 ? "a loan" : "loans"} from
            Tracker
          </Text>
          {status.needDetails.map((loan) => (
            <LoanDetailsForm
              key={String(loan.id)}
              loan={loan}
              onSave={onSaveDetails}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  asOf: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.sm },
  drift: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#F1D9A6",
    backgroundColor: "#FFF8E6",
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  driftTitle: { fontSize: 14, fontWeight: "700", color: "#7A5A12" },
  driftText: { marginTop: 4, fontSize: 14, color: "#7A5A12", lineHeight: 20 },
  driftNote: { marginTop: Spacing.sm, fontSize: 12, color: "#7A5A12" },
  link: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  detailsCard: { backgroundColor: "#F7F6FE", gap: Spacing.sm },
  detailsTitle: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  loan: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  loanTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  loanSub: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  label: { marginTop: Spacing.md, fontSize: 12, color: Colors.textSecondary },
  input: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  error: { marginTop: Spacing.sm, fontSize: 12, color: Colors.error },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  saveBtn: {
    minHeight: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  skipBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  skipText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  disabled: { opacity: 0.6 },
});
