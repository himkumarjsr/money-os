import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import MoneyInput from "@/components/ui/MoneyInput";
import { Colors, readable, themedStyles, tintBg } from "@/constants/theme";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { formatIndian } from "@/lib/formatters";
import {
  answerPromptedGoal,
  applyGoalEdit,
  detectGoals,
  dismissGoal,
  homeUpfrontShare,
  promptedGoalOffers,
  restoreDismissedGoals,
  type DetectedGoal,
  type PromptedGoalOffer,
} from "@/lib/goalDetection";
import type { GoalFundingItem } from "@/lib/goalFunding";
import { goalSavingsLines } from "@/lib/goalSavingsText";
import { buildGoalStrategies, projectGoalReach } from "@/lib/goalStrategies";
import { GoalStrategiesList } from "./GoalStrategiesList";
import { PlanAssumptionsCard } from "./PlanAssumptionsCard";
import { saveAnalyseProfile } from "@/lib/saveAnalyseProfile";
import { router } from "expo-router";

const OFFER_COPY: Record<PromptedGoalOffer, { q: string; sub: string }> = {
  marriage: {
    q: "Planning to get married?",
    sub: "We'll add a wedding fund to your goals.",
  },
  baby: {
    q: "Planning a baby?",
    sub: "We'll add a childbirth and first-year fund.",
  },
  home_purchase: {
    q: "Planning to buy a home?",
    sub: "We'll add the cash you need upfront. You can set the price and year.",
  },
  vehicle_purchase: {
    q: "Planning to buy a car?",
    sub: "We'll add a car fund, so you can buy it without a loan.",
  },
};

