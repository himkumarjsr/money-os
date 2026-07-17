"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import FeedbackWidget from "@/components/FeedbackWidget";
import AddExpenseModal from "@/components/tracker/AddExpenseModal";
import MonthSafetyPulse from "@/components/tracker/MonthSafetyPulse";
import TrackerConsent from "@/components/tracker/TrackerConsent";
import {
  TRACKER_CATEGORIES,
  countsTowardTrackerTotals,
  findSubcategory,
} from "@/lib/tracker-categories";
import {
  TrackerIconBadge,
  TrackerIcon,
} from "@/components/tracker/TrackerIcons";
import { Analytics } from "@/lib/analytics";
import { getSupabase } from "@/lib/supabase";
import { getProfileMonthlySalaryCached } from "@/lib/trackerProfileIncome";
import {
  computeMonthSafetyPulse,
  previousCalendarMonth,
} from "@/lib/trackerSafetyPulse";
import { useAuthStore } from "@/store/authStore";
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
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<TrackerTransaction | null>(null);
  const [transactions, setTransactions] = useState<TrackerTransaction[]>([]);
  const [previousTransactions, setPreviousTransactions] = useState<
    TrackerTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [expandedBucket, setExpandedBucket] = useState<string | null>("");
  const [expandedIncome, setExpandedIncome] = useState(false);
  const [defaultBucket, setDefaultBucket] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  useEffect(() => {
    try {
      const local = localStorage.getItem("finkoin_tracker_consent");
      if (local === "v1") {
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
          .select("consent_given")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.consent_given) {
          try {
            localStorage.setItem("finkoin_tracker_consent", "v1");
          } catch {
            /* ignore */
          }
          setHasConsent(true);
        } else {
          setHasConsent(false);
        }
      } catch {
        setHasConsent(false);
      }
    };

    void checkDB();
  }, [user?.id]);

  const fetchTransactions = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!hasConsent) return;
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const myId = ++fetchReqId.current;
      const soft = opts?.soft === true;
      if (!soft) setLoading(true);
      try {
        const supabase = getSupabase();
        const prev = previousCalendarMonth(selectedMonth, selectedYear);

        const [currentRes, prevRes] = await Promise.all([
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
        ]);

        if (fetchReqId.current !== myId) return;
        if (currentRes.error)
          console.warn("tracker fetch:", currentRes.error.message);
        if (prevRes.error)
          console.warn("tracker prev fetch:", prevRes.error.message);
        setTransactions((currentRes.data as TrackerTransaction[]) || []);
        setPreviousTransactions((prevRes.data as TrackerTransaction[]) || []);
      } catch (e) {
        if (fetchReqId.current !== myId) return;
        console.warn("tracker fetch failed", e);
        setTransactions([]);
        setPreviousTransactions([]);
      } finally {
        if (fetchReqId.current === myId) setLoading(false);
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
    if (hasConsent) void fetchTransactions();
  }, [hasConsent, fetchTransactions]);

  useEffect(() => {
    if (!hasConsent) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Soft refresh — full loading teardown breaks PWA "Add expense" taps after a few entries.
      if (showAddModal) return;
      void fetchTransactions({ soft: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      if (!window.confirm("Remove this entry?")) return;
      try {
        const supabase = getSupabase();
        await supabase
          .from("expense_transactions")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        void fetchTransactions({ soft: true });
      } catch (e) {
        console.warn("tracker delete failed", e);
      }
    },
    [user?.id, fetchTransactions],
  );

  const prevMeta = previousCalendarMonth(selectedMonth, selectedYear);
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
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent" />
      </div>
    );
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
  const displayIncome = monthlyIncome || profileMonthlyFromDb;
  // Purple summary card only: "Spent"/"Left" reflect real cash out, so include
  // loan prepayment here. Bucket cards, caps, and Safety Pulse still exclude it.
  const totalSpent = transactions
    .filter((t) => t.bucket !== "income")
    .reduce((a, t) => a + Number(t.amount), 0);
  const remaining = displayIncome - totalSpent;
  const spentPercent =
    displayIncome > 0 ? Math.min((totalSpent / displayIncome) * 100, 100) : 0;
  const now = new Date();
  const isCurrentMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    const nowDate = new Date();
    if (
      selectedYear === nowDate.getFullYear() &&
      selectedMonth === nowDate.getMonth()
    )
      return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };
  const buckets = ["needs", "wants", "habits", "loans", "investment"] as const;
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
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: 8,
            width: 36,
            height: 36,
            color: "white",
            cursor: "pointer",
            fontSize: 16,
            flexShrink: 0,
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
            disabled={isCurrentMonth}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 8,
              width: 36,
              height: 36,
              color: "white",
              cursor: isCurrentMonth ? "not-allowed" : "pointer",
              fontSize: 16,
              opacity: isCurrentMonth ? 0.5 : 1,
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
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
            INCOME
          </div>
          <div
            style={{
              fontSize: "clamp(13px, 3.6vw, 18px)",
              fontWeight: 800,
              letterSpacing: visible ? "normal" : "0.06em",
              overflowWrap: "anywhere",
            }}
          >
            {visible ? `₹${displayIncome.toLocaleString("en-IN")}` : "₹••••••"}
          </div>
        </div>
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
          <span>Budget used</span>
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

      {!loading ? (
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
            onClick={() => setExpandedIncome((e) => !e)}
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
                <TrackerIconBadge
                  name={incomeCat.icon}
                  color={incomeCat.color}
                />
                <div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: "#111110" }}
                  >
                    {incomeCat.label}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#111110", opacity: 0.85 }}
                  >
                    {incomeTxns.length}{" "}
                    {incomeTxns.length === 1 ? "entry" : "entries"}
                    {monthlyIncome === 0 && profileMonthlyFromDb > 0
                      ? ` · ${formatMaskedAmount(profileMonthlyFromDb, incomeVisible)} from profile`
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
                  {formatMaskedAmount(monthlyIncome, incomeVisible)}
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
                              letterSpacing: incomeVisible
                                ? "normal"
                                : "0.06em",
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
                            {txn.description?.trim() || dateLabel}
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
                  {profileMonthlyFromDb > 0
                    ? `No income logged yet. Your dashboard shows ${formatMaskedAmount(profileMonthlyFromDb, incomeVisible)} from your profile — tap Add income to record it here.`
                    : "No income logged this month. Tap Add income to get started."}
                </div>
              )}
              <div style={{ padding: "12px 16px 16px" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDefaultBucket("income");
                    setEditingExpense(null);
                    setShowAddModal(true);
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
      ) : null}

      {loading ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            color: "#111110",
            fontSize: 14,
          }}
        >
          Loading...
        </div>
      ) : (
        <>
          {buckets.map((bucketKey) => {
            const cat = TRACKER_CATEGORIES[bucketKey];
            const bucketTxns = transactions.filter(
              (t) => t.bucket === bucketKey,
            );
            const bucketTotal = bucketTxns
              .filter((t) => countsTowardTrackerTotals(t))
              .reduce((a, t) => a + Number(t.amount), 0);
            const isExpanded = expandedBucket === bucketKey;
            const budgetAmount =
              displayIncome > 0 ? displayIncome * (cat.cap / 100) : 0;
            const overBudget = budgetAmount > 0 && bucketTotal > budgetAmount;
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
                  onClick={() =>
                    setExpandedBucket(isExpanded ? null : bucketKey)
                  }
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
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
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
                          {cat.cap > 0 ? ` · ${cat.cap}% budget` : ""}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
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
                              letterSpacing: sectionVisible
                                ? "normal"
                                : "0.06em",
                            }}
                          >
                            of{" "}
                            {formatMaskedAmount(budgetAmount, sectionVisible)}
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
                            width: sectionVisible
                              ? `${progressPercent}%`
                              : "0%",
                            background:
                              progressPercent >= 100
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
                        + Add expense · {cat.label}
                      </button>
                    </div>
                    {Object.keys(bySubcategory).length > 0 ? (
                      Object.entries(bySubcategory).map(([subId, txns]) => {
                        const subTotal = txns.reduce(
                          (a, t) => a + Number(t.amount),
                          0,
                        );
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
                              {txns.map((txn) => (
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
                                      }}
                                    >
                                      {formatMaskedAmount(
                                        Number(txn.amount),
                                        sectionVisible,
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: "#111110",
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: 220,
                                      }}
                                    >
                                      {txn.description ||
                                        new Date(txn.date).toLocaleDateString(
                                          "en-IN",
                                          { day: "numeric", month: "short" },
                                        )}
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
                              ))}
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
          />
          <div style={{ marginTop: 16 }}>
            <FeedbackWidget pageContext="tracker" />
          </div>
        </>
      )}

      {showAddModal ? (
        <AddExpenseModal
          defaultBucket={
            editingExpense ? editingExpense.bucket : defaultBucket || undefined
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
          }}
          onSaved={() => {
            if (!editingExpense) {
              const trackedBucket = defaultBucket || "unknown";
              Analytics.trackerExpenseAdded(trackedBucket);
            }
            setShowAddModal(false);
            setDefaultBucket("");
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
