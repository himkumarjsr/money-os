import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useObligationStore } from "@/store/obligationStore";
import { supabase, getSupabase } from "@/lib/supabase";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SectionPrivacyEye, EyeIcon } from "@/components/ui/PrivacyEye";
import {
  TrackerIcon,
  TrackerIconBadge,
} from "@/components/tracker/TrackerIcons";
import { TrackerConsent } from "@/components/tracker/TrackerConsent";
import { AppHeader } from "@/components/AppHeader";
import {
  AddExpenseSheet,
  type SavedExpense,
  type TrackerTxn,
} from "@/components/tracker/AddExpenseSheet";
import { MonthSafetyPulse } from "@/components/tracker/MonthSafetyPulse";
import { ObligationsChecklist } from "@/components/tracker/ObligationsChecklist";
import {
  TRACKER_CATEGORIES,
  countsTowardTrackerTotals,
  findSubcategory,
  normalizeTrackerBucket,
  type BucketType,
} from "@/lib/tracker-categories";
import {
  buildSmartBudget,
  learnCapsFromSpending,
  monthSpendFromRows,
  sameSmartBudget,
  type LearnedAdjustment,
  type MonthSpend,
} from "@/lib/learned-caps";
import { syncKv } from "@/lib/syncKv";
import {
  getProfileCaps,
  getUniversalBucketActuals,
  type SmartBudget,
} from "@/lib/universal-buckets";
import { saveUserAnalyseSnapshotSmartBudget } from "@/lib/userAnalyseSnapshot";
import { formatExpenseDate, localISODate } from "@/lib/localDate";
import { getProfileMonthlySalaryCached } from "@/lib/trackerProfileIncome";
import {
  computeMonthSafetyPulse,
  previousCalendarMonth,
} from "@/lib/trackerSafetyPulse";
import {
  candidateFromExpense,
  decideObligationLearn,
  shouldLearnObligationFromExpense,
} from "@/lib/obligationLearn";
import {
  creditCardBillPaymentDescription,
  displayExpenseDescription,
  hasTrackerConsentLocal,
  isCreditCardBillPayment,
  isCreditCardPaymentMethod,
  loadCreditCardsMerged,
  parsePayBillLabel,
  sumCashSpend,
  sumOnCardsSpend,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";
import { CreditCardDues } from "@/components/tracker/CreditCardDues";
import {
  EXPENSE_SUBCATEGORY_TO_OBLIGATION,
  SAVINGS_CARRY_FORWARD_DESC,
  listSavingsCarryForward,
  monthHasStarted,
  planAutoIncomeCleanup,
  planMonthIncomeFromPrior,
  trackerForwardLimit,
} from "@/lib/trackerMonthIncome";
import {
  expenseCoversChecklistItem,
  findPendingChecklistForExpense,
  obligationCategoryFromExpense,
  planObligationExpenseSync,
} from "@/lib/trackerObligationSync";

const BUCKETS: BucketType[] = [
  "needs",
  "wants",
  "habits",
  "security",
  "loans",
  "investment",
];

function formatMasked(n: number, visible: boolean) {
  return visible
    ? `₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`
    : "₹••••••";
}

const SMART_BUDGET_OFF_KEY = "finkoin_smart_budget_off";

function SmartBudgetNote({
  adjustments,
  on,
  onToggle,
}: {
  adjustments: LearnedAdjustment[];
  on: boolean;
  onToggle: (on: boolean) => void;
}) {
  const moved = adjustments.reduce((a, x) => a + x.movedToInvestment, 0);
  return (
    <View style={styles.smartNote}>
      {on ? (
        <>
          <Text style={styles.smartNoteTitle}>
            {`Smart budget: ₹${Math.round(moved).toLocaleString("en-IN")}/mo moved to Investments`}
          </Text>
          {adjustments.map((a) => (
            <Text key={a.key} style={styles.smartNoteText}>
              {`${a.key === "needs" ? "Needs" : "Wants"} stayed under budget for 3 months (avg ₹${Math.round(a.averageSpend).toLocaleString("en-IN")}), so its budget is now ${a.toPercent}% instead of ${a.fromPercent}%.`}
            </Text>
          ))}
        </>
      ) : (
        <Text style={styles.smartNoteText}>
          Smart budget is off. Your spending has stayed under budget for 3
          months.
        </Text>
      )}
      <Pressable onPress={() => onToggle(!on)} hitSlop={8}>
        <Text style={styles.smartNoteAction}>
          {on ? "Undo" : "Turn smart budget on"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function TrackerScreen() {
  const user = useAuthStore((s) => s.user);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const analyseResult = useFinancialStore((s) => s.result);
  const analyseCompleted = Boolean(lastSubmission && analyseResult);
  // Budget caps follow the Analyse answers once they exist; otherwise the generic split.
  // The smart budget is learned on top of these, never on top of itself.
  const bucketCaps = useMemo(
    () =>
      getProfileCaps(analyseCompleted && lastSubmission ? lastSubmission : {}),
    [analyseCompleted, lastSubmission],
  );
  const setStoreSmartBudget = useFinancialStore((s) => s.setSmartBudget);
  /** Set during render once spending history is known; saved by the effect below. */
  const smartSyncRef = useRef<SmartBudget | null | undefined>(undefined);
  const [hasConsent, setHasConsent] = useState<boolean | null>(() => {
    try {
      if (hasTrackerConsentLocal()) return true;
    } catch {
      /* ignore */
    }
    return null;
  });

  const [transactions, setTransactions] = useState<TrackerTxn[]>([]);
  const [previousTransactions, setPreviousTransactions] = useState<
    TrackerTxn[]
  >([]);
  /** prev-2 + prev months — CC carry-forward + obligation learning only (never Safety Pulse). */
  const [ccBillHistory, setCcBillHistory] = useState<TrackerTxn[]>([]);
  /** Needs / Wants spend for the 3 months before the selected one (newest first). */
  const [learnHistory, setLearnHistory] = useState<MonthSpend[]>([]);
  /** Month ("year-month") the learn history was fetched for, once it loaded cleanly. */
  const [learnHistoryFor, setLearnHistoryFor] = useState<string | null>(null);
  const [smartBudgetOff, setSmartBudgetOff] = useState(
    () => syncKv.getItem(SMART_BUDGET_OFF_KEY) === "1",
  );
  const [savedCards, setSavedCards] = useState<SavedCreditCard[]>([]);
  const [pendingCcPayCardId, setPendingCcPayCardId] = useState<string | null>(
    null,
  );
  const [ccOptimisticPayments, setCcOptimisticPayments] = useState<
    Array<{ cardId: string; amount: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [expandedIncome, setExpandedIncome] = useState(false);

  const [showSheet, setShowSheet] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TrackerTxn | null>(null);
  const [defaultBucket, setDefaultBucket] = useState<string>("");
  const [sheetDefaults, setSheetDefaults] = useState<{
    subcategory?: string;
    amount?: number;
    description?: string;
    paymentMethod?: string;
  }>({});

  const [learnedObligation, setLearnedObligation] = useState<{
    title: string;
    category: string;
    amount: number;
  } | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [trackerStart, setTrackerStart] = useState<{
    month: number;
    year: number;
  } | null>(null);
  const [profileMonthlyFromDb, setProfileMonthlyFromDb] = useState(0);

  const [amountsVisible, setAmountsVisible] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(flip, {
      toValue: amountsVisible ? 1 : 0,
      duration: 550,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [amountsVisible, flip]);
  const [sectionVisible, setSectionVisible] = useState<Record<string, boolean>>(
    {},
  );

  const isSectionVisible = (key: string) => sectionVisible[key] === true;
  const toggleSectionVisible = (key: string) =>
    setSectionVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const privacyKeys = [
    "income",
    "needs",
    "wants",
    "habits",
    "security",
    "loans",
    "investment",
  ] as const;
  const allVisible =
    amountsVisible && privacyKeys.every((k) => sectionVisible[k] === true);
  const toggleShowAll = () => {
    const next = !allVisible;
    setAmountsVisible(next);
    setSectionVisible(() => {
      const rec: Record<string, boolean> = {};
      for (const k of privacyKeys) rec[k] = next;
      return rec;
    });
  };

  const fetchReqId = useRef(0);
  const currentMonth = new Date(selectedYear, selectedMonth, 1).toLocaleString(
    "en-IN",
    {
      month: "long",
    },
  );
  const currentYear = selectedYear;

  // Keep obligations in sync with health-check data once analyse completes.
  useEffect(() => {
    if (!user?.id || !analyseCompleted || !lastSubmission) return;
    void useObligationStore
      .getState()
      .syncFromHealthCheck(user.id, lastSubmission)
      .catch(() => {});
  }, [user?.id, analyseCompleted, lastSubmission]);

  // Snap back if a prior session had next-month open before the forward limit moved.
  useEffect(() => {
    const limit = trackerForwardLimit();
    const selectedKey = selectedYear * 12 + selectedMonth;
    const limitKey = limit.year * 12 + limit.month;
    if (selectedKey <= limitKey) return;
    setSelectedMonth(limit.month);
    setSelectedYear(limit.year);
  }, [selectedMonth, selectedYear]);

  // Consent gate: local flag first, else check DB.
  useEffect(() => {
    if (hasConsent === true) return;
    try {
      if (hasTrackerConsentLocal()) {
        setHasConsent(true);
        return;
      }
    } catch {
      /* ignore */
    }
    const checkDB = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("tracker_consent")
          .select("consent_given, consent_version")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.consent_given && data.consent_version === "v2") {
          setHasConsent(true);
        } else {
          setHasConsent(false);
        }
      } catch {
        setHasConsent(false);
      }
    };
    void checkDB();
  }, [user?.id, hasConsent]);

  const fetchTransactions = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!hasConsent || !user?.id) {
        setLoading(false);
        return;
      }
      const myId = ++fetchReqId.current;
      const soft = opts?.soft !== false;
      if (!soft) setLoading(true);
      try {
        const prev = previousCalendarMonth(selectedMonth, selectedYear);
        const prev2 = previousCalendarMonth(prev.monthIndex, prev.year);
        const prev3 = previousCalendarMonth(prev2.monthIndex, prev2.year);
        const [currentRes, prevRes, prev2Res, prev3Res] = await Promise.all([
          supabase
            .from("expense_transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("month", currentMonth)
            .eq("year", currentYear)
            .order("date", { ascending: false }),
          supabase
            .from("expense_transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("month", prev.monthName)
            .eq("year", prev.year)
            .order("date", { ascending: false }),
          supabase
            .from("expense_transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("month", prev2.monthName)
            .eq("year", prev2.year)
            .order("date", { ascending: false }),
          supabase
            .from("expense_transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("month", prev3.monthName)
            .eq("year", prev3.year),
        ]);
        if (fetchReqId.current !== myId) return;
        const prevRows = ((prevRes.data as TrackerTxn[]) || []).map(
          normalizeTrackerBucket,
        );
        const prev2Rows = ((prev2Res.data as TrackerTxn[]) || []).map(
          normalizeTrackerBucket,
        );
        setTransactions(
          ((currentRes.data as TrackerTxn[]) || []).map(normalizeTrackerBucket),
        );
        setPreviousTransactions(prevRows);
        setCcBillHistory([...prev2Rows, ...prevRows]);
        const prev3Rows = ((prev3Res.data as TrackerTxn[]) || []).map(
          normalizeTrackerBucket,
        );
        setLearnHistory(
          [prevRows, prev2Rows, prev3Rows].map((rows) =>
            monthSpendFromRows(rows),
          ),
        );
        setLearnHistoryFor(
          prevRes.error || prev2Res.error || prev3Res.error
            ? null
            : `${selectedYear}-${selectedMonth}`,
        );
      } catch (e) {
        if (fetchReqId.current !== myId) return;
        console.warn("tracker fetch failed", e);
        setTransactions([]);
        setPreviousTransactions([]);
        setCcBillHistory([]);
        setLearnHistory([]);
        setLearnHistoryFor(null);
      } finally {
        if (fetchReqId.current === myId) setLoading(false);
      }
    },
    [
      hasConsent,
      user?.id,
      currentMonth,
      currentYear,
      selectedMonth,
      selectedYear,
    ],
  );

  useEffect(() => {
    if (hasConsent) void fetchTransactions({ soft: true });
  }, [hasConsent, fetchTransactions]);

  // Soft refresh when returning to the tab (e.g. after editing in the month drill-down).
  // Refs keep the callback stable so it fires on focus only, and never mid-edit.
  const focusRefreshRef = useRef({ fetchTransactions, showSheet, first: true });
  focusRefreshRef.current.fetchTransactions = fetchTransactions;
  focusRefreshRef.current.showSheet = showSheet;
  useFocusEffect(
    useCallback(() => {
      const r = focusRefreshRef.current;
      if (r.first) {
        r.first = false;
        return;
      }
      if (hasConsent && !r.showSheet) void r.fetchTransactions({ soft: true });
    }, [hasConsent]),
  );

  // Re-runs when the sheet closes so a card added inside it shows up immediately.
  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const cards = await loadCreditCardsMerged(user.id);
      if (!cancelled) setSavedCards(cards);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasConsent, user?.id, showSheet]);

  // Drop optimistic CC pay credits once a matching bill payment is fetched.
  useEffect(() => {
    if (ccOptimisticPayments.length === 0) return;
    setCcOptimisticPayments((prev) =>
      prev.filter((p) => {
        const pool = [...transactions, ...ccBillHistory];
        const id = p.cardId.toLowerCase();
        return !pool.some((t) => {
          if (!isCreditCardBillPayment(t)) return false;
          const desc = (t.description || "").toLowerCase();
          if (desc.includes(`[#${id}]`)) return true;
          const payLabel = (
            parsePayBillLabel(t.description) || ""
          ).toLowerCase();
          if (payLabel && (payLabel === id || desc.includes(id))) return true;
          // Any loans → credit_card cash pay after a Pay CTA (covers orphan "Credit card").
          return (
            t.bucket === "loans" &&
            (t.subcategory === "credit_card" || t.category === "credit_card") &&
            Math.abs(Number(t.amount) - p.amount) < 0.02
          );
        });
      }),
    );
  }, [transactions, ccBillHistory, ccOptimisticPayments.length]);

  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const v = await getProfileMonthlySalaryCached(getSupabase(), user.id);
      if (!cancelled) setProfileMonthlyFromDb(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasConsent, user?.id]);

  // Back-nav floor: consent month, else first txn month.
  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const [consentRes, txnRes] = await Promise.all([
          supabase
            .from("tracker_consent")
            .select("consent_at")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("expense_transactions")
            .select("date, month, year")
            .eq("user_id", user.id)
            .order("date", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const fromDate = (iso: string | null | undefined) => {
          if (!iso) return null;
          const d = new Date(iso);
          if (Number.isNaN(d.getTime())) return null;
          return { month: d.getMonth(), year: d.getFullYear() };
        };
        const consentStart = fromDate(consentRes.data?.consent_at ?? null);
        let txnStart: { month: number; year: number } | null = null;
        const row = txnRes.data as {
          date?: string;
          month?: string;
          year?: number;
        } | null;
        if (row) {
          let month = -1;
          let year = typeof row.year === "number" ? row.year : Number(row.year);
          if (typeof row.month === "string" && Number.isFinite(year)) {
            const idx = new Date(`${row.month} 1, ${year}`).getMonth();
            if (!Number.isNaN(idx)) month = idx;
          }
          if (month < 0 && row.date) {
            txnStart = fromDate(`${String(row.date).slice(0, 10)}T12:00:00`);
          } else if (month >= 0 && Number.isFinite(year)) {
            txnStart = { month, year };
          }
        }
        const start = consentStart ||
          txnStart || {
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
          };
        setTrackerStart(start);
      } catch {
        /* ignore — nav stays unbounded */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasConsent, user?.id, transactions.length]);

  useEffect(() => {
    if (!trackerStart) return;
    const sel = selectedYear * 12 + selectedMonth;
    const start = trackerStart.year * 12 + trackerStart.month;
    if (sel < start) {
      setSelectedMonth(trackerStart.month);
      setSelectedYear(trackerStart.year);
    }
  }, [trackerStart, selectedMonth, selectedYear]);

  // On/after the 1st: persist missing salary and/or "Saving from last month".
  const incomeSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    if (!monthHasStarted(selectedMonth, selectedYear)) return;
    if (trackerStart) {
      const startKey = trackerStart.year * 12 + trackerStart.month;
      const selKey = selectedYear * 12 + selectedMonth;
      if (selKey < startKey) return;
    }

    const plan = planMonthIncomeFromPrior({
      previousTxns: previousTransactions,
      currentTxns: transactions,
      profileSalary: profileMonthlyFromDb,
    });
    const cleanupPreview = planAutoIncomeCleanup({
      currentTxns: transactions,
      salaryAmount: plan.salaryAmount,
      savingsAmount: plan.savingsAmount,
    });
    if (
      !plan.needsSalaryRow &&
      !plan.needsSavingsRow &&
      !cleanupPreview.needsWork
    ) {
      return;
    }

    const key = `${user.id}:${selectedYear}-${selectedMonth}:sal${plan.needsSalaryRow}:cf${plan.needsSavingsRow}:clean${cleanupPreview.dropIds.join(",")}:${cleanupPreview.updateCf?.amount ?? ""}:${plan.salaryAmount}:${plan.savingsAmount}`;
    if (incomeSyncKeyRef.current === key) return;
    incomeSyncKeyRef.current = key;

    let cancelled = false;
    void (async () => {
      try {
        const monthName = new Date(
          selectedYear,
          selectedMonth,
          1,
        ).toLocaleString("en-IN", { month: "long" });
        const date = localISODate(new Date(selectedYear, selectedMonth, 1));

        const { data: fresh, error: freshErr } = await supabase
          .from("expense_transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", monthName)
          .eq("year", selectedYear);
        if (freshErr) {
          incomeSyncKeyRef.current = null;
          return;
        }
        if (cancelled) return;

        const freshRows = (fresh || []) as TrackerTxn[];
        const freshPlan = planMonthIncomeFromPrior({
          previousTxns: previousTransactions,
          currentTxns: freshRows,
          profileSalary: profileMonthlyFromDb,
        });
        const cleanup = planAutoIncomeCleanup({
          currentTxns: freshRows,
          salaryAmount: freshPlan.salaryAmount,
          savingsAmount: freshPlan.savingsAmount,
        });

        if (cleanup.dropIds.length > 0) {
          await supabase
            .from("expense_transactions")
            .delete()
            .eq("user_id", user.id)
            .in("id", cleanup.dropIds);
        }
        if (cleanup.updateCf) {
          await supabase
            .from("expense_transactions")
            .update({ amount: cleanup.updateCf.amount })
            .eq("user_id", user.id)
            .eq("id", cleanup.updateCf.id);
        }

        const afterCleanup = freshRows.filter(
          (t) => !t.id || !cleanup.dropIds.includes(t.id),
        );
        const afterPlan = planMonthIncomeFromPrior({
          previousTxns: previousTransactions,
          currentTxns: afterCleanup.map((t) =>
            cleanup.updateCf && t.id === cleanup.updateCf.id
              ? { ...t, amount: cleanup.updateCf.amount }
              : t,
          ),
          profileSalary: profileMonthlyFromDb,
        });

        const rows: Array<Record<string, unknown>> = [];
        if (afterPlan.needsSalaryRow) {
          rows.push({
            user_id: user.id,
            date,
            amount: afterPlan.salaryAmount,
            category: "salary",
            subcategory: "salary",
            description: "Salary",
            bucket: "income",
            payment_method: null,
            month: monthName,
            year: selectedYear,
          });
        }
        if (afterPlan.needsSavingsRow) {
          rows.push({
            user_id: user.id,
            date,
            amount: afterPlan.savingsAmount,
            category: "other_income",
            subcategory: "other_income",
            description: SAVINGS_CARRY_FORWARD_DESC,
            bucket: "income",
            payment_method: null,
            month: monthName,
            year: selectedYear,
          });
        }
        if (rows.length > 0) {
          const { error } = await supabase
            .from("expense_transactions")
            .insert(rows);
          if (error) {
            incomeSyncKeyRef.current = null;
            return;
          }
        }
        if (!cancelled && (cleanup.needsWork || rows.length > 0)) {
          void fetchTransactions({ soft: true });
        }
      } catch {
        incomeSyncKeyRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hasConsent,
    user?.id,
    selectedMonth,
    selectedYear,
    previousTransactions,
    transactions,
    profileMonthlyFromDb,
    fetchTransactions,
    trackerStart,
  ]);

  const obligationChecklistMonth = useMemo(
    () => new Date(selectedYear, selectedMonth, 1),
    [selectedYear, selectedMonth],
  );

  // Keep obligation checklist ticks in sync with real expenses.
  const obligationSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    const checklistMonth = obligationChecklistMonth;
    const monthKey = `${selectedYear}-${selectedMonth}`;
    let cancelled = false;
    void (async () => {
      const store = useObligationStore.getState();
      await store.generateChecklist(user.id, checklistMonth);
      if (cancelled) return;
      const { checklist } = useObligationStore.getState();
      const plan = planObligationExpenseSync({
        checklist,
        expenses: transactions,
      });
      if (plan.markPaid.length === 0 && plan.markUnpaid.length === 0) {
        obligationSyncKeyRef.current = monthKey;
        return;
      }
      const actionKey = `${monthKey}:p${plan.markPaid.map((x) => x.id).join(",")}:u${plan.markUnpaid.join(",")}`;
      if (obligationSyncKeyRef.current === actionKey) return;
      obligationSyncKeyRef.current = actionKey;
      for (const id of plan.markUnpaid) {
        if (cancelled) return;
        await store.markUnpaid(id);
      }
      for (const row of plan.markPaid) {
        if (cancelled) return;
        await store.markPaid(row.id, row.amount);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hasConsent,
    user?.id,
    obligationChecklistMonth,
    selectedMonth,
    selectedYear,
    transactions,
  ]);

  const safetyPulse = useMemo(
    () =>
      computeMonthSafetyPulse({
        currentTxns: transactions,
        previousTxns: previousTransactions,
        fallbackIncome: profileMonthlyFromDb,
        monthIndex: selectedMonth,
        year: selectedYear,
      }),
    [
      transactions,
      previousTransactions,
      profileMonthlyFromDb,
      selectedMonth,
      selectedYear,
    ],
  );

  const deleteTransaction = useCallback(
    async (txn: TrackerTxn) => {
      if (!user?.id) return;
      try {
        await supabase
          .from("expense_transactions")
          .delete()
          .eq("id", txn.id)
          .eq("user_id", user.id);
        void fetchTransactions({ soft: true });

        const obligationCategory = obligationCategoryFromExpense(txn);
        if (
          obligationCategory &&
          obligationCategory !== "credit_card" &&
          (txn.subcategory || txn.category) !== "credit_card"
        ) {
          const store = useObligationStore.getState();
          await store.fetchChecklist(user.id, obligationChecklistMonth);
          const { checklist } = useObligationStore.getState();
          const paid = checklist.find(
            (c) =>
              c.status === "paid" &&
              expenseCoversChecklistItem(
                txn.amount,
                txn.description,
                obligationCategory,
                c,
              ),
          );
          if (paid) {
            const stillCovered = transactions.some(
              (t) =>
                t.id !== txn.id &&
                expenseCoversChecklistItem(
                  t.amount,
                  t.description,
                  obligationCategoryFromExpense(t),
                  paid,
                ),
            );
            if (!stillCovered) await store.markUnpaid(paid.id);
          }
        }
      } catch (e) {
        console.warn("tracker delete failed", e);
      }
    },
    [user?.id, fetchTransactions, transactions, obligationChecklistMonth],
  );

  const confirmDelete = (txn: TrackerTxn) => {
    Alert.alert("Remove this entry?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteTransaction(txn),
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions({ soft: false });
    setRefreshing(false);
  };

  // Save a changed smart budget to the account, so Analyse, the Fix Plan and
  // the PDF use the same split on every device. Runs after every render but
  // only writes when the learned split actually differs from the stored one.
  smartSyncRef.current = undefined;
  useEffect(() => {
    const next = smartSyncRef.current;
    if (next === undefined || !user?.id || !lastSubmission) return;
    if (sameSmartBudget(next, lastSubmission.smartBudget)) return;
    const result = setStoreSmartBudget(next);
    void saveUserAnalyseSnapshotSmartBudget(user.id, next, result);
  });

  if (hasConsent === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader />
        <LoadingSpinner full />
      </SafeAreaView>
    );
  }
  if (!hasConsent) {
    return <TrackerConsent onAccept={() => setHasConsent(true)} />;
  }

  const incomeTxns = transactions.filter((t) => t.bucket === "income");
  const monthlyIncome = incomeTxns.reduce((a, t) => a + Number(t.amount), 0);
  const incomeCat = TRACKER_CATEGORIES.income;
  const incomePlan = planMonthIncomeFromPrior({
    previousTxns: previousTransactions,
    currentTxns: transactions,
    profileSalary: profileMonthlyFromDb,
  });
  const displayIncome =
    incomePlan.displayTotal > 0
      ? incomePlan.displayTotal
      : monthlyIncome || profileMonthlyFromDb;

  // Lower Needs / Wants when the last 3 months stayed under them; the freed
  // share goes to Investment. A budget never drops below the monthly amount
  // from the Analyse form, which spreads yearly bills like school fees, so
  // the report never flags the user's own answers as over budget.
  const formActuals =
    analyseCompleted && lastSubmission
      ? getUniversalBucketActuals(lastSubmission)
      : null;
  const learnedCaps = learnCapsFromSpending(
    bucketCaps,
    displayIncome,
    learnHistory,
    formActuals ? { needs: formActuals.needs, wants: formActuals.wants } : {},
  );
  const storedSmartBudget =
    analyseCompleted && lastSubmission ? lastSubmission.smartBudget : null;
  // With Analyse done the choice lives on the account; otherwise on this device.
  const smartBudgetOn = storedSmartBudget
    ? storedSmartBudget.enabled
    : !smartBudgetOff;
  const effectiveCaps = smartBudgetOn ? learnedCaps.caps : bucketCaps;
  const isCurrentMonth =
    selectedMonth === new Date().getMonth() &&
    selectedYear === new Date().getFullYear();
  if (
    analyseCompleted &&
    isCurrentMonth &&
    learnHistoryFor === `${selectedYear}-${selectedMonth}`
  ) {
    smartSyncRef.current = buildSmartBudget(
      bucketCaps,
      learnedCaps,
      storedSmartBudget,
      !smartBudgetOff,
    );
  }
  const setSmartBudget = (on: boolean) => {
    setSmartBudgetOff(!on);
    if (on) syncKv.removeItem(SMART_BUDGET_OFF_KEY);
    else syncKv.setItem(SMART_BUDGET_OFF_KEY, "1");
    if (storedSmartBudget && user?.id) {
      const next = { ...storedSmartBudget, enabled: on };
      const result = setStoreSmartBudget(next);
      void saveUserAnalyseSnapshotSmartBudget(user.id, next, result);
    }
  };

  const totalSpent = sumCashSpend(transactions);
  const onCardsSpend = sumOnCardsSpend(transactions);
  const remaining = displayIncome - totalSpent;
  const spentPercent =
    displayIncome > 0 ? Math.min((totalSpent / displayIncome) * 100, 100) : 0;

  const now = new Date();
  const forwardLimit = trackerForwardLimit(now);
  const isAtForwardLimit =
    selectedMonth === forwardLimit.month && selectedYear === forwardLimit.year;
  const isAtBackLimit = trackerStart
    ? selectedMonth === trackerStart.month && selectedYear === trackerStart.year
    : false;
  const viewingCurrentMonth =
    selectedMonth === new Date().getMonth() &&
    selectedYear === new Date().getFullYear();
  const prevMeta = previousCalendarMonth(selectedMonth, selectedYear);

  const goToPrevMonth = () => {
    if (isAtBackLimit) return;
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (isAtForwardLimit) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const openSalaryEditor = () => {
    setExpandedIncome(true);
    setExpandedBucket(null);
    setDefaultBucket("income");
    const salaryTxn = incomeTxns.find(
      (t) => (t.subcategory || t.category) === "salary",
    );
    if (salaryTxn) {
      setSheetDefaults({});
      setEditingExpense(salaryTxn);
    } else {
      setEditingExpense(null);
      setSheetDefaults({
        subcategory: "salary",
        amount:
          incomePlan.salaryAmount > 0 ? incomePlan.salaryAmount : undefined,
        description: "Salary",
      });
    }
    setShowSheet(true);
  };

  const openAddIncome = () => {
    setExpandedIncome(true);
    setExpandedBucket(null);
    setDefaultBucket("income");
    setEditingExpense(null);
    const hasSalary = incomeTxns.some(
      (t) => (t.subcategory || t.category) === "salary",
    );
    if (hasSalary) {
      setSheetDefaults({
        subcategory: "other_income",
        amount: undefined,
        description: "",
      });
    } else {
      setSheetDefaults({
        subcategory: "salary",
        amount:
          incomePlan.salaryAmount > 0 ? incomePlan.salaryAmount : undefined,
        description: "Salary",
      });
    }
    setShowSheet(true);
  };

  const maxDate = localISODate(new Date(selectedYear, selectedMonth + 1, 0));
  const defaultDateForSheet = (() => {
    const today = new Date();
    if (
      today.getFullYear() === selectedYear &&
      today.getMonth() === selectedMonth
    ) {
      return localISODate(today);
    }
    if (
      selectedYear > today.getFullYear() ||
      (selectedYear === today.getFullYear() && selectedMonth > today.getMonth())
    ) {
      return localISODate(new Date(selectedYear, selectedMonth, 1));
    }
    return localISODate(new Date(selectedYear, selectedMonth + 1, 0));
  })();

  const onSheetSaved = (saved: SavedExpense) => {
    void fetchTransactions({ soft: true });
    if (pendingCcPayCardId && saved.amount != null) {
      setCcOptimisticPayments((prev) => [
        ...prev,
        { cardId: pendingCcPayCardId, amount: Number(saved.amount) || 0 },
      ]);
    }
    setPendingCcPayCardId(null);
    if (!saved.isEdit && user?.id && saved.bucket !== "income") {
      const subKey = (saved.subcategory || saved.category || "").trim();
      const obligationCategory = obligationCategoryFromExpense(saved);
      const isCcBillPay =
        subKey === "credit_card" || obligationCategory === "credit_card";
      if (!isCcBillPay) {
        void (async () => {
          const store = useObligationStore.getState();
          if (obligationCategory) {
            await store.fetchObligations(user.id);
            const { obligations } = useObligationStore.getState();
            const candidate = candidateFromExpense(
              saved.description || subKey.replace(/_/g, " "),
              saved.amount,
              obligationCategory,
            );
            const existing = obligations.find(
              (o) =>
                o.is_active &&
                (Math.abs(Number(o.amount) - saved.amount) < 1 ||
                  (o.category === obligationCategory &&
                    o.title.toLowerCase() === candidate.title.toLowerCase())),
            );
            if (!existing) {
              const decision = decideObligationLearn({
                description: saved.description,
                amount: saved.amount,
                category: obligationCategory,
                existing: obligations,
                priorTransactions: ccBillHistory,
              });
              const fromSub = Boolean(
                EXPENSE_SUBCATEGORY_TO_OBLIGATION[subKey],
              );
              const learn = shouldLearnObligationFromExpense({
                obligationCategory,
                decision,
                fromMappedSubcategory: fromSub,
              });
              if (learn === "add") {
                await store.addObligation({
                  title: candidate.title,
                  category: candidate.category,
                  amount: candidate.amount,
                  frequency: "monthly",
                  source: "tracker_learned",
                  user_id: user.id,
                  is_active: true,
                  remind_days_before: 7,
                });
              } else if (learn === "suggest") {
                setLearnedObligation(candidate);
              }
            }
          }
          await store.generateChecklist(user.id, obligationChecklistMonth);
          await store.fetchChecklist(user.id, obligationChecklistMonth);
          const { checklist } = useObligationStore.getState();
          const pending = findPendingChecklistForExpense(checklist, saved);
          if (pending) await store.markPaid(pending.id, saved.amount);
        })();
      }
    }
    setShowSheet(false);
    setDefaultBucket("");
    setSheetDefaults({});
    setEditingExpense(null);
  };

  const renderSummaryCard = (revealed: boolean) => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <Pressable
          onPress={goToPrevMonth}
          disabled={isAtBackLimit}
          style={[styles.navBtn, isAtBackLimit && { opacity: 0.4 }]}
        >
          <Text style={styles.navBtnText}>←</Text>
        </Pressable>
        <Text style={styles.monthTitle} numberOfLines={1}>
          {currentMonth} {currentYear}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <SectionPrivacyEye
            visible={revealed}
            onToggle={() => setAmountsVisible((v) => !v)}
            light
          />
          <Pressable
            onPress={goToNextMonth}
            disabled={isAtForwardLimit}
            style={[styles.navBtn, isAtForwardLimit && { opacity: 0.4 }]}
          >
            <Text style={styles.navBtnText}>→</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <Pressable onPress={openSalaryEditor} style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>INCOME</Text>
          <Text
            style={[styles.summaryValue, styles.underline]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMasked(displayIncome, revealed)}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>SPENT</Text>
          <Text
            style={[
              styles.summaryValue,
              totalSpent > displayIncome && { color: "#FFB3B3" },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMasked(totalSpent, revealed)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>LEFT</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: remaining < 0 ? "#FFB3B3" : "#B3FFD9" },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {revealed
              ? `₹${Math.abs(remaining).toLocaleString("en-IN")}${remaining < 0 ? " over" : ""}`
              : "₹••••••"}
          </Text>
        </View>
      </View>

      {onCardsSpend > 0 ? (
        <Text style={styles.onCardsText} numberOfLines={1}>
          On cards this month:{" "}
          {revealed
            ? `₹${Math.round(onCardsSpend).toLocaleString("en-IN")}`
            : "₹••••"}
        </Text>
      ) : null}

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Cash budget used</Text>
        <Text style={styles.progressLabel}>
          {revealed ? `${spentPercent.toFixed(0)}%` : "••%"}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: revealed ? `${spentPercent}%` : "0%",
              backgroundColor:
                spentPercent > 90
                  ? "#FF6B6B"
                  : spentPercent > 70
                    ? "#FFD93D"
                    : "#6BCB77",
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Summary card — flips like a coin to reveal amounts (PWA parity). */}
        <View>
          <Animated.View
            pointerEvents={amountsVisible ? "none" : "auto"}
            style={[
              styles.flipFace,
              {
                opacity: flip.interpolate({
                  inputRange: [0, 0.5, 0.5001, 1],
                  outputRange: [1, 1, 0, 0],
                }),
                transform: [
                  { perspective: 1000 },
                  {
                    rotateY: flip.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            {renderSummaryCard(false)}
          </Animated.View>
          <Animated.View
            pointerEvents={amountsVisible ? "auto" : "none"}
            style={[
              styles.flipFace,
              styles.flipBack,
              {
                opacity: flip.interpolate({
                  inputRange: [0, 0.4999, 0.5, 1],
                  outputRange: [0, 0, 1, 1],
                }),
                transform: [
                  { perspective: 1000 },
                  {
                    rotateY: flip.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["180deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            {renderSummaryCard(true)}
          </Animated.View>
        </View>

        <View style={styles.toolbarRow}>
          <Pressable
            onPress={() =>
              router.push(
                `/tracker/${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`,
              )
            }
            accessibilityRole="link"
            style={styles.allTxnLink}
          >
            <Text style={styles.allTxnText}>All transactions →</Text>
          </Pressable>
          <Pressable onPress={toggleShowAll} style={styles.showAllBtn}>
            <EyeIcon open={allVisible} size={14} color={Colors.primary} />
            <Text style={styles.showAllText}>
              {allVisible ? "Hide all" : "Show all"}
            </Text>
          </Pressable>
        </View>

        {loading ? <LoadingSpinner /> : null}

        {/* Income section */}
        <View
          style={[
            styles.sectionCard,
            { borderColor: expandedIncome ? incomeCat.color : Colors.border },
          ]}
        >
          <Pressable
            onPress={() => {
              setExpandedIncome((open) => {
                const next = !open;
                if (next) setExpandedBucket(null);
                return next;
              });
            }}
            style={styles.sectionHead}
          >
            <View style={styles.sectionHeadLeft}>
              <TrackerIconBadge name={incomeCat.icon} color={incomeCat.color} />
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.sectionTitle}>{incomeCat.label}</Text>
                <Text style={styles.sectionSub}>
                  {incomeTxns.length}{" "}
                  {incomeTxns.length === 1 ? "entry" : "entries"}
                  {listSavingsCarryForward(incomeTxns).length > 0 ||
                  incomePlan.needsSavingsRow
                    ? " · includes saving from last month"
                    : monthlyIncome === 0 && profileMonthlyFromDb > 0
                      ? " · synced from profile"
                      : ""}
                </Text>
              </View>
            </View>
            <View style={styles.sectionHeadRight}>
              <Text style={styles.sectionAmount}>
                {formatMasked(displayIncome, isSectionVisible("income"))}
              </Text>
              <Text style={styles.chevron}>{expandedIncome ? "▾" : "▸"}</Text>
              <SectionPrivacyEye
                visible={isSectionVisible("income")}
                onToggle={() => toggleSectionVisible("income")}
              />
            </View>
          </Pressable>

          {expandedIncome ? (
            <View style={styles.sectionBody}>
              {incomeTxns.length > 0 ? (
                incomeTxns.map((txn) => {
                  const sub = findSubcategory(
                    "income",
                    txn.subcategory ?? txn.category,
                  );
                  return (
                    <View key={txn.id} style={styles.txnRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.txnAmount}>
                          {formatMasked(
                            Number(txn.amount),
                            isSectionVisible("income"),
                          )}
                        </Text>
                        <Text style={styles.txnMeta} numberOfLines={1}>
                          {sub?.label ?? txn.category} ·{" "}
                          {[
                            txn.description?.trim(),
                            formatExpenseDate(txn.date),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Pressable
                          onPress={() => {
                            setSheetDefaults({});
                            setDefaultBucket("income");
                            setEditingExpense(txn);
                            setShowSheet(true);
                          }}
                          hitSlop={6}
                        >
                          <Text style={styles.editLink}>Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDelete(txn)}
                          hitSlop={6}
                        >
                          <Text style={styles.deleteLink}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>
                  No income logged this month. Tap Add income to get started.
                </Text>
              )}
              <Pressable onPress={openAddIncome} style={styles.addBtn}>
                <Text style={[styles.addBtnText, { color: incomeCat.color }]}>
                  + Add income
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Bucket sections */}
        {learnedCaps.adjustments.length > 0 ? (
          <SmartBudgetNote
            adjustments={learnedCaps.adjustments}
            on={smartBudgetOn}
            onToggle={setSmartBudget}
          />
        ) : null}

        {BUCKETS.map((bucketKey) => {
          const cat = TRACKER_CATEGORIES[bucketKey];
          const bucketTxns = transactions.filter((t) => t.bucket === bucketKey);
          const bucketTotal = bucketTxns
            .filter((t) => countsTowardTrackerTotals(t))
            .reduce((a, t) => a + Number(t.amount), 0);
          const isExpanded = expandedBucket === bucketKey;
          const capPct =
            bucketKey in effectiveCaps
              ? Math.round(
                  effectiveCaps[bucketKey as keyof typeof effectiveCaps] * 100,
                )
              : cat.cap;
          const budgetAmount =
            displayIncome > 0 ? displayIncome * (capPct / 100) : 0;
          // Investment is a target to reach, not a limit — going over is good.
          const isTargetBucket = bucketKey === "investment";
          const overBudget =
            !isTargetBucket && budgetAmount > 0 && bucketTotal > budgetAmount;
          const progressPercent =
            budgetAmount > 0
              ? Math.min((bucketTotal / budgetAmount) * 100, 100)
              : 0;
          const bySubcategory: Record<string, TrackerTxn[]> = {};
          for (const t of bucketTxns) {
            const key = t.subcategory || "other";
            if (!bySubcategory[key]) bySubcategory[key] = [];
            bySubcategory[key].push(t);
          }
          const visible = isSectionVisible(bucketKey);

          return (
            <View
              key={bucketKey}
              style={[
                styles.sectionCard,
                {
                  borderColor: isExpanded
                    ? cat.color
                    : overBudget
                      ? "#FCEBEB"
                      : Colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  if (isExpanded) {
                    setExpandedBucket(null);
                    return;
                  }
                  setExpandedIncome(false);
                  setExpandedBucket(bucketKey);
                }}
                style={styles.sectionHeadWrap}
              >
                <View style={styles.sectionHead}>
                  <View style={styles.sectionHeadLeft}>
                    <TrackerIconBadge name={cat.icon} color={cat.color} />
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.sectionTitle}>{cat.label}</Text>
                      <Text style={styles.sectionSub}>
                        {bucketTxns.length} items
                        {capPct > 0 ? ` · ${capPct}% budget` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sectionHeadRight}>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.sectionAmount,
                          overBudget && { color: Colors.error },
                        ]}
                      >
                        {formatMasked(bucketTotal, visible)}
                      </Text>
                      {budgetAmount > 0 ? (
                        <Text style={styles.budgetOf}>
                          of {formatMasked(budgetAmount, visible)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.chevron}>{isExpanded ? "▾" : "▸"}</Text>
                    <SectionPrivacyEye
                      visible={visible}
                      onToggle={() => toggleSectionVisible(bucketKey)}
                    />
                  </View>
                </View>
                {budgetAmount > 0 ? (
                  <View style={styles.bucketProgressTrack}>
                    <View
                      style={[
                        styles.bucketProgressFill,
                        {
                          width: visible ? `${progressPercent}%` : "0%",
                          backgroundColor: isTargetBucket
                            ? cat.color
                            : progressPercent >= 100
                              ? "#E24B4A"
                              : progressPercent >= 80
                                ? "#BA7517"
                                : cat.color,
                        },
                      ]}
                    />
                  </View>
                ) : null}
                {overBudget ? (
                  <Text style={styles.overBudgetText}>
                    Over budget by{" "}
                    {formatMasked(bucketTotal - budgetAmount, visible)}
                  </Text>
                ) : null}
              </Pressable>

              {isExpanded ? (
                <View style={styles.sectionBody}>
                  <Pressable
                    onPress={() => {
                      setSheetDefaults({});
                      setDefaultBucket(bucketKey);
                      setEditingExpense(null);
                      setShowSheet(true);
                    }}
                    style={[
                      styles.addBtn,
                      {
                        borderColor: cat.color,
                        backgroundColor: `${cat.color}15`,
                      },
                    ]}
                  >
                    <Text style={[styles.addBtnText, { color: cat.color }]}>
                      {bucketKey === "investment"
                        ? "+ Add savings"
                        : "+ Add expense"}{" "}
                      · {cat.label}
                    </Text>
                  </Pressable>

                  {Object.keys(bySubcategory).length > 0 ? (
                    Object.entries(bySubcategory).map(([subId, txns]) => {
                      const subTotal = txns
                        .filter((t) => countsTowardTrackerTotals(t))
                        .reduce((a, t) => a + Number(t.amount), 0);
                      const sub = findSubcategory(bucketKey, subId);
                      return (
                        <View key={subId} style={styles.subGroup}>
                          <View style={styles.subHead}>
                            <TrackerIcon
                              name={sub?.icon ?? "other"}
                              size={18}
                              color={cat.color}
                            />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.subLabel}>
                                {sub?.label || subId}
                              </Text>
                              <Text style={styles.subMeta}>
                                {txns.length}{" "}
                                {txns.length === 1
                                  ? "transaction"
                                  : "transactions"}
                              </Text>
                            </View>
                            <Text style={styles.subTotal}>
                              {formatMasked(subTotal, visible)}
                            </Text>
                          </View>
                          {txns.map((txn) => {
                            const onCard = isCreditCardPaymentMethod(
                              txn.payment_method,
                            );
                            return (
                              <View key={txn.id} style={styles.txnRow}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <Text style={styles.txnAmount}>
                                      {formatMasked(
                                        Number(txn.amount),
                                        visible,
                                      )}
                                    </Text>
                                    {onCard ? (
                                      <View style={styles.cardChip}>
                                        <Text style={styles.cardChipText}>
                                          Card
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                  <Text
                                    style={styles.txnMeta}
                                    numberOfLines={1}
                                  >
                                    {[
                                      displayExpenseDescription(
                                        txn.description,
                                      ),
                                      formatExpenseDate(txn.date),
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: "row", gap: 4 }}>
                                  <Pressable
                                    onPress={() => {
                                      setSheetDefaults({});
                                      setEditingExpense(txn);
                                      setShowSheet(true);
                                    }}
                                    hitSlop={6}
                                  >
                                    <Text style={styles.editLink}>Edit</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => confirmDelete(txn)}
                                    hitSlop={6}
                                  >
                                    <Text style={styles.deleteLink}>
                                      Delete
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>
                      No {cat.label.toLowerCase()} expenses this month
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}

        <MonthSafetyPulse
          pulse={safetyPulse}
          previousMonthLabel={prevMeta.monthName}
          forceVisible={allVisible}
        >
          {(viewingCurrentMonth || isAtForwardLimit) &&
          (savedCards.length > 0 ||
            ccBillHistory.some((t) =>
              isCreditCardPaymentMethod(t.payment_method),
            ) ||
            previousTransactions.some((t) =>
              isCreditCardPaymentMethod(t.payment_method),
            ) ||
            transactions.some(
              (t) =>
                (t.bucket === "loans" && t.subcategory === "credit_card") ||
                isCreditCardPaymentMethod(t.payment_method),
            )) ? (
            <CreditCardDues
              previousTransactions={ccBillHistory}
              currentTransactions={transactions}
              cards={savedCards}
              monthlySalary={displayIncome}
              optimisticPayments={ccOptimisticPayments}
              asOf={obligationChecklistMonth}
              onCardsChange={() => {
                if (!user?.id) return;
                void loadCreditCardsMerged(user.id).then(setSavedCards);
              }}
              onPayBill={(amount, label, cardId) => {
                setEditingExpense(null);
                setPendingCcPayCardId(cardId);
                setDefaultBucket("loans");
                setSheetDefaults({
                  subcategory: "credit_card",
                  amount,
                  description: creditCardBillPaymentDescription(label, cardId),
                  paymentMethod: "upi",
                });
                setShowSheet(true);
              }}
            />
          ) : null}
          {user?.id ? (
            <ObligationsChecklist
              userId={user.id}
              checklistMonth={obligationChecklistMonth}
              analyseCompleted={analyseCompleted}
              learnedSuggestion={learnedObligation}
              onDismissLearn={() => setLearnedObligation(null)}
            />
          ) : null}
        </MonthSafetyPulse>
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => {
          setEditingExpense(null);
          setDefaultBucket("");
          setSheetDefaults({});
          setShowSheet(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <AddExpenseSheet
        visible={showSheet}
        onClose={() => {
          setShowSheet(false);
          setEditingExpense(null);
          setSheetDefaults({});
          setDefaultBucket("");
          setPendingCcPayCardId(null);
        }}
        onSaved={onSheetSaved}
        defaultDate={defaultDateForSheet}
        maxDate={maxDate}
        defaultBucket={
          editingExpense ? editingExpense.bucket : defaultBucket || undefined
        }
        defaultSubcategory={
          editingExpense ? undefined : sheetDefaults.subcategory
        }
        defaultAmount={editingExpense ? undefined : sheetDefaults.amount}
        defaultDescription={
          editingExpense ? undefined : sheetDefaults.description
        }
        defaultPaymentMethod={
          editingExpense ? undefined : sheetDefaults.paymentMethod
        }
        editExpense={editingExpense}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flipFace: { backfaceVisibility: "hidden" },
  flipBack: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadow.strong,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  summaryValue: { fontSize: FontSize.lg, fontWeight: "800", color: "#fff" },
  underline: { textDecorationLine: "underline" },
  onCardsText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  allTxnLink: { minHeight: 44, justifyContent: "center" },
  allTxnText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  showAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F9F9FC",
  },
  showAllText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  sectionCard: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  sectionHeadWrap: { padding: Spacing.lg },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sectionHeadRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionAmount: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  budgetOf: { fontSize: 11, color: Colors.textSecondary },
  chevron: { fontSize: 14, color: Colors.textSecondary },
  bucketProgressTrack: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 6,
  },
  bucketProgressFill: { height: "100%", borderRadius: 3 },
  smartNote: {
    backgroundColor: "#E1F5EE",
    borderColor: "#BFE6D6",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  smartNoteTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#085041",
    marginBottom: 4,
  },
  smartNoteText: { fontSize: 13, color: "#085041", lineHeight: 19 },
  smartNoteAction: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#534AB7",
  },
  overBudgetText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  addBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  addBtnText: { fontSize: 13, fontWeight: "700" },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    padding: Spacing.lg,
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9F9FC",
    borderRadius: 8,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  txnAmount: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  txnMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  editLink: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
    padding: 6,
  },
  deleteLink: {
    color: Colors.error,
    fontWeight: "700",
    fontSize: 13,
    padding: 6,
  },
  subGroup: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  subHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: Spacing.sm,
  },
  subLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
  subMeta: { fontSize: 12, color: Colors.textSecondary },
  subTotal: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  cardChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  cardChipText: { fontSize: 10, fontWeight: "700", color: Colors.primary },
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
  fabText: { fontSize: 28, color: "#fff", fontWeight: "300", lineHeight: 30 },
});
