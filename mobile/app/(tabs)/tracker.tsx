import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { AddExpenseSheet } from "@/components/tracker/AddExpenseSheet";
import { BucketCard } from "@/components/tracker/BucketCard";
import { formatIndian } from "@/lib/formatters";

type Expense = { id: string; title: string; amount: number };

const KEY = "finkoin-mobile-tracker-v1";

export default function TrackerScreen() {
  const [sheet, setSheet] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setExpenses(JSON.parse(raw) as Expense[]);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function persist(next: Expense[]) {
    setExpenses(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Tracker</Text>
        <Text style={styles.sub}>
          Local expenses this device · cloud sync next sprint
        </Text>

        <BucketCard name="This month" spent={total} emoji="📒" />
        <BucketCard
          name="Needs"
          spent={total * 0.5}
          budget={total || 1}
          emoji="🏠"
        />
        <BucketCard
          name="Wants"
          spent={total * 0.3}
          budget={total || 1}
          emoji="☕"
        />

        <Button label="Add expense" onPress={() => setSheet(true)} />

        <Text style={styles.listTitle}>Recent</Text>
        {expenses.length === 0 ? (
          <Text style={styles.empty}>No expenses yet</Text>
        ) : (
          expenses.slice(0, 20).map((e) => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.rowTitle}>{e.title}</Text>
              <Text style={styles.rowAmt}>₹{formatIndian(e.amount)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <AddExpenseSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onSave={(payload) => {
          void persist([{ id: String(Date.now()), ...payload }, ...expenses]);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pad: { padding: Spacing.xl, paddingBottom: 40 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  sub: {
    marginTop: 6,
    marginBottom: Spacing.xl,
    fontSize: 14,
    color: Colors.textMuted,
  },
  listTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  empty: { color: Colors.textMuted, fontSize: FontSize.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowTitle: { fontWeight: "600", color: Colors.textPrimary },
  rowAmt: { fontWeight: "700", color: Colors.primary },
});
