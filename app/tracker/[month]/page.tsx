"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import AddExpenseModal from "@/components/tracker/AddExpenseModal";
import ExpenseTable, { type TrackerTransactionRow } from "@/components/tracker/ExpenseTable";
import MonthSummary from "@/components/tracker/MonthSummary";
import TrackerConsent from "@/components/tracker/TrackerConsent";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function TrackerMonthContent() {
  const params = useParams<{ month: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const monthParam = params?.month ?? "";

  const parsed = useMemo(() => {
    const ok = /^\d{4}-\d{2}$/.test(monthParam);
    if (!ok) return null;
    const [y, m] = monthParam.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    if (start.getFullYear() !== y || start.getMonth() !== m - 1) return null;
    const label = start.toLocaleString("default", { month: "long" });
    return { year: y, monthIndex: m - 1, monthName: label };
  }, [monthParam]);

  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<TrackerTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TrackerTransactionRow | null>(null);

  useEffect(() => {
    if (!parsed) {
      router.replace("/tracker");
    }
  }, [parsed, router]);

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
    if (!user?.id || !hasConsent || !parsed) return;
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase
      .from("expense_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", parsed.monthName)
      .eq("year", parsed.year)
      .order("date", { ascending: false });

    setTransactions((data as TrackerTransactionRow[]) || []);
    setLoading(false);
  }, [user?.id, hasConsent, parsed]);

  useEffect(() => {
    if (hasConsent) void fetchTransactions();
  }, [hasConsent, fetchTransactions]);

  const defaultDateForModal = parsed
    ? `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, "0")}-15`
    : undefined;

  if (!parsed) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-sm text-[#9B9A94]">
        Redirecting…
      </div>
    );
  }

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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/tracker" style={{ fontSize: 14, color: "#534AB7", fontWeight: 600, textDecoration: "none" }}>
          ← Back to current month
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111110", margin: 0 }}>
            {parsed.monthName} {parsed.year}
          </h1>
          <p style={{ fontSize: 13, color: "#9B9A94", margin: "4px 0 0" }}>All transactions</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingExpense(null);
            setShowAddModal(true);
          }}
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
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>TOTAL THIS MONTH</div>
        <div style={{ fontSize: 32, fontWeight: 800 }}>₹{totalSpent.toLocaleString("en-IN")}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{transactions.length} transactions</div>
      </div>

      <MonthSummary title="BY CATEGORY" bucketTotals={bucketTotals} totalSpent={totalSpent} />

      <div style={{ background: "white", border: "1px solid #E8E6F0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #F0EFF8" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#9B9A94", textTransform: "uppercase" }}>
            ALL TRANSACTIONS
          </span>
        </div>
        {loading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#9B9A94" }}>Loading...</div>
        ) : (
          <ExpenseTable
            transactions={transactions}
            onChanged={() => void fetchTransactions()}
            onEdit={(txn) => {
              setEditingExpense(txn);
              setShowAddModal(true);
            }}
          />
        )}
      </div>

      {showAddModal ? (
        <AddExpenseModal
          defaultDate={defaultDateForModal}
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
            setEditingExpense(null);
            void fetchTransactions();
          }}
        />
      ) : null}
    </div>
  );
}

export default function TrackerMonthPage() {
  return (
    <ProtectedGate>
      <TrackerMonthContent />
    </ProtectedGate>
  );
}
