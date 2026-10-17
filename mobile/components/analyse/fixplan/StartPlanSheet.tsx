import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import {
  buildPlannedDrafts,
  formatStartMonth,
  monthStart,
  PLANNED_REMIND_DAYS_BEFORE,
  plannedDraftKey,
  redistributeUnticked,
  savePlannedInvestments,
  START_MONTH_CHOICES,
  withoutSavingsAccount,
} from "@/lib/plannedInvestments";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type { GoalItem } from "@/lib/priorityEngine";
import { getSupabase } from "@/lib/supabase";
import { applyTrackerCover, trackerPlanFit } from "@/lib/trackerPlanFit";
import { GoldText } from "@/components/ui/GoldMirror";
import { useObligationStore } from "@/store/obligationStore";

const rs = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Matches web StartPlanSheet: consent before any reminder is created. Nothing is ever invested. */
export function StartPlanSheet({
  visible,
  onClose,
  userId,
  goals,
  profile,
  hasExisting,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  goals: GoalItem[];
  profile: FinancialProfile | null;
  hasExisting: boolean;
  onSaved: () => void;
}) {
  const [offset, setOffset] = useState(1);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [hasSavings, setHasSavings] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const obligations = useObligationStore((st) => st.obligations);
  useEffect(() => {
    if (visible && userId)
      void useObligationStore.getState().fetchObligations(userId);
  }, [visible, userId]);

  const startMonth = monthStart(new Date(), offset);
  const fit = useMemo(
    () => trackerPlanFit(obligations, profile, startMonth),
    [obligations, profile, startMonth],
  );
  const { allDrafts, taken } = useMemo(() => {
    const built = buildPlannedDrafts(goals, startMonth);
    const r = applyTrackerCover(
      hasSavings ? built : withoutSavingsAccount(built),
      fit.investmentCover,
    );
    return { allDrafts: r.drafts, taken: r.taken };
  }, [goals, startMonth, hasSavings, fit.investmentCover]);
  const asksSavings = useMemo(
    () =>
      buildPlannedDrafts(goals, startMonth).some(
        (d) => d.instrument_key === "savings_sweep",
      ),
    [goals, startMonth],
  );
  const drafts = useMemo(
    () => redistributeUnticked(allDrafts, off),
    [allDrafts, off],
  );
  const shown = new Map(drafts.map((d) => [plannedDraftKey(d), d]));
  const toggle = (key: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const total = drafts.reduce((s, d) => s + d.monthly_amount, 0);
  const goalCount = new Set(drafts.map((d) => d.source_id)).size;
  const anyOff = allDrafts.some((d) => off.has(plannedDraftKey(d)));
  const canSave = agreed && !saving && drafts.length > 0;

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
    <BottomSheet visible={visible} onClose={onClose} scroll>
      <Text style={styles.title}>Start this plan</Text>

      <View style={[styles.box, { backgroundColor: Colors.primaryLight }]}>
        <GoldText style={[styles.boxTitle, { color: Colors.primaryText }]}>
          What will happen
        </GoldText>
        <Text style={styles.body}>
          {drafts.length} planned{" "}
          {drafts.length === 1 ? "investment" : "investments"} across{" "}
          {goalCount} {goalCount === 1 ? "goal" : "goals"} (₹
          {total.toLocaleString("en-IN")}/month) will be added to your Tracker,
          and we&apos;ll remind you {PLANNED_REMIND_DAYS_BEFORE} days before
          they start.
        </Text>
      </View>
      <View style={[styles.box, { backgroundColor: Colors.warningLight }]}>
        <Text style={[styles.boxTitle, { color: Colors.warningText }]}>
          What won&apos;t happen
        </Text>
        <Text style={styles.body}>
          Nothing will ever be invested, debited or moved. Finkoin doesn&apos;t
          connect to your bank or broker and doesn&apos;t sell any of these
          products. You start each SIP yourself wherever you choose, then mark
          it started in Tracker.
        </Text>
      </View>

      <Text style={styles.label}>Start from</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.months}
      >
        {Array.from({ length: START_MONTH_CHOICES }, (_, o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: offset === o }}
            onPress={() => setOffset(o)}
            style={[styles.month, offset === o && styles.choiceOn]}
          >
            <Text
              style={[
                styles.choiceText,
                offset === o && { color: Colors.onPrimary },
              ]}
            >
              {formatStartMonth(monthStart(new Date(), o))}
            </Text>
            {o < 2 ? (
              <Text
                style={[
                  styles.monthHint,
                  offset === o && { color: Colors.onPrimary },
                ]}
              >
                {o === 0 ? "This month" : "Next month"}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {asksSavings ? (
        <>
          <Text style={styles.label}>
            Do you have a savings account or sweep-in FD to keep short-term goal
            money in?
          </Text>
          <View style={styles.choices}>
            {([true, false] as const).map((v) => (
              <Pressable
                key={String(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: hasSavings === v }}
                onPress={() => setHasSavings(v)}
                style={[styles.choice, hasSavings === v && styles.choiceOn]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    hasSavings === v && { color: Colors.onPrimary },
                  ]}
                >
                  {v ? "Yes" : "No, use a liquid fund"}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {fit.items.length ? (
        <View style={styles.preview}>
          <Text style={styles.boxTitle}>Already in your Tracker</Text>
          {fit.items.map((it) => (
            <View key={`${it.kind}|${it.title}`} style={styles.previewRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewLabel, { fontWeight: "600" }]}>
                  {it.title}
                </Text>
                <Text style={styles.subNote}>{it.note}</Text>
              </View>
              <Text style={styles.previewAmount}>{rs(it.monthly)}</Text>
            </View>
          ))}
          {fit.investmentCover > 0 ? (
            <Text style={styles.body}>
              Your running SIPs ({rs(fit.investmentCover)}/month) are taken off
              the suggestions below, so nothing is suggested twice.
            </Text>
          ) : null}
          {fit.premiumExtra > 0 ? (
            <Text style={[styles.body, { color: Colors.warningText }]}>
              Your premium savings need {rs(fit.premiumExtra)}/month more than
              the plan sets aside for premiums
              {fit.premiumExtraUntil
                ? ` until ${formatStartMonth(fit.premiumExtraUntil)}`
                : ""}
              . Keep that from your spare cash, or start this plan after they
              end.
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.note}>
        Untick anything you don&apos;t want. Its amount moves to the ticked
        items of the same goal, so your monthly total stays the same.
      </Text>
      <View style={styles.preview}>
        {allDrafts.map((d) => {
          const key = plannedDraftKey(d);
          const on = !off.has(key);
          return (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(key)}
              style={styles.previewRow}
            >
              <View style={[styles.smallBox, on && styles.checkboxOn]}>
                {on ? <Text style={styles.smallTick}>✓</Text> : null}
              </View>
              <Text style={[styles.previewLabel, !on && styles.offText]}>
                <Text style={{ fontWeight: "600" }}>{d.source_label}</Text> ·{" "}
                {d.instrument_label}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.previewAmount, !on && styles.offText]}>
                  {rs(shown.get(key)?.monthly_amount ?? d.monthly_amount)}
                </Text>
                {on && taken[key] ? (
                  <Text style={styles.subNote}>
                    {rs(taken[key])} already in Tracker
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        {anyOff ? (
          <Text style={styles.subNote}>
            Amounts above include what moved from the items you unticked.
          </Text>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total per month</Text>
          <Text style={styles.totalText}>₹{total.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      {hasExisting ? (
        <Text style={styles.note}>
          You already have planned investments. Ones you&apos;ve started stay
          started with the new amounts; pending ones are replaced by this plan.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed((v) => !v)}
        style={styles.agreeRow}
      >
        <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
          {agreed ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <Text style={styles.agreeText}>
          I understand Finkoin will only store these planned amounts and remind
          me. Nothing is invested automatically, and I can remove them anytime
          from Tracker.
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave, busy: saving }}
        disabled={!canSave}
        onPress={() => void save()}
        style={[styles.primary, !canSave && { opacity: 0.5 }]}
      >
        <Text style={styles.primaryText}>
          {saving
            ? "Saving…"
            : hasExisting
              ? "Update reminders"
              : "Create reminders"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>Not now</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  box: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  boxTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  body: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  choices: { flexDirection: "row", gap: Spacing.sm },
  choice: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  choiceOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  choiceText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  preview: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    minHeight: 36,
  },
  months: { gap: Spacing.sm, paddingVertical: 2 },
  month: {
    minHeight: 48,
    minWidth: 96,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  monthHint: { fontSize: 11, color: Colors.textMuted },
  smallBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  smallTick: { color: Colors.onPrimary, fontSize: 11, fontWeight: "700" },
  offText: { color: Colors.textMuted, textDecorationLine: "line-through" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  previewLabel: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  previewAmount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  note: { marginTop: Spacing.sm, fontSize: 12, color: Colors.textMuted },
  subNote: { fontSize: 11, color: Colors.textMuted },
  agreeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    minHeight: 44,
    marginTop: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: Colors.primary },
  tick: { color: Colors.onPrimary, fontSize: 13, fontWeight: "700" },
  agreeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  error: { marginTop: Spacing.sm, fontSize: 13, color: Colors.error },
  primary: {
    marginTop: Spacing.lg,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: Colors.onPrimary, fontSize: 15, fontWeight: "700" },
  secondary: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  secondaryText: { color: Colors.primaryText, fontSize: 14, fontWeight: "600" },
}));
