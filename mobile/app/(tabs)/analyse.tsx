import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import { hasAnalyseConsent } from "@/lib/analyseConsent";
import { scoreBand, type AnalysisResult } from "@/lib/financialEngine";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { Colors, Spacing, Radius, FontSize } from "@/constants/theme";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ResultCard } from "@/components/analyse/ResultCard";
import { IssueCard } from "@/components/analyse/IssueCard";

const SCORE_TONES = {
  critical: { bg: "#FDEDED", fg: "#991B1B", label: "Take action now" },
  warning: { bg: "#FFF4E5", fg: "#92400E", label: "Needs attention" },
  good: { bg: "#DCFCE7", fg: "#166534", label: "Great shape" },
} as const;

function scoreTone(s: number) {
  return SCORE_TONES[scoreBand(s)];
}

async function goToHealthCheck(userId: string | undefined) {
  if (!userId) {
    router.push({
      pathname: "/(auth)/login",
      params: { next: "/(tabs)/analyse" },
    });
    return;
  }
  const ok = await hasAnalyseConsent(userId);
  router.push(ok ? "/analyse/form" : "/analyse/consent");
}

export default function AnalyseScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const result = useFinancialStore((s) => s.result);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const store = useFinancialStore.getState();
      if (!opts?.force && store.result && store.lastSubmission) {
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      setError(null);
      try {
        const snapshot = await fetchUserAnalyseSnapshot(user.id);
        if (snapshot?.lastSubmission && snapshot.result) {
          if (isValidStoredAnalysis(snapshot.result)) {
            hydrateFromSnapshot(snapshot.lastSubmission, snapshot.result, {
              analysisPatch: snapshot.analysis ?? undefined,
            });
            return;
          }
          if (
            snapshot.result &&
            typeof (snapshot.result as AnalysisResult).overallScore === "number"
          ) {
            hydrateFromSnapshot(
              snapshot.lastSubmission,
              snapshot.result as AnalysisResult,
              { analysisPatch: snapshot.analysis ?? undefined },
            );
            return;
          }
        }

        if (!isSupabaseConfigured()) {
          setError("Could not load your report. Check your connection.");
          return;
        }
        const supabase = getSupabase();
        const { data, error: dbErr } = await supabase
          .from("user_analysis")
          .select("analysis_result, profile, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (dbErr) {
          setError(dbErr.message || "Failed to load report.");
          return;
        }

        const legacyResult = data?.analysis_result;
        const legacyProfile = data?.profile as FinancialProfile | null;
        if (
          legacyResult &&
          typeof (legacyResult as AnalysisResult).overallScore === "number" &&
          legacyProfile
        ) {
          hydrateFromSnapshot(legacyProfile, legacyResult as AnalysisResult);
        } else if (
          legacyResult &&
          typeof (legacyResult as AnalysisResult).overallScore === "number"
        ) {
          useFinancialStore
            .getState()
            .setResult(legacyResult as AnalysisResult);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, hydrateFromSnapshot],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    if (!hasHydrated) return;
    setLoading(true);
    void loadResult();
  }, [isLoggedIn, hasHydrated, loadResult]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadResult({ force: true });
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Know your financial health</Text>
          <Text style={styles.emptySub}>
            Log in to see your score, or start a free health check after signing
            in.
          </Text>
          <Button
            label="Log in"
            onPress={() =>
              router.push({
                pathname: "/(auth)/login",
                params: { next: "/(tabs)/analyse" },
              })
            }
            style={{ marginTop: 24, minHeight: 52, alignSelf: "stretch" }}
          />
          <Button
            label="Create free account"
            variant="secondary"
            onPress={() => router.push("/(auth)/signup")}
            style={{ marginTop: 12, minHeight: 52, alignSelf: "stretch" }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <LoadingSpinner full />
      </SafeAreaView>
    );
  }

  const score = result?.overallScore ?? 0;
  const tone = scoreTone(score);
  const issues = result?.issues ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Health</Text>
          {result ? (
            <TouchableOpacity
              onPress={() => void goToHealthCheck(user?.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.retakeHit}
            >
              <Text style={styles.retake}>Retake →</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                void loadResult({ force: true });
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {result ? (
          <>
            <View
              style={[
                styles.scoreBanner,
                { backgroundColor: tone.bg, marginHorizontal: Spacing.xl },
              ]}
            >
              <Text style={[styles.scoreNum, { color: tone.fg }]}>{score}</Text>
              <Text style={[styles.scoreOf, { color: tone.fg }]}>/100</Text>
              <Text style={[styles.scoreLabel, { color: tone.fg }]}>
                {tone.label}
              </Text>
              <Text style={[styles.scoreSubtitle, { color: tone.fg }]}>
                Financial Health Score
              </Text>
            </View>

            <View
              style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.md }}
            >
              <ResultCard
                score={score}
                title={tone.label}
                subtitle="Tap issues below for the full report"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What needs attention</Text>
              {issues.length === 0 ? (
                <Card style={{ padding: Spacing.lg }}>
                  <Text style={styles.issueFallbackTitle}>Looking solid</Text>
                  <Text style={styles.issueFallbackDesc}>
                    No critical gaps flagged right now. Keep tracking.
                  </Text>
                </Card>
              ) : (
                issues
                  .slice(0, 5)
                  .map((issue, i) => (
                    <IssueCard
                      key={`${issue.code}-${i}`}
                      severity={issue.severity}
                      title={issue.message}
                      onPress={() => router.push("/analyse/result")}
                    />
                  ))
              )}
            </View>

            <View style={styles.ctaSection}>
              <Button
                label="See full report"
                variant="secondary"
                onPress={() => router.push("/analyse/result")}
                style={{ minHeight: 48, marginBottom: Spacing.md }}
              />
              <Card style={styles.ctaCard}>
                <Text style={styles.ctaTitle}>Get your complete fix plan</Text>
                <Text style={styles.ctaSub}>
                  Step-by-step actions with exact ₹ numbers. AI powered.
                  Personal to you.
                </Text>
                <Button
                  label="View fix plan → ₹99"
                  onPress={() => router.push("/analyse/fixplan")}
                  style={{ marginTop: 14, minHeight: 48 }}
                />
              </Card>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>Know your financial health</Text>
            <Text style={styles.emptySub}>
              Answer 7 questions about your salary, loans, insurance and
              investments. Get a score out of 100 with exact gaps.
            </Text>
            <View style={styles.emptyStats}>
              {(
                [
                  ["5 min", "to complete"],
                  ["Free", "always"],
                  ["No PAN", "needed"],
                ] as const
              ).map(([val, sub]) => (
                <View key={val} style={styles.statItem}>
                  <Text style={styles.statVal}>{val}</Text>
                  <Text style={styles.statSub}>{sub}</Text>
                </View>
              ))}
            </View>
            <Button
              label="Start health check →"
              onPress={() => void goToHealthCheck(user?.id)}
              style={{ marginTop: 24, minHeight: 52, alignSelf: "stretch" }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  retakeHit: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  retake: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: "700",
  },
  errorBox: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    backgroundColor: "#FCEBEB",
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.md,
    color: "#791F1F",
    lineHeight: 20,
  },
  retry: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  scoreBanner: {
    marginTop: Spacing.xl,
    borderRadius: Radius.xxl,
    padding: 28,
    alignItems: "center",
  },
  scoreNum: {
    fontSize: 72,
    fontWeight: "900",
    lineHeight: 80,
  },
  scoreOf: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    marginTop: -4,
    opacity: 0.85,
  },
  scoreLabel: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    marginTop: 8,
  },
  scoreSubtitle: {
    fontSize: FontSize.md,
    marginTop: 4,
    opacity: 0.8,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  issueFallbackTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  issueFallbackDesc: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  ctaSection: {
    padding: Spacing.xl,
  },
  ctaCard: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryMedium,
  },
  ctaTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 6,
  },
  ctaSub: {
    fontSize: FontSize.md,
    color: Colors.primary,
    lineHeight: 20,
    opacity: 0.8,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: "center",
    paddingTop: 48,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  emptySub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyStats: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statVal: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.primary,
  },
  statSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
