import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";

const CATEGORIES = [
  { value: "loan_emi", label: "Loan EMI", emoji: "🏦" },
  { value: "insurance_life", label: "Life Insurance", emoji: "🛡️" },
  { value: "insurance_health", label: "Health Insurance", emoji: "🏥" },
  { value: "insurance_vehicle", label: "Vehicle Insurance", emoji: "🚗" },
  { value: "insurance_rd", label: "RD for premiums", emoji: "🗓️" },
  { value: "investment_sip", label: "SIP", emoji: "📈" },
  { value: "investment_ppf", label: "PPF", emoji: "💰" },
  { value: "subscription", label: "Subscription", emoji: "📱" },
  { value: "rent", label: "Rent", emoji: "🏠" },
  { value: "other", label: "Other", emoji: "📌" },
] as const;

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One Time" },
] as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type ObligationFormPayload = {
  title: string;
  category: string;
  amount: number;
  frequency: string;
  due_day: number | null;
  due_month: number | null;
  source: string;
  is_active: boolean;
  remind_days_before: number;
};

/** Add / edit obligation — port of web AddObligationForm. */
export function AddObligationForm({
  onSave,
  onClose,
  initial,
  submitLabel,
}: {
  onSave: (data: ObligationFormPayload) => Promise<void>;
  onClose: () => void;
  /** When set, the form opens in edit mode with these values. */
  initial?: Partial<ObligationFormPayload> | null;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "loan_emi");
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [frequency, setFrequency] = useState(initial?.frequency ?? "monthly");
  const [dueDay, setDueDay] = useState(
    initial?.due_day != null ? String(initial.due_day) : "",
  );
  const [dueMonth, setDueMonth] = useState(
    initial?.due_month != null ? String(initial.due_month) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const canSave = Boolean(title.trim() && amount);
  const showDayGrid =
    frequency === "monthly" ||
    frequency === "quarterly" ||
    frequency === "half_yearly";

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        title: title.trim(),
        category,
        amount: parseFloat(amount),
        frequency,
        due_day: dueDay ? parseInt(dueDay, 10) : null,
        due_month: dueMonth ? parseInt(dueMonth, 10) : null,
        source: "manual",
        is_active: true,
        remind_days_before: initial?.remind_days_before ?? 7,
      });
    } catch (err) {
      console.warn("obligation save failed:", err);
      setSaveError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <View style={styles.headRow}>
        <Text style={styles.title}>
          {isEdit ? "Edit obligation" : "Add obligation"}
        </Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>What is it?</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. LIC Premium, HDFC Home Loan"
        placeholderTextColor={Colors.textMuted}
        autoFocus={!isEdit}
        style={styles.input}
      />

      <Text style={[styles.label, styles.labelSpaced]}>Category</Text>
      <View style={styles.wrap}>
        {CATEGORIES.map((c) => {
          const active = category === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {c.emoji} {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, styles.labelSpaced]}>Amount (₹)</Text>
      <TextInput
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))}
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
        style={[styles.input, styles.amountInput]}
      />

      <Text style={[styles.label, styles.labelSpaced]}>How often?</Text>
      <View style={styles.wrap}>
        {FREQUENCIES.map((f) => {
          const active = frequency === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFrequency(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showDayGrid ? (
        <>
          <Text style={[styles.label, styles.labelSpaced]}>
            Due date (day of month)
          </Text>
          <View style={styles.dayGrid}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const active = dueDay === String(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => setDueDay(String(day))}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.dayCell, active && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {frequency === "yearly" ? (
        <>
          <Text style={[styles.label, styles.labelSpaced]}>Which month?</Text>
          <View style={styles.dayGrid}>
            {MONTHS.map((m, i) => {
              const active = dueMonth === String(i + 1);
              return (
                <Pressable
                  key={m}
                  onPress={() => setDueMonth(String(i + 1))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.monthCell, active && styles.pillActive]}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

      <Pressable
        onPress={() => void handleSave()}
        disabled={!canSave || saving}
        accessibilityRole="button"
        style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
      >
        <Text
          style={[
            styles.saveText,
            (!canSave || saving) && styles.saveTextDisabled,
          ]}
        >
          {saving
            ? "Saving…"
            : submitLabel || (isEdit ? "Update obligation" : "Save obligation")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => ({
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  close: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  labelSpaced: { marginTop: 14 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  amountInput: { fontWeight: "700", color: Colors.primary },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pillText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  pillTextActive: { color: Colors.primary },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  monthCell: {
    width: "23%",
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    color: Colors.error,
  },
  saveBtn: {
    marginTop: 18,
    height: 52,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: Colors.border },
  saveText: { fontSize: 15, fontWeight: "700", color: Colors.onPrimary },
  saveTextDisabled: { color: Colors.textMuted },
}));
