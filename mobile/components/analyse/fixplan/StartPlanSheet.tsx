import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Colors, Radius, Spacing, themedStyles } from "@/constants/theme";
import {
  buildPlannedDrafts,
  formatStartMonth,
  monthStart,
  PLANNED_REMIND_DAYS_BEFORE,
  savePlannedInvestments,
} from "@/lib/plannedInvestments";
import type { GoalItem } from "@/lib/priorityEngine";
import { getSupabase } from "@/lib/supabase";

/** Matches web StartPlanSheet: consent before any reminder is created. Nothing is ever invested. */
export function StartPlanSheet({
  visible,
  onClose,
  userId,
  goals,
  hasExisting,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  goals: GoalItem[];
  hasExisting: boolean;
  onSaved: () => void;
}) {
  const [offset, setOffset] = useState<0 | 1>(1);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startMonth = monthStart(new Date(), offset);
  const drafts = useMemo(
    () => buildPlannedDrafts(goals, startMonth),
    [goals, startMonth],
  );
  const total = drafts.reduce((s, d) => s + d.monthly_amount, 0);
  const goalCount = new Set(drafts.map((d) => d.source_id)).size;
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
        <Text style={[styles.boxTitle, { color: Colors.primary }]}>
          What will happen
        </Text>
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
      <View style={styles.choices}>
        {([0, 1] as const).map((o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: offset === o }}
            onPress={() => setOffset(o)}
            style={[styles.choice, offset === o && styles.choiceOn]}
          >
            <Text
              style={[
                styles.choiceText,
                offset === o && { color: Colors.onPrimary },
              ]}
            >
              {o === 0 ? "This month" : "Next month"} ·{" "}
              {formatStartMonth(monthStart(new Date(), o))}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.preview}>
        {drafts.map((d) => (
          <View
            key={`${d.source_id}|${d.instrument_key}`}
            style={styles.previewRow}
          >
            <Text style={styles.previewLabel}>
              <Text style={{ fontWeight: "600", color: Colors.textPrimary }}>
                {d.source_label}
              </Text>{" "}
              · {d.instrument_label}
            </Text>
            <Text style={styles.previewAmount}>
              ₹{d.monthly_amount.toLocaleString("en-IN")}
            </Text>
          </View>
        ))}
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
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  previewLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  previewAmount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  note: { marginTop: Spacing.sm, fontSize: 12, color: Colors.textMuted },
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
  secondaryText: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
}));
