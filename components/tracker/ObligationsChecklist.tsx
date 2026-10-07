"use client";

import AddObligationForm, {
  type ObligationFormPayload,
} from "@/components/tracker/AddObligationForm";
import CollapsiblePanel from "@/components/tracker/CollapsiblePanel";
import PlannedInvestmentsSection from "@/components/tracker/PlannedInvestmentsSection";
import { AppIcon } from "@/components/ui/AppIcon";
import { deactivateAllCreditCardObligations } from "@/lib/trackerCreditCards";
import { useObligationStore } from "@/store/obligationStore";
import { useEffect, useRef, useState } from "react";

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

type Editing = {
  id: string;
  payload: ObligationFormPayload;
};

export default function ObligationsChecklist({
  userId,
  checklistMonth,
  learnedSuggestion,
  onDismissLearn,
  analyseCompleted = false,
  defaultOpen = false,
}: {
  userId: string;
  /** Anchor month for the checklist (tracker selected month). */
  checklistMonth?: Date;
  learnedSuggestion?: Learned | null;
  onDismissLearn?: () => void;
  /** True when health check already submitted — hide "set up calendar" empty CTA. */
  analyseCompleted?: boolean;
  defaultOpen?: boolean;
}) {
  const {
    checklist,
    obligations,
    totalObligated,
    totalPaid,
    totalPending,
    generateChecklist,
    markSkipped,
    markUnpaid,
    addObligation,
    updateObligation,
    closeObligation,
    resetAllObligations,
    loading,
  } = useObligationStore();

  const [open, setOpen] = useState(defaultOpen);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const month = checklistMonth ?? new Date();
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  const cleanedCc = useRef(false);
  useEffect(() => {
    const m = checklistMonth ?? new Date();
    void (async () => {
      if (!cleanedCc.current) {
        cleanedCc.current = true;
        await deactivateAllCreditCardObligations(userId);
      }
      await generateChecklist(userId, m);
      await useObligationStore.getState().fetchObligations(userId);
      await useObligationStore.getState().fetchChecklist(userId, m);
    })();
  }, [userId, generateChecklist, monthKey, checklistMonth]);

  const handleSave = async (data: ObligationFormPayload) => {
    const id = await addObligation({ ...data, user_id: userId });
    if (id) {
      await generateChecklist(userId, month);
      await useObligationStore.getState().fetchObligations(userId);
      setShowAdd(false);
    }
  };

  const handleUpdate = async (data: ObligationFormPayload) => {
    if (!editing) return;
    const ok = await updateObligation(editing.id, {
      title: data.title,
      category: data.category,
      amount: data.amount,
      frequency: data.frequency,
      due_day: data.due_day,
      due_month: data.due_month,
      source: "manual",
    });
    if (!ok) {
      throw new Error("updateObligation failed");
    }
    await generateChecklist(userId, month);
    await useObligationStore.getState().fetchObligations(userId);
    await useObligationStore.getState().fetchChecklist(userId, month);
    setEditing(null);
  };

  const hasObligationData = checklist.length > 0 || obligations.length > 0;
  const showSetupEmpty = !hasObligationData && !analyseCompleted;

  const subtitle = hasObligationData
    ? `₹${totalPending.toLocaleString("en-IN")} pending · ₹${totalPaid.toLocaleString("en-IN")} paid`
    : "Add EMIs, SIPs, renewals";

  return (
    <>
      {learnedSuggestion && learnedSuggestion.category !== "credit_card" ? (
        <div className="mb-2 flex items-start gap-2.5 rounded-xl bg-[#EEEDFE] p-3.5">
          <AppIcon name="bulb" size={20} color="#534AB7" />
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
                    await generateChecklist(userId, month);
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

      <CollapsiblePanel
        title="This month’s obligations"
        subtitle={subtitle}
        icon="calendar"
        open={open}
        onToggle={() => setOpen((v) => !v)}
        defaultBorder={false}
        headerRight={
          hasObligationData ? (
            <button
              type="button"
              aria-label="Reset all obligations"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmReset(true);
              }}
              style={{
                border: "none",
                background: "transparent",
                padding: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <AppIcon name="trash" size={16} color="#E24B4A" />
            </button>
          ) : null
        }
      >
        {showSetupEmpty ? (
          <div className="flex items-start gap-3 rounded-[14px] bg-[#EEEDFE] p-3">
            <AppIcon name="bulb" size={22} color="#534AB7" />
            <div>
              <div className="mb-1 text-sm font-bold text-[#534AB7]">
                Set up your financial calendar
              </div>
              <div className="mb-2.5 text-[13px] leading-relaxed text-[#534AB7]">
                Add EMI dates, insurance renewals and SIPs. Finkoin reminds you
                before each one. Recurring expenses can also be added
                automatically when we spot a monthly pattern.
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
          <div className="overflow-hidden rounded-xl border border-[#E8E6F0]">
            <div className="bg-[#534AB7] px-3.5 py-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="text-xs text-white/70">Keep this aside</div>
                <div className="text-right text-[18px] font-extrabold text-white">
                  ₹{totalObligated.toLocaleString("en-IN")}
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
                const isClosed = ob != null && ob.is_active === false;
                const isPaid =
                  item.status === "paid" || item.status === "auto_debit";
                const isSkipped = item.status === "skipped";
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2.5 px-3.5 py-3 ${
                      i < checklist.length - 1
                        ? "border-b border-[#F7F7F4]"
                        : ""
                    } ${
                      isClosed
                        ? "bg-[#FAFAFA] opacity-70"
                        : isPaid
                          ? "bg-[#F7FDF9]"
                          : isSkipped
                            ? "bg-[#FAFAFA] opacity-60"
                            : "bg-white"
                    }`}
                  >
                    <span
                      aria-hidden
                      title={
                        isClosed
                          ? "Closed — will not appear from next month"
                          : isPaid
                            ? "Paid via logged expense"
                            : "Checks automatically when you log the expense"
                      }
                      className={`flex h-[26px] w-[26px] shrink-0 cursor-default items-center justify-center rounded-lg border-2 ${
                        isClosed
                          ? "border-[#D3D1C7] bg-[#E8E6F0]"
                          : isPaid
                            ? "border-[#1D9E75] bg-[#1D9E75]"
                            : isSkipped
                              ? "border-[#E8E6F0] bg-white"
                              : "border-[#534AB7] bg-white"
                      }`}
                    >
                      {isPaid && !isClosed ? (
                        <AppIcon name="check" size={14} color="#FFFFFF" />
                      ) : isClosed ? (
                        <span className="text-[11px] font-bold text-[#9B9A94]">
                          —
                        </span>
                      ) : null}
                    </span>
                    <div className="shrink-0 text-lg">
                      {CATEGORY_ICON[ob?.category || "other"] || "📌"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`mb-0.5 text-sm font-semibold ${
                          isClosed
                            ? "text-[#9B9A94] line-through"
                            : isPaid
                              ? "text-[#1D5C3A]"
                              : "text-[#111110]"
                        } ${isSkipped && !isClosed ? "line-through" : ""}`}
                      >
                        {ob?.title || "Obligation"}
                      </div>
                      <div className="text-[11px] text-[#9B9A94]">
                        {isClosed ? (
                          <>Closed · won’t show from next month</>
                        ) : (
                          <>
                            {ob?.frequency === "monthly"
                              ? `Due on ${ob.due_day ?? "—"}th`
                              : ob?.frequency === "yearly"
                                ? `Due in ${MONTH_SHORT[(ob.due_month || 1) - 1]}`
                                : ob?.frequency}
                            {isPaid && item.paid_at
                              ? ` · Paid ${new Date(
                                  item.paid_at,
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}`
                              : null}
                            {isSkipped ? " · Skipped" : null}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`mb-1 text-[15px] font-bold ${
                          isClosed
                            ? "text-[#9B9A94] line-through"
                            : isPaid
                              ? "text-[#1D9E75]"
                              : "text-[#111110]"
                        }`}
                      >
                        ₹
                        {(
                          (ob?.amount != null && ob.amount > 0
                            ? ob.amount
                            : item.expected_amount) || 0
                        ).toLocaleString("en-IN")}
                      </div>
                      {isClosed ? (
                        <div className="mt-1 text-[10px] font-semibold text-[#9B9A94]">
                          Closed
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                          {ob ? (
                            <button
                              type="button"
                              aria-label={`Edit ${ob.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAdd(false);
                                setEditing({
                                  id: ob.id,
                                  payload: {
                                    title: ob.title,
                                    category: ob.category,
                                    amount: ob.amount,
                                    frequency: ob.frequency,
                                    due_day: ob.due_day ?? null,
                                    due_month: ob.due_month ?? null,
                                    source: ob.source,
                                    is_active: true,
                                    remind_days_before: ob.remind_days_before,
                                  },
                                });
                              }}
                              className="bg-transparent p-0"
                            >
                              <AppIcon
                                name="pencil"
                                size={14}
                                color="#534AB7"
                              />
                            </button>
                          ) : null}
                          {isSkipped ? (
                            <button
                              type="button"
                              onClick={() => void markUnpaid(item.id)}
                              className="bg-transparent p-0 text-[10px] font-semibold text-[#534AB7] underline"
                            >
                              Restore
                            </button>
                          ) : null}
                          {!isPaid && !isSkipped ? (
                            <button
                              type="button"
                              onClick={() => void markSkipped(item.id)}
                              className="bg-transparent p-0 text-[10px] text-[#9B9A94] underline"
                              title="Skip this month only — comes back next month"
                            >
                              Skip
                            </button>
                          ) : null}
                          {ob ? (
                            <button
                              type="button"
                              aria-label={`Mark ${ob.title} as closed`}
                              title="EMI paid off / stop forever — stays struck out this month"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  !window.confirm(
                                    `Mark “${ob.title}” as closed?\n\nIt stays on this month’s list (struck out).\nIt will not appear from next month.`,
                                  )
                                ) {
                                  return;
                                }
                                void (async () => {
                                  await closeObligation(ob.id, month);
                                  await useObligationStore
                                    .getState()
                                    .fetchChecklist(userId, month);
                                })();
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-[#FCEBEB] px-1.5 py-0.5 text-[10px] font-bold text-[#E24B4A]"
                            >
                              <AppIcon name="trash" size={12} color="#E24B4A" />
                              Mark closed
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3.5 py-3 text-[13px] leading-relaxed text-[#5F5E5A]">
                {obligations.length > 0
                  ? `${obligations.length} obligation${obligations.length === 1 ? "" : "s"} saved — none due on this month’s checklist yet.`
                  : "No obligations due this month yet."}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#F7F7F4] px-3.5 py-2.5">
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
                  : "Mark closed = strike this month · hide from next"}
              </div>
            </div>
          </div>
        )}
        <PlannedInvestmentsSection userId={userId} />
      </CollapsiblePanel>

      {confirmReset ? (
        <>
          <button
            type="button"
            aria-label="Cancel reset"
            className="fixed inset-0 z-[990] bg-black/40"
            onClick={() => setConfirmReset(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[991] mx-auto max-w-[480px] rounded-t-[20px] bg-white px-5 pb-10 pt-6">
            <div className="mb-2 text-[16px] font-extrabold text-[#111110]">
              Reset all obligations?
            </div>
            <p className="mb-5 text-[13px] leading-relaxed text-[#5F5E5A]">
              This permanently deletes every obligation and this month’s
              checklist from the database. You can add them again later.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="h-12 flex-1 rounded-[12px] border border-[#E8E6F0] bg-white text-[14px] font-bold text-[#5F5E5A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    await resetAllObligations(userId);
                    setConfirmReset(false);
                  })();
                }}
                className="h-12 flex-1 rounded-[12px] bg-[#E24B4A] text-[14px] font-bold text-white"
              >
                Delete all
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showAdd || editing ? (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[990] bg-black/40"
            onClick={() => {
              setShowAdd(false);
              setEditing(null);
            }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[991] mx-auto max-h-[90vh] max-w-[480px] overflow-y-auto rounded-t-[20px] bg-white px-5 pb-10 pt-6">
            <div className="mx-auto mb-5 h-1 w-10 rounded bg-[#E8E6F0]" />
            <AddObligationForm
              key={editing ? `edit-${editing.id}` : "add-new"}
              initial={editing?.payload}
              onSave={editing ? handleUpdate : handleSave}
              onClose={() => {
                setShowAdd(false);
                setEditing(null);
              }}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
