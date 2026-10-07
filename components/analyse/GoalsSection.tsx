"use client";

import { useMemo, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import MoneyInput from "@/components/ui/MoneyInput";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { formatIndian, handleMoneyInput } from "@/lib/formatters";
import {
  answerPromptedGoal,
  applyGoalEdit,
  detectGoals,
  dismissGoal,
  promptedGoalOffers,
  restoreDismissedGoals,
  type DetectedGoal,
  type PromptedGoalOffer,
} from "@/lib/goalDetection";
import { saveAnalyseProfile } from "@/lib/saveAnalyseProfile";

const OFFER_COPY: Record<PromptedGoalOffer, { q: string; sub: string }> = {
  marriage: {
    q: "Planning to get married?",
    sub: "We'll add a wedding fund to your goals.",
  },
  baby: {
    q: "Planning a baby?",
    sub: "We'll add a childbirth and first-year fund.",
  },
};

export default function GoalsSection({
  profile,
  userId,
}: {
  profile: FinancialProfile;
  userId?: string | null;
}) {
  const goals = useMemo(() => detectGoals(profile), [profile]);
  const offers = useMemo(() => promptedGoalOffers(profile), [profile]);
  const hiddenCount = profile.dismissedGoals?.length ?? 0;

  const [editing, setEditing] = useState<DetectedGoal | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [yearRaw, setYearRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const thisYear = new Date().getFullYear();

  const save = async (next: FinancialProfile) => {
    setSaving(true);
    setError(null);
    const res = await saveAnalyseProfile(userId, next);
    setSaving(false);
    if (res.error) setError("Couldn't save — your change is kept on this device.");
    return !res.error;
  };

  const openEdit = (g: DetectedGoal) => {
    setEditing(g);
    setAmountRaw(String(g.targetAmount));
    setYearRaw(String(g.targetYear));
    setError(null);
  };

  const submitEdit = async () => {
    if (!editing) return;
    const amount = editing.editable.amount
      ? handleMoneyInput(amountRaw)
      : null;
    const year = editing.editable.year ? Number(yearRaw) : NaN;
    const next = applyGoalEdit(profile, editing.id, {
      targetAmount: amount != null && amount > 0 ? amount : undefined,
      targetYear:
        Number.isFinite(year) && year > thisYear && year <= thisYear + 60
          ? year
          : undefined,
    });
    await save(next);
    setEditing(null);
  };

  const yearInvalid =
    editing?.editable.year &&
    (!Number.isFinite(Number(yearRaw)) ||
      Number(yearRaw) <= thisYear ||
      Number(yearRaw) > thisYear + 60);

  return (
    <section className="rounded-2xl bg-white p-5">
      <h2 className="text-xl font-semibold">Your goals</h2>
      <p className="text-sm font-medium leading-relaxed text-[#454442]">
        Picked up from your answers — no extra questions. Edit anything
        that&apos;s off.
      </p>

      {offers.map((offer) => (
        <div
          key={offer}
          className="mt-3 rounded-xl border border-[#DCD8F4] bg-[#F7F6FE] p-4"
        >
          <p className="text-sm font-semibold text-[#111110]">
            {OFFER_COPY[offer].q}
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-[#5F5E5A]">
            {OFFER_COPY[offer].sub}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(answerPromptedGoal(profile, offer, true))}
              className="min-h-[44px] rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Yes, add it
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void save(answerPromptedGoal(profile, offer, false))
              }
              className="min-h-[44px] rounded-lg border border-[#DCD8F4] bg-white px-4 text-sm font-semibold text-[#534AB7] disabled:opacity-60"
            >
              Not now
            </button>
          </div>
        </div>
      ))}

      <div className="mt-3 space-y-2">
        {goals.map((g) => {
          const canEdit = g.editable.amount || g.editable.year;
          return (
            <div
              key={g.id}
              className="rounded-xl border border-[#ECEAF5] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111110]">
                    {g.label}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[#454442]">
                    ₹{formatIndian(g.targetAmount)} by {g.targetYear} ·{" "}
                    {g.yearsToGoal} {g.yearsToGoal === 1 ? "year" : "years"}{" "}
                    left
                  </p>
                  <p className="mt-1 text-xs font-medium leading-snug text-[#5F5E5A]">
                    {g.reason}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    g.isDefaultTarget
                      ? "bg-[#FFF3E6] text-[#BA7517]"
                      : "bg-[#E8F6F1] text-[#1D9E75]"
                  }`}
                >
                  {g.isDefaultTarget ? "Suggested amount" : "Your amount"}
                </span>
              </div>
              {canEdit || g.removable ? (
                <div className="mt-2 flex gap-2">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-[#534AB7] hover:bg-[#F7F6FE]"
                    >
                      Edit
                    </button>
                  ) : null}
                  {g.removable ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save(dismissGoal(profile, g.id))}
                      className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-[#8C3A3A] hover:bg-[#FDEDEC] disabled:opacity-60"
                    >
                      Not my goal
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(restoreDismissedGoals(profile))}
          className="mt-3 min-h-[44px] text-sm font-semibold text-[#534AB7] disabled:opacity-60"
        >
          Show {hiddenCount} hidden {hiddenCount === 1 ? "goal" : "goals"}
        </button>
      ) : null}
      {error && !editing ? (
        <p className="mt-2 text-sm text-[#E24B4A]">{error}</p>
      ) : null}

      <BottomSheet
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit: ${editing.label}` : "Edit goal"}
      >
        {editing ? (
          <div className="pt-1">
            {editing.editable.amount ? (
              <MoneyInput
                key={`${editing.id}-amount`}
                id="goal-target-amount"
                label="Target amount (today's rupees)"
                defaultValue={formatIndian(editing.targetAmount)}
                onChange={(e) => setAmountRaw(e.target.value)}
              />
            ) : null}
            {editing.editable.year ? (
              <div className="mb-5">
                <label
                  htmlFor="goal-target-year"
                  className="mb-1.5 block text-sm font-medium text-[#5F5E5A]"
                >
                  Target year
                </label>
                <input
                  id="goal-target-year"
                  type="number"
                  inputMode="numeric"
                  min={thisYear + 1}
                  max={thisYear + 60}
                  value={yearRaw}
                  onChange={(e) => setYearRaw(e.target.value)}
                  style={{ fontSize: 16 }}
                  className="min-h-[52px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-4 font-semibold text-[#111110] outline-none focus:border-[#534AB7]"
                />
                {yearInvalid ? (
                  <p className="mt-1 text-sm text-[#E24B4A]">
                    Pick a year between {thisYear + 1} and {thisYear + 60}.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mb-5 text-sm font-medium text-[#5F5E5A]">
                Target year {editing.targetYear} is set by your child&apos;s
                age.
              </p>
            )}
            {error ? (
              <p className="mb-3 text-sm text-[#E24B4A]">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={saving || Boolean(yearInvalid)}
              onClick={() => void submitEdit()}
              className="min-h-[48px] w-full rounded-xl bg-[#534AB7] text-base font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save goal"}
            </button>
          </div>
        ) : null}
      </BottomSheet>
    </section>
  );
}
