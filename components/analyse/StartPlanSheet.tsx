"use client";

import BottomSheet from "@/components/ui/BottomSheet";
import {
  buildPlannedDrafts,
  formatStartMonth,
  monthStart,
  PLANNED_REMIND_DAYS_BEFORE,
  plannedDraftKey,
  savePlannedInvestments,
  START_MONTH_CHOICES,
  withoutSavingsAccount,
} from "@/lib/plannedInvestments";
import type { GoalItem } from "@/lib/priorityEngine";
import { getSupabase } from "@/lib/supabase";
import { useMemo, useState } from "react";

/** Consent step before any planned-investment reminder is created. Nothing is ever invested. */
export default function StartPlanSheet({
  isOpen,
  onClose,
  userId,
  goals,
  hasExisting,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  goals: GoalItem[];
  hasExisting: boolean;
  onSaved: () => void;
}) {
  const [offset, setOffset] = useState(1);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [hasSavings, setHasSavings] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startMonth = monthStart(new Date(), offset);
  const allDrafts = useMemo(() => {
    const built = buildPlannedDrafts(goals, startMonth);
    return hasSavings ? built : withoutSavingsAccount(built);
  }, [goals, startMonth, hasSavings]);
  const asksSavings = useMemo(
    () =>
      buildPlannedDrafts(goals, startMonth).some(
        (d) => d.instrument_key === "savings_sweep",
      ),
    [goals, startMonth],
  );
  const drafts = allDrafts.filter((d) => !off.has(plannedDraftKey(d)));
  const toggle = (key: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const total = drafts.reduce((s, d) => s + d.monthly_amount, 0);
  const goalCount = new Set(drafts.map((d) => d.source_id)).size;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await savePlannedInvestments(getSupabase(), userId, drafts);
      setAgreed(false);
      onSaved();
      onClose();
    } catch {
      setError(
        "Couldn't save your reminders. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Start this plan">
      <div className="space-y-4 pb-4 text-[14px] leading-relaxed text-[#454442]">
        <div className="rounded-xl bg-[#EEEDFE] p-3">
          <p className="font-semibold text-[#534AB7]">What will happen</p>
          <p className="mt-1">
            {drafts.length} planned{" "}
            {drafts.length === 1 ? "investment" : "investments"} across{" "}
            {goalCount} {goalCount === 1 ? "goal" : "goals"} (₹
            {total.toLocaleString("en-IN")}
            /month) will be added to your Tracker, and we&apos;ll remind you{" "}
            {PLANNED_REMIND_DAYS_BEFORE} days before they start.
          </p>
        </div>
        <div className="rounded-xl bg-[#FFF3E0] p-3">
          <p className="font-semibold text-[#8C5A0A]">What won&apos;t happen</p>
          <p className="mt-1">
            Nothing will ever be invested, debited or moved. Finkoin
            doesn&apos;t connect to your bank or broker and doesn&apos;t sell
            any of these products. You start each SIP yourself wherever you
            choose, then mark it started in Tracker.
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold text-[#111110]">Start from</p>
          <select
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            className="min-h-[44px] w-full rounded-xl border border-[#E8E6F0] bg-white px-3 text-[14px] font-semibold text-[#111110]"
          >
            {Array.from({ length: START_MONTH_CHOICES }, (_, o) => (
              <option key={o} value={o}>
                {formatStartMonth(monthStart(new Date(), o))}
                {o === 0 ? " · this month" : o === 1 ? " · next month" : ""}
              </option>
            ))}
          </select>
        </div>

        {asksSavings ? (
          <div>
            <p className="mb-2 font-semibold text-[#111110]">
              Do you have a savings account or sweep-in FD to keep short-term
              goal money in?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setHasSavings(v)}
                  className={`min-h-[44px] rounded-xl border text-[14px] font-semibold ${
                    hasSavings === v
                      ? "border-[#534AB7] bg-[#534AB7] text-white"
                      : "border-[#E8E6F0] bg-white text-[#454442]"
                  }`}
                >
                  {v ? "Yes" : "No, use a liquid fund"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-[12px] text-[#7A7871]">
            Untick anything you don&apos;t want. The total updates as you go.
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-[#E8E6F0] p-3 text-[13px]">
            {allDrafts.map((d) => {
              const key = plannedDraftKey(d);
              const on = !off.has(key);
              return (
                <li key={key}>
                  <label className="flex min-h-[36px] cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(key)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#534AB7]"
                    />
                    <span
                      className={`flex-1 ${on ? "" : "text-[#A3A19B] line-through"}`}
                    >
                      <span className="font-semibold">{d.source_label}</span> ·{" "}
                      {d.instrument_label}
                    </span>
                    <span
                      className={`shrink-0 tabular-nums ${on ? "" : "text-[#A3A19B] line-through"}`}
                    >
                      ₹{d.monthly_amount.toLocaleString("en-IN")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 flex justify-between text-[14px] font-semibold text-[#111110]">
            <span>Total per month</span>
            <span className="tabular-nums">
              ₹{total.toLocaleString("en-IN")}
            </span>
          </p>
        </div>

        {hasExisting ? (
          <p className="text-[12px] text-[#7A7871]">
            You already have planned investments. Ones you&apos;ve started stay
            started with the new amounts; pending ones are replaced by this
            plan.
          </p>
        ) : null}

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#534AB7]"
          />
          <span className="text-[13px]">
            I understand Finkoin will only store these planned amounts and
            remind me. Nothing is invested automatically, and I can remove them
            anytime from Tracker.
          </span>
        </label>

        {error ? <p className="text-[13px] text-[#E24B4A]">{error}</p> : null}

        <button
          type="button"
          disabled={!agreed || saving || drafts.length === 0}
          onClick={() => void save()}
          className="min-h-[48px] w-full rounded-xl bg-[#534AB7] text-[15px] font-bold text-white disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : hasExisting
              ? "Update reminders"
              : "Create reminders"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] w-full text-[14px] font-semibold text-[#534AB7]"
        >
          Not now
        </button>
      </div>
    </BottomSheet>
  );
}
