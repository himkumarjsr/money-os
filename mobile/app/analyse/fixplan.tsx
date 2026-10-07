/**
 * Fix Plan — port of web app/analyse/fixplan/page.tsx.
 * Engine plan merged with the /api/ai/analyse overlay (engine numbers win).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { canViewFixPlan } from "@/lib/analyseEntitlement";
import { shareFixPlanPdf } from "@/lib/fixPlanPdf";
import { AnalyseErrorBoundary } from "@/components/analyse/AnalyseErrorBoundary";
import { AppIcon } from "@/components/ui/AppIcon";
import { useFixPlan } from "@/components/analyse/fixplan/useFixPlan";
import { FixPlanHero } from "@/components/analyse/fixplan/FixPlanHero";
import { SurplusBreakdown } from "@/components/analyse/fixplan/SurplusBreakdown";
import { PriorityCard } from "@/components/analyse/fixplan/PriorityCard";
import { SurplusAllocationSummary } from "@/components/analyse/fixplan/SurplusAllocationSummary";
import { MonthlyPlanTable } from "@/components/analyse/fixplan/MonthlyPlanTable";
import { DebtStrategy } from "@/components/analyse/fixplan/DebtStrategy";
import { GoalPlanCard } from "@/components/analyse/fixplan/GoalPlanCard";
import { StartPlanSheet } from "@/components/analyse/fixplan/StartPlanSheet";
import { LifeMapCard } from "@/components/analyse/fixplan/LifeMapCard";
import { NetWorthTrajectoryCard } from "@/components/analyse/fixplan/NetWorthTrajectoryCard";
import { NoConflictNote } from "@/components/analyse/fixplan/NoConflictNote";
import { projectNetWorth } from "@/lib/netWorthTrajectory";
import {
  fetchPlannedInvestments,
  plannedProgressBySource,
  type GoalPlanProgress,
} from "@/lib/plannedInvestments";
import { getSupabase } from "@/lib/supabase";
import { ScoreProjection } from "@/components/analyse/fixplan/ScoreProjection";
import {
  DoThisFirst,
  Encouragement,
  FdSuggestionCard,
} from "@/components/analyse/fixplan/Callouts";
import {
  FixPlanEmpty,
  FixPlanError,
  FixPlanLoader,
} from "@/components/analyse/fixplan/FixPlanStates";
import { openPriorities } from "@/lib/fixPlanMerge";
import type { PriorityItem } from "@/lib/priorityEngine";
import { Colors, FontSize, Radius, Spacing } from "@/constants/theme";

function FixPlanScreen() {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const [plannedProgress, setPlannedProgress] = useState<
    Record<string, GoalPlanProgress>
  >({});
  const [startPlanOpen, setStartPlanOpen] = useState(false);
  const loadPlannedProgress = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await fetchPlannedInvestments(getSupabase(), user.id);
      setPlannedProgress(plannedProgressBySource(rows));
    } catch {
      setPlannedProgress({});
    }
  }, [user?.id]);
  useEffect(() => {
    void loadPlannedProgress();
  }, [loadPlannedProgress]);
  const profile = useFinancialStore((s) => s.lastSubmission);
  const result = useFinancialStore((s) => s.result);
  const storeHydrated = useFinancialStore((s) => s.hasHydrated);
  const [downloading, setDownloading] = useState(false);

  const hasAccess = canViewFixPlan(user?.subscriptionTier);
  const allowed = hasInitialized && isLoggedIn && hasAccess;

  useEffect(() => {
    if (!hasInitialized) return;
    if (!isLoggedIn) {
      router.replace({
        pathname: "/(auth)/login",
        params: { next: "/analyse/fixplan" },
      });
      return;
    }
    if (!hasAccess) router.replace("/analyse/result");
  }, [hasInitialized, isLoggedIn, hasAccess]);

  const { aiPlan, aiLoading, aiError, refreshing, notice, retry, refresh } =
    useFixPlan({
      profile,
      result,
      userId: user?.id,
      enabled: allowed && storeHydrated && !!profile && !!result,
    });
  const trajectory = useMemo(
    () =>
      profile && aiPlan?.priorityPlan
        ? projectNetWorth(profile, aiPlan.priorityPlan)
        : null,
    [profile, aiPlan?.priorityPlan],
  );

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/analyse/result");

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={goBack}
        style={styles.back}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text style={styles.backText}>← Back to report</Text>
      </Pressable>
    </View>
  );

  if (!allowed || !storeHydrated) {
    return <FixPlanLoader label="Loading…" />;
  }
  if (!profile || !result) {
    return (
      <>
        {header}
        <FixPlanEmpty />
      </>
    );
  }
  if (!aiPlan) {
    if (aiLoading) return <FixPlanLoader />;
    return (
      <>
        {header}
        <FixPlanError message={aiError} onRetry={() => void retry()} />
      </>
    );
  }

  const pp = aiPlan.priorityPlan;
  const expl = aiPlan.explanations;
  const visiblePriorities: PriorityItem[] = openPriorities(pp);
  const monthlyPlanRows = pp?.monthlyPlan || [];
  const goals = pp?.goals ?? [];

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await shareFixPlanPdf({
        profile,
        result,
        priorityPlan: pp,
        explanations: expl,
      });
      if (res.error) Alert.alert("Couldn't create PDF", res.error);
    } catch (err) {
      console.error("PDF error:", err);
      Alert.alert(
        "Couldn't create PDF",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {notice ? (
          <View
            style={styles.info}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.infoText}>{notice}</Text>
          </View>
        ) : null}

        {aiError ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Couldn&apos;t refresh your plan. {aiError}
            </Text>
            <Pressable
              onPress={() => void refresh()}
              style={styles.noticeBtn}
              accessibilityRole="button"
            >
              <Text style={styles.noticeBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <FixPlanHero
          attentionCount={visiblePriorities.length}
          overallSummary={expl?.overallSummary}
          isFallback={aiPlan.isFallback}
        />

        {pp?.surplusBreakdown ? (
          <SurplusBreakdown breakdown={pp.surplusBreakdown} />
        ) : null}

        {visiblePriorities.map((p: PriorityItem) => (
          <PriorityCard
            key={p.id}
            priority={p}
            monthlySurplus={pp?.monthlySurplus || 0}
            explanation={expl?.priorityExplanations?.[p.id]}
          />
        ))}

        {visiblePriorities.length > 0 ? (
          <SurplusAllocationSummary
            priorities={visiblePriorities}
            monthlySurplus={pp?.monthlySurplus || 0}
            plan={pp}
          />
        ) : null}

        {monthlyPlanRows.length > 0 ? (
          <MonthlyPlanTable rows={monthlyPlanRows} />
        ) : null}

        {pp?.debts?.length > 0 ? (
          <DebtStrategy debts={pp.debts} debtStrategy={expl?.debtStrategy} />
        ) : null}

        {goals.length > 0 ? (
          <LifeMapCard goals={goals} selfAge={profile.selfAge} />
        ) : null}

        {goals.length > 0 ? (
          <GoalPlanCard
            goals={goals}
            plans={expl?.goalPlans}
            progress={plannedProgress}
            onStart={user?.id ? () => setStartPlanOpen(true) : undefined}
          />
        ) : null}
        {trajectory ? <NetWorthTrajectoryCard trajectory={trajectory} /> : null}

        <NoConflictNote />

        {user?.id && goals.length > 0 ? (
          <StartPlanSheet
            visible={startPlanOpen}
            onClose={() => setStartPlanOpen(false)}
            userId={user.id}
            goals={goals}
            hasExisting={Object.keys(plannedProgress).length > 0}
            onSaved={() => void loadPlannedProgress()}
          />
        ) : null}

        <ScoreProjection plan={pp} />

        {pp?.fdSuggestion ? <FdSuggestionCard fd={pp.fdSuggestion} /> : null}

        <DoThisFirst text={expl?.thisWeekAction || pp?.topAction} />
        <Encouragement text={expl?.encouragement} />

        <Pressable
          onPress={() => void handleDownloadPDF()}
          disabled={downloading}
          style={[styles.pdfBtn, downloading && styles.pdfBtnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: downloading, busy: downloading }}
        >
          {downloading ? (
            <Text style={styles.pdfText}>Generating PDF...</Text>
          ) : (
            <View style={styles.pdfInner}>
              <AppIcon name="doc" size={18} color={Colors.primary} />
              <Text style={styles.pdfText}>Download full report PDF</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          Educational guidance only. Not SEBI registered investment advice.
        </Text>
      </ScrollView>
    </>
  );
}

export default function FixPlanRoute() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AnalyseErrorBoundary label="FixPlanErrorBoundary">
        <FixPlanScreen />
      </AnalyseErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  backText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  notice: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  noticeText: { fontSize: FontSize.md, color: "#B91C1C", lineHeight: 18 },
  info: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryMedium,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoText: { fontSize: 14, color: Colors.primaryDark, lineHeight: 20 },
  noticeBtn: {
    marginTop: Spacing.sm,
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  noticeBtnText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  pdfBtn: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  pdfBtnDisabled: { opacity: 0.7 },
  pdfInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  pdfText: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  disclaimer: {
    paddingBottom: Spacing.lg,
    textAlign: "center",
    fontSize: 12,
    color: Colors.textMuted,
  },
});
