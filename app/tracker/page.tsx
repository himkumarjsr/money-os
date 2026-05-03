"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import AddExpenseModal from "@/components/tracker/AddExpenseModal";
import TrackerConsent from "@/components/tracker/TrackerConsent";
import { TRACKER_CATEGORIES } from "@/lib/tracker-categories";
import { getSupabase } from "@/lib/supabase";
import { getProfileMonthlySalaryCached } from "@/lib/trackerProfileIncome";
import { useAuthStore } from "@/store/authStore";
import { useCallback, useEffect, useRef, useState } from "react";

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

function SuggestionBox({
  transactions,
  bucketTotals,
  totalSpent,
}: {
  transactions: TrackerTransaction[];
  bucketTotals: Record<string, number>;
  totalSpent: number;
}) {
  const suggestions: string[] = [];

  const habitsAmount = bucketTotals.habits || 0;
  if (habitsAmount > 0) {
    suggestions.push(
      `🚬 You spent ₹${habitsAmount.toLocaleString("en-IN")} on habits this month. This is money that could go towards your emergency fund.`,
    );
  }

  const wantsAmount = bucketTotals.wants || 0;
  const wantsPct = totalSpent > 0 ? (wantsAmount / totalSpent) * 100 : 0;
  if (wantsPct > 5) {
    const reduceBy = Math.max(0, Math.round(wantsAmount - totalSpent * 0.05));
    suggestions.push(
      `🎉 Your wants spending is ${wantsPct.toFixed(1)}% of total. Recommended is 5%. Try reducing dining and entertainment by ₹${reduceBy.toLocaleString("en-IN")}.`,
    );
  }

  if (!bucketTotals.investment || bucketTotals.investment === 0) {
    suggestions.push(`📈 No investments tracked this month. Even ₹500 in a SIP is a great start.`);
  }

  const coffeeTransactions = transactions.filter((t) => t.subcategory === "coffee" || t.subcategory === "cigarettes");
  if (coffeeTransactions.length > 0) {
    const coffeeTotal = coffeeTransactions.reduce((a, t) => a + Number(t.amount), 0);
    suggestions.push(
      `☕ You spent ₹${coffeeTotal.toLocaleString("en-IN")} on tea/coffee and cigarettes. In a year this is ₹${(coffeeTotal * 12).toLocaleString("en-IN")} — enough for a term insurance premium.`,
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div
      style={{
        background: "#EEEDFE",
        borderRadius: 16,
        padding: "16px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#534AB7",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        💡 INSIGHTS
      </div>
      {suggestions.map((s, i) => (
        <div
          key={i}
          style={{
            fontSize: 13,
            color: "#3C3489",
            lineHeight: 1.6,
            marginBottom: i < suggestions.length - 1 ? 12 : 0,
            paddingBottom: i < suggestions.length - 1 ? 12 : 0,
            borderBottom: i < suggestions.length - 1 ? "1px solid #D4D2F5" : "none",
          }}
        >
          {s}
        </div>
      ))}
    </div>
  );
}

function TrackerContent() {
  const user = useAuthStore((s) => s.user);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TrackerTransaction | null>(null);
  const [transactions, setTransactions] = useState<TrackerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBucket, setExpandedBucket] = useState<string | null>("needs");
  const [expandedIncome, setExpandedIncome] = useState(true);
  const [defaultBucket, setDefaultBucket] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [profileMonthlyFromDb, setProfileMonthlyFromDb] = useState(0);
  const currentMonth = new Date(selectedYear, selectedMonth, 1).toLocaleString("default", { month: "long" });
  const currentYear = selectedYear;
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
        const { data } = await supabase.from("tracker_consent").select("consent_given").eq("user_id", user.id).maybeSingle();

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

  const fetchTransactions = useCallback(async () => {
    if (!hasConsent) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const myId = ++fetchReqId.current;
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("expense_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .order("date", { ascending: false });

      if (fetchReqId.current !== myId) return;
      if (error) console.warn("tracker fetch:", error.message);
      setTransactions((data as TrackerTransaction[]) || []);
    } catch (e) {
      if (fetchReqId.current !== myId) return;
      console.warn("tracker fetch failed", e);
      setTransactions([]);
    } finally {
      if (fetchReqId.current === myId) setLoading(false);
    }
  }, [user?.id, hasConsent, currentMonth, currentYear]);

  useEffect(() => {
    if (hasConsent) void fetchTransactions();
  }, [hasConsent, fetchTransactions]);

  useEffect(() => {
    if (!hasConsent) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchTransactions();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [hasConsent, fetchTransactions]);

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
        await supabase.from("expense_transactions").delete().eq("id", id).eq("user_id", user.id);
        void fetchTransactions();
      } catch (e) {
        console.warn("tracker delete failed", e);
      }
    },
    [user?.id, fetchTransactions],
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
      acc[t.bucket] = (acc[t.bucket] || 0) + Number(t.amount);
      return acc;
    },
    {} as Record<string, number>,
  );

  const incomeTxns = transactions.filter((t) => t.bucket === "income");
  const monthlyIncome = incomeTxns.reduce((a, t) => a + Number(t.amount), 0);
  const incomeCat = TRACKER_CATEGORIES.income;
  const displayIncome = monthlyIncome || profileMonthlyFromDb;
  const totalSpent = transactions
    .filter((t) => t.bucket !== "income")
    .reduce((a, t) => a + Number(t.amount), 0);
  const remaining = displayIncome - totalSpent;
  const spentPercent = displayIncome > 0 ? Math.min((totalSpent / displayIncome) * 100, 100) : 0;
  const now = new Date();
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
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
    if (selectedYear === nowDate.getFullYear() && selectedMonth === nowDate.getMonth()) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };
  const buckets = ["needs", "wants", "habits", "loans", "investment"] as const;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "24px 16px 80px",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #534AB7 0%, #3C3489 100%)",
          borderRadius: 20,
          padding: "24px",
          marginBottom: 20,
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <button type="button" onClick={goToPrevMonth} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, color: "white", cursor: "pointer", fontSize: 16 }}>←</button>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{currentMonth} {currentYear}</h2>
          <button type="button" onClick={goToNextMonth} disabled={isCurrentMonth} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, color: "white", cursor: isCurrentMonth ? "not-allowed" : "pointer", fontSize: 16, opacity: isCurrentMonth ? 0.5 : 1 }}>→</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>INCOME</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>₹{displayIncome.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>SPENT</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: totalSpent > displayIncome ? "#FFB3B3" : "white" }}>₹{totalSpent.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>LEFT</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: remaining < 0 ? "#FFB3B3" : "#B3FFD9" }}>₹{Math.abs(remaining).toLocaleString("en-IN")}{remaining < 0 ? " over" : ""}</div>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
            <span>Budget used</span>
            <span>{spentPercent.toFixed(0)}%</span>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${spentPercent}%`, background: spentPercent > 90 ? "#FF6B6B" : spentPercent > 70 ? "#FFD93D" : "#6BCB77", borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
        </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${incomeCat.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  {incomeCat.emoji}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111110" }}>{incomeCat.label}</div>
                  <div style={{ fontSize: 12, color: "#111110", opacity: 0.85 }}>
                    {incomeTxns.length} {incomeTxns.length === 1 ? "entry" : "entries"}
                    {monthlyIncome === 0 && profileMonthlyFromDb > 0
                      ? ` · ₹${profileMonthlyFromDb.toLocaleString("en-IN")} from profile`
                      : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111110" }}>
                  ₹{monthlyIncome.toLocaleString("en-IN")}
                </div>
                <span style={{ fontSize: 14, color: "#111110", transform: expandedIncome ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
              </div>
            </div>
          </button>
          {expandedIncome ? (
            <div style={{ borderTop: "1px solid #F0EFF8" }}>
              {incomeTxns.length > 0 ? (
                <div style={{ padding: "8px 16px 12px", display: "grid", gap: 8 }}>
                  {incomeTxns.map((txn) => {
                    const sub = incomeCat.subcategories.find((s) => s.id === (txn.subcategory ?? txn.category));
                    const dateLabel = new Date(txn.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
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
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>
                            ₹{Number(txn.amount).toLocaleString("en-IN")}
                          </div>
                          <div style={{ fontSize: 12, color: "#111110", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {sub?.label ?? txn.category} · {txn.description?.trim() || dateLabel}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
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
                <div style={{ padding: "16px", textAlign: "center", color: "#111110", fontSize: 13 }}>
                  {profileMonthlyFromDb > 0
                    ? `No income logged yet. Your dashboard shows ₹${profileMonthlyFromDb.toLocaleString("en-IN")} from your profile — tap Add income to record it here.`
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
        <div style={{ padding: "32px", textAlign: "center", color: "#111110", fontSize: 14 }}>Loading...</div>
      ) : (
        <>
          {buckets.map((bucketKey) => {
            const cat = TRACKER_CATEGORIES[bucketKey];
            const bucketTxns = transactions.filter((t) => t.bucket === bucketKey);
            const bucketTotal = bucketTxns.reduce((a, t) => a + Number(t.amount), 0);
            const isExpanded = expandedBucket === bucketKey;
            const budgetAmount = displayIncome > 0 ? displayIncome * (cat.cap / 100) : 0;
            const overBudget = budgetAmount > 0 && bucketTotal > budgetAmount;
            const progressPercent = budgetAmount > 0 ? Math.min((bucketTotal / budgetAmount) * 100, 100) : 0;
            const bySubcategory = bucketTxns.reduce(
              (acc, t) => {
                const key = t.subcategory || "other";
                if (!acc[key]) acc[key] = [];
                acc[key].push(t);
                return acc;
              },
              {} as Record<string, typeof bucketTxns>,
            );

            return (
              <div key={bucketKey} style={{ background: "white", border: `1.5px solid ${isExpanded ? cat.color : overBudget ? "#FCEBEB" : "#E8E6F0"}`, borderRadius: 16, marginBottom: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
                <div onClick={() => setExpandedBucket(isExpanded ? null : bucketKey)} style={{ padding: "16px", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{cat.emoji}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#111110" }}>{cat.label}</div>
                        <div style={{ fontSize: 12, color: "#111110", opacity: 0.88 }}>
                          {bucketTxns.length} items{cat.cap > 0 ? ` · ${cat.cap}% budget` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: overBudget ? "#E24B4A" : "#111110" }}>₹{bucketTotal.toLocaleString("en-IN")}</div>
                        {budgetAmount > 0 ? (
                          <div style={{ fontSize: 11, color: "#111110", opacity: 0.88 }}>
                            of ₹{budgetAmount.toLocaleString("en-IN")}
                          </div>
                        ) : null}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#111110",
                          opacity: 0.75,
                          transition: "transform 0.2s",
                          transform: isExpanded ? "rotate(180deg)" : "none",
                        }}
                      >
                        ▼
                      </div>
                    </div>
                  </div>
                  {budgetAmount > 0 ? (
                    <div>
                      <div style={{ height: 6, background: "#F7F7F4", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progressPercent}%`, background: progressPercent >= 100 ? "#E24B4A" : progressPercent >= 80 ? "#BA7517" : cat.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                      </div>
                      {overBudget ? <div style={{ fontSize: 11, color: "#E24B4A", marginTop: 4, fontWeight: 600 }}>⚠️ Over budget by ₹{(bucketTotal - budgetAmount).toLocaleString("en-IN")}</div> : null}
                    </div>
                  ) : null}
                </div>
                {isExpanded ? (
                  <div style={{ borderTop: "1px solid #F0EFF8" }}>
                    {Object.keys(bySubcategory).length > 0 ? (
                      Object.entries(bySubcategory).map(([subId, txns]) => {
                        const subTotal = txns.reduce((a, t) => a + Number(t.amount), 0);
                        const sub = cat.subcategories.find((s) => s.id === subId);
                        return (
                          <div key={subId} style={{ borderBottom: "1px solid #F7F7F4" }}>
                            <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 16 }}>{sub?.emoji || "💸"}</span>
                                <div>
                                  <div style={{ fontSize: 14, color: "#111110", fontWeight: 500 }}>{sub?.label || subId}</div>
                                  <div style={{ fontSize: 12, color: "#111110", opacity: 0.88 }}>
                                    {txns.length} {txns.length === 1 ? "transaction" : "transactions"}
                                  </div>
                                </div>
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#111110" }}>₹{subTotal.toLocaleString("en-IN")}</div>
                            </div>
                            <div style={{ padding: "0 16px 10px 42px", display: "grid", gap: 8 }}>
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
                                    <div style={{ fontSize: 12, color: "#111110", fontWeight: 700 }}>
                                      ₹{Number(txn.amount).toLocaleString("en-IN")}
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
                                      {txn.description || new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
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
                      <div style={{ padding: "20px 16px", textAlign: "center", color: "#111110", fontSize: 13 }}>
                        No {cat.label.toLowerCase()} expenses this month
                      </div>
                    )}
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
                  </div>
                ) : null}
              </div>
            );
          })}
          <SuggestionBox transactions={transactions} bucketTotals={bucketTotals} totalSpent={totalSpent} />
        </>
      )}

      {showAddModal ? (
        <AddExpenseModal
          defaultBucket={editingExpense ? editingExpense.bucket : defaultBucket || undefined}
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
            setShowAddModal(false);
            setDefaultBucket("");
            setEditingExpense(null);
            void fetchTransactions();
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
