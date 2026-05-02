"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import AddExpenseModal from "@/components/tracker/AddExpenseModal";
import MonthSummary from "@/components/tracker/MonthSummary";
import TrackerConsent from "@/components/tracker/TrackerConsent";
import { TRACKER_CATEGORIES } from "@/lib/tracker-categories";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  const router = useRouter();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactions, setTransactions] = useState<TrackerTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.toLocaleString("default", { month: "long" });
  const currentYear = now.getFullYear();

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
    };

    void checkDB();
  }, [user?.id]);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id || !hasConsent) return;
    setLoading(true);

    const supabase = getSupabase();
    const { data } = await supabase
      .from("expense_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .order("date", { ascending: false });

    setTransactions((data as TrackerTransaction[]) || []);
    setLoading(false);
  }, [user?.id, hasConsent, currentMonth, currentYear]);

  useEffect(() => {
    if (hasConsent) void fetchTransactions();
  }, [hasConsent, fetchTransactions]);

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

  const totalSpent = Object.values(bucketTotals).reduce((a, b) => a + b, 0);

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#111110",
              margin: 0,
            }}
          >
            {currentMonth} {currentYear}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#9B9A94",
              margin: "4px 0 0",
            }}
          >
            Expense tracker
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            height: 44,
            padding: "0 20px",
            borderRadius: 12,
            background: "#534AB7",
            color: "white",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Add
        </button>
      </div>

      <div
        style={{
          background: "#534AB7",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 20,
          color: "white",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>TOTAL SPENT THIS MONTH</div>
        <div style={{ fontSize: 36, fontWeight: 800 }}>₹{totalSpent.toLocaleString("en-IN")}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{transactions.length} transactions</div>
      </div>

      <MonthSummary title="BY CATEGORY" bucketTotals={bucketTotals} totalSpent={totalSpent} />

      {transactions.length > 0 ? (
        <SuggestionBox transactions={transactions} bucketTotals={bucketTotals} totalSpent={totalSpent} />
      ) : null}

      <div
        style={{
          background: "white",
          border: "1px solid #E8E6F0",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #F0EFF8",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#9B9A94",
              textTransform: "uppercase",
            }}
          >
            RECENT TRANSACTIONS
          </span>
          <button
            type="button"
            onClick={() =>
              router.push(`/tracker/${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`)
            }
            style={{
              background: "none",
              border: "none",
              color: "#534AB7",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            See all →
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#9B9A94", fontSize: 14 }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <p style={{ fontSize: 15, color: "#5F5E5A", marginBottom: 16 }}>No expenses this month yet. Start by adding your first one.</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{
                height: 44,
                padding: "0 24px",
                borderRadius: 12,
                background: "#534AB7",
                color: "white",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Add first expense
            </button>
          </div>
        ) : (
          transactions.slice(0, 10).map((t) => {
            const bucket = TRACKER_CATEGORIES[t.bucket as keyof typeof TRACKER_CATEGORIES];
            const subId = t.subcategory ?? t.category;
            const sub = bucket?.subcategories.find((s) => s.id === subId);

            return (
              <div
                key={t.id}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #F7F7F4",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: `${bucket?.color || "#534AB7"}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {sub?.emoji || bucket?.emoji || "💸"}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111110" }}>{sub?.label ?? t.category}</div>
                    <div style={{ fontSize: 12, color: "#9B9A94" }}>
                      {t.description || t.payment_method} ·{" "}
                      {new Date(t.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: t.bucket === "investment" ? "#1D9E75" : t.bucket === "habits" ? "#E24B4A" : "#111110",
                  }}
                >
                  {t.bucket === "investment" ? "+" : "−"}₹{Number(t.amount).toLocaleString("en-IN")}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
        {[...Array(3)].map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (i + 1));
          const label = d.toLocaleString("default", { month: "short" });
          const yr = d.getFullYear();
          const mn = String(d.getMonth() + 1).padStart(2, "0");

          return (
            <button
              key={i}
              type="button"
              onClick={() => router.push(`/tracker/${yr}-${mn}`)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "#F7F7F4",
                border: "1px solid #E8E6F0",
                fontSize: 13,
                color: "#5F5E5A",
                cursor: "pointer",
              }}
            >
              {label} {yr}
            </button>
          );
        })}
      </div>

      {showAddModal ? (
        <AddExpenseModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
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
