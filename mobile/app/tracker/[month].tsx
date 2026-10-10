import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  AddExpenseSheet,
  type TrackerTxn,
} from "@/components/tracker/AddExpenseSheet";
import { ExpenseList } from "@/components/tracker/ExpenseList";
import { MonthSummary } from "@/components/tracker/MonthSummary";
import { TrackerConsent } from "@/components/tracker/TrackerConsent";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Colors, Spacing, themedStyles, tintBg } from "@/constants/theme";
import { localISODate } from "@/lib/localDate";
import { getSupabase } from "@/lib/supabase";
import { trackerTotalAmount } from "@/lib/tracker-categories";
import { monthSummaryCaps } from "@/lib/trackerMonthSummary";
import {
  hasTrackerConsentLocal,
  setTrackerConsentLocal,
} from "@/lib/trackerCreditCards";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";

/** All transactions for one month (`/tracker/2026-03`) — port of web app/tracker/[month]. */
export default function TrackerMonthScreen() {
  const { month: monthParam = "" } = useLocalSearchParams<{ month: string }>();
  const user = useAuthStore((s) => s.user);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const analyseResult = useFinancialStore((s) => s.result);
  // Same caps as the main tracker: the user's split once Analyse is done.
  const caps = useMemo(
    () =>
      monthSummaryCaps(lastSubmission && analyseResult ? lastSubmission : null),
    [lastSubmission, analyseResult],
  );

  const parsed = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(monthParam)) return null;
    const [y, m] = monthParam.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    if (start.getFullYear() !== y || start.getMonth() !== m - 1) return null;
    // en-IN must match the locale used when rows are written.
    const monthName = start.toLocaleString("en-IN", { month: "long" });
    return { year: y, monthIndex: m - 1, monthName };
  }, [monthParam]);

  const [hasConsent, setHasConsent] = useState<boolean | null>(() =>
    hasTrackerConsentLocal() ? true : null,
  );
  const [transactions, setTransactions] = useState<TrackerTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetBucket, setSheetBucket] = useState<string | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<TrackerTxn | null>(null);
  const fetchReqId = useRef(0);

  useEffect(() => {
    if (!parsed) router.replace("/(tabs)/tracker");
  }, [parsed]);

  useEffect(() => {
    if (hasConsent === true || !user?.id) return;
    void (async () => {
      try {
        const { data } = await getSupabase()
          .from("tracker_consent")
          .select("consent_given, consent_version")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.consent_given && data.consent_version === "v2") {
          setTrackerConsentLocal();
          setHasConsent(true);
        } else {
          setHasConsent(false);
        }
      } catch {
        setHasConsent(false);
      }
    })();
  }, [user?.id, hasConsent]);

  const fetchTransactions = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!hasConsent || !parsed || !user?.id) return;
      const myId = ++fetchReqId.current;
      const soft = opts?.soft !== false;
      if (!soft) setLoading(true);
      try {
        const { data, error } = await getSupabase()
          .from("expense_transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", parsed.monthName)
          .eq("year", parsed.year)
          .order("date", { ascending: false });
        if (fetchReqId.current !== myId) return;
        if (error) console.warn("tracker month fetch:", error.message);
        setTransactions((data as TrackerTxn[]) || []);
      } catch (e) {
        if (fetchReqId.current !== myId) return;
        console.warn("tracker month fetch failed", e);
        setTransactions([]);
      } finally {
        if (fetchReqId.current === myId) setLoading(false);
      }
    },
    [hasConsent, parsed, user?.id],
  );

  // Soft refresh on focus; never while the sheet is open so an edit isn't yanked away.
  useFocusEffect(
    useCallback(() => {
      if (hasConsent && !showSheet) void fetchTransactions({ soft: true });
    }, [hasConsent, showSheet, fetchTransactions]),
  );

  const closeSheet = () => {
    setShowSheet(false);
    setEditingExpense(null);
    setSheetBucket(undefined);
  };

  if (!parsed || hasConsent === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LoadingSpinner full />
      </SafeAreaView>
    );
  }
  if (!hasConsent) {
    return <TrackerConsent onAccept={() => setHasConsent(true)} />;
  }

  const bucketTotals = transactions.reduce(
    (acc, t) => {
      if (t.bucket === "income") return acc;
      // Signed: card refunds lower the bucket, EMI purchases and bill pays add 0.
      acc[t.bucket] = (acc[t.bucket] || 0) + trackerTotalAmount(t);
      return acc;
    },
    {} as Record<string, number>,
  );
  const totalSpent = Object.values(bucketTotals).reduce((a, b) => a + b, 0);
  const monthIncome = transactions
    .filter((t) => t.bucket === "income")
    .reduce((a, t) => a + Number(t.amount), 0);
  const pad = String(parsed.monthIndex + 1).padStart(2, "0");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchTransactions({ soft: false });
              setRefreshing(false);
            }}
          />
        }
      >
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/tracker")
          }
          accessibilityRole="button"
          style={styles.back}
        >
          <Text style={styles.backText}>← Back to tracker</Text>
        </Pressable>

        <Text style={styles.heading}>
          {parsed.monthName} {parsed.year}
        </Text>
        <Text style={styles.subheading}>All transactions</Text>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              setEditingExpense(null);
              setSheetBucket("income");
              setShowSheet(true);
            }}
            accessibilityRole="button"
            style={styles.addIncome}
          >
            <Text style={styles.addIncomeText}>+ Add income</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setEditingExpense(null);
              setSheetBucket(undefined);
              setShowSheet(true);
            }}
            accessibilityRole="button"
            style={styles.addExpense}
          >
            <Text style={styles.addExpenseText}>+ Add expense</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL THIS MONTH</Text>
          <Text style={styles.heroValue}>
            ₹{totalSpent.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.heroSub}>{transactions.length} transactions</Text>
        </View>

        <MonthSummary
          title="BY CATEGORY"
          bucketTotals={bucketTotals}
          totalSpent={totalSpent}
          income={monthIncome}
          caps={caps}
        />

        <View style={styles.listCard}>
          <View style={styles.listHead}>
            <Text style={styles.listTitle}>ALL TRANSACTIONS</Text>
          </View>
          {loading ? <LoadingSpinner /> : null}
          <ExpenseList
            transactions={transactions}
            onChanged={() => void fetchTransactions({ soft: true })}
            onEdit={(txn) => {
              setEditingExpense(txn);
              setShowSheet(true);
            }}
          />
        </View>
      </ScrollView>

      <AddExpenseSheet
        visible={showSheet}
        onClose={closeSheet}
        onSaved={() => {
          closeSheet();
          void fetchTransactions({ soft: true });
        }}
        defaultDate={`${parsed.year}-${pad}-15`}
        maxDate={localISODate(new Date(parsed.year, parsed.monthIndex + 1, 0))}
        defaultBucket={editingExpense ? editingExpense.bucket : sheetBucket}
        editExpense={editingExpense}
      />
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  back: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  backText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  heading: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  subheading: {
    fontSize: 13,
    color: Colors.textPrimary,
    opacity: 0.88,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  addIncome: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.success,
    backgroundColor: tintBg("#E8F8EF"),
    alignItems: "center",
    justifyContent: "center",
  },
  addIncomeText: { fontSize: 14, fontWeight: "700", color: Colors.success },
  addExpense: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addExpenseText: { fontSize: 14, fontWeight: "700", color: Colors.onPrimary },
  hero: {
    borderRadius: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  heroLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 },
  heroValue: { fontSize: 32, fontWeight: "800", color: Colors.onPrimary },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  listHead: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listTitle: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
}));
