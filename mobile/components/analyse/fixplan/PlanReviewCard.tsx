import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Colors, themedStyles, tintBg } from "@/constants/theme";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  PLAN_REVIEW_MIN_MONTHS,
  applyPlanReview,
  buildPlanReview,
  monthsSincePlanReview,
  planReviewDue,
  type PlanReview,
} from "@/lib/planReview";
import { saveAnalyseProfile } from "@/lib/saveAnalyseProfile";
import { getSupabase } from "@/lib/supabase";
import { fetchNatureRows } from "@/lib/trackerNatureFetch";
import { buildNatureReport } from "@/lib/trackerNatureReport";

/** Once a year: the Tracker against the plan, with a one-tap update (same as web). */
export function PlanReviewCard({
  profile,
  userId,
}: {
  profile: FinancialProfile;
  userId?: string | null;
}) {
  const due = planReviewDue(profile);
  const [review, setReview] = useState<PlanReview | null | undefined>(
    undefined,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!due || !userId) return;
    let cancelled = false;
    const now = new Date();
    void fetchNatureRows(
      getSupabase(),
      userId,
      now.getFullYear(),
      now.getMonth(),
    )
      .then((res) => {
        if (cancelled) return;
        const report = res.ok
          ? buildNatureReport({
              rows: res.rows,
              emiSources: res.emiSources,
              profileSalary: profile.monthlySalary,
            })
          : null;
        setReview(buildPlanReview(profile, report, now));
      })
      .catch(() => {
        if (!cancelled) setReview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [due, userId, profile]);

  if (!due || review === undefined) return null;

  const months = monthsSincePlanReview(profile) ?? 0;
  const hasChanges = !!review && Object.keys(review.patch).length > 0;
  const finish = async (withChanges: boolean) => {
    setSaving(true);
    setError(null);
    const res = await saveAnalyseProfile(
      userId,
      applyPlanReview(profile, withChanges ? review : null),
    );
    setSaving(false);
    if (res.error) setError("Couldn't save - try again in a moment.");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Time for your yearly check</Text>
      <Text style={styles.body}>
        Your plan is {months} months old. A planner would check it against real
        life once a year.
        {review
          ? ` Here's what your Tracker shows over the last ${review.basedOnMonths} months:`
          : ""}
      </Text>
      {review ? (
        <View style={{ gap: 6, marginTop: 12 }}>
          {review.lines.map((l) => (
            <View key={l.key} style={styles.line}>
              <Text style={styles.lineText}>{l.changes ? "•" : "✓"}</Text>
              <Text style={[styles.lineText, { flex: 1 }]}>{l.text}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.body, { marginTop: 12 }]}>
          Log at least {PLAN_REVIEW_MIN_MONTHS} full months in the Tracker and
          we&apos;ll compare them with your plan. Or retake the analysis with
          today&apos;s numbers.
        </Text>
      )}
      <View style={styles.row}>
        {hasChanges ? (
          <Pressable
            disabled={saving}
            onPress={() => void finish(true)}
            style={[styles.primaryBtn, saving && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Update my plan</Text>
          </Pressable>
        ) : null}
        {review ? (
          <Pressable
            disabled={saving}
            onPress={() => void finish(false)}
            style={[styles.secondaryBtn, saving && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>
              {hasChanges ? "Keep it as it is" : "Plan still fits"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push("/analyse/form")}
            style={styles.primaryBtn}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Retake the analysis</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: tintBg("#F7F6FE"),
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: "600", color: Colors.textPrimary },
  body: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  line: { flexDirection: "row", gap: 8 },
  lineText: { fontSize: 14, lineHeight: 20, color: Colors.textPrimary },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "600" },
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
  secondaryText: { color: Colors.primaryText, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  error: { marginTop: 8, fontSize: 13, color: Colors.error },
}));
