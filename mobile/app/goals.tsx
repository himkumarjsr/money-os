/**
 * My Goals — port of web app/goals/page.tsx. Goals come from the profile
 * (detectGoals + the user's own goals); each one shows the monthly SIP it
 * needs and the SIPs linked to it in user_planned_investments.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import MoneyInput from "@/components/ui/MoneyInput";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { Colors, readable, themedStyles, tintBg } from "@/constants/theme";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import {
  addCustomGoal,
  answerPromptedGoal,
  applyGoalEdit,
  CUSTOM_GOAL_PRESETS,
  dismissGoal,
  MAX_CUSTOM_GOALS,
  promptedGoalOffers,
  restoreDismissedGoals,
  type DetectedGoal,
  type PromptedGoalOffer,
} from "@/lib/goalDetection";
import {
  buildGoalsHub,
  GOAL_EMOJI,
  goalStatusLine,
  type GoalHubItem,
  type GoalHubStatus,
  type GoalsHub,
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
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";

const STATUS_PILL: Record<
  GoalHubStatus,
  { label: string; bg: string; fg: string }
> = {
  on_track: { label: "On track", bg: "#F7FDF9", fg: "#1D9E75" },
  behind: { label: "Behind", bg: "#FFF3E6", fg: "#BA7517" },
  planned: { label: "Planned", bg: "#EEEDFE", fg: "#534AB7" },
  not_started: { label: "Not started", bg: "#F7F7F4", fg: "#5F5E5A" },
  via_emi: { label: "Via EMIs", bg: "#F7F7F4", fg: "#5F5E5A" },
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

export default function GoalsScreen() {
  const user = useAuthStore((s) => s.user);
  const result = useFinancialStore((s) => s.result);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);

  const [sips, setSips] = useState<PlannedInvestment[]>([]);
  const [sipError, setSipError] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Restore the last health check from the account when this device has none.
  useEffect(() => {
    if (!hasHydrated || lastSubmission || !user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await fetchUserAnalyseSnapshot(user.id);
        if (cancelled || !snap?.lastSubmission) return;
        hydrateFromSnapshot(
          snap.lastSubmission,
          snap.result ?? analyseFinances(snap.lastSubmission),
          { analysisPatch: snap.analysis ?? undefined },
        );
      } catch {
        // No snapshot: the empty state points to the health check.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, lastSubmission, user?.id, hydrateFromSnapshot]);

  const loadSips = useCallback(async () => {
    if (!user?.id) return;
    try {
      setSips(await fetchPlannedInvestments(getSupabase(), user.id));
      setSipError("");
    } catch {
      setSipError("Couldn't load your linked SIPs. Pull down to try again.");
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

  const customCount = lastSubmission?.customGoals?.length ?? 0;
  const hiddenCount = lastSubmission?.dismissedGoals?.length ?? 0;

  return (
    <PageScaffold
      title="My goals"
      subtitle="Everything you're saving for, the monthly SIP each goal needs, and the SIPs you've linked to it."
      requireAuth
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await loadSips();
        setRefreshing(false);
      }}
    >
      {!lastSubmission || !hub ? (
        <View style={[pageStyles.card, { alignItems: "center" }]}>
          <Text style={{ fontSize: 30 }}>🎯</Text>
          <Text style={styles.emptyTitle}>Find your goals in 5 minutes</Text>
          <Text style={styles.emptyBody}>
            Take the money health check. We pick up your goals from your
            answers, work out the SIP each one needs, and track them here.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/analyse")}
            style={[
              pageStyles.primaryBtn,
              { marginTop: 16, alignSelf: "stretch" },
            ]}
            accessibilityRole="button"
          >
            <Text style={pageStyles.primaryBtnText}>
              Start the health check
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() => setSheet({ kind: "add" })}
            disabled={customCount >= MAX_CUSTOM_GOALS}
            style={[
              pageStyles.primaryBtn,
              customCount >= MAX_CUSTOM_GOALS && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={pageStyles.primaryBtnText}>+ Add a goal</Text>
          </Pressable>

          <Summary hub={hub} />

          {promptedGoalOffers(lastSubmission).map((offer) => (
            <View key={offer} style={styles.offer}>
              <Text style={styles.title}>{OFFER_COPY[offer].q}</Text>
              <Text style={styles.meta}>{OFFER_COPY[offer].sub}</Text>
              <View style={styles.row}>
                <Pressable
                  disabled={busy !== null}
                  onPress={() =>
                    void saveProfile(
                      answerPromptedGoal(lastSubmission, offer, true),
                    )
                  }
                  style={[
                    styles.smallPrimary,
                    busy !== null && styles.disabled,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.smallPrimaryText}>Yes, add it</Text>
                </Pressable>
                <Pressable
                  disabled={busy !== null}
                  onPress={() =>
                    void saveProfile(
                      answerPromptedGoal(lastSubmission, offer, false),
                    )
                  }
                  style={[styles.textBtn, busy !== null && styles.disabled]}
                  accessibilityRole="button"
                >
                  <Text style={styles.textBtnLabel}>Not now</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {sipError ? <Text style={styles.error}>{sipError}</Text> : null}
          {error && sheet === null ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

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

          {hiddenCount > 0 ? (
            <Pressable
              disabled={busy !== null}
              onPress={() =>
                void saveProfile(restoreDismissedGoals(lastSubmission))
              }
              style={styles.textBtn}
              accessibilityRole="button"
            >
              <Text style={styles.textBtnLabel}>
                Show {hiddenCount} hidden {hiddenCount === 1 ? "goal" : "goals"}
              </Text>
            </Pressable>
          ) : null}

          {hub.orphanSips.length > 0 ? (
            <View style={pageStyles.card}>
              <Text style={styles.title}>SIPs linked to goals you removed</Text>
              {hub.orphanSips.map((s) => (
                <View key={s.id} style={styles.sipRow}>
                  <Text style={[styles.meta, { flex: 1 }]}>
                    {s.source_label} · {s.instrument_label} ·{" "}
                    {rupees(s.monthly_amount)}/mo
                  </Text>
                  <Pressable
                    disabled={busy === s.id}
                    onPress={() =>
                      void runSip(s.id, () =>
                        deletePlannedInvestment(getSupabase(), s.user_id, s.id),
                      )
                    }
                    style={styles.textBtn}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[styles.textBtnLabel, { color: Colors.error }]}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.fine}>
            Amounts are in today&apos;s rupees. The monthly need assumes typical
            returns for each goal&apos;s time left. Finkoin never invests or
            moves money: you start each SIP yourself and mark it here.{" "}
            <Text
              style={pageStyles.link}
              onPress={() => router.push("/analyse/fixplan" as never)}
            >
              See the full plan
            </Text>
          </Text>
        </View>
      )}

      <Text style={pageStyles.footnote}>
        Educational guidance only.{" "}
        <Text
          style={pageStyles.link}
          onPress={() => router.push("/legal/disclaimer" as never)}
        >
          Disclaimer
        </Text>
      </Text>

      {lastSubmission ? (
        <>
          <AddGoalSheet
            visible={sheet?.kind === "add"}
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
    </PageScaffold>
  );
}

function Summary({ hub }: { hub: GoalsHub }) {
  const { goals, onTrack, monthlyRequired, linkedMonthly } = hub.totals;
  const pct =
    monthlyRequired > 0
      ? Math.min(100, Math.round((linkedMonthly / monthlyRequired) * 100))
      : 100;
  return (
    <View style={pageStyles.card}>
      <View style={styles.spread}>
        <Text style={styles.metaStrong}>
          {onTrack} of {goals} {goals === 1 ? "goal" : "goals"} on track
        </Text>
        <Text style={styles.pct}>{pct}% funded</Text>
      </View>
      <Text style={styles.big}>
        {rupees(linkedMonthly)}
        <Text style={styles.bigMuted}>
          {" "}
          / {rupees(monthlyRequired)} a month
        </Text>
      </Text>
      <Text style={styles.meta}>
        SIPs linked to your goals, against what they need
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: Colors.primary },
          ]}
        />
      </View>
    </View>
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
  const funded = item.status !== "via_emi";
  const canPlan =
    funded &&
    (item.planGoal?.allocation?.slices.some((s) => s.monthly > 0) ?? false) &&
    item.linkedMonthly + item.plannedMonthly < item.monthlyRequired;

  return (
    <View style={pageStyles.card}>
      <View style={styles.head}>
        <Text style={{ fontSize: 24 }}>{GOAL_EMOJI[goal.type] ?? "🎯"}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.spread}>
            <Text style={[styles.title, { flex: 1 }]}>{goal.label}</Text>
            <View style={[styles.pill, { backgroundColor: tintBg(pill.bg) }]}>
              <Text style={[styles.pillText, { color: readable(pill.fg) }]}>
                {pill.label}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {formatIndianCompact(goal.targetAmount)} by {goal.targetYear} ·{" "}
            {goal.yearsToGoal} {goal.yearsToGoal === 1 ? "year" : "years"} left
            {goal.isDefaultTarget ? " · suggested amount" : ""}
          </Text>
        </View>
      </View>

      {funded ? (
        <>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${item.coveragePct}%`,
                  backgroundColor:
                    item.status === "on_track"
                      ? Colors.success
                      : item.status === "behind"
                        ? readable("#BA7517")
                        : Colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.metaStrong, { marginTop: 6 }]}>
            {goalStatusLine(item, formatStartMonth)}
          </Text>
          <Text style={styles.small}>
            Needs {rupees(item.monthlyRequired)}/month · linked{" "}
            {rupees(item.linkedMonthly)}
            {item.suggestedMonthly > 0
              ? ` · your plan sets aside ${rupees(item.suggestedMonthly)}`
              : ""}
            {item.currentSaved > 0
              ? ` · saved so far ${formatIndianCompact(item.currentSaved)}`
              : ""}
          </Text>
        </>
      ) : (
        <Text style={[styles.meta, { marginTop: 8 }]}>
          {goalStatusLine(item, formatStartMonth)}.{" "}
          <Text
            style={pageStyles.link}
            onPress={() => router.push("/(tabs)/tracker" as never)}
          >
            See them in Tracker
          </Text>
        </Text>
      )}

      {item.sips.length > 0 ? (
        <View style={styles.sipList}>
          {item.sips.map((s) => {
            const started = s.status !== "pending";
            return (
              <View key={s.id} style={styles.sipRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sipName} numberOfLines={1}>
                    {s.instrument_label}
                  </Text>
                  <Text style={styles.small}>
                    {rupees(s.monthly_amount)}/mo ·{" "}
                    {started
                      ? "Running"
                      : `Starts ${formatStartMonth(s.start_month)}`}
                  </Text>
                </View>
                {!started ? (
                  <Pressable
                    disabled={busy === s.id}
                    onPress={() => onStart(s)}
                    style={styles.textBtn}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.textBtnLabel, { fontSize: 12 }]}>
                      Mark started
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  disabled={busy === s.id}
                  onPress={() => onUnlink(s)}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Unlink ${s.instrument_label}`}
                >
                  <Text style={styles.x}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.row, { flexWrap: "wrap" }]}>
        {canPlan ? (
          <Pressable
            onPress={onPlan}
            style={styles.tintBtn}
            accessibilityRole="button"
          >
            <Text style={styles.textBtnLabel}>Plan suggested SIPs</Text>
          </Pressable>
        ) : null}
        {funded ? (
          <Pressable
            onPress={onLink}
            style={styles.textBtn}
            accessibilityRole="button"
          >
            <Text style={styles.textBtnLabel}>Link a SIP I have</Text>
          </Pressable>
        ) : null}
        {canEdit ? (
          <Pressable
            onPress={onEdit}
            style={styles.textBtn}
            accessibilityRole="button"
          >
            <Text style={styles.textBtnLabel}>Edit</Text>
          </Pressable>
        ) : null}
        {goal.removable ? (
          <Pressable
            disabled={busy !== null}
            onPress={onRemove}
            style={[styles.textBtn, busy !== null && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={[styles.textBtnLabel, { color: Colors.error }]}>
              {goal.source === "custom" ? "Delete" : "Not my goal"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const yearOk = (v: string) => {
  const thisYear = new Date().getFullYear();
  const y = Number(v);
  return Number.isFinite(y) && y > thisYear && y <= thisYear + 60;
};

function YearField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const thisYear = new Date().getFullYear();
  const invalid = !yearOk(value);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.inputLabel}>Target year</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        style={[styles.input, invalid && { borderColor: Colors.error }]}
      />
      {invalid ? (
        <Text style={styles.error}>
          Pick a year between {thisYear + 1} and {thisYear + 60}.
        </Text>
      ) : null}
    </View>
  );
}

function AddGoalSheet({
  visible,
  onClose,
  saving,
  error,
  onSave,
}: {
  visible: boolean;
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
  const first = CUSTOM_GOAL_PRESETS[0];
  const [preset, setPreset] = useState(first.key);
  const [label, setLabel] = useState(first.label);
  const [amount, setAmount] = useState<number | null>(first.targetAmount);
  const [yearRaw, setYearRaw] = useState(String(thisYear + first.years));

  const pick = (key: string) => {
    const p = CUSTOM_GOAL_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPreset(key);
    setLabel(p.key === "other" ? "" : p.label);
    setAmount(p.targetAmount);
    setYearRaw(String(thisYear + p.years));
  };

  const valid = label.trim().length > 0 && (amount ?? 0) > 0 && yearOk(yearRaw);

  return (
    <BottomSheet visible={visible} onClose={onClose} scroll>
      <View style={{ gap: 16 }}>
        <Text style={styles.sheetTitle}>Add a goal</Text>
        <View style={[styles.row, { flexWrap: "wrap", marginTop: 0 }]}>
          {CUSTOM_GOAL_PRESETS.map((p) => {
            const on = preset === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => pick(p.key)}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {p.emoji} {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ gap: 6 }}>
          <Text style={styles.inputLabel}>Goal name</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            maxLength={60}
            placeholder="e.g. Europe trip"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
        </View>
        <MoneyInput
          label="Target amount (today's rupees)"
          value={amount}
          onChangeValue={setAmount}
        />
        <YearField value={yearRaw} onChange={setYearRaw} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          disabled={!valid || saving}
          onPress={() =>
            void onSave({
              label: label.trim(),
              targetAmount: amount ?? 0,
              targetYear: Number(yearRaw),
            })
          }
          style={[pageStyles.primaryBtn, (!valid || saving) && styles.disabled]}
          accessibilityRole="button"
        >
          <Text style={pageStyles.primaryBtnText}>
            {saving ? "Saving…" : "Add goal"}
          </Text>
        </Pressable>
      </View>
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
  onSave: (
    goalId: string,
    edit: { targetAmount?: number; targetYear?: number },
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState<number | null>(null);
  const [yearRaw, setYearRaw] = useState("");
  useEffect(() => {
    if (!goal) return;
    setAmount(goal.targetAmount);
    setYearRaw(String(goal.targetYear));
  }, [goal]);
  const yearValid = !goal?.editable.year || yearOk(yearRaw);

  return (
    <BottomSheet visible={goal !== null} onClose={onClose} scroll>
      {goal ? (
        <View style={{ gap: 16 }}>
          <Text style={styles.sheetTitle}>Edit: {goal.label}</Text>
          {goal.editable.amount ? (
            <MoneyInput
              label="Target amount (today's rupees)"
              value={amount}
              onChangeValue={setAmount}
            />
          ) : null}
          {goal.editable.year ? (
            <YearField value={yearRaw} onChange={setYearRaw} />
          ) : (
            <Text style={styles.meta}>
              Target year {goal.targetYear} is set by your child&apos;s age.
            </Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={saving || !yearValid}
            onPress={() =>
              void onSave(goal.id, {
                targetAmount:
                  goal.editable.amount && amount != null && amount > 0
                    ? amount
                    : undefined,
                targetYear: goal.editable.year ? Number(yearRaw) : undefined,
              })
            }
            style={[
              pageStyles.primaryBtn,
              (saving || !yearValid) && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={pageStyles.primaryBtnText}>
              {saving ? "Saving…" : "Save goal"}
            </Text>
          </Pressable>
        </View>
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
    <BottomSheet visible={item !== null} onClose={onClose} scroll>
      {item ? (
        <View style={{ gap: 14 }}>
          <Text style={styles.sheetTitle}>SIPs for {item.goal.label}</Text>
          <Text style={styles.body}>
            Your plan sets aside {rupees(total)}/month for this goal, split by
            how far away it is. We&apos;ll remind you{" "}
            {PLANNED_REMIND_DAYS_BEFORE} days before they start. Nothing is ever
            invested or debited: you start each SIP yourself, wherever you like.
          </Text>
          <View style={styles.sipList}>
            {drafts.map((d) => (
              <View key={d.instrument_key} style={styles.sipRow}>
                <Text style={[styles.sipName, { flex: 1 }]}>
                  {d.instrument_label}
                </Text>
                <Text style={styles.meta}>{rupees(d.monthly_amount)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.row}>
            {([0, 1] as const).map((o) => {
              const on = offset === o;
              return (
                <Pressable
                  key={o}
                  onPress={() => setOffset(o)}
                  style={[styles.monthBtn, on && styles.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {o === 0 ? "This month" : "Next month"} ·{" "}
                    {formatStartMonth(monthStart(new Date(), o))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setAgreed((a) => !a)}
            style={styles.consent}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.box, agreed && styles.boxOn]}>
              {agreed ? <Text style={styles.tick}>✓</Text> : null}
            </View>
            <Text style={[styles.body, { flex: 1 }]}>
              I understand Finkoin only stores these planned amounts and reminds
              me. I can remove them anytime.
            </Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={!agreed || saving || drafts.length === 0}
            onPress={() => void save()}
            style={[
              pageStyles.primaryBtn,
              (!agreed || saving || drafts.length === 0) && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={pageStyles.primaryBtnText}>
              {saving ? "Saving…" : "Plan these SIPs"}
            </Text>
          </Pressable>
        </View>
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
  const [amount, setAmount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!item) return;
    setName("");
    setAmount(null);
    setError("");
  }, [item]);

  const draft = item
    ? ownSipDraft(
        { id: item.goal.id, label: item.goal.label },
        name,
        amount ?? 0,
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
    <BottomSheet visible={item !== null} onClose={onClose} scroll>
      {item ? (
        <View style={{ gap: 16 }}>
          <Text style={styles.sheetTitle}>Link a SIP to {item.goal.label}</Text>
          <Text style={styles.body}>
            Already running a SIP, RD or PPF deposit for this goal? Add it here
            so it counts towards the goal.
          </Text>
          <View style={{ gap: 6 }}>
            <Text style={styles.inputLabel}>Fund or scheme</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={120}
              placeholder="e.g. Parag Parikh Flexi Cap"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
          <MoneyInput
            label="Monthly amount"
            value={amount}
            onChangeValue={setAmount}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={!draft || saving}
            onPress={() => void save()}
            style={[
              pageStyles.primaryBtn,
              (!draft || saving) && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={pageStyles.primaryBtnText}>
              {saving ? "Saving…" : "Link SIP"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  disabled: { opacity: 0.5 },
  emptyTitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptyBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  offer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.primaryLight,
    padding: 16,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  spread: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  meta: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  metaStrong: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  small: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  body: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  fine: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  pct: { fontSize: 13, fontWeight: "700", color: Colors.primaryText },
  big: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  bigMuted: { fontSize: 15, fontWeight: "600", color: Colors.textMuted },
  track: {
    marginTop: 12,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallPrimary: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  smallPrimaryText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  textBtn: { minHeight: 44, paddingHorizontal: 10, justifyContent: "center" },
  tintBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
  },
  textBtnLabel: { color: Colors.primaryText, fontSize: 14, fontWeight: "600" },
  iconBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  x: { fontSize: 18, color: Colors.textMuted },
  sipList: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sipRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  sipName: { fontSize: 13, fontWeight: "500", color: Colors.textPrimary },
  error: { fontSize: 13, color: Colors.error },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  inputLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
    justifyContent: "center",
  },
  monthBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  chipTextOn: { color: Colors.onPrimary },
  consent: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tick: { color: Colors.onPrimary, fontSize: 14, fontWeight: "700" },
}));
