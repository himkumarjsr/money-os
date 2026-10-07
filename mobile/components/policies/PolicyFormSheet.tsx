import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PolicyDateField } from "@/components/policies/PolicyDateField";
import { Colors } from "@/constants/theme";
import { formatIndian, handleMoneyInput } from "@/lib/formatters";
import {
  INSURER_SUGGESTIONS,
  POLICY_TYPES,
  POLICY_TYPE_LABELS,
  deleteUserPolicy,
  getSupabaseAuthUserId,
  insertUserPolicy,
  updateUserPolicy,
  type PolicyFormInput,
  type PremiumFrequency,
} from "@/lib/policyVault";

function toMoneyText(n: number): string {
  return n > 0 ? formatIndian(n) : "";
}

/** Live Indian grouping while typing; leaves partial decimals untouched. */
function formatTyping(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  if (cleaned.includes(".")) return cleaned;
  const num = Number(cleaned);
  return Number.isFinite(num) ? formatIndian(num) : cleaned;
}

function Label({ text, optional, required }: {
  text: string;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <Text style={styles.label}>
      {text}
      {required ? <Text style={styles.required}> *</Text> : null}
      {optional ? <Text style={styles.optional}> (optional)</Text> : null}
    </Text>
  );
}

export function PolicyFormSheet({
  visible,
  onClose,
  editId,
  initial,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  editId: string | null;
  /** Remount (via `key`) to reset the form when this changes. */
  initial: PolicyFormInput;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PolicyFormInput>(initial);
  const [coverText, setCoverText] = useState(() =>
    toMoneyText(initial.coverAmount),
  );
  const [premiumText, setPremiumText] = useState(() =>
    toMoneyText(initial.premiumAmount),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const premiumValue = handleMoneyInput(premiumText) ?? 0;
  const premiumLabel = useMemo(() => {
    const sym = `₹${formatIndian(premiumValue)}`;
    return form.premiumFrequency === "yearly" ? `${sym}/year` : `${sym}/month`;
  }, [premiumValue, form.premiumFrequency]);

  const set = <K extends keyof PolicyFormInput>(
    key: K,
    value: PolicyFormInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    setFormError(null);
    try {
      const uid = await getSupabaseAuthUserId();
      if (!uid) {
        setFormError(
          "Cannot save: no Supabase session. Sign out and sign in with Google or email (or complete phone OTP).",
        );
        return;
      }
      const c = handleMoneyInput(coverText);
      const pr = handleMoneyInput(premiumText);
      const nextForm: PolicyFormInput = {
        ...form,
        coverAmount: c ?? 0,
        premiumAmount: pr ?? 0,
      };
      setForm(nextForm);
      if (!nextForm.insurerName.trim()) {
        setFormError(
          "Enter insurer name (company), not only the plan name — scroll up to the Insurer field.",
        );
        return;
      }
      if (!nextForm.renewalDate) {
        setFormError("Select renewal date");
        return;
      }
      if (nextForm.coverAmount <= 0) {
        setFormError("Enter cover amount");
        return;
      }
      if (nextForm.premiumAmount <= 0) {
        setFormError("Enter premium amount");
        return;
      }
      setSaving(true);
      const { error } = editId
        ? await updateUserPolicy(editId, nextForm)
        : await insertUserPolicy(uid, nextForm);
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
      onSaved();
    } catch (e) {
      setSaving(false);
      setFormError(
        e instanceof Error ? e.message : "Save failed. Please try again.",
      );
    }
  };

  const onDelete = () => {
    if (!editId) return;
    Alert.alert(
      "Delete policy?",
      `${form.insurerName || "This policy"} will be removed from your vault.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteUserPolicy(editId);
            setDeleting(false);
            if (error) {
              setFormError(error.message);
              return;
            }
            onSaved();
          },
        },
      ],
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{editId ? "Edit policy" : "Add policy"}</Text>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <Label text="Policy type" />
      <View style={styles.chipRow}>
        {POLICY_TYPES.map((t) => {
          const on = form.policyType === t;
          return (
            <Pressable
              key={t}
              onPress={() => set("policyType", t)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {POLICY_TYPE_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Label text="Insurer name" required />
      <Text style={styles.hint}>
        e.g. Max Life, HDFC Life — required (plan name goes below)
      </Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Max Life"
        placeholderTextColor={Colors.textMuted}
        value={form.insurerName}
        onChangeText={(v) => set("insurerName", v)}
        autoCapitalize="words"
      />
      <View style={[styles.chipRow, { marginTop: 8 }]}>
        {INSURER_SUGGESTIONS.map((s) => {
          const on = form.insurerName.trim() === s;
          return (
            <Pressable
              key={s}
              onPress={() => set("insurerName", s)}
              style={[styles.suggest, on && styles.chipOn]}
              accessibilityRole="button"
            >
              <Text style={[styles.suggestText, on && styles.chipTextOn]}>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Label text="Policy number" optional />
      <TextInput
        style={styles.input}
        value={form.policyNumber}
        onChangeText={(v) => set("policyNumber", v)}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Label text="Plan name" optional />
      <TextInput
        style={styles.input}
        value={form.planName}
        onChangeText={(v) => set("planName", v)}
      />

      <View style={styles.moneyWrap}>
        <MoneyInput
          label="Cover amount"
          value={coverText}
          onChange={(raw) => setCoverText(formatTyping(raw))}
        />
      </View>
      <View style={styles.moneyWrap}>
        <MoneyInput
          label="Premium amount"
          value={premiumText}
          onChange={(raw) => setPremiumText(formatTyping(raw))}
        />
      </View>
      <Text style={styles.preview}>Preview: {premiumLabel}</Text>

      <Label text="Premium frequency" />
      <View style={styles.segment}>
        {(["monthly", "yearly"] as PremiumFrequency[]).map((f) => {
          const on = form.premiumFrequency === f;
          return (
            <Pressable
              key={f}
              onPress={() => set("premiumFrequency", f)}
              style={[styles.segBtn, on && styles.segBtnOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>
                {f === "monthly" ? "Monthly" : "Yearly"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PolicyDateField
        label="Renewal date"
        value={form.renewalDate}
        onChange={(v) => set("renewalDate", v)}
      />
      <PolicyDateField
        label="Purchase date"
        optional
        value={form.purchaseDate}
        onChange={(v) => set("purchaseDate", v)}
      />

      <Label text="Nominee name" optional />
      <TextInput
        style={styles.input}
        value={form.nomineeName}
        onChangeText={(v) => set("nomineeName", v)}
        autoCapitalize="words"
      />

      <View style={styles.footer}>
        {formError ? (
          <Text style={styles.error} accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}
        <Pressable
          onPress={() => void onSave()}
          disabled={saving || deleting}
          style={[styles.saveBtn, (saving || deleting) && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>Save policy</Text>
          )}
        </Pressable>
        {editId ? (
          <Pressable
            onPress={onDelete}
            disabled={saving || deleting}
            style={styles.deleteBtn}
            accessibilityRole="button"
          >
            {deleting ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <Text style={styles.deleteText}>Delete policy</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, color: Colors.textMuted },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  required: { fontWeight: "400", color: "#DC2626" },
  optional: { fontWeight: "400", color: "#94A3B8" },
  hint: { fontSize: 12, color: "#64748B", marginBottom: 6 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    justifyContent: "center",
  },
  chipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  chipTextOn: { color: Colors.primary, fontWeight: "700" },
  suggest: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FAFAFE",
    justifyContent: "center",
  },
  suggestText: { fontSize: 13, color: Colors.textSecondary },
  moneyWrap: { marginBottom: 16 },
  preview: { fontSize: 12, color: "#64748B", marginTop: -8, marginBottom: 16 },
  segment: {
    flexDirection: "row",
    backgroundColor: "#F1F0F7",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnOn: {
    backgroundColor: Colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segText: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  segTextOn: { color: Colors.primary, fontWeight: "700" },
  footer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  error: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 12,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  deleteBtn: {
    marginTop: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: Colors.error, fontSize: 15, fontWeight: "700" },
});
