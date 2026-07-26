"use client";

import AddObligationForm, {
  type ObligationFormPayload,
} from "@/components/tracker/AddObligationForm";
import { useObligationStore } from "@/store/obligationStore";
import { useEffect, useState } from "react";

const CATEGORY_ICON: Record<string, string> = {
  insurance_life: "🛡️",
  insurance_health: "🏥",
  insurance_vehicle: "🚗",
  loan_emi: "🏦",
  investment_sip: "📈",
  investment_ppf: "💰",
  investment_fd: "🏛️",
  credit_card: "💳",
  subscription: "📱",
  rent: "🏠",
  tax: "📋",
  other: "📌",
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type Learned = {
  title: string;
  category: string;
  amount: number;
};

export default function ObligationsChecklist({
  userId,
  learnedSuggestion,
  onDismissLearn,
  analyseCompleted = false,
}: {
  userId: string;
  learnedSuggestion?: Learned | null;
  onDismissLearn?: () => void;
  /** True when health check already submitted — hide "set up calendar" empty CTA. */
  analyseCompleted?: boolean;
}) {
  const {
    checklist,
    obligations,
    totalObligated,
    totalPaid,
    totalPending,
    generateChecklist,
    markPaid,
    markSkipped,
    addObligation,
    loading,
  } = useObligationStore();

  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    void generateChecklist(userId);
    void useObligationStore.getState().fetchObligations(userId);
  }, [userId, generateChecklist]);

  const handleSave = async (data: ObligationFormPayload) => {
    const id = await addObligation({ ...data, user_id: userId });
    if (id) {
      await generateChecklist(userId);
      await useObligationStore.getState().fetchObligations(userId);
      setShowAdd(false);
    }
  };

  const hasObligationData = checklist.length > 0 || obligations.length > 0;
  const showSetupEmpty = !hasObligationData && !analyseCompleted;

  return (
    <>
      {learnedSuggestion ? (
        <div className="my-2 flex items-start gap-2.5 rounded-xl bg-[#EEEDFE] p-3.5">
          <div className="shrink-0 text-xl">💡</div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[13px] font-bold text-[#534AB7]">
              Add to your obligations?
            </div>
            <div className="mb-2 text-xs text-[#534AB7]">
              Looks like &quot;{learnedSuggestion.title}&quot; (₹
              {learnedSuggestion.amount.toLocaleString("en-IN")}) is a recurring
              payment. Add it so we can remind you!
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    await addObligation({
                      title: learnedSuggestion.title,
                      category: learnedSuggestion.category,
                      amount: learnedSuggestion.amount,
                      frequency: "monthly",
                      source: "tracker_learned",
                      user_id: userId,
                      is_active: true,
                      remind_days_before: 7,
                    });
                    await generateChecklist(userId);
                    await useObligationStore
                      .getState()
                      .fetchObligations(userId);
                    onDismissLearn?.();
                  })();
                }}
                className="rounded-lg bg-[#534AB7] px-3.5 py-1.5 text-xs font-bold text-white"
              >
                Yes, add it
              </button>
              <button
                type="button"
                onClick={() => onDismissLearn?.()}
                className="bg-transparent text-xs text-[#534AB7]"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSetupEmpty ? (
        <div className="my-4 flex items-start gap-3 rounded-[14px] bg-[#EEEDFE] p-4">
          <div className="shrink-0 text-2xl">💡</div>
          <div>
            <div className="mb-1 text-sm font-bold text-[#534AB7]">
              Set up your financial calendar
            </div>
            <div className="mb-2.5 text-[13px] leading-relaxed text-[#534AB7]">
              Add your EMI dates, insurance renewals and SIP dates. Finkoin will
              remind you before each one.
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="rounded-[10px] bg-[#534AB7] px-4 py-2 text-[13px] font-bold text-white"
            >
              Add first obligation
            </button>
          </div>
        </div>
      ) : (
        <div className="my-4 overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white">
          <div className="bg-[#534AB7] px-4 py-3.5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="mb-0.5 text-[15px] font-extrabold text-white">
                  This Month&apos;s Obligations
                </div>
                <div className="text-xs text-white/70">
                  Keep this amount aside
                </div>
              </div>
              <div className="text-right">
                <div className="mb-0.5 text-[11px] text-white/60">
                  Total to set aside
                </div>
                <div className="text-[22px] font-extrabold text-white">
                  ₹{totalObligated.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[#90EE90] transition-[width] duration-300"
                style={{
                  width:
                    totalObligated > 0
                      ? `${Math.min(100, (totalPaid / totalObligated) * 100)}%`
                      : "0%",
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-white/70">
              <span>✓ Paid: ₹{totalPaid.toLocaleString("en-IN")}</span>
              <span>Pending: ₹{totalPending.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {checklist.length > 0 ? (
            checklist.map((item, i) => {
              const ob = item.obligation;
              const isPaid =
                item.status === "paid" || item.status === "auto_debit";
              const isSkipped = item.status === "skipped";
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-[13px] ${
                    i < checklist.length - 1 ? "border-b border-[#F7F7F4]" : ""
                  } ${isPaid ? "bg-[#F7FDF9]" : isSkipped ? "bg-[#FAFAFA] opacity-60" : "bg-white"}`}
                >
                  <button
                    type="button"
                    aria-label={isPaid ? "Paid" : "Mark as paid"}
                    disabled={isPaid || isSkipped}
                    onClick={() => {
                      if (!isPaid && !isSkipped) {
                        void markPaid(item.id, item.expected_amount);
                      }
                    }}
                    className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border-2 transition ${
                      isPaid
                        ? "border-[#1D9E75] bg-[#1D9E75]"
                        : isSkipped
                          ? "border-[#E8E6F0] bg-white"
                          : "border-[#534AB7] bg-white"
                    }`}
                  >
                    {isPaid ? (
                      <span className="text-sm font-bold leading-none text-white">
                        ✓
                      </span>
                    ) : null}
                  </button>
                  <div className="shrink-0 text-xl">
                    {CATEGORY_ICON[ob?.category || "other"] || "📌"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`mb-0.5 text-sm font-semibold ${
                        isPaid ? "text-[#1D5C3A]" : "text-[#111110]"
                      } ${isSkipped ? "line-through" : ""}`}
                    >
                      {ob?.title || "Obligation"}
                    </div>
                    <div className="text-[11px] text-[#9B9A94]">
                      {ob?.frequency === "monthly"
                        ? `Due on ${ob.due_day ?? "—"}th`
                        : ob?.frequency === "yearly"
                          ? `Due in ${MONTH_SHORT[(ob.due_month || 1) - 1]}`
                          : ob?.frequency}
                      {isPaid && item.paid_at
                        ? ` · Paid ${new Date(item.paid_at).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" },
                          )}`
                        : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`mb-1 text-[15px] font-bold ${
                        isPaid ? "text-[#1D9E75]" : "text-[#111110]"
                      }`}
                    >
                      ₹{(item.expected_amount || 0).toLocaleString("en-IN")}
                    </div>
                    {!isPaid && !isSkipped ? (
                      <button
                        type="button"
                        onClick={() => void markSkipped(item.id)}
                        className="bg-transparent p-0 text-[10px] text-[#9B9A94] underline"
                      >
                        Skip
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-4 text-[13px] leading-relaxed text-[#5F5E5A]">
              {obligations.length > 0
                ? `${obligations.length} obligation${obligations.length === 1 ? "" : "s"} saved — none due on this month’s checklist yet. Add another or check due dates.`
                : "No obligations due this month yet. Add EMIs, SIPs, or renewals to track them here."}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#F7F7F4] px-4 py-3">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 bg-transparent text-[13px] font-semibold text-[#534AB7]"
            >
              <span className="text-base">+</span>
              Add obligation
            </button>
            <div className="text-[11px] text-[#9B9A94]">
              {loading
                ? "Updating…"
                : checklist.length > 0
                  ? "Tap ☐ to mark as paid"
                  : "Reminders use due day"}
            </div>
          </div>
        </div>
      )}

      {showAdd ? (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[990] bg-black/40"
            onClick={() => setShowAdd(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[991] mx-auto max-h-[90vh] max-w-[480px] overflow-y-auto rounded-t-[20px] bg-white px-5 pb-10 pt-6">
            <div className="mx-auto mb-5 h-1 w-10 rounded bg-[#E8E6F0]" />
            <AddObligationForm
              onSave={handleSave}
              onClose={() => setShowAdd(false)}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
