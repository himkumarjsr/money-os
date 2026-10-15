"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import AddObligationForm, {
  type ObligationFormPayload,
} from "@/components/tracker/AddObligationForm";
import { AppIcon } from "@/components/ui/AppIcon";
import BackLink from "@/components/ui/BackLink";
import {
  MONTH_NAMES,
  billsByDay,
  buildBillsMonth,
  describeSchedule,
  monthGrid,
  parseYmd,
  type BillItem,
  type BillObligation,
  type BillStatus,
} from "@/lib/billsCalendar";
import {
  loadBillsData,
  setBillStatus,
  type BillsData,
} from "@/lib/billsCalendarData";
import { useAuthStore } from "@/store/authStore";
import { useObligationStore } from "@/store/obligationStore";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLE: Record<
  BillStatus,
  { label: string; pill: string; dot: string }
> = {
  paid: {
    label: "Paid",
    pill: "bg-[#F7FDF9] text-[#1D9E75]",
    dot: "bg-[#1D9E75]",
  },
  skipped: {
    label: "Skipped",
    pill: "bg-[#F7F7F4] text-[#9B9A94]",
    dot: "bg-[#D3D1C7]",
  },
  overdue: {
    label: "Overdue",
    pill: "bg-[#FCEBEB] text-[#E24B4A]",
    dot: "bg-[#E24B4A]",
  },
  due: {
    label: "Due",
    pill: "bg-[#EEEDFE] text-[#534AB7]",
    dot: "bg-[#534AB7]",
  },
  info: {
    label: "Reminder",
    pill: "bg-[#F7F7F4] text-[#5F5E5A]",
    dot: "bg-[#9B9A94]",
  },
};

type Editing = { id: string; payload: ObligationFormPayload };

function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function dayHeading(ymd: string): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function BillsPage() {
  return (
    <ProtectedGate>
      <BillsCalendar />
    </ProtectedGate>
  );
}

