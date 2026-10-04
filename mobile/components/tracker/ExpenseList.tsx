import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { TrackerTxn } from "@/components/tracker/AddExpenseSheet";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import { AppIcon } from "@/components/ui/AppIcon";
import { Colors } from "@/constants/theme";
import { getSupabase } from "@/lib/supabase";
import {
  TRACKER_CATEGORIES,
  findSubcategory,
  type BucketType,
} from "@/lib/tracker-categories";
import {
  displayExpenseDescription,
  isCreditCardPaymentMethod,
} from "@/lib/trackerCreditCards";
import { useAuthStore } from "@/store/authStore";

/** Every transaction for a month with Edit / Delete — mobile list for web ExpenseTable. */
export function ExpenseList({
  transactions,
  onChanged,
  onEdit,
}: {
  transactions: TrackerTxn[];
  onChanged: () => void;
  onEdit?: (txn: TrackerTxn) => void;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    if (!userId) return;
    Alert.alert("Remove this entry?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDeletingId(id);
          void (async () => {
            await getSupabase()
              .from("expense_transactions")
              .delete()
              .eq("id", id)
              .eq("user_id", userId);
            setDeletingId(null);
            onChanged();
          })();
        },
      },
    ]);
  };

  if (transactions.length === 0) {
    return <Text style={styles.empty}>No transactions for this month.</Text>;
  }

  return (
    <View>
      {transactions.map((t, i) => {
        const bucketKey = t.bucket as BucketType;
        const bucket = TRACKER_CATEGORIES[bucketKey];
        const sub = bucket
          ? findSubcategory(bucketKey, t.subcategory ?? t.category)
          : null;
        const editVerb = t.bucket === "income" ? "income" : "expense";
        const onCard = isCreditCardPaymentMethod(t.payment_method);
        const note = displayExpenseDescription(t.description);
        return (
          <View
            key={t.id}
            style={[
              styles.row,
              i < transactions.length - 1 && styles.rowDivider,
            ]}
          >
            <View style={styles.rowTop}>
              {bucket ? (
                <TrackerIcon
                  name={sub?.icon ?? bucket.icon}
                  size={18}
                  color={bucket.color}
                />
              ) : null}
              <View style={styles.rowText}>
                <Text style={styles.category} numberOfLines={1}>
                  {sub?.label ?? t.category}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {new Date(t.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {note ? ` · ${note}` : ""}
                </Text>
              </View>
              <View style={styles.amountWrap}>
                {onCard ? (
                  <View
                    style={styles.cardChip}
                    accessibilityLabel="Paid by credit card — not in purple LEFT or bucket totals"
                  >
                    <AppIcon name="card" size={12} color={Colors.primary} />
                    <Text style={styles.cardChipText}>Card</Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.amount,
                    t.bucket === "investment"
                      ? { color: Colors.success }
                      : t.bucket === "habits"
                        ? { color: Colors.error }
                        : null,
                  ]}
                >
                  {t.bucket === "investment" ? "+" : "−"}₹
                  {Number(t.amount).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              {onEdit ? (
                <Pressable
                  onPress={() => onEdit(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${editVerb}`}
                  style={styles.actionBtn}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => confirmDelete(t.id)}
                disabled={deletingId === t.id}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${editVerb}`}
                style={styles.actionBtn}
              >
                <Text style={styles.deleteText}>
                  {deletingId === t.id ? "…" : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: 24,
    textAlign: "center",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  row: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.background },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { flex: 1, minWidth: 0 },
  category: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  amountWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  cardChipText: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  amount: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 4 },
  actionBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  editText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  deleteText: { fontSize: 13, fontWeight: "700", color: Colors.error },
});