export function GoalsSection({
  profile,
  userId,
  funding,
  statusOnly = false,
}: {
  profile: FinancialProfile;
  userId?: string | null;
  /** Fix Plan goal funding: shows the money already counted toward each goal. */
  funding?: GoalFundingItem[];
  /** Report: where each goal stands, without fixes (they're in the plan). */
  statusOnly?: boolean;
}) {
  const goals = useMemo(() => detectGoals(profile), [profile]);
  const offers = useMemo(() => promptedGoalOffers(profile), [profile]);
  const hiddenCount = profile.dismissedGoals?.length ?? 0;
  const strategiesById = useMemo(
    () => new Map(buildGoalStrategies(profile).map((s) => [s.goalId, s])),
    [profile],
  );
  const fundingById = useMemo(
    () => new Map((funding ?? []).map((f) => [f.goalId, f])),
    [funding],
  );

  const [editing, setEditing] = useState<DetectedGoal | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [yearRaw, setYearRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const thisYear = new Date().getFullYear();

  const save = async (next: FinancialProfile) => {
    setSaving(true);
    setError(null);
    const res = await saveAnalyseProfile(userId, next);
    setSaving(false);
    if (res.error)
      setError("Couldn't save - your change is kept on this device.");
    return !res.error;
  };

  const openEdit = (g: DetectedGoal) => {
    setEditing(g);
    setAmount(g.home ? g.home.price : g.targetAmount);
    setYearRaw(String(g.targetYear));
    setError(null);
  };

  const yearNum = Number(yearRaw);
  const yearInvalid =
    !!editing?.editable.year &&
    (!Number.isFinite(yearNum) ||
      yearNum <= thisYear ||
      yearNum > thisYear + 60);

  const submitEdit = async () => {
    if (!editing || yearInvalid) return;
    const valid = editing.editable.amount && amount != null && amount > 0;
    const next = applyGoalEdit(profile, editing.id, {
      // For a home the user enters the price; the upfront cash follows.
      ...(editing.home ? { homePrice: valid ? amount : undefined } : {}),
      targetAmount: !editing.home && valid ? amount : undefined,
      targetYear: editing.editable.year ? yearNum : undefined,
    });
    await save(next);
    setEditing(null);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>Your goals</Text>
      <Text style={styles.sub}>
        Picked up from your answers - no extra questions. Edit anything
        that&apos;s off.
      </Text>

      {offers.map((offer) => (
        <View key={offer} style={styles.offer}>
          <Text style={styles.goalTitle}>{OFFER_COPY[offer].q}</Text>
          <Text style={styles.meta}>{OFFER_COPY[offer].sub}</Text>
          <View style={styles.row}>
            <Pressable
              disabled={saving}
              onPress={() =>
                void save(answerPromptedGoal(profile, offer, true))
              }
              style={[styles.primaryBtn, saving && styles.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Yes, add it</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() =>
                void save(answerPromptedGoal(profile, offer, false))
              }
              style={[styles.secondaryBtn, saving && styles.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <View style={{ marginTop: 12, gap: 8 }}>
        {goals.map((g) => {
          const canEdit = g.editable.amount || g.editable.year;
          return (
            <View key={g.id} style={styles.goal}>
              <View style={styles.goalHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>{g.label}</Text>
                  <Text style={styles.goalAmount}>
                    ₹{formatIndian(g.targetAmount)} by {g.targetYear} ·{" "}
                    {g.yearsToGoal} {g.yearsToGoal === 1 ? "year" : "years"}{" "}
                    left
                  </Text>
                  <Text style={styles.reason}>{g.reason}</Text>
                  {g.calculation ? (
                    <Text style={styles.reason}>
                      <Text style={{ fontWeight: "700" }}>
                        How it&apos;s worked out:{" "}
                      </Text>
                      {g.calculation}
                    </Text>
                  ) : null}
                  {fundingById.get(g.id) ? (
                    <View style={styles.funded}>
                      {goalSavingsLines(fundingById.get(g.id)!, {
                        statusOnly,
                      }).map((line) => (
                        <Text key={line} style={styles.fundedText}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: g.isDefaultTarget
                        ? tintBg("#FFF3E6")
                        : tintBg("#E8F6F1"),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: g.isDefaultTarget
                          ? readable("#BA7517")
                          : readable("#1D9E75"),
                      },
                    ]}
                  >
                    {g.isDefaultTarget ? "Suggested amount" : "Your amount"}
                  </Text>
                </View>
              </View>
              <GoalStrategiesList
                goal={g}
                plan={strategiesById.get(g.id)}
                reach={
                  fundingById.get(g.id)
                    ? projectGoalReach(profile, fundingById.get(g.id)!)
                    : undefined
                }
                busy={saving}
                statusOnly={statusOnly}
                onSetHomePrice={(price) =>
                  void save(applyGoalEdit(profile, g.id, { homePrice: price }))
                }
              />
              {canEdit || g.removable ? (
                <View style={styles.row}>
                  {canEdit ? (
                    <Pressable
                      onPress={() => openEdit(g)}
                      style={styles.textBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.textBtnLabel}>Edit</Text>
                    </Pressable>
                  ) : null}
                  {g.removable ? (
                    <Pressable
                      disabled={saving}
                      onPress={() => void save(dismissGoal(profile, g.id))}
                      style={[styles.textBtn, saving && styles.disabled]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.textBtnLabel,
                          { color: Colors.errorText },
                        ]}
                      >
                        Not my goal
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {hiddenCount > 0 ? (
        <Pressable
          disabled={saving}
          onPress={() => void save(restoreDismissedGoals(profile))}
          style={styles.textBtn}
          accessibilityRole="button"
        >
          <Text style={styles.textBtnLabel}>
            Show {hiddenCount} hidden {hiddenCount === 1 ? "goal" : "goals"}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push("/goals" as never)}
        style={styles.textBtn}
        accessibilityRole="link"
      >
        <Text style={styles.textBtnLabel}>Track SIPs for each goal →</Text>
      </Pressable>
      <PlanAssumptionsCard
        profile={profile}
        saving={saving}
        onChange={(next) => void save(next)}
      />
      {error && !editing ? <Text style={styles.error}>{error}</Text> : null}

      <BottomSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        scroll
      >
        {editing ? (
          <View style={{ gap: 16 }}>
            <Text style={styles.sheetTitle}>Edit: {editing.label}</Text>
            {editing.editable.amount ? (
              <MoneyInput
                label={
                  editing.home
                    ? "Home price (today's rupees)"
                    : "Target amount (today's rupees)"
                }
                value={amount}
                onChangeValue={setAmount}
              />
            ) : null}
            {editing.home ? (
              <Text style={styles.meta}>
                Upfront cash goal: ₹
                {formatIndian(
                  Math.round(
                    (amount ?? 0) *
                      homeUpfrontShare(editing.home.includeInteriors),
                  ),
                )}{" "}
                (20% downpayment + 10% stamp duty
                {editing.home.includeInteriors ? " + 10% interiors" : ""})
              </Text>
            ) : null}
            {editing.editable.year ? (
              <View style={{ gap: 6 }}>
                <Text style={styles.inputLabel}>Target year</Text>
                <TextInput
                  value={yearRaw}
                  onChangeText={(t) =>
                    setYearRaw(t.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="number-pad"
                  style={[styles.yearInput, yearInvalid && styles.inputError]}
                  maxLength={4}
                />
                {yearInvalid ? (
                  <Text style={styles.error}>
                    Pick a year between {thisYear + 1} and {thisYear + 60}.
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.meta}>
                Target year {editing.targetYear} is set by your child&apos;s
                age.
              </Text>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              disabled={saving || yearInvalid}
              onPress={() => void submitEdit()}
              style={[
                styles.saveBtn,
                (saving || yearInvalid) && styles.disabled,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>
                {saving ? "Saving…" : "Save goal"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    borderRadius: 16,
    backgroundColor: Colors.card,
    padding: 16,
  },
  h2: { fontSize: 20, fontWeight: "600", color: Colors.textPrimary },
  sub: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  offer: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.surfaceMuted,
    padding: 16,
  },
  goal: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    padding: 12,
  },
  goalHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  goalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  goalAmount: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  funded: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: tintBg("#F7F6FE"),
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  fundedText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    color: Colors.primaryText,
  },
  reason: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "600" },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: Colors.primaryText,
    fontSize: 14,
    fontWeight: "600",
  },
  textBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  textBtnLabel: { color: Colors.primaryText, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  error: { marginTop: 4, fontSize: 13, color: Colors.error },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  inputLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  yearInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  inputError: { borderColor: Colors.error },
  saveBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