function BillsCalendar() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [data, setData] = useState<BillsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadError(null);
      setData(await loadBillsData(userId, cursor.year, cursor.monthIndex));
    } catch (err) {
      console.error("bills load failed:", err);
      setLoadError("Couldn't load your bills. Pull to refresh or try again.");
    }
  }, [userId, cursor.year, cursor.monthIndex]);

  useEffect(() => {
    setData(null);
    setSelectedDay(null);
    void reload();
  }, [reload]);

  const today = useMemo(() => new Date(), []);
  const month = useMemo(
    () =>
      data
        ? buildBillsMonth({
            year: cursor.year,
            monthIndex: cursor.monthIndex,
            today,
            ...data,
          })
        : null,
    [data, cursor.year, cursor.monthIndex, today],
  );
  const byDay = useMemo(
    () => (month ? billsByDay(month.items) : new Map<number, BillItem[]>()),
    [month],
  );
  const cells = monthGrid(cursor.year, cursor.monthIndex);
  const isThisMonth =
    cursor.year === today.getFullYear() &&
    cursor.monthIndex === today.getMonth();

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.monthIndex + delta, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });

  const visible = month
    ? selectedDay == null
      ? month.items
      : month.items.filter((i) => i.day === selectedDay)
    : [];
  const groups: { date: string; items: BillItem[] }[] = [];
  for (const item of visible) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }

  const amountText = (n: number) => (showAmounts ? rupees(n) : "₹••••");

  const changeStatus = async (
    item: BillItem,
    status: "paid" | "skipped" | "pending",
  ) => {
    if (!userId) return;
    setBusyKey(item.key);
    try {
      await setBillStatus(userId, item, status);
      await reload();
    } catch (err) {
      console.error("bills status failed:", err);
      setLoadError("Couldn't update that bill. Try again.");
    } finally {
      setBusyKey(null);
    }
  };

  const findObligation = (id?: string): BillObligation | undefined =>
    data?.obligations.find((o) => o.id === id);

  const startEdit = (ob: BillObligation) => {
    const full = useObligationStore
      .getState()
      .obligations.find((o) => o.id === ob.id);
    setEditing({
      id: ob.id,
      payload: {
        title: ob.title,
        category: ob.category,
        amount: ob.amount,
        frequency: ob.frequency,
        due_day: ob.due_day ?? null,
        due_month: ob.due_month ?? null,
        due_date: ob.due_date ?? null,
        source: "manual",
        is_active: true,
        remind_days_before: full?.remind_days_before ?? 7,
      },
    });
  };

  const handleAdd = async (payload: ObligationFormPayload) => {
    if (!userId) return;
    const id = await useObligationStore
      .getState()
      .addObligation({ ...payload, user_id: userId });
    if (!id) {
      throw new Error("addObligation failed");
    }
    setAdding(false);
    await reload();
  };

  const handleUpdate = async (payload: ObligationFormPayload) => {
    if (!editing) return;
    const ok = await useObligationStore
      .getState()
      .updateObligation(editing.id, {
        title: payload.title,
        category: payload.category,
        amount: payload.amount,
        frequency: payload.frequency,
        due_day: payload.due_day,
        due_month: payload.due_month,
        due_date: payload.due_date ?? null,
        remind_days_before: payload.remind_days_before,
      });
    if (!ok) throw new Error("updateObligation failed");
    setEditing(null);
    await reload();
  };

  useEffect(() => {
    // Keep the store's obligation list warm so edits keep remind_days_before.
    if (userId) void useObligationStore.getState().fetchObligations(userId);
  }, [userId]);

  const totals = month?.totals;
  const progress =
    totals && totals.total > 0
      ? Math.min(100, (totals.paid / totals.total) * 100)
      : 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6 md:pb-10">
      <BackLink fallbackHref="/tracker" label="Back" />
      <div className="mb-5 mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#111110] sm:text-3xl">
            Bills & renewals
          </h1>
          <p className="mt-1 text-sm text-[#5F5E5A]">
            EMIs, premiums, utility bills, card due dates and renewals in one
            place. We remind you before each one.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
          className="shrink-0 rounded-[12px] bg-[#534AB7] px-4 py-2.5 text-sm font-bold text-white"
        >
          + Add bill
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#E8E6F0] bg-white px-2 py-1.5">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-[#534AB7]"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-[15px] font-bold text-[#111110]">
            {MONTH_NAMES[cursor.monthIndex]} {cursor.year}
          </div>
          {!isThisMonth ? (
            <button
              type="button"
              onClick={() =>
                setCursor({
                  year: today.getFullYear(),
                  monthIndex: today.getMonth(),
                })
              }
              className="text-[11px] font-semibold text-[#534AB7] underline"
            >
              Back to this month
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-[#534AB7]"
        >
          ›
        </button>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-xl bg-[#FCEBEB] px-4 py-3 text-[13px] font-medium text-[#E24B4A]">
          {loadError}{" "}
          <button
            type="button"
            onClick={() => void reload()}
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!month ? (
        <div className="rounded-2xl border border-[#E8E6F0] bg-white p-6 text-center text-sm text-[#9B9A94]">
          {loadError ? "Nothing to show yet." : "Loading your bills…"}
        </div>
      ) : (
        <>
          <section className="mb-4 rounded-2xl bg-[#534AB7] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-white/70">
                  {isThisMonth ? "Still to pay this month" : "To pay"}
                </div>
                <div className="mt-0.5 text-[24px] font-extrabold text-white">
                  {amountText(month.totals.pending)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAmounts((v) => !v)}
                aria-label={showAmounts ? "Hide amounts" : "Show amounts"}
                className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                {showAmounts ? "Hide amounts" : "Show amounts"}
              </button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[#90EE90] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[11px] text-white/70">
              <span>
                ✓ Paid {amountText(month.totals.paid)} of{" "}
                {amountText(month.totals.total)}
              </span>
              <span>
                {month.totals.overdueCount > 0
                  ? `${month.totals.overdueCount} overdue`
                  : `${month.totals.dueCount} coming up`}
              </span>
            </div>
          </section>

          <section
            aria-label="Calendar"
            className="mb-4 rounded-2xl border border-[#E8E6F0] bg-white p-3"
          >
            <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-[#9B9A94]">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day == null) return <div key={`pad-${i}`} />;
                const dayItems = byDay.get(day) ?? [];
                const isToday = isThisMonth && day === today.getDate();
                const selected = selectedDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={dayItems.length === 0}
                    onClick={() => setSelectedDay(selected ? null : day)}
                    aria-label={`${day} ${MONTH_NAMES[cursor.monthIndex]}: ${dayItems.length} bill${dayItems.length === 1 ? "" : "s"}`}
                    aria-pressed={selected}
                    className={`flex h-11 flex-col items-center justify-center rounded-[10px] border-[1.5px] text-[13px] font-semibold ${
                      selected
                        ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                        : isToday
                          ? "border-[#534AB7] bg-white text-[#534AB7]"
                          : "border-transparent text-[#111110]"
                    } ${dayItems.length === 0 ? "cursor-default" : ""}`}
                  >
                    <span>{day}</span>
                    <span className="mt-0.5 flex h-1.5 gap-0.5">
                      {dayItems.slice(0, 3).map((it) => (
                        <span
                          key={it.key}
                          className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[it.status].dot}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {month.undated.length > 0 ? (
            <section className="mb-4 rounded-2xl bg-[#FFF8E6] px-4 py-3">
              <div className="mb-1 text-[13px] font-bold text-[#8A6100]">
                {month.undated.length === 1
                  ? "1 bill needs a date"
                  : `${month.undated.length} bills need a date`}
              </div>
              <p className="mb-2 text-xs text-[#8A6100]">
                Add the month or date so it shows here and we can remind you.
              </p>
              <div className="flex flex-wrap gap-2">
                {month.undated.map((ob) => (
                  <button
                    key={ob.id}
                    type="button"
                    onClick={() => startEdit(ob)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#8A6100]"
                  >
                    {ob.title} · Set date
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section aria-label="Bills this month">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#111110]">
                {selectedDay == null
                  ? "This month"
                  : `${selectedDay} ${MONTH_NAMES[cursor.monthIndex]}`}
              </h2>
              {selectedDay != null ? (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-xs font-semibold text-[#534AB7]"
                >
                  Show all
                </button>
              ) : null}
            </div>

            {groups.length === 0 ? (
              <div className="rounded-2xl border border-[#E8E6F0] bg-white p-5 text-center">
                <div className="text-sm font-semibold text-[#111110]">
                  Nothing due this month
                </div>
                <p className="mt-1 text-[13px] text-[#5F5E5A]">
                  Add rent, EMIs, electricity, school fees, PUC or a passport
                  expiry, and we&apos;ll remind you before each one.
                </p>
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-3 rounded-[10px] bg-[#534AB7] px-4 py-2 text-[13px] font-bold text-white"
                >
                  Add your first bill
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((g) => (
                  <div
                    key={g.date}
                    className="overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white"
                  >
                    <div className="bg-[#F7F7F4] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#5F5E5A]">
                      {dayHeading(g.date)}
                    </div>
                    {g.items.map((item, idx) => (
                      <BillRow
                        key={item.key}
                        item={item}
                        last={idx === g.items.length - 1}
                        busy={busyKey === item.key}
                        amountText={amountText}
                        schedule={(() => {
                          const ob = findObligation(item.obligationId);
                          return ob ? describeSchedule(ob) : null;
                        })()}
                        onStatus={(s) => void changeStatus(item, s)}
                        onEdit={() => {
                          const ob = findObligation(item.obligationId);
                          if (ob) startEdit(ob);
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>

          <p className="mt-6 text-center text-xs text-[#9B9A94]">
            Bills you log in{" "}
            <Link href="/tracker" className="font-semibold text-[#534AB7]">
              Tracker
            </Link>{" "}
            tick themselves off here when the amount matches.
          </p>
        </>
      )}

      {adding || editing ? (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[990] bg-black/40"
            onClick={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[991] mx-auto max-h-[90vh] max-w-[480px] overflow-y-auto rounded-t-[20px] bg-white px-5 pb-10 pt-6">
            <div className="mx-auto mb-5 h-1 w-10 rounded bg-[#E8E6F0]" />
            <AddObligationForm
              key={editing ? `edit-${editing.id}` : "add-bill"}
              noun="bill"
              initial={editing?.payload}
              defaults={{ category: "bill_electricity" }}
              onSave={editing ? handleUpdate : handleAdd}
              onClose={() => {
                setAdding(false);
                setEditing(null);
              }}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}

function BillRow({
  item,
  last,
  busy,
  amountText,
  schedule,
  onStatus,
  onEdit,
}: {
  item: BillItem;
  last: boolean;
  busy: boolean;
  amountText: (n: number) => string;
  schedule: string | null;
  onStatus: (s: "paid" | "skipped" | "pending") => void;
  onEdit: () => void;
}) {
  const style = STATUS_STYLE[item.status];
  const done = item.status === "paid" || item.status === "skipped";
  const subtitle =
    item.kind === "card"
      ? "Credit card due date"
      : item.kind === "policy"
        ? "Policy renewal"
        : schedule;

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-3 ${last ? "" : "border-b border-[#F7F7F4]"} ${
        busy ? "opacity-60" : ""
      }`}
    >
      <div className="shrink-0 text-xl" aria-hidden>
        {item.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-semibold ${
            item.status === "skipped"
              ? "text-[#9B9A94] line-through"
              : item.status === "paid"
                ? "text-[#1D5C3A]"
                : "text-[#111110]"
          }`}
        >
          {item.title}
        </div>
        {subtitle ? (
          <div className="truncate text-[11px] text-[#9B9A94]">{subtitle}</div>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.pill}`}
          >
            {style.label}
          </span>
          {item.kind === "obligation" ? (
            <>
              {!done ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onStatus("paid")}
                  className="text-[11px] font-bold text-[#1D9E75] underline"
                >
                  Mark paid
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onStatus("pending")}
                  className="text-[11px] font-semibold text-[#534AB7] underline"
                >
                  Undo
                </button>
              )}
              {!done ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onStatus("skipped")}
                  title="Skip this time only"
                  className="text-[11px] text-[#9B9A94] underline"
                >
                  Skip
                </button>
              ) : null}
              <button
                type="button"
                aria-label={`Edit ${item.title}`}
                onClick={onEdit}
                className="p-0"
              >
                <AppIcon name="pencil" size={13} color="#534AB7" />
              </button>
            </>
          ) : item.kind === "card" ? (
            <Link
              href="/tracker"
              className="text-[11px] font-semibold text-[#534AB7] underline"
            >
              See bill amount in Tracker
            </Link>
          ) : (
            <Link
              href="/policies"
              className="text-[11px] font-semibold text-[#534AB7] underline"
            >
              View policy
            </Link>
          )}
        </div>
      </div>
      <div
        className={`shrink-0 text-right text-[15px] font-bold ${
          item.status === "paid"
            ? "text-[#1D9E75]"
            : item.status === "overdue"
              ? "text-[#E24B4A]"
              : "text-[#111110]"
        }`}
      >
        {item.amount != null ? amountText(item.amount) : "—"}
      </div>
    </div>
  );
}
