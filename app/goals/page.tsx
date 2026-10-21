"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import BackLink from "@/components/ui/BackLink";
import BottomSheet from "@/components/ui/BottomSheet";
import MoneyInput from "@/components/ui/MoneyInput";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import {
  formatIndian,
  formatIndianCompact,
  handleMoneyInput,
} from "@/lib/formatters";
import {
  addCustomGoal,
  answerPromptedGoal,
  applyGoalEdit,
  CUSTOM_GOAL_PRESETS,
  dismissGoal,
  homeUpfrontShare,
  MAX_CUSTOM_GOALS,
  promptedGoalOffers,
  restoreDismissedGoals,
  type DetectedGoal,
  type GoalEdit,
  type PromptedGoalOffer,
} from "@/lib/goalDetection";
import {
  buildGoalsHub,
  GOAL_EMOJI,
  goalStatusLine,
  type GoalHubItem,
  type GoalHubStatus,
} from "@/lib/goalsHub";
import {
  addPlannedInvestments,
  buildPlannedDrafts,
  deletePlannedInvestment,
  fetchPlannedInvestments,
  formatStartMonth,
  linkOwnSip,
  monthStart,
  ownSipDraft,
  PLANNED_REMIND_DAYS_BEFORE,
  setPlannedInvestmentStatus,
  type PlannedInvestment,
} from "@/lib/plannedInvestments";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import { saveAnalyseProfile } from "@/lib/saveAnalyseProfile";
import { getSupabase } from "@/lib/supabase";
import { useRestoreAnalyseSnapshot } from "@/lib/useRestoreAnalyseSnapshot";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_PILL: Record<GoalHubStatus, { label: string; cls: string }> = {
  on_track: { label: "On track", cls: "bg-[#F7FDF9] text-[#1D9E75]" },
  behind: { label: "Behind", cls: "bg-[#FFF3E6] text-[#BA7517]" },
  planned: { label: "Planned", cls: "bg-[#EEEDFE] text-[#534AB7]" },
  not_started: { label: "Not started", cls: "bg-[#F7F7F4] text-[#5F5E5A]" },
  via_emi: { label: "Via EMIs", cls: "bg-[#F7F7F4] text-[#5F5E5A]" },
};

const BAR: Record<GoalHubStatus, string> = {
  on_track: "bg-[#1D9E75]",
  behind: "bg-[#BA7517]",
  planned: "bg-[#534AB7]",
  not_started: "bg-[#D3D1C7]",
  via_emi: "bg-[#D3D1C7]",
};

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

const rupees = (v: number) => `₹${formatIndian(Math.round(v))}`;

type Sheet =
  | { kind: "add" }
  | { kind: "edit"; goal: DetectedGoal }
  | { kind: "plan"; item: GoalHubItem }
  | { kind: "link"; item: GoalHubItem }
  | null;

export default function GoalsPage() {
  return (
    <ProtectedGate>
      <GoalsContent />
    </ProtectedGate>
  );
}

