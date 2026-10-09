"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import FeedbackWidget from "@/components/FeedbackWidget";
import AddExpenseModal from "@/components/tracker/AddExpenseModal";
import CreditCardBillReminder from "@/components/tracker/CreditCardBillReminder";
import MonthSafetyPulse from "@/components/tracker/MonthSafetyPulse";
import ObligationsChecklist from "@/components/tracker/ObligationsChecklist";
// import PurpleCashAudit from "@/components/tracker/PurpleCashAudit";
import TrackerConsent from "@/components/tracker/TrackerConsent";
import {
  TRACKER_CATEGORIES,
  countsTowardTrackerTotals,
  findSubcategory,
  normalizeTrackerBucket,
} from "@/lib/tracker-categories";
import { getUniversalCaps } from "@/lib/universal-buckets";
import {
  TrackerIconBadge,
  TrackerIcon,
} from "@/components/tracker/TrackerIcons";
import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { Analytics } from "@/lib/analytics";
import {
  formatExpenseDate,
  localISODate,
  msUntilNextLocalMidnight,
} from "@/lib/localDate";
import { getSupabase } from "@/lib/supabase";
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
import { buildCashAudit, logCashAudit } from "@/lib/trackerCashAudit";
import {
  countsTowardCashSpend,
  creditCardBillPaymentDescription,
  displayExpenseDescription,
  hasTrackerConsentLocal,
  isCreditCardBillPayment,
  isCreditCardPaymentMethod,
  loadCreditCardsMerged,
  parsePayBillLabel,
  setTrackerConsentLocal,
  sumCashSpend,
  sumOnCardsSpend,
  type SavedCreditCard,
} from "@/lib/trackerCreditCards";
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
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useObligationStore } from "@/store/obligationStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TrackerTransaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  subcategory: string | null;
  description: string | null;
  bucket: string;
  payment_method: string | null;
};

function formatMaskedAmount(n: number, visible: boolean) {
  return visible ? `₹${Math.abs(n).toLocaleString("en-IN")}` : "₹••••••";
}

