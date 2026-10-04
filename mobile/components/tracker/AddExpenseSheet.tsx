import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/Input";
import { Colors, Spacing, Radius, FontSize } from "@/constants/theme";
import {
  TRACKER_CATEGORIES,
  pickerSubcategories,
  type BucketType,
} from "@/lib/tracker-categories";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { displayExpenseDescription } from "@/lib/trackerCreditCards";

export type TrackerTxn = {
  id: string;
  date: string;
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  bucket: string;
  payment_method: string | null;
};

export type SavedExpense = {
  id: string;
  amount: number;
  bucket: string;
  category: string;
  subcategory: string;
  description: string | null;
  isEdit: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: (saved: SavedExpense) => void;
  defaultDate: string;
  maxDate?: string;
  defaultBucket?: string;
  defaultSubcategory?: string;
  defaultAmount?: number;
  defaultDescription?: string;
  defaultPaymentMethod?: string;
  editExpense?: TrackerTxn | null;
};

const SPEND_BUCKETS: BucketType[] = [
  "needs",
  "wants",
  "habits",
  "loans",
  "investment",
  "income",
];

const PAYMENT_OPTIONS = [
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
  { id: "credit_card", label: "Credit card" },
  { id: "netbanking", label: "Net banking" },
  { id: "wallet", label: "Wallet" },
] as const;

function monthYearFromDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return {
    month: d.toLocaleString("en-IN", { month: "long" }),
    year: d.getFullYear(),
  };
}

/** Full add/edit sheet — field order matches PWA AddExpenseModal. */
export function AddExpenseSheet({
  visible,
  onClose,
  onSaved,
  defaultDate,
  maxDate,
  defaultBucket,
  defaultSubcategory,
  defaultAmount,
  defaultDescription,
  defaultPaymentMethod,
  editExpense,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const isEdit = Boolean(editExpense?.id);

  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState<number | null>(null);
  const [bucket, setBucket] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDate(editExpense?.date || defaultDate);
    setAmount(editExpense?.amount ?? defaultAmount ?? null);
    setBucket(editExpense?.bucket || defaultBucket || "");
    setSubcategory(editExpense?.subcategory || defaultSubcategory || "");
    setDescription(
      displayExpenseDescription(
        editExpense?.description || defaultDescription || "",
      ),
    );
    let pm = editExpense?.payment_method || defaultPaymentMethod || "upi";
    if (pm.startsWith("credit_card")) pm = "credit_card";
    setPaymentMethod(pm || "upi");
    setError("");
  }, [
    visible,
    editExpense,
    defaultDate,
    defaultBucket,
    defaultSubcategory,
    defaultAmount,
    defaultDescription,
    defaultPaymentMethod,
  ]);

  // Loans → credit card payment should use cash rails (UPI/cash), not card charge
  useEffect(() => {
    if (bucket === "loans" && subcategory === "credit_card") {
      if (paymentMethod === "credit_card") setPaymentMethod("upi");
    }
  }, [bucket, subcategory, paymentMethod]);

  const isIncome = bucket === "income";
  const cat = bucket ? TRACKER_CATEGORIES[bucket as BucketType] : null;
  const subs = useMemo(() => {
    if (!bucket || !(bucket in TRACKER_CATEGORIES)) return [];
    return pickerSubcategories(bucket as BucketType);
  }, [bucket]);

  const title = isEdit
    ? isIncome
      ? "Edit income"
      : bucket === "investment"
        ? "Edit savings"
        : "Edit expense"
    : isIncome
      ? "Add income"
      : bucket === "investment"
        ? "Add savings"
        : "Add expense";

  const paymentChoices = useMemo(() => {
    if (isIncome) return [];
    // Loans → CC bill pay: no "charge another card"
    if (bucket === "loans" && subcategory === "credit_card") {
      return PAYMENT_OPTIONS.filter((p) => p.id !== "credit_card");
    }
    return [...PAYMENT_OPTIONS];
  }, [isIncome, bucket, subcategory]);

  async function handleSave() {
    setError("");
    if (!user?.id) {
      setError("Sign in to save.");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!bucket) {
      setError("Pick a category.");
      return;
    }
    if (!subcategory) {
      setError("Pick a type.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setDate(defaultDate);
    }
    const finalDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : defaultDate;
    if (maxDate && finalDate > maxDate) {
      setError("Date cannot be in the future.");
      return;
    }

    setSaving(true);
    try {
      const { month, year } = monthYearFromDate(finalDate);
      const payload = {
        user_id: user.id,
        date: finalDate,
        amount,
        category: subcategory,
        subcategory,
        description: description.trim() || null,
        bucket,
        payment_method: isIncome ? null : paymentMethod || "upi",
        month,
        year,
      };

      let savedId = editExpense?.id ?? "";
      if (isEdit && editExpense?.id) {
        const { error: err } = await supabase
          .from("expense_transactions")
          .update(payload)
          .eq("id", editExpense.id)
          .eq("user_id", user.id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from("expense_transactions")
          .insert(payload)
          .select("id")
          .single();
        if (err) throw err;
        savedId = String((data as { id?: string } | null)?.id ?? "");
      }
      onSaved({
        id: savedId,
        amount,
        bucket,
        category: subcategory,
        subcategory,
        description: payload.description,
        isEdit,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            <MoneyInput
              label={isIncome ? "Income amount (₹)" : "Expense amount (₹)"}
              value={amount}
              onChangeValue={setAmount}
              placeholder="0"
            />

            <View style={{ height: Spacing.md }} />
            <Input
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder={defaultDate}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />

            {!defaultBucket && !editExpense ? (
              <>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.grid}>
                  {SPEND_BUCKETS.map((id) => {
                    const meta = TRACKER_CATEGORIES[id];
                    const on = bucket === id;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => {
                          setBucket(id);
                          setSubcategory("");
                        }}
                        style={[
                          styles.catCell,
                          on && {
                            borderColor: meta.color,
                            backgroundColor: `${meta.color}18`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catText,
                            on && { color: meta.color, fontWeight: "700" },
                          ]}
                          numberOfLines={2}
                        >
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {bucket ? (
              <>
                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.wrapChips}>
                  {subs.map((s) => {
                    const on = subcategory === s.id;
                    const accent = cat?.color ?? Colors.primary;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setSubcategory(s.id)}
                        style={[
                          styles.chip,
                          on && {
                            borderColor: accent,
                            backgroundColor: `${accent}18`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            on && { color: accent, fontWeight: "700" },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View style={{ height: Spacing.md }} />
            <Input
              label="Note (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
            />

            {!isIncome && bucket ? (
              <>
                <Text style={styles.fieldLabel}>Paid via</Text>
                <View style={styles.wrapChips}>
                  {paymentChoices.map((p) => {
                    const on = paymentMethod === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setPaymentMethod(p.id)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text
                          style={[styles.chipText, on && styles.chipTextOn]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveText}>
                  {isEdit ? "Update" : "Save"}{" "}
                  {isIncome
                    ? "income"
                    : bucket === "investment"
                      ? "savings"
                      : "expense"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 10,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111110",
  },
  close: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  fieldLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: "#111110",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catCell: {
    width: "48%",
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 10,
    justifyContent: "center",
  },
  catText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  wrapChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipTextOn: { color: Colors.primary, fontWeight: "700" },
  error: {
    marginTop: 12,
    color: Colors.error,
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