function GoalsContent() {
  const user = useAuthStore((s) => s.user);
  const { result, lastSubmission, hasHydrated } = useFinancialStore();
  useRestoreAnalyseSnapshot(user?.id);

  const [sips, setSips] = useState<PlannedInvestment[]>([]);
  const [sipError, setSipError] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadSips = useCallback(async () => {
    if (!user?.id) return;
    try {
      setSips(await fetchPlannedInvestments(getSupabase(), user.id));
      setSipError("");
    } catch {
      setSipError(
        "Couldn't load your linked SIPs. Refresh the page to try again.",
      );
    }
  }, [user?.id]);

  useEffect(() => {
    void loadSips();
  }, [loadSips]);

  const plan = useMemo(() => {
    if (!lastSubmission) return null;
    return buildPriorityPlan(
      lastSubmission,
      result ?? analyseFinances(lastSubmission),
    );
  }, [lastSubmission, result]);

  const hub = useMemo(
    () =>
      lastSubmission ? buildGoalsHub(lastSubmission, plan?.goals, sips) : null,
    [lastSubmission, plan, sips],
  );

  const saveProfile = async (next: FinancialProfile) => {
    setBusy("profile");
    setError("");
    const res = await saveAnalyseProfile(user?.id, next);
    setBusy(null);
    if (res.error)
      setError("Couldn't save. Your change is kept on this device.");
    return !res.error;
  };

  const runSip = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError("");
    try {
      await fn();
      await loadSips();
    } catch {
      setError(
        "Couldn't update that SIP. Check your connection and try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  if (!hasHydrated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-[#5F5E5A]">Loading your goals…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6 md:pb-10">
      <BackLink fallbackHref="/profile" label="Back" />
      <div className="mb-6 mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111110]">My goals</h1>
          <p className="mt-2 max-w-xl text-sm text-[#5F5E5A]">
            Everything you&apos;re saving for, the monthly SIP each goal needs,
            and the SIPs you&apos;ve linked to it.
          </p>
        </div>
        {lastSubmission ? (
          <button
            type="button"
            onClick={() => setSheet({ kind: "add" })}
            disabled={
              (lastSubmission.customGoals?.length ?? 0) >= MAX_CUSTOM_GOALS
            }
            className="min-h-[44px] shrink-0 rounded-xl bg-[#534AB7] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            + Add a goal
          </button>
        ) : null}
      </div>

      {!lastSubmission || !hub ? (
        <div className="rounded-2xl border border-[#E8E6F0] bg-white p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🎯
          </p>
          <h2 className="mt-2 text-lg font-bold text-[#111110]">
            Find your goals in 5 minutes
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#5F5E5A]">
            Take the money health check. We pick up your goals from your
            answers, work out the SIP each one needs, and track them here.
          </p>
          <Link
            href="/analyse"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#534AB7] px-5 text-sm font-semibold text-white"
          >
            Start the health check
          </Link>
        </div>
      ) : (
        <>
          <Summary hub={hub} />

          {promptedGoalOffers(lastSubmission).map((offer) => (
            <div
              key={offer}
              className="mt-3 rounded-2xl border border-[#E8E6F0] bg-[#EEEDFE] p-4"
            >
              <p className="text-sm font-semibold text-[#111110]">
                {OFFER_COPY[offer].q}
              </p>
              <p className="mt-0.5 text-[13px] text-[#5F5E5A]">
                {OFFER_COPY[offer].sub}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void saveProfile(
                      answerPromptedGoal(lastSubmission, offer, true),
                    )
                  }
                  className="min-h-[44px] rounded-lg bg-[#534AB7] px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Yes, add it
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void saveProfile(
                      answerPromptedGoal(lastSubmission, offer, false),
                    )
                  }
                  className="min-h-[44px] rounded-lg border border-[#E8E6F0] bg-white px-4 text-sm font-semibold text-[#534AB7] disabled:opacity-60"
                >
                  Not now
                </button>
              </div>
            </div>
          ))}

          {sipError ? (
            <p className="mt-3 text-sm text-[#E24B4A]">{sipError}</p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-[#E24B4A]">{error}</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {hub.items.map((item) => (
              <GoalCard
                key={item.goal.id}
                item={item}
                busy={busy}
                onEdit={() => setSheet({ kind: "edit", goal: item.goal })}
                onRemove={() =>
                  void saveProfile(dismissGoal(lastSubmission, item.goal.id))
                }
                onPlan={() => setSheet({ kind: "plan", item })}
                onLink={() => setSheet({ kind: "link", item })}
                onStart={(s) =>
                  void runSip(s.id, () =>
                    setPlannedInvestmentStatus(
                      getSupabase(),
                      s.user_id,
                      s.id,
                      "started",
                    ),
                  )
                }
                onUnlink={(s) =>
                  void runSip(s.id, () =>
                    deletePlannedInvestment(getSupabase(), s.user_id, s.id),
                  )
                }
              />
            ))}
          </div>

          {(lastSubmission.dismissedGoals?.length ?? 0) > 0 ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void saveProfile(restoreDismissedGoals(lastSubmission))
              }
              className="mt-3 min-h-[44px] text-sm font-semibold text-[#534AB7] disabled:opacity-60"
            >
              Show {lastSubmission.dismissedGoals?.length} hidden{" "}
              {lastSubmission.dismissedGoals?.length === 1 ? "goal" : "goals"}
            </button>
          ) : null}

          {hub.orphanSips.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-[#E8E6F0] bg-white p-4">
              <p className="text-sm font-semibold text-[#111110]">
                SIPs linked to goals you removed
              </p>
              {hub.orphanSips.map((s) => (
                <div
                  key={s.id}
                  className="mt-2 flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 text-[#5F5E5A]">
                    {s.source_label} · {s.instrument_label} ·{" "}
                    {rupees(s.monthly_amount)}/mo
                  </span>
                  <button
                    type="button"
                    disabled={busy === s.id}
                    onClick={() =>
                      void runSip(s.id, () =>
                        deletePlannedInvestment(getSupabase(), s.user_id, s.id),
                      )
                    }
                    className="min-h-[44px] shrink-0 px-2 font-semibold text-[#E24B4A] disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <p className="mt-6 text-xs leading-relaxed text-[#9B9A94]">
            Amounts are in today&apos;s rupees. The monthly need assumes typical
            returns for each goal&apos;s time left. Finkoin never invests or
            moves money: you start each SIP yourself and mark it here.{" "}
            <Link
              href="/analyse/fixplan"
              className="font-semibold text-[#534AB7]"
            >
              See the full plan
            </Link>
          </p>
        </>
      )}

      <p className="mt-8 text-center text-xs text-[#9B9A94]">
        Educational guidance only.{" "}
        <Link href="/legal/disclaimer" className="font-semibold text-[#534AB7]">
          Disclaimer
        </Link>
      </p>

      {lastSubmission ? (
        <>
          <AddGoalSheet
            isOpen={sheet?.kind === "add"}
            onClose={() => setSheet(null)}
            saving={busy === "profile"}
            error={error}
            onSave={async (g) => {
              if (await saveProfile(addCustomGoal(lastSubmission, g)))
                setSheet(null);
            }}
          />
          <EditGoalSheet
            goal={sheet?.kind === "edit" ? sheet.goal : null}
            onClose={() => setSheet(null)}
            saving={busy === "profile"}
            error={error}
            onSave={async (goalId, edit) => {
              if (
                await saveProfile(applyGoalEdit(lastSubmission, goalId, edit))
              )
                setSheet(null);
            }}
          />
          <PlanSipSheet
            item={sheet?.kind === "plan" ? sheet.item : null}
            userId={user?.id ?? null}
            onClose={() => setSheet(null)}
            onSaved={() => {
              setSheet(null);
              void loadSips();
            }}
          />
          <LinkSipSheet
            item={sheet?.kind === "link" ? sheet.item : null}
            userId={user?.id ?? null}
            onClose={() => setSheet(null)}
            onSaved={() => {
              setSheet(null);
              void loadSips();
            }}
          />
        </>
      ) : null}
    </main>
  );
}

function Summary({
  hub,
}: {
  hub: NonNullable<ReturnType<typeof buildGoalsHub>>;
}) {
  const { goals, onTrack, monthlyRequired, linkedMonthly } = hub.totals;
  const pct =
    monthlyRequired > 0
      ? Math.min(100, Math.round((linkedMonthly / monthlyRequired) * 100))
      : 100;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-[#5F5E5A]">
          {onTrack} of {goals} {goals === 1 ? "goal" : "goals"} on track
        </p>
        <p className="text-sm font-semibold tabular-nums text-[#534AB7]">
          {pct}% funded
        </p>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[#111110]">
        {rupees(linkedMonthly)}
        <span className="text-base font-semibold text-[#9B9A94]">
          {" "}
          / {rupees(monthlyRequired)} a month
        </span>
      </p>
      <p className="text-[13px] text-[#5F5E5A]">
        SIPs linked to your goals, against what they need
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F7F7F4]">
        <div
          className="h-full rounded-full bg-[#534AB7]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}

function GoalCard({
  item,
  busy,
  onEdit,
  onRemove,
  onPlan,
  onLink,
  onStart,
  onUnlink,
}: {
  item: GoalHubItem;
  busy: string | null;
  onEdit: () => void;
  onRemove: () => void;
  onPlan: () => void;
  onLink: () => void;
  onStart: (s: PlannedInvestment) => void;
  onUnlink: (s: PlannedInvestment) => void;
}) {
  const { goal } = item;
  const pill = STATUS_PILL[item.status];
  const canEdit = goal.editable.amount || goal.editable.year;
  const canPlan =
    item.status !== "via_emi" &&
    (item.planGoal?.allocation?.slices.some((s) => s.monthly > 0) ?? false) &&
    item.linkedMonthly + item.plannedMonthly < item.monthlyRequired;
  const funded = item.status !== "via_emi";

  return (
    <article className="rounded-2xl border border-[#E8E6F0] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {GOAL_EMOJI[goal.type] ?? "🎯"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-bold text-[#111110]">{goal.label}</h2>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill.cls}`}
            >
              {pill.label}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] font-medium tabular-nums text-[#5F5E5A]">
            {formatIndianCompact(goal.targetAmount)} by {goal.targetYear} ·{" "}
            {goal.yearsToGoal} {goal.yearsToGoal === 1 ? "year" : "years"} left
            {goal.isDefaultTarget ? " · suggested amount" : ""}
          </p>
          {goal.calculation ? (
            <p className="mt-1 text-xs leading-snug text-[#5F5E5A]">
              <span className="font-semibold">How it&apos;s worked out: </span>
              {goal.calculation}
            </p>
          ) : null}
        </div>
      </div>

      {funded ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F7F7F4]">
            <div
              className={`h-full rounded-full ${BAR[item.status]}`}
              style={{ width: `${item.coveragePct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[13px] font-semibold text-[#111110]">
            {goalStatusLine(item, formatStartMonth)}
          </p>
          <p className="mt-0.5 text-xs text-[#5F5E5A]">
            Needs {rupees(item.monthlyRequired)}/month · linked{" "}
            {rupees(item.linkedMonthly)}
            {item.suggestedMonthly > 0
              ? ` · your plan sets aside ${rupees(item.suggestedMonthly)}`
              : ""}
            {item.currentSaved > 0
              ? ` · saved so far ${formatIndianCompact(item.currentSaved)}`
              : ""}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-[#5F5E5A]">
          {goalStatusLine(item, formatStartMonth)}.{" "}
          <Link href="/tracker" className="font-semibold text-[#534AB7]">
            See them in Tracker
          </Link>
        </p>
      )}

      {item.sips.length > 0 ? (
        <ul className="mt-3 divide-y divide-[#F7F7F4] rounded-xl border border-[#E8E6F0]">
          {item.sips.map((s) => {
            const started = s.status !== "pending";
            return (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#111110]">
                    {s.instrument_label}
                  </p>
                  <p className="text-[11px] text-[#9B9A94]">
                    {rupees(s.monthly_amount)}/mo ·{" "}
                    {started
                      ? "Running"
                      : `Starts ${formatStartMonth(s.start_month)}`}
                  </p>
                </div>
                {!started ? (
                  <button
                    type="button"
                    disabled={busy === s.id}
                    onClick={() => onStart(s)}
                    className="min-h-[44px] shrink-0 rounded-lg px-2 text-[12px] font-semibold text-[#534AB7] disabled:opacity-60"
                  >
                    Mark started
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`Unlink ${s.instrument_label}`}
                  disabled={busy === s.id}
                  onClick={() => onUnlink(s)}
                  className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-[16px] text-[#9B9A94] disabled:opacity-60"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {canPlan ? (
          <button
            type="button"
            onClick={onPlan}
            className="min-h-[44px] rounded-lg bg-[#EEEDFE] px-3 text-sm font-semibold text-[#534AB7]"
          >
            Plan suggested SIPs
          </button>
        ) : null}
        {funded ? (
          <button
            type="button"
            onClick={onLink}
            className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-[#534AB7]"
          >
            Link a SIP I have
          </button>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-[#534AB7]"
          >
            Edit
          </button>
        ) : null}
        {goal.removable ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={onRemove}
            className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-[#E24B4A] disabled:opacity-60"
          >
            {goal.source === "custom" ? "Delete" : "Not my goal"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function YearField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const thisYear = new Date().getFullYear();
  const y = Number(value);
  const invalid = !Number.isFinite(y) || y <= thisYear || y > thisYear + 60;
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[#5F5E5A]"
      >
        Target year
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={thisYear + 1}
        max={thisYear + 60}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: 16 }}
        className="min-h-[52px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-4 font-semibold text-[#111110] outline-none focus:border-[#534AB7]"
      />
      {invalid ? (
        <p className="mt-1 text-sm text-[#E24B4A]">
          Pick a year between {thisYear + 1} and {thisYear + 60}.
        </p>
      ) : null}
    </div>
  );
}

const yearOk = (v: string) => {
  const thisYear = new Date().getFullYear();
  const y = Number(v);
  return Number.isFinite(y) && y > thisYear && y <= thisYear + 60;
};

function AddGoalSheet({
  isOpen,
  onClose,
  saving,
  error,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  error: string;
  onSave: (g: {
    label: string;
    targetAmount: number;
    targetYear: number;
  }) => Promise<void>;
}) {
  const thisYear = new Date().getFullYear();
  const [preset, setPreset] = useState(CUSTOM_GOAL_PRESETS[0].key);
  const [label, setLabel] = useState(CUSTOM_GOAL_PRESETS[0].label);
  const [amountRaw, setAmountRaw] = useState(
    String(CUSTOM_GOAL_PRESETS[0].targetAmount),
  );
  const [yearRaw, setYearRaw] = useState(
    String(thisYear + CUSTOM_GOAL_PRESETS[0].years),
  );
  const [formKey, setFormKey] = useState(0);

  const pick = (key: string) => {
    const p = CUSTOM_GOAL_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPreset(key);
    setLabel(p.key === "other" ? "" : p.label);
    setAmountRaw(String(p.targetAmount));
    setYearRaw(String(thisYear + p.years));
    setFormKey((k) => k + 1);
  };

  const amount = handleMoneyInput(amountRaw) ?? 0;
  const valid = label.trim().length > 0 && amount > 0 && yearOk(yearRaw);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add a goal">
      <div className="pt-1">
        <div className="mb-4 flex flex-wrap gap-2">
          {CUSTOM_GOAL_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={preset === p.key}
              onClick={() => pick(p.key)}
              className={`min-h-[40px] rounded-full border px-3 text-[13px] font-semibold ${
                preset === p.key
                  ? "border-[#534AB7] bg-[#534AB7] text-white"
                  : "border-[#E8E6F0] bg-white text-[#5F5E5A]"
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
        <div className="mb-5">
          <label
            htmlFor="goal-name"
            className="mb-1.5 block text-sm font-medium text-[#5F5E5A]"
          >
            Goal name
          </label>
          <input
            id="goal-name"
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Europe trip"
            style={{ fontSize: 16 }}
            className="min-h-[52px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-4 font-semibold text-[#111110] outline-none focus:border-[#534AB7]"
          />
        </div>
        <MoneyInput
          key={`add-amount-${formKey}`}
          id="goal-add-amount"
          label="Target amount (today's rupees)"
          defaultValue={formatIndian(Number(amountRaw) || 0)}
          onChange={(e) => setAmountRaw(e.target.value)}
        />
        <YearField id="goal-add-year" value={yearRaw} onChange={setYearRaw} />
        {error ? <p className="mb-3 text-sm text-[#E24B4A]">{error}</p> : null}
        <button
          type="button"
          disabled={!valid || saving}
          onClick={() =>
            void onSave({
              label: label.trim(),
              targetAmount: amount,
              targetYear: Number(yearRaw),
            })
          }
          className="min-h-[48px] w-full rounded-xl bg-[#534AB7] text-base font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add goal"}
        </button>
      </div>
    </BottomSheet>
  );
}

function EditGoalSheet({
  goal,
  onClose,
  saving,
  error,
  onSave,
}: {
  goal: DetectedGoal | null;
  onClose: () => void;
  saving: boolean;
  error: string;
  onSave: (goalId: string, edit: GoalEdit) => Promise<void>;
}) {
  const [amountRaw, setAmountRaw] = useState("");
  const [yearRaw, setYearRaw] = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [interiors, setInteriors] = useState(true);
  useEffect(() => {
    if (!goal) return;
    setAmountRaw(String(goal.targetAmount));
    setYearRaw(String(goal.targetYear));
    setPriceRaw(String(goal.home?.price ?? ""));
    setInteriors(goal.home?.includeInteriors ?? true);
  }, [goal]);

  const amount = handleMoneyInput(amountRaw);
  const price = handleMoneyInput(priceRaw);
  const upfront =
    price != null && price > 0
      ? Math.round(price * homeUpfrontShare(interiors))
      : 0;
  const yearValid = !goal?.editable.year || yearOk(yearRaw);

  return (
    <BottomSheet
      isOpen={goal !== null}
      onClose={onClose}
      title={goal ? `Edit: ${goal.label}` : "Edit goal"}
    >
      {goal ? (
        <div className="pt-1">
          {goal.home ? (
            <div className="mb-5">
              <MoneyInput
                key={`${goal.id}-price`}
                id="goal-edit-home-price"
                label="Price of the home you want"
                helper={
                  goal.home.priceIsEstimate
                    ? "Our estimate from your rent - change it to your real budget."
                    : undefined
                }
                defaultValue={formatIndian(goal.home.price)}
                onChange={(e) => setPriceRaw(e.target.value)}
              />
              <label className="mb-3 flex min-h-11 items-center gap-3 text-sm font-medium text-[#2C2C2A]">
                <input
                  type="checkbox"
                  checked={interiors}
                  onChange={(e) => setInteriors(e.target.checked)}
                  className="h-5 w-5 accent-[#534AB7]"
                />
                Include interiors (10% of price)
              </label>
              <div className="rounded-xl bg-[#EEEDFE] px-4 py-3 text-sm text-[#3C3489]">
                <div className="flex justify-between">
                  <span>Downpayment (20%)</span>
                  <span>₹{formatIndian(Math.round((price ?? 0) * 0.2))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stamp duty and registration (10%)</span>
                  <span>₹{formatIndian(Math.round((price ?? 0) * 0.1))}</span>
                </div>
                {interiors ? (
                  <div className="flex justify-between">
                    <span>Interiors (10%)</span>
                    <span>₹{formatIndian(Math.round((price ?? 0) * 0.1))}</span>
                  </div>
                ) : null}
                <div className="mt-1 flex justify-between font-bold text-[#534AB7]">
                  <span>Upfront cash goal</span>
                  <span>₹{formatIndian(upfront)}</span>
                </div>
              </div>
            </div>
          ) : goal.editable.amount ? (
            <MoneyInput
              key={`${goal.id}-amount`}
              id="goal-edit-amount"
              label="Target amount (today's rupees)"
              defaultValue={formatIndian(goal.targetAmount)}
              onChange={(e) => setAmountRaw(e.target.value)}
            />
          ) : null}
          {goal.editable.year ? (
            <YearField
              id="goal-edit-year"
              value={yearRaw}
              onChange={setYearRaw}
            />
          ) : (
            <p className="mb-5 text-sm font-medium text-[#5F5E5A]">
              Target year {goal.targetYear} is set by your child&apos;s age.
            </p>
          )}
          {error ? (
            <p className="mb-3 text-sm text-[#E24B4A]">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={saving || !yearValid}
            onClick={() =>
              void onSave(goal.id, {
                ...(goal.home
                  ? {
                      homePrice: price != null && price > 0 ? price : undefined,
                      homeIncludeInteriors: interiors,
                    }
                  : {}),
                targetAmount:
                  !goal.home &&
                  goal.editable.amount &&
                  amount != null &&
                  amount > 0
                    ? amount
                    : undefined,
                targetYear: goal.editable.year ? Number(yearRaw) : undefined,
              })
            }
            className="min-h-[48px] w-full rounded-xl bg-[#534AB7] text-base font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save goal"}
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}

function PlanSipSheet({
  item,
  userId,
  onClose,
  onSaved,
}: {
  item: GoalHubItem | null;
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [offset, setOffset] = useState<0 | 1>(1);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const startMonth = monthStart(new Date(), offset);
  const drafts = useMemo(
    () =>
      item?.planGoal ? buildPlannedDrafts([item.planGoal], startMonth) : [],
    [item, startMonth],
  );
  const total = drafts.reduce((s, d) => s + d.monthly_amount, 0);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError("");
    try {
      await addPlannedInvestments(getSupabase(), userId, drafts);
      setAgreed(false);
      onSaved();
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={item !== null}
      onClose={onClose}
      title={item ? `SIPs for ${item.goal.label}` : "Plan SIPs"}
    >
      {item ? (
        <div className="space-y-4 pb-4 text-[14px] leading-relaxed text-[#5F5E5A]">
          <p>
            Your plan sets aside {rupees(total)}/month for this goal, split by
            how far away it is. We&apos;ll remind you{" "}
            {PLANNED_REMIND_DAYS_BEFORE} days before they start. Nothing is ever
            invested or debited: you start each SIP yourself, wherever you like.
          </p>
          <ul className="space-y-1 rounded-xl border border-[#E8E6F0] p-3 text-[13px]">
            {drafts.map((d) => (
              <li key={d.instrument_key} className="flex justify-between gap-3">
                <span className="text-[#111110]">{d.instrument_label}</span>
                <span className="shrink-0 tabular-nums">
                  {rupees(d.monthly_amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            {([0, 1] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOffset(o)}
                className={`min-h-[44px] rounded-xl border text-[14px] font-semibold ${
                  offset === o
                    ? "border-[#534AB7] bg-[#534AB7] text-white"
                    : "border-[#E8E6F0] bg-white text-[#5F5E5A]"
                }`}
              >
                {o === 0 ? "This month" : "Next month"} ·{" "}
                {formatStartMonth(monthStart(new Date(), o))}
              </button>
            ))}
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 accent-[#534AB7]"
            />
            <span className="text-[13px]">
              I understand Finkoin only stores these planned amounts and reminds
              me. I can remove them anytime.
            </span>
          </label>
          {error ? <p className="text-[13px] text-[#E24B4A]">{error}</p> : null}
          <button
            type="button"
            disabled={!agreed || saving || drafts.length === 0}
            onClick={() => void save()}
            className="min-h-[48px] w-full rounded-xl bg-[#534AB7] text-[15px] font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Plan these SIPs"}
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}

function LinkSipSheet({
  item,
  userId,
  onClose,
  onSaved,
}: {
  item: GoalHubItem | null;
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!item) return;
    setName("");
    setAmountRaw("");
    setError("");
  }, [item]);

  const draft = item
    ? ownSipDraft(
        { id: item.goal.id, label: item.goal.label },
        name,
        handleMoneyInput(amountRaw) ?? 0,
      )
    : null;

  const save = async () => {
    if (!userId || !draft) return;
    setSaving(true);
    setError("");
    try {
      await linkOwnSip(getSupabase(), userId, draft);
      onSaved();
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={item !== null}
      onClose={onClose}
      title={item ? `Link a SIP to ${item.goal.label}` : "Link a SIP"}
    >
      {item ? (
        <div className="pt-1">
          <p className="mb-4 text-[13px] text-[#5F5E5A]">
            Already running a SIP, RD or PPF deposit for this goal? Add it here
            so it counts towards the goal.
          </p>
          <div className="mb-5">
            <label
              htmlFor="sip-name"
              className="mb-1.5 block text-sm font-medium text-[#5F5E5A]"
            >
              Fund or scheme
            </label>
            <input
              id="sip-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Parag Parikh Flexi Cap"
              style={{ fontSize: 16 }}
              className="min-h-[52px] w-full rounded-xl border-[1.5px] border-[#E8E6F0] px-4 font-semibold text-[#111110] outline-none focus:border-[#534AB7]"
            />
          </div>
          <MoneyInput
            key={`${item.goal.id}-sip`}
            id="sip-amount"
            label="Monthly amount"
            onChange={(e) => setAmountRaw(e.target.value)}
          />
          {error ? (
            <p className="mb-3 text-sm text-[#E24B4A]">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={!draft || saving}
            onClick={() => void save()}
            className="min-h-[48px] w-full rounded-xl bg-[#534AB7] text-base font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Link SIP"}
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
