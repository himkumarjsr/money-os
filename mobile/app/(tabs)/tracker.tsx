import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";

const BUCKET_COLORS: Record<
  string,
  { bg: string; text: string; light: string }
> = {
  needs: {
    bg: Colors.primary,
    text: "#fff",
    light: Colors.primaryLight,
  },
  wants: {
    bg: "#BA7517",
    text: "#fff",
    light: "#FFF3E0",
  },
  savings: {
    bg: Colors.success,
    text: "#fff",
    light: Colors.successLight,
  },
  investment: {
    bg: "#5E35B1",
    text: "#fff",
    light: "#EDE7F6",
  },
  loans: {
    bg: Colors.error,
    text: "#fff",
    light: Colors.errorLight,
  },
};

type Expense = {
  id: string;
  amount: number;
  bucket?: string | null;
  category?: string | null;
  title?: string | null;
  description?: string | null;
  date?: string | null;
};

export default function TrackerScreen() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [amountsVisible, setAmountsVisible] = useState(false);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setExpenses([]);
      setIncome(0);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("expense_transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", `${monthKey}-01`)
      .lte("date", `${monthKey}-31`)
      .order("date", { ascending: false });

    setExpenses((data as Expense[]) || []);

    const { data: analysis } = await supabase
      .from("user_analysis")
      .select("profile")
      .eq("user_id", user.id)
      .maybeSingle();

    if (analysis?.profile) {
      const p = analysis.profile as {
        monthlySalary?: number;
        spouseIncome?: number;
        otherIncome?: number;
      };
      setIncome(
        (p.monthlySalary || 0) + (p.spouseIncome || 0) + (p.otherIncome || 0),
      );
    } else {
      setIncome(0);
    }

    setLoading(false);
  }, [user?.id, monthKey]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const bucketTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const bucket = e.bucket || "needs";
    bucketTotals[bucket] =
      (bucketTotals[bucket] || 0) + (Number(e.amount) || 0);
  });

  const maskAmount = (amount: number) =>
    amountsVisible ? `₹${Math.round(amount).toLocaleString("en-IN")}` : "₹••••";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={styles.summaryIncome}>{maskAmount(income)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAmountsVisible(!amountsVisible)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeIcon}>{amountsVisible ? "👁️" : "🙈"}</Text>
            </TouchableOpacity>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text
                style={[
                  styles.summarySpent,
                  totalSpent > income * 0.8 && { color: Colors.error },
                ]}
              >
                {maskAmount(totalSpent)}
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    income > 0 ? Math.min(100, (totalSpent / income) * 100) : 0
                  }%`,
                  backgroundColor:
                    totalSpent > income * 0.9
                      ? Colors.error
                      : totalSpent > income * 0.7
                        ? Colors.warning
                        : Colors.success,
                },
              ]}
            />
          </View>

          <View style={styles.leftRow}>
            <Text style={styles.leftLabel}>Left this month</Text>
            <Text
              style={[
                styles.leftAmount,
                income - totalSpent < 0 && { color: Colors.error },
              ]}
            >
              {maskAmount(Math.max(0, income - totalSpent))}
            </Text>
          </View>
        </View>

        <Text style={styles.monthLabel}>{monthName}</Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : (
          <>
            <View style={styles.bucketsGrid}>
              {Object.entries(bucketTotals).map(([bucket, amount]) => {
                const colors = BUCKET_COLORS[bucket] || BUCKET_COLORS.needs;
                const cap =
                  income *
                  (bucket === "needs"
                    ? 0.3
                    : bucket === "wants"
                      ? 0.05
                      : bucket === "loans"
                        ? 0.4
                        : bucket === "investment"
                          ? 0.2
                          : 0.05);
                const pct = cap > 0 ? Math.min(100, (amount / cap) * 100) : 0;

                return (
                  <View
                    key={bucket}
                    style={[styles.bucketCard, { borderColor: colors.light }]}
                  >
                    <Text style={[styles.bucketName, { color: colors.bg }]}>
                      {bucket.toUpperCase()}
                    </Text>
                    <Text style={styles.bucketAmount}>
                      {maskAmount(amount)}
                    </Text>
                    <View style={styles.bucketBar}>
                      <View
                        style={[
                          styles.bucketFill,
                          {
                            width: `${pct}%`,
                            backgroundColor:
                              pct >= 100 ? Colors.error : colors.bg,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.bucketCap}>cap {maskAmount(cap)}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.recentTitle}>Recent expenses</Text>

            {expenses.slice(0, 20).map((exp) => (
              <View key={exp.id} style={styles.expenseRow}>
                <View style={styles.expenseCat}>
                  <Text style={styles.expenseCatText}>
                    {(exp.category || exp.bucket || "₹")[0]?.toUpperCase() ||
                      "₹"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseTitle}>
                    {exp.title || exp.description || exp.category || "Expense"}
                  </Text>
                  <Text style={styles.expenseDate}>
                    {exp.date
                      ? new Date(exp.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {maskAmount(Number(exp.amount) || 0)}
                </Text>
              </View>
            ))}

            {expenses.length === 0 ? (
              <View style={styles.emptyExpenses}>
                <Text style={styles.emptyExpensesText}>
                  No expenses this month. Tap + to add your first one.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {showAdd ? (
        <AddExpenseModal
          userId={user?.id || ""}
          monthName={now.toLocaleDateString("en-IN", { month: "long" })}
          year={now.getFullYear()}
          onClose={() => setShowAdd(false)}
          onSave={async () => {
            setShowAdd(false);
            await loadData();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function AddExpenseModal({
  userId,
  monthName,
  year,
  onClose,
  onSave,
}: {
  userId: string;
  monthName: string;
  year: number;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [bucket, setBucket] = useState("needs");
  const [saving, setSaving] = useState(false);

  const BUCKETS = [
    { value: "needs", label: "🏠 Needs" },
    { value: "wants", label: "🎉 Wants" },
    { value: "investment", label: "📈 Investment" },
    { value: "loans", label: "🏦 Loans" },
  ];

  const save = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Log in to add expenses.");
      return;
    }
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      Alert.alert("Missing fields", "Enter title and amount");
      return;
    }

    setSaving(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("expense_transactions").insert({
        user_id: userId,
        title: title.trim(),
        description: title.trim(),
        amount: parseFloat(amount),
        bucket,
        category: bucket,
        subcategory: bucket,
        date,
        month: monthName,
        year,
        payment_method: "cash",
      });
      if (error) throw error;
      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={modalStyles.overlay}>
      <TouchableOpacity style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>Add expense</Text>

        <View style={modalStyles.amountBox}>
          <Text style={modalStyles.rupeeSign}>₹</Text>
          <TextInput
            style={modalStyles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            autoFocus
          />
        </View>

        <TextInput
          style={modalStyles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="What was this for?"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={modalStyles.bucketLabel}>Category</Text>
        <View style={modalStyles.bucketRow}>
          {BUCKETS.map((b) => (
            <TouchableOpacity
              key={b.value}
              onPress={() => setBucket(b.value)}
              style={[
                modalStyles.bucketChip,
                bucket === b.value && modalStyles.bucketChipActive,
              ]}
            >
              <Text
                style={[
                  modalStyles.bucketChipText,
                  bucket === b.value && modalStyles.bucketChipTextActive,
                ]}
              >
                {b.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={[modalStyles.saveBtn, saving && { opacity: 0.6 }]}
        >
          <Text style={modalStyles.saveBtnText}>
            {saving ? "Adding..." : `Add ₹${amount || "0"}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    margin: Spacing.xl,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    ...Shadow.strong,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    marginBottom: 2,
  },
  summaryIncome: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    color: "#fff",
  },
  summarySpent: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    color: "#FFB3B3",
  },
  eyeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: { fontSize: 22 },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  leftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftLabel: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.7)",
  },
  leftAmount: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#90EE90",
  },
  monthLabel: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  loadingText: {
    textAlign: "center",
    color: Colors.textMuted,
    padding: 24,
  },
  bucketsGrid: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  bucketCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    ...Shadow.card,
  },
  bucketName: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bucketAmount: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  bucketBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  bucketFill: {
    height: "100%",
    borderRadius: 2,
  },
  bucketCap: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  recentTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expenseCat: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseCatText: {
    fontSize: FontSize.base,
    fontWeight: "800",
    color: Colors.primary,
  },
  expenseTitle: {
    fontSize: FontSize.base,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  expenseDate: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptyExpenses: {
    alignItems: "center",
    padding: 32,
  },
  emptyExpensesText: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.strong,
  },
  fabText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "300",
    lineHeight: 30,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    paddingBottom: 48,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  rupeeSign: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.primary,
  },
  amountInput: {
    fontSize: 52,
    fontWeight: "900",
    color: Colors.primary,
    minWidth: 120,
    textAlign: "center",
  },
  titleInput: {
    height: 52,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  bucketLabel: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bucketRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.xl,
  },
  bucketChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  bucketChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bucketChipText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  bucketChipTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  saveBtn: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.strong,
  },
  saveBtnText: {
    fontSize: FontSize.base,
    fontWeight: "800",
    color: "#fff",
  },
});