function SectionPrivacyEye({
  visible,
  onToggle,
  label,
}: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={visible ? `Hide ${label} amounts` : `Show ${label} amounts`}
      title={visible ? "Hide amounts" : "Show amounts"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "1px solid #E8E6F0",
        background: "#F9F9FC",
        color: "#534AB7",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {visible ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function TrackerContent() {
  const user = useAuthStore((s) => s.user);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const analyseResult = useFinancialStore((s) => s.result);
  const analyseCompleted = Boolean(lastSubmission && analyseResult);
  // Budget caps follow the Analyse answers once they exist; otherwise the generic split.
  const bucketCaps = useMemo(
    () =>
      getUniversalCaps(
        analyseCompleted && lastSubmission ? lastSubmission : {},
      ),
    [analyseCompleted, lastSubmission],
  );
  const [hasConsent, setHasConsent] = useState<boolean | null>(() => {
    try {
      if (typeof window !== "undefined" && hasTrackerConsentLocal()) {
        return true;
      }
    } catch {
      /* ignore */
    }
    return null;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<TrackerTransaction | null>(null);
  const [transactions, setTransactions] = useState<TrackerTransaction[]>([]);
  const [previousTransactions, setPreviousTransactions] = useState<
    TrackerTransaction[]
  >([]);
  /** Extra prior months for CC unpaid carry-forward (not used by Safety Pulse). */
  const [ccBillHistory, setCcBillHistory] = useState<TrackerTransaction[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCreditCard[]>([]);
  /** Prefer showing the UI shell immediately; soft fetches never blank it. */
  const [loading, setLoading] = useState(false);
  const [expandedBucket, setExpandedBucket] = useState<string | null>("");
  const [expandedIncome, setExpandedIncome] = useState(false);
  const [defaultBucket, setDefaultBucket] = useState<string>("");
  const [modalDefaults, setModalDefaults] = useState<{
    subcategory?: string;
    amount?: number;
    description?: string;
    paymentMethod?: string;
  }>({});
  /** Card id for in-flight Pay from dues → marks Paid after save. */
  const [pendingCcPayCardId, setPendingCcPayCardId] = useState<string | null>(
    null,
  );
  const [ccOptimisticPayments, setCcOptimisticPayments] = useState<
    Array<{ cardId: string; amount: number }>
  >([]);
  const [learnedObligation, setLearnedObligation] = useState<{
    title: string;
    category: string;
    amount: number;
  } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  /** First calendar month the user has tracker activity — nav cannot go earlier. */
  const [trackerStart, setTrackerStart] = useState<{
    month: number;
    year: number;
  } | null>(null);
  const [profileMonthlyFromDb, setProfileMonthlyFromDb] = useState(0);
  /** Summary-card eye only (180° flip). Each Income/bucket section has its own eye. */
  const [amountsVisible, setAmountsVisible] = useState(false);
  const [sectionAmountsVisible, setSectionAmountsVisible] = useState<
    Record<string, boolean>
  >({});
  const currentMonth = new Date(selectedYear, selectedMonth, 1).toLocaleString(
    "en-IN",
    { month: "long" },
  );
  const currentYear = selectedYear;

  const isSectionVisible = (key: string) => sectionAmountsVisible[key] === true;
  const toggleSectionVisible = (key: string) => {
    setSectionAmountsVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAmountsVisible = () => {
    setAmountsVisible((v) => !v);
  };

  /** Master privacy switch: reveal/hide the summary card + every section at once. */
  const privacySectionKeys = [
    "income",
    "needs",
    "wants",
    "habits",
    "security",
    "loans",
    "investment",
  ] as const;
  const allAmountsVisible =
    amountsVisible &&
    privacySectionKeys.every((k) => sectionAmountsVisible[k] === true);
  const toggleShowAll = () => {
    const next = !allAmountsVisible;
    setAmountsVisible(next);
    setSectionAmountsVisible(() => {
      const rec: Record<string, boolean> = {};
      for (const k of privacySectionKeys) rec[k] = next;
      return rec;
    });
  };
  const fetchReqId = useRef(0);
  /** Hard fetches that are still in flight — soft must not clear the spinner early. */
  const hardInFlight = useRef(0);
  const selectedCalRef = useRef({ month: selectedMonth, year: selectedYear });
  selectedCalRef.current = { month: selectedMonth, year: selectedYear };
  const clockCalRef = useRef({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  // When analyse is done, keep obligations in sync with health-check data.
  useEffect(() => {
    if (!user?.id || !analyseCompleted || !lastSubmission) return;
    void useObligationStore
      .getState()
      .syncFromHealthCheck(user.id, lastSubmission)
      .catch(() => {});
  }, [user?.id, analyseCompleted, lastSubmission]);

  // Follow the device calendar when the user is on "this month" past midnight.
  useEffect(() => {
    let midnightTimer = 0;
    const syncCalendar = () => {
      const now = new Date();
      const nextMonth = now.getMonth();
      const nextYear = now.getFullYear();
      const prevClock = clockCalRef.current;
      if (prevClock.month === nextMonth && prevClock.year === nextYear) {
        window.clearTimeout(midnightTimer);
        midnightTimer = window.setTimeout(
          syncCalendar,
          msUntilNextLocalMidnight(),
        );
        return;
      }
      const { month: m, year: y } = selectedCalRef.current;
      const followingClock = m === prevClock.month && y === prevClock.year;
      clockCalRef.current = { month: nextMonth, year: nextYear };
      if (followingClock) {
        setSelectedMonth(nextMonth);
        setSelectedYear(nextYear);
      }
      window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(
        syncCalendar,
        msUntilNextLocalMidnight(),
      );
    };
    syncCalendar();
    const onVis = () => {
      if (document.visibilityState === "visible") syncCalendar();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", syncCalendar);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", syncCalendar);
      window.clearTimeout(midnightTimer);
    };
  }, []);

  // If next month was open before unlock day, snap back to the allowed limit.
  useEffect(() => {
    const limit = trackerForwardLimit();
    const selectedKey = selectedYear * 12 + selectedMonth;
    const limitKey = limit.year * 12 + limit.month;
    if (selectedKey <= limitKey) return;
    setSelectedMonth(limit.month);
    setSelectedYear(limit.year);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    // Already known from localStorage — skip the DB round-trip flash.
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
        const supabase = getSupabase();
        const { data } = await supabase
          .from("tracker_consent")
          .select("consent_given, consent_version")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.consent_given && data.consent_version === "v2") {
          setTrackerConsentLocal();
          setHasConsent(true);
        } else {
          // v1 (or missing version) must re-accept updated card-storage disclaimer
          setHasConsent(false);
        }
      } catch {
        setHasConsent(false);
      }
    };

    void checkDB();
  }, [user?.id, hasConsent]);

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
  }, [hasConsent, user?.id, showAddModal]);

  const fetchTransactions = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!hasConsent) return;
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const myId = ++fetchReqId.current;
      // Soft by default so navigating back to Tracker never blanks the UI.
      const soft = opts?.soft !== false;
      if (!soft) {
        hardInFlight.current += 1;
        setLoading(true);
      }
      try {
        const supabase = getSupabase();
        const prev = previousCalendarMonth(selectedMonth, selectedYear);
        const prev2 = previousCalendarMonth(prev.monthIndex, prev.year);

        const [currentRes, prevRes, prev2Res] = await Promise.all([
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
        ]);

        if (fetchReqId.current !== myId) return;
        if (currentRes.error)
          console.warn("tracker fetch:", currentRes.error.message);
        if (prevRes.error)
          console.warn("tracker prev fetch:", prevRes.error.message);
        const prevRows = ((prevRes.data as TrackerTransaction[]) || []).map(
          normalizeTrackerBucket,
        );
        const prev2Rows = ((prev2Res.data as TrackerTransaction[]) || []).map(
          normalizeTrackerBucket,
        );
        setTransactions(
          ((currentRes.data as TrackerTransaction[]) || []).map(
            normalizeTrackerBucket,
          ),
        );
        setPreviousTransactions(prevRows);
        setCcBillHistory([...prev2Rows, ...prevRows]);
      } catch (e) {
        if (fetchReqId.current !== myId) return;
        console.warn("tracker fetch failed", e);
        setTransactions([]);
        setPreviousTransactions([]);
        setCcBillHistory([]);
      } finally {
        if (!soft) {
          hardInFlight.current = Math.max(0, hardInFlight.current - 1);
        }
        if (hardInFlight.current === 0) {
          if (fetchReqId.current === myId || !soft) {
            setLoading(false);
          }
        }
      }
    },
    [
      user?.id,
      hasConsent,
      currentMonth,
      currentYear,
      selectedMonth,
      selectedYear,
    ],
  );

  useEffect(() => {
    // Safety: clear sticky body lock if a modal remount was interrupted (PWA idle).
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    if (hasConsent) void fetchTransactions({ soft: true });
  }, [hasConsent, fetchTransactions]);

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
          // Any loans → credit_card cash pay after a Pay CTA (covers orphan "Credit card")
          if (
            t.bucket === "loans" &&
            (t.subcategory === "credit_card" || t.category === "credit_card") &&
            Math.abs(Number(t.amount) - p.amount) < 0.02
          ) {
            return true;
          }
          return false;
        });
      }),
    );
  }, [transactions, ccBillHistory, ccOptimisticPayments.length]);

  // DevTools: dump every tracker row + purple SPENT/LEFT breakdown on each load.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!hasConsent) return;

    console.group(
      `[Tracker] ${currentMonth} ${currentYear} — ${transactions.length} row(s)`,
    );
    console.table(
      transactions.map((t) => ({
        date: t.date,
        amount: Number(t.amount),
        bucket: t.bucket,
        subcategory: t.subcategory,
        payment: t.payment_method,
        inPurpleSpent: countsTowardCashSpend(t),
        description: t.description,
        id: t.id,
      })),
    );
    logCashAudit(
      buildCashAudit({
        transactions,
        profileMonthlyIncome: profileMonthlyFromDb,
      }),
      `${currentMonth} ${currentYear} purple cash`,
    );
    console.groupEnd();
  }, [
    hasConsent,
    transactions,
    currentMonth,
    currentYear,
    profileMonthlyFromDb,
  ]);

  useEffect(() => {
    if (!hasConsent) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSoftFetchAt = 0;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Soft refresh — full loading teardown breaks PWA "Add expense" taps after a few entries.
      if (showAddModal) return;
      // Avoid stacking fetches on resume (auth refresh + visibility) after idle.
      const now = Date.now();
      if (now - lastSoftFetchAt < 8000) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        lastSoftFetchAt = Date.now();
        void fetchTransactions({ soft: true });
      }, 400);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [hasConsent, fetchTransactions, showAddModal]);

  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    let cancelled = false;
    const supabase = getSupabase();
    void (async () => {
      const v = await getProfileMonthlySalaryCached(supabase, user.id);
      if (!cancelled) setProfileMonthlyFromDb(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasConsent, user?.id]);

  // Tracker back-nav floor: consent month (when they started), else first txn month.
  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabase();
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
        const row = txnRes.data;
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

        // Prefer consent month so auto-seeded junk before they started is skipped.
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

  // If current selection is before tracker start, snap forward.
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
  // Re-fetches before insert to avoid duplicate rows from Strict Mode / races.
  const incomeSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasConsent || !user?.id) return;
    if (!monthHasStarted(selectedMonth, selectedYear)) return;
    // Never auto-seed months before the user started using the tracker.
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
        const supabase = getSupabase();
        const monthName = new Date(
          selectedYear,
          selectedMonth,
          1,
        ).toLocaleString("en-IN", { month: "long" });
        const date = localISODate(new Date(selectedYear, selectedMonth, 1));

        // Fresh read so parallel effects don't both insert.
        const { data: fresh, error: freshErr } = await supabase
          .from("expense_transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", monthName)
          .eq("year", selectedYear);
        if (freshErr) {
          console.warn("month income sync read failed:", freshErr.message);
          incomeSyncKeyRef.current = null;
          return;
        }
        if (cancelled) return;

        const freshRows = (fresh || []) as TrackerTransaction[];
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

        // One salary + one CF at the correct leftover — drop extras / fix amount.
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

        // Recompute after cleanup so we don't re-insert rows we just fixed.
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
            console.warn("month income sync failed:", error.message);
            incomeSyncKeyRef.current = null;
            return;
          }
        }
        if (!cancelled && (cleanup.needsWork || rows.length > 0)) {
          void fetchTransactions({ soft: true });
        }
      } catch (e) {
        console.warn("month income sync failed:", e);
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

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      if (!window.confirm("Remove this entry?")) return;
      const txn = transactions.find((t) => t.id === id);
      try {
        const supabase = getSupabase();
        await supabase
          .from("expense_transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        void fetchTransactions({ soft: true });

        // If this expense had ticked an obligation, clear ✓ when nothing else covers it.
        // Credit card bill pays never sync to obligations.
        const obligationCategory = txn
          ? obligationCategoryFromExpense(txn)
          : null;
        if (
          txn &&
          obligationCategory &&
          obligationCategory !== "credit_card" &&
          (txn.subcategory || txn.category) !== "credit_card"
        ) {
          const checklistMonth = new Date(selectedYear, selectedMonth, 1);
          const store = useObligationStore.getState();
          await store.fetchChecklist(user.id, checklistMonth);
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
                t.id !== id &&
                expenseCoversChecklistItem(
                  t.amount,
                  t.description,
                  obligationCategoryFromExpense(t),
                  paid,
                ),
            );
            if (!stillCovered) {
              await store.markUnpaid(paid.id);
            }
          }
        }
      } catch (e) {
        console.warn("tracker delete failed", e);
      }
    },
    [user?.id, fetchTransactions, transactions, selectedMonth, selectedYear],
  );

  const obligationChecklistMonth = useMemo(
    () => new Date(selectedYear, selectedMonth, 1),
    [selectedYear, selectedMonth],
  );

  // Keep obligation ✓ in sync with real expenses (unmark when Loans etc. empty).
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

  const prevMeta = previousCalendarMonth(selectedMonth, selectedYear);
  const viewingCurrentMonth =
    selectedMonth === new Date().getMonth() &&
    selectedYear === new Date().getFullYear();
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

  if (hasConsent === null) {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  if (!hasConsent) {
    return <TrackerConsent onAccept={() => setHasConsent(true)} />;
  }

  const bucketTotals = transactions.reduce(
    (acc, t) => {
      if (!countsTowardTrackerTotals(t)) return acc;
      acc[t.bucket] = (acc[t.bucket] || 0) + Number(t.amount);
      return acc;
    },
    {} as Record<string, number>,
  );

  const incomeTxns = transactions.filter((t) => t.bucket === "income");
  const monthlyIncome = incomeTxns.reduce((a, t) => a + Number(t.amount), 0);
  const incomeCat = TRACKER_CATEGORIES.income;
  const incomePlan = planMonthIncomeFromPrior({
    previousTxns: previousTransactions,
    currentTxns: transactions,
    profileSalary: profileMonthlyFromDb,
  });
  // Purple + Income use the same total (logged + any planned carry-forward).
  const displayIncome =
    incomePlan.displayTotal > 0
      ? incomePlan.displayTotal
      : monthlyIncome || profileMonthlyFromDb;

  /**
   * Edit the main salary row (purple INCOME tap).
   * Only creates when no salary exists yet.
   */
  const openSalaryEditor = () => {
    setExpandedIncome(true);
    setExpandedBucket(null);
    setDefaultBucket("income");
    const salaryTxn = incomeTxns.find(
      (t) => (t.subcategory || t.category) === "salary",
    );
    if (salaryTxn) {
      setModalDefaults({});
      setEditingExpense(salaryTxn);
    } else {
      setEditingExpense(null);
      setModalDefaults({
        subcategory: "salary",
        amount:
          incomePlan.salaryAmount > 0 ? incomePlan.salaryAmount : undefined,
        description: "Salary",
      });
    }
    setShowAddModal(true);
  };

  /**
   * Always add a *new* income row (bonus, freelance, etc.).
   * Does not open the existing salary for edit — that was the bug.
   */
  const openAddIncome = () => {
    setExpandedIncome(true);
    setExpandedBucket(null);
    setDefaultBucket("income");
    setEditingExpense(null);
    const hasSalary = incomeTxns.some(
      (t) => (t.subcategory || t.category) === "salary",
    );
    if (hasSalary) {
      // Additional income on top of salary — never overwrite salary.
      setModalDefaults({
        subcategory: "other_income",
        amount: undefined,
        description: "",
      });
    } else {
      setModalDefaults({
        subcategory: "salary",
        amount:
          incomePlan.salaryAmount > 0 ? incomePlan.salaryAmount : undefined,
        description: "Salary",
      });
    }
    setShowAddModal(true);
  };
  // Purple SPENT/LEFT: cash leaving the account this month. Includes loan EMIs,
  // investments, loan repayment, and CC bill pays (UPI/netbanking). Excludes
  // only expenses paid *with* a credit card. Obligations are not expenses.
  const totalSpent = sumCashSpend(transactions);
  const onCardsSpend = sumOnCardsSpend(transactions);
  const remaining = displayIncome - totalSpent;
  const spentPercent =
    displayIncome > 0 ? Math.min((totalSpent / displayIncome) * 100, 100) : 0;
  const now = new Date();
  // Next month unlocks only on/after the last Friday of the current month.
  const forwardLimit = trackerForwardLimit(now);
  const isAtForwardLimit =
    selectedMonth === forwardLimit.month && selectedYear === forwardLimit.year;
  const isAtBackLimit = trackerStart
    ? selectedMonth === trackerStart.month && selectedYear === trackerStart.year
    : false;
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
  const buckets = [
    "needs",
    "wants",
    "habits",
    "security",
    "loans",
    "investment",
  ] as const;
  const incomeVisible = isSectionVisible("income");

  const summaryCardInner = (visible: boolean) => (
    <div
      style={{
        background: "linear-gradient(135deg, #534AB7 0%, #3C3489 100%)",
        borderRadius: 20,
        padding: "20px 16px",
        color: "white",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={isAtBackLimit}
          aria-label="Previous month"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: 8,
            width: 36,
            height: 36,
            color: "white",
            cursor: isAtBackLimit ? "not-allowed" : "pointer",
            fontSize: 16,
            flexShrink: 0,
            opacity: isAtBackLimit ? 0.5 : 1,
          }}
        >
          ←
        </button>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
            textAlign: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          {currentMonth} {currentYear}
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={toggleAmountsVisible}
            aria-label={visible ? "Hide amounts" : "Show amounts"}
            title={visible ? "Hide amounts" : "Show amounts"}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              width: 36,
              height: 36,
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            {visible ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 3l18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.5 10.5 0 0121 12c-.6 1.1-1.4 2.1-2.3 3M6.1 6.1C4.5 7.4 3.3 9.1 2.5 11c2.2 4.5 6.5 7 9.5 7 1.4 0 2.8-.4 4.1-1.1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2.5 12C4.7 7.5 8.5 5 12 5s7.3 2.5 9.5 7c-2.2 4.5-6 7-9.5 7s-7.3-2.5-9.5-7z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={isAtForwardLimit}
            aria-label="Next month"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              width: 36,
              height: 36,
              color: "white",
              cursor: isAtForwardLimit ? "not-allowed" : "pointer",
              fontSize: 16,
              opacity: isAtForwardLimit ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={openSalaryEditor}
          aria-label="Edit salary"
          title="Edit salary"
          style={{
            minWidth: 0,
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
            INCOME
          </div>
          <div
            style={{
              fontSize: "clamp(13px, 3.6vw, 18px)",
              fontWeight: 800,
              letterSpacing: visible ? "normal" : "0.06em",
              overflowWrap: "anywhere",
              textDecoration: "underline",
              textDecorationColor: "rgba(255,255,255,0.35)",
              textUnderlineOffset: 3,
            }}
          >
            {visible ? `₹${displayIncome.toLocaleString("en-IN")}` : "₹••••••"}
          </div>
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
            SPENT
          </div>
          <div
            style={{
              fontSize: "clamp(13px, 3.6vw, 18px)",
              fontWeight: 800,
              color: totalSpent > displayIncome ? "#FFB3B3" : "white",
              letterSpacing: visible ? "normal" : "0.06em",
              overflowWrap: "anywhere",
            }}
          >
            {visible ? `₹${totalSpent.toLocaleString("en-IN")}` : "₹••••••"}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
            LEFT
          </div>
          <div
            style={{
              fontSize: "clamp(13px, 3.6vw, 18px)",
              fontWeight: 800,
              color: remaining < 0 ? "#FFB3B3" : "#B3FFD9",
              letterSpacing: visible ? "normal" : "0.06em",
              overflowWrap: "anywhere",
            }}
          >
            {visible
              ? `₹${Math.abs(remaining).toLocaleString("en-IN")}${remaining < 0 ? " over" : ""}`
              : "₹••••••"}
          </div>
        </div>
      </div>
      {onCardsSpend > 0 ? (
        <div
          style={{
            fontSize: 11,
            opacity: 0.85,
            marginBottom: 12,
            letterSpacing: visible ? "normal" : "0.06em",
          }}
        >
          On cards this month:{" "}
          {visible
            ? `₹${Math.round(onCardsSpend).toLocaleString("en-IN")}`
            : "₹••••"}
        </div>
      ) : null}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            opacity: 0.7,
            marginBottom: 6,
          }}
        >
          <span>Cash budget used</span>
          <span>{visible ? `${spentPercent.toFixed(0)}%` : "••%"}</span>
        </div>
        <div
          style={{
            height: 8,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: visible ? `${spentPercent}%` : "0%",
              background:
                spentPercent > 90
                  ? "#FF6B6B"
                  : spentPercent > 70
                    ? "#FFD93D"
                    : "#6BCB77",
              borderRadius: 4,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto box-border w-full max-w-[920px] px-4 pb-20 pt-6 sm:px-6">
      {/* Only this summary card flips 180°; other sections just mask amounts. */}
      <div
        className="mb-5 w-full"
        style={{
          perspective: "1000px",
          WebkitPerspective: "1000px",
        }}
      >
        <div
          style={{
            display: "grid",
            width: "100%",
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: amountsVisible ? "rotateY(180deg)" : "rotateY(0deg)",
            WebkitTransform: amountsVisible
              ? "rotateY(180deg)"
              : "rotateY(0deg)",
          }}
        >
          <div
            style={{
              gridArea: "1 / 1",
              width: "100%",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: amountsVisible ? "none" : "auto",
            }}
          >
            {summaryCardInner(false)}
          </div>
          <div
            style={{
              gridArea: "1 / 1",
              width: "100%",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg) translateZ(1px)",
              WebkitTransform: "rotateY(180deg) translateZ(1px)",
              pointerEvents: amountsVisible ? "auto" : "none",
            }}
          >
            {summaryCardInner(true)}
          </div>
        </div>
      </div>

      {/* <PurpleCashAudit
        transactions={transactions}
        profileMonthlyIncome={profileMonthlyFromDb}
      /> */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={toggleShowAll}
          aria-pressed={allAmountsVisible}
          aria-label={
            allAmountsVisible ? "Hide all amounts" : "Show all amounts"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 36,
            padding: "0 14px",
            borderRadius: 999,
            border: "1px solid #E8E6F0",
            background: allAmountsVisible ? "#EEEDFE" : "#F9F9FC",
            color: "#534AB7",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {allAmountsVisible ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
          {allAmountsVisible ? "Hide all" : "Show all"}
        </button>
      </div>

      {loading ? (
        <BrandPageLoader
          fullScreen={false}
          size="xs"
          minHeight="auto"
          inline
          label="Updating…"
        />
      ) : null}

      <div
        style={{
          background: "white",
          border: `1.5px solid ${expandedIncome ? incomeCat.color : "#E8E6F0"}`,
          borderRadius: 16,
          marginBottom: 10,
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setExpandedIncome((open) => {
              const next = !open;
              if (next) setExpandedBucket(null);
              return next;
            });
          }}
          style={{
            width: "100%",
            padding: "16px",
            cursor: "pointer",
            border: "none",
            background: "white",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TrackerIconBadge name={incomeCat.icon} color={incomeCat.color} />
              <div>
                <div
                  style={{ fontSize: 15, fontWeight: 700, color: "#111110" }}
                >
                  {incomeCat.label}
                </div>
                <div style={{ fontSize: 12, color: "#111110", opacity: 0.85 }}>
                  {incomeTxns.length}{" "}
                  {incomeTxns.length === 1 ? "entry" : "entries"}
                  {listSavingsCarryForward(incomeTxns).length > 0 ||
                  incomePlan.needsSavingsRow
                    ? " · includes saving from last month"
                    : monthlyIncome === 0 && profileMonthlyFromDb > 0
                      ? " · synced from last month / profile"
                      : ""}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#111110",
                  letterSpacing: incomeVisible ? "normal" : "0.06em",
                }}
              >
                {formatMaskedAmount(displayIncome, incomeVisible)}
              </div>
              <span
                style={{
                  fontSize: 14,
                  color: "#111110",
                  transform: !expandedIncome ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              >
                ▼
              </span>
              <SectionPrivacyEye
                visible={incomeVisible}
                onToggle={() => toggleSectionVisible("income")}
                label="Income"
              />
            </div>
          </div>
        </button>
        {expandedIncome ? (
          <div style={{ borderTop: "1px solid #F0EFF8" }}>
            {incomeTxns.length > 0 ? (
              <div
                style={{ padding: "8px 16px 12px", display: "grid", gap: 8 }}
              >
                {incomeTxns.map((txn) => {
                  const sub = findSubcategory(
                    "income",
                    txn.subcategory ?? txn.category,
                  );
                  const dateLabel = new Date(txn.date).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  );
                  return (
                    <div
                      key={txn.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderRadius: 8,
                        background: "#F9F9FC",
                        padding: "10px 12px",
                        gap: 8,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#111110",
                            letterSpacing: incomeVisible ? "normal" : "0.06em",
                          }}
                        >
                          {formatMaskedAmount(
                            Number(txn.amount),
                            incomeVisible,
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#111110",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {sub?.label ?? txn.category} ·{" "}
                          {txn.description?.trim()
                            ? `${txn.description.trim()} · ${dateLabel}`
                            : dateLabel}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Edit income"
                          title="Edit income"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalDefaults({});
                            setDefaultBucket("income");
                            setEditingExpense(txn);
                            setShowAddModal(true);
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#534AB7",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: "6px 8px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label="Delete income"
                          title="Delete income"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteTransaction(txn.id);
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#E24B4A",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: "6px 8px",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                {incomePlan.needsSavingsRow ? (
                  <div
                    style={{
                      borderRadius: 8,
                      background: "#F3F1FF",
                      padding: "10px 12px",
                      border: "1px dashed #534AB7",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111110",
                      }}
                    >
                      {formatMaskedAmount(
                        incomePlan.savingsAmount,
                        incomeVisible,
                      )}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {SAVINGS_CARRY_FORWARD_DESC} · syncing…
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "#111110",
                  fontSize: 13,
                }}
              >
                {displayIncome > 0 ? (
                  <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
                    {incomePlan.salaryAmount > 0 ? (
                      <div
                        style={{
                          borderRadius: 8,
                          background: "#F9F9FC",
                          padding: "10px 12px",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {formatMaskedAmount(
                            incomePlan.salaryAmount,
                            incomeVisible,
                          )}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                          Salary · synced from last month
                        </div>
                      </div>
                    ) : null}
                    {incomePlan.savingsAmount > 0 ? (
                      <div
                        style={{
                          borderRadius: 8,
                          background: "#F9F9FC",
                          padding: "10px 12px",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {formatMaskedAmount(
                            incomePlan.savingsAmount,
                            incomeVisible,
                          )}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                          {SAVINGS_CARRY_FORWARD_DESC}
                        </div>
                      </div>
                    ) : null}
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
                      Use Add income for bonus / freelance / other — leftover
                      savings still auto-sync on the 1st if missing.
                    </p>
                  </div>
                ) : (
                  "No income logged this month. Tap Add income to get started."
                )}
              </div>
            )}
            <div style={{ padding: "12px 16px 16px" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddIncome();
                }}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  background: `${incomeCat.color}18`,
                  border: `1.5px dashed ${incomeCat.color}`,
                  color: incomeCat.color,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add income
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {buckets.map((bucketKey) => {
        const cat = TRACKER_CATEGORIES[bucketKey];
        const bucketTxns = transactions.filter((t) => t.bucket === bucketKey);
        const bucketTotal = bucketTxns
          .filter((t) => countsTowardTrackerTotals(t))
          .reduce((a, t) => a + Number(t.amount), 0);
        const isExpanded = expandedBucket === bucketKey;
        const capPct =
          bucketKey in bucketCaps
            ? Math.round(bucketCaps[bucketKey as keyof typeof bucketCaps] * 100)
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
        const bySubcategory = bucketTxns.reduce(
          (acc, t) => {
            const key = t.subcategory || "other";
            if (!acc[key]) acc[key] = [];
            acc[key].push(t);
            return acc;
          },
          {} as Record<string, typeof bucketTxns>,
        );
        const sectionVisible = isSectionVisible(bucketKey);

        return (
          <div
            key={bucketKey}
            style={{
              background: "white",
              border: `1.5px solid ${isExpanded ? cat.color : overBudget ? "#FCEBEB" : "#E8E6F0"}`,
              borderRadius: 16,
              marginBottom: 10,
              overflow: "hidden",
              transition: "border-color 0.2s",
            }}
          >
            <div
              onClick={() => {
                // Accordion: only one section open at a time; do not auto-scroll.
                if (isExpanded) {
                  setExpandedBucket(null);
                  return;
                }
                setExpandedIncome(false);
                setExpandedBucket(bucketKey);
              }}
              style={{
                padding: "16px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TrackerIconBadge name={cat.icon} color={cat.color} />
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#111110",
                      }}
                    >
                      {cat.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#111110",
                        opacity: 0.88,
                      }}
                    >
                      {bucketTxns.length} items
                      {capPct > 0 ? ` · ${capPct}% budget` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: overBudget ? "#E24B4A" : "#111110",
                        letterSpacing: sectionVisible ? "normal" : "0.06em",
                      }}
                    >
                      {formatMaskedAmount(bucketTotal, sectionVisible)}
                    </div>
                    {budgetAmount > 0 ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#111110",
                          opacity: 0.88,
                          letterSpacing: sectionVisible ? "normal" : "0.06em",
                        }}
                      >
                        of {formatMaskedAmount(budgetAmount, sectionVisible)}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#111110",
                      opacity: 0.75,
                      transition: "transform 0.2s",
                      transform: !isExpanded ? "rotate(180deg)" : "none",
                    }}
                  >
                    ▼
                  </div>
                  <SectionPrivacyEye
                    visible={sectionVisible}
                    onToggle={() => toggleSectionVisible(bucketKey)}
                    label={cat.label}
                  />
                </div>
              </div>
              {budgetAmount > 0 ? (
                <div>
                  <div
                    style={{
                      height: 6,
                      background: "#F7F7F4",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: sectionVisible ? `${progressPercent}%` : "0%",
                        background: isTargetBucket
                          ? cat.color
                          : progressPercent >= 100
                            ? "#E24B4A"
                            : progressPercent >= 80
                              ? "#BA7517"
                              : cat.color,
                        borderRadius: 3,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  {overBudget ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#E24B4A",
                        marginTop: 4,
                        fontWeight: 600,
                        letterSpacing: sectionVisible ? "normal" : "0.06em",
                      }}
                    >
                      ⚠️ Over budget by{" "}
                      {formatMaskedAmount(
                        bucketTotal - budgetAmount,
                        sectionVisible,
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {isExpanded ? (
              <div style={{ borderTop: "1px solid #F0EFF8" }}>
                <div style={{ padding: "12px 16px" }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalDefaults({});
                      setDefaultBucket(bucketKey);
                      setEditingExpense(null);
                      setShowAddModal(true);
                    }}
                    style={{
                      width: "100%",
                      height: 40,
                      borderRadius: 10,
                      background: `${cat.color}15`,
                      border: `1px dashed ${cat.color}`,
                      color: cat.color,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {bucketKey === "investment"
                      ? `+ Add savings · ${cat.label}`
                      : `+ Add expense · ${cat.label}`}
                  </button>
                </div>
                {Object.keys(bySubcategory).length > 0 ? (
                  Object.entries(bySubcategory).map(([subId, txns]) => {
                    const subTotal = txns
                      .filter((t) => countsTowardTrackerTotals(t))
                      .reduce((a, t) => a + Number(t.amount), 0);
                    const sub = findSubcategory(bucketKey, subId);
                    return (
                      <div
                        key={subId}
                        style={{ borderBottom: "1px solid #F7F7F4" }}
                      >
                        <div
                          style={{
                            padding: "10px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <TrackerIcon
                              name={sub?.icon ?? "other"}
                              size={18}
                              color={cat.color}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#111110",
                                  fontWeight: 500,
                                }}
                              >
                                {sub?.label || subId}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#111110",
                                  opacity: 0.88,
                                }}
                              >
                                {txns.length}{" "}
                                {txns.length === 1
                                  ? "transaction"
                                  : "transactions"}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#111110",
                              letterSpacing: sectionVisible
                                ? "normal"
                                : "0.06em",
                            }}
                          >
                            {formatMaskedAmount(subTotal, sectionVisible)}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "0 16px 10px 42px",
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          {txns.map((txn) => {
                            const onCard = isCreditCardPaymentMethod(
                              txn.payment_method,
                            );
                            return (
                              <div
                                key={txn.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderRadius: 8,
                                  background: "#F9F9FC",
                                  padding: "8px 10px",
                                  gap: 8,
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#111110",
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    {formatMaskedAmount(
                                      Number(txn.amount),
                                      sectionVisible,
                                    )}
                                    {onCard ? (
                                      <span
                                        title="Paid by credit card — not counted in purple LEFT or bucket totals"
                                        aria-label="Paid by credit card"
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "2px 6px",
                                          borderRadius: 6,
                                          background: "#EEEDFE",
                                          color: "#534AB7",
                                          fontSize: 10,
                                          fontWeight: 700,
                                        }}
                                      >
                                        <AppIcon
                                          name="card"
                                          size={12}
                                          color="#534AB7"
                                        />
                                        Card
                                      </span>
                                    ) : null}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "#111110",
                                      fontWeight: 500,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: 260,
                                    }}
                                  >
                                    {displayExpenseDescription(txn.description)}
                                    {displayExpenseDescription(
                                      txn.description,
                                    ) && formatExpenseDate(txn.date)
                                      ? " · "
                                      : ""}
                                    <span style={{ color: "#9B9A94" }}>
                                      {formatExpenseDate(txn.date)}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    flexShrink: 0,
                                  }}
                                >
                                  <button
                                    type="button"
                                    aria-label="Edit expense"
                                    title="Edit expense"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setModalDefaults({});
                                      setEditingExpense(txn);
                                      setShowAddModal(true);
                                    }}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: "#534AB7",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      padding: "6px 8px",
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Delete expense"
                                    title="Delete expense"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void deleteTransaction(txn.id);
                                    }}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: "#E24B4A",
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      padding: "6px 8px",
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      padding: "20px 16px",
                      textAlign: "center",
                      color: "#111110",
                      fontSize: 13,
                    }}
                  >
                    No {cat.label.toLowerCase()} expenses this month
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      <MonthSafetyPulse
        pulse={safetyPulse}
        previousMonthLabel={prevMeta.monthName}
        forceVisible={allAmountsVisible}
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
          <CreditCardBillReminder
            previousTransactions={ccBillHistory}
            currentTransactions={transactions}
            cards={savedCards}
            monthName={currentMonth}
            year={currentYear}
            monthlySalary={displayIncome}
            defaultOpen={false}
            optimisticPayments={ccOptimisticPayments}
            asOf={new Date(selectedYear, selectedMonth, 1)}
            onCardsChange={() => {
              if (!user?.id) return;
              void loadCreditCardsMerged(user.id).then(setSavedCards);
            }}
            onPayBill={(amount, label, cardId) => {
              setEditingExpense(null);
              setPendingCcPayCardId(cardId);
              setDefaultBucket("loans");
              setModalDefaults({
                subcategory: "credit_card",
                amount,
                description: creditCardBillPaymentDescription(label, cardId),
                paymentMethod: "upi",
              });
              setShowAddModal(true);
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
            defaultOpen={false}
          />
        ) : null}
      </MonthSafetyPulse>

      <div style={{ marginTop: 16 }}>
        <FeedbackWidget pageContext="tracker" />
      </div>

      {showAddModal ? (
        <AddExpenseModal
          defaultDate={(() => {
            const today = new Date();
            if (
              today.getFullYear() === selectedYear &&
              today.getMonth() === selectedMonth
            ) {
              return localISODate(today);
            }
            if (
              selectedYear > today.getFullYear() ||
              (selectedYear === today.getFullYear() &&
                selectedMonth > today.getMonth())
            ) {
              return localISODate(new Date(selectedYear, selectedMonth, 1));
            }
            return localISODate(new Date(selectedYear, selectedMonth + 1, 0));
          })()}
          maxDate={localISODate(new Date(selectedYear, selectedMonth + 1, 0))}
          defaultBucket={
            editingExpense ? editingExpense.bucket : defaultBucket || undefined
          }
          defaultSubcategory={
            editingExpense ? undefined : modalDefaults.subcategory
          }
          defaultAmount={editingExpense ? undefined : modalDefaults.amount}
          defaultDescription={
            editingExpense ? undefined : modalDefaults.description
          }
          defaultPaymentMethod={
            editingExpense ? undefined : modalDefaults.paymentMethod
          }
          editExpense={
            editingExpense
              ? {
                  id: editingExpense.id,
                  date: editingExpense.date,
                  amount: editingExpense.amount,
                  bucket: editingExpense.bucket,
                  subcategory: editingExpense.subcategory,
                  description: editingExpense.description,
                  payment_method: editingExpense.payment_method,
                }
              : undefined
          }
          onClose={() => {
            setShowAddModal(false);
            setEditingExpense(null);
            setModalDefaults({});
            setPendingCcPayCardId(null);
          }}
          onSaved={(saved) => {
            if (!editingExpense) {
              const trackedBucket = defaultBucket || "unknown";
              Analytics.trackerExpenseAdded(trackedBucket);
            }
            if (pendingCcPayCardId && saved?.amount != null) {
              setCcOptimisticPayments((prev) => [
                ...prev,
                {
                  cardId: pendingCcPayCardId,
                  amount: Number(saved.amount) || 0,
                },
              ]);
              setPendingCcPayCardId(null);
            }
            if (
              saved &&
              !saved.isEdit &&
              user?.id &&
              saved.bucket !== "income"
            ) {
              const subKey = (saved.subcategory || saved.category || "").trim();
              const obligationCategory = obligationCategoryFromExpense(saved);
              // CC bill pays never create / tick / suggest obligations.
              const isCcBillPay =
                subKey === "credit_card" ||
                obligationCategory === "credit_card";
              if (!isCcBillPay) {
                void (async () => {
                  const store = useObligationStore.getState();
                  const checklistMonth = new Date(
                    selectedYear,
                    selectedMonth,
                    1,
                  );

                  // Optional: learn a new obligation when we recognize the type.
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
                            o.title.toLowerCase() ===
                              candidate.title.toLowerCase())),
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

                  // Tick by amount first (Home loan EMI etc. — no strict type).
                  await store.generateChecklist(user.id, checklistMonth);
                  await store.fetchChecklist(user.id, checklistMonth);
                  const { checklist } = useObligationStore.getState();
                  const pending = findPendingChecklistForExpense(
                    checklist,
                    saved,
                  );
                  if (pending) {
                    await store.markPaid(pending.id, saved.amount);
                  }
                })();
              }
            }
            setShowAddModal(false);
            setDefaultBucket("");
            setModalDefaults({});
            setEditingExpense(null);
            void fetchTransactions({ soft: true });
          }}
        />
      ) : null}
    </div>
  );
}

export default function TrackerPage() {
  return (
    <ProtectedGate>
      <TrackerContent />
    </ProtectedGate>
  );
}
