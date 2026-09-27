/**
 * Add / edit expense — PWA `/split/[groupId]/add-expense` parity.
 */
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useSplitStore } from "@/store/splitStore";
import { computeSplitShares } from "@/lib/splitShares";
import { Colors, Spacing, Radius, FontSize } from "@/constants/theme";
import Button from "@/components/ui/Button";

const CATEGORIES = [
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "transport", label: "Transport", emoji: "🚕" },
  { value: "accommodation", label: "Hotel", emoji: "🏨" },
  { value: "entertainment", label: "Entertainment", emoji: "🎉" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "utilities", label: "Utilities", emoji: "⚡" },
  { value: "medical", label: "Medical", emoji: "💊" },
  { value: "other", label: "Other", emoji: "🧾" },
] as const;

const SPLIT_TYPES = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percentage", label: "Percent" },
  { value: "shares", label: "Shares" },
] as const;

type SplitType = "equal" | "exact" | "percentage" | "shares";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AddExpenseScreen() {
  const { groupId, edit } = useLocalSearchParams<{
    groupId: string;
    edit?: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const { activeGroup, expenses, fetchGroupDetail, addExpense, editExpense } =
    useSplitStore();

  const myEmail = (user?.email ?? "").toLowerCase();
  const members = useMemo(
    () => (activeGroup?.members ?? []).filter((m) => m.status === "active"),
    [activeGroup?.members],
  );

  const editing = expenses.find((e) => e.id === edit);

  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [paidByEmail, setPaidByEmail] = useState(myEmail);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [included, setIncluded] = useState<string[]>([]);
  const [exactMap, setExactMap] = useState<Record<string, string>>({});
  const [pctMap, setPctMap] = useState<Record<string, string>>({});
  const [shareCounts, setShareCounts] = useState<Record<string, string>>({});
  const [category, setCategory] = useState("food");
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (groupId && !activeGroup) {
      void fetchGroupDetail(groupId);
    }
  }, [groupId, activeGroup, fetchGroupDetail]);

  useEffect(() => {
    if (!members.length) return;
    if (included.length === 0) {
      setIncluded(members.map((m) => m.email.toLowerCase()));
      const counts: Record<string, string> = {};
      for (const m of members) counts[m.email.toLowerCase()] = "1";
      setShareCounts(counts);
    }
    if (!paidByEmail && members[0]) {
      setPaidByEmail(members[0].email.toLowerCase());
    }
  }, [members, included.length, paidByEmail]);

  useEffect(() => {
    if (!editing) return;
    setAmount(String(editing.amount));
    setTitle(editing.title);
    setPaidByEmail(editing.paid_by_email.toLowerCase());
    setSplitType((editing.split_type as SplitType) || "equal");
    setCategory(editing.category || "other");
    setExpenseDate(editing.expense_date);
    setNotes(editing.notes || "");
    const emails =
      editing.shares?.map((s) => s.email.toLowerCase()) ||
      members.map((m) => m.email.toLowerCase());
    setIncluded(emails);
    const exact: Record<string, string> = {};
    const pct: Record<string, string> = {};
    const shares: Record<string, string> = {};
    for (const s of editing.shares || []) {
      const e = s.email.toLowerCase();
      exact[e] = String(s.share_amount);
      pct[e] = s.share_percentage != null ? String(s.share_percentage) : "";
      shares[e] = "1";
    }
    setExactMap(exact);
    setPctMap(pct);
    setShareCounts(shares);
  }, [editing, members]);

  const includedMembers = members
    .filter((m) => included.includes(m.email.toLowerCase()))
    .map((m) => ({
      email: m.email.toLowerCase(),
      display_name: m.display_name,
      user_id: m.user_id,
    }));

  const amtNum = parseFloat(amount) || 0;
  const preview = computeSplitShares({
    amount: amtNum,
    splitType,
    includedMembers,
    exactAmounts: Object.fromEntries(
      Object.entries(exactMap).map(([k, v]) => [k, parseFloat(v) || 0]),
    ),
    percentages: Object.fromEntries(
      Object.entries(pctMap).map(([k, v]) => [k, parseFloat(v) || 0]),
    ),
    shareCounts: Object.fromEntries(
      Object.entries(shareCounts).map(([k, v]) => [k, parseFloat(v) || 1]),
    ),
  });

  const toggleMember = (email: string) => {
    const key = email.toLowerCase();
    setIncluded((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((e) => e !== key);
      }
      return [...prev, key];
    });
  };

  const save = async () => {
    if (!user || !groupId) return;
    if (!title.trim()) {
      Alert.alert("Missing", "Enter a description");
      return;
    }
    if (!amtNum || amtNum <= 0) {
      Alert.alert("Missing", "Enter a valid amount");
      return;
    }
    if (preview.error) {
      Alert.alert("Split error", preview.error);
      return;
    }

    const payer = members.find(
      (m) => m.email.toLowerCase() === paidByEmail.toLowerCase(),
    );

    setSaving(true);
    const payload = {
      groupId,
      title: title.trim(),
      amount: amtNum,
      category,
      paidByEmail: paidByEmail.toLowerCase(),
      paidByName: payer?.display_name || paidByEmail.split("@")[0],
      paidByUserId: payer?.user_id,
      splitType,
      expenseDate,
      notes: notes.trim() || undefined,
      includedMembers,
      exactAmounts: Object.fromEntries(
        Object.entries(exactMap).map(([k, v]) => [k, parseFloat(v) || 0]),
      ),
      percentages: Object.fromEntries(
        Object.entries(pctMap).map(([k, v]) => [k, parseFloat(v) || 0]),
      ),
      shareCounts: Object.fromEntries(
        Object.entries(shareCounts).map(([k, v]) => [k, parseFloat(v) || 1]),
      ),
    };

    let res: { error?: string };
    if (edit) {
      res = await editExpense({
        expenseId: edit,
        ...payload,
      });
    } else {
      res = await addExpense({
        ...payload,
        createdBy: user.id,
      });
    }
    setSaving(false);

    if (res.error) {
      Alert.alert("Error", res.error);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>
              {edit ? "Edit expense" : "Add expense"}
            </Text>
            <Text style={styles.headerTitle}>
              {edit ? "Update expense" : "New expense"}
            </Text>
            <Text style={styles.headerSub}>Split among selected members.</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <Text style={styles.label}>Total Amount</Text>
          <View style={styles.amountBox}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              autoFocus={!edit}
            />
          </View>

          {preview.shares.length > 0 && !preview.error ? (
            <View style={styles.preview}>
              {preview.shares.map((s) => (
                <Text key={s.email} style={styles.previewRow}>
                  {s.display_name}: ₹{s.share_amount.toFixed(2)}
                </Text>
              ))}
            </View>
          ) : preview.error && amtNum > 0 ? (
            <Text style={styles.previewError}>{preview.error}</Text>
          ) : null}

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Beach shack drinks"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Paid by */}
          <Text style={styles.label}>Paid by</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            {members.map((m) => {
              const key = m.email.toLowerCase();
              const active = paidByEmail === key;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setPaidByEmail(key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {key === myEmail ? "You" : m.display_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Split type */}
          <Text style={styles.label}>Split type</Text>
          <View style={styles.splitRow}>
            {SPLIT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setSplitType(t.value)}
                style={[
                  styles.splitChip,
                  splitType === t.value && styles.splitChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.splitText,
                    splitType === t.value && styles.splitTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Split among */}
          <Text style={styles.label}>Split among</Text>
          <View style={styles.memberGrid}>
            {members.map((m) => {
              const key = m.email.toLowerCase();
              const on = included.includes(key);
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => toggleMember(key)}
                  style={[styles.memberChip, on && styles.memberChipOn]}
                >
                  <Text
                    style={[
                      styles.memberChipText,
                      on && styles.memberChipTextOn,
                    ]}
                  >
                    {on ? "✓ " : ""}
                    {key === myEmail ? "You" : m.display_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {splitType === "exact" ? (
            <>
              <Text style={styles.label}>Exact amounts</Text>
              {includedMembers.map((m) => (
                <View key={m.email} style={styles.rowField}>
                  <Text style={styles.rowLabel}>{m.display_name}</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={exactMap[m.email] || ""}
                    onChangeText={(v) =>
                      setExactMap((p) => ({ ...p, [m.email]: v }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}
            </>
          ) : null}

          {splitType === "percentage" ? (
            <>
              <Text style={styles.label}>Percentages</Text>
              {includedMembers.map((m) => (
                <View key={m.email} style={styles.rowField}>
                  <Text style={styles.rowLabel}>{m.display_name}</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={pctMap[m.email] || ""}
                    onChangeText={(v) =>
                      setPctMap((p) => ({ ...p, [m.email]: v }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}
            </>
          ) : null}

          {splitType === "shares" ? (
            <>
              <Text style={styles.label}>Share counts</Text>
              {includedMembers.map((m) => (
                <View key={m.email} style={styles.rowField}>
                  <Text style={styles.rowLabel}>{m.display_name}</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={shareCounts[m.email] || "1"}
                    onChangeText={(v) =>
                      setShareCounts((p) => ({ ...p, [m.email]: v }))
                    }
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}
            </>
          ) : null}

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                onPress={() => setCategory(c.value)}
                style={[
                  styles.catChip,
                  category === c.value && styles.catChipActive,
                ]}
              >
                <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                <Text
                  style={[
                    styles.catText,
                    category === c.value && styles.catTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date */}
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder={todayISO()}
            placeholderTextColor={Colors.textMuted}
            maxLength={10}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Optional note"
            placeholderTextColor={Colors.textMuted}
          />

          <Button
            label={
              saving
                ? edit
                  ? "Saving…"
                  : "Adding…"
                : edit
                  ? "Save changes"
                  : "Add expense"
            }
            onPress={save}
            loading={saving}
            style={{ marginTop: 20, marginBottom: 40 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 20, color: Colors.textSecondary },
  headerEyebrow: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  label: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  rupee: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: "900",
    color: Colors.primary,
  },
  preview: {
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 4,
  },
  previewRow: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  previewError: {
    marginTop: 8,
    color: Colors.error,
    fontWeight: "600",
    fontSize: FontSize.md,
  },
  input: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.card,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontWeight: "600", color: Colors.textMuted },
  chipTextActive: { color: Colors.primary, fontWeight: "800" },
  splitRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  splitChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  splitChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  splitText: { fontWeight: "700", color: Colors.textMuted },
  splitTextActive: { color: "#fff" },
  memberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  memberChipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  memberChipText: { fontWeight: "600", color: Colors.textMuted },
  memberChipTextOn: { color: Colors.primary, fontWeight: "800" },
  rowField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  rowLabel: { flex: 1, fontWeight: "600", color: Colors.textPrimary },
  rowInput: {
    width: 100,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    textAlign: "right",
    fontWeight: "700",
    color: Colors.primary,
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  catChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  catText: {
    fontWeight: "600",
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  catTextActive: { color: Colors.primary, fontWeight: "800" },
});
