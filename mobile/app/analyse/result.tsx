/**
 * Analyse result - web parity with `app/analyse/result/page.tsx`: hero gauge,
 * monthly summary, net worth, category caps, gauges, safety net, issues,
 * fix-plan teaser + paywall, cross-sell links.
 */
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useObligationStore } from "@/store/obligationStore";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import { analyseFinances, type AnalysisResult } from "@/lib/financialEngine";
import { canOpenFixPlanDirectly } from "@/lib/analyseEntitlement";
import { Colors, FontSize, Spacing, themedStyles } from "@/constants/theme";
import Button from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AnalyseErrorBoundary } from "@/components/analyse/AnalyseErrorBoundary";
import { PaywallSheet } from "@/components/analyse/PaywallSheet";
import {
  buildResultModel,
  buildResultPriorityPlan,
} from "@/components/analyse/result/model";
import {
  BucketCapsSection,
  GaugesSection,
  KeepGoingSection,
  MonthlySummaryCard,
  NetWorthCard,
  PlanTeaserSection,
  ResultHero,
  SafetyNetSection,
} from "@/components/analyse/result/ResultSections";
import { GoalsSection } from "@/components/analyse/result/GoalsSection";
import FeedbackCard from "@/components/FeedbackCard";
import { PremiumRdCard } from "@/components/analyse/result/PremiumRdCard";
import { openContentHref } from "@/lib/contentLinks";
import { maybeAskForReview } from "@/lib/storeReview";
import { hasAnalyseConsent } from "@/lib/analyseConsent";
import { getUniversalCaps } from "@/lib/universal-buckets";

/** Web `/analyse`: skips consent when it was already given. */
async function goToForm(userId: string | undefined, replace = false) {
  const ok = userId ? await hasAnalyseConsent(userId) : false;
  const href = ok ? "/analyse/form" : "/analyse/consent";
  if (replace) router.replace(href);
  else router.push(href);
}

function Header({
  userId,
  showRetake = true,
}: {
  userId?: string;
  showRetake?: boolean;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        hitSlop={12}
        style={styles.back}
        accessibilityRole="button"
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      {showRetake ? (
        <TouchableOpacity
          onPress={() => void goToForm(userId)}
          hitSlop={8}
          style={styles.retake}
          accessibilityRole="button"
          accessibilityLabel="Retake health check"
        >
          <Text style={styles.retakeText}>↻ Retake</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AnalyseResultContent() {
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user?.id)
      void useObligationStore.getState().syncLoansToAnalyse(user.id);
  }, [user?.id]);
  const result = useFinancialStore((s) => s.result);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);
  const [restoring, setRestoring] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const reviewCheckedRef = useRef(false);

  // Store rating prompt after the report has been seen a few times.
  useEffect(() => {
    if (restoring || !result || reviewCheckedRef.current) return;
    reviewCheckedRef.current = true;
    const t = setTimeout(() => void maybeAskForReview(), 3000);
    return () => clearTimeout(t);
  }, [restoring, result]);

  useEffect(() => {
    if (!hasHydrated) return;
    if ((result && lastSubmission) || !user?.id) {
      setRestoring(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const snap = await fetchUserAnalyseSnapshot(user.id);
        if (cancelled) return;
        if (snap?.lastSubmission && snap.result) {
          const snapResult = snap.result;
          const usable =
            isValidStoredAnalysis(snapResult) ||
            typeof (snapResult as { overallScore?: unknown }).overallScore ===
              "number";
          if (usable) {
            hydrateFromSnapshot(
              snap.lastSubmission,
              snapResult as AnalysisResult,
              { analysisPatch: snap.analysis ?? undefined },
            );
          }
        }
      } catch (err) {
        console.log("No snapshot found:", err);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, user?.id, result, lastSubmission, hydrateFromSnapshot]);

  const analysis = useMemo(
    () => (lastSubmission ? (result ?? analyseFinances(lastSubmission)) : null),
    [lastSubmission, result],
  );
  const priorityPlan = useMemo(
    () =>
      lastSubmission && analysis
        ? buildResultPriorityPlan(lastSubmission, analysis)
        : null,
    [lastSubmission, analysis],
  );
  const model = useMemo(
    () =>
      lastSubmission && analysis && priorityPlan
        ? buildResultModel(lastSubmission, analysis, priorityPlan)
        : null,
    [lastSubmission, analysis, priorityPlan],
  );

  if (!hasHydrated || (restoring && !(result && lastSubmission))) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <LoadingSpinner full />
      </SafeAreaView>
    );
  }

  if (!result || !lastSubmission || !priorityPlan || !model) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Header userId={user?.id} showRetake={false} />
        <View style={styles.empty}>
          <AppIcon name="chart" size={44} color={Colors.primaryText} />
          <Text style={styles.emptyTitle}>No analysis found</Text>
          <Text style={styles.emptySub}>
            Please complete the financial analysis form to see your results.
          </Text>
          <Button
            label="Start analysis →"
            onPress={() => void goToForm(user?.id, true)}
            style={{ marginTop: 20, minHeight: 48 }}
            fullWidth={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleUnlock = () => {
    if (!user) {
      router.push({
        pathname: "/(auth)/login",
        params: { next: "/analyse/result" },
      });
      return;
    }
    if (canOpenFixPlanDirectly(user.subscriptionTier)) {
      router.push("/analyse/fixplan");
      return;
    }
    setPaywallOpen(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header userId={user?.id} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ResultHero model={model} profile={lastSubmission} />
        <MonthlySummaryCard model={model} />
        <NetWorthCard model={model} />
        <BucketCapsSection model={model} />
        <GaugesSection
          profile={lastSubmission}
          loanCap={getUniversalCaps(lastSubmission).loans}
        />
        <SafetyNetSection
          model={model}
          onTermLearn={() =>
            openContentHref(
              "/learn/term-insurance-vs-endowment-why-most-indians-buy-wrong",
            )
          }
        />

        <PremiumRdCard profile={lastSubmission} userId={user?.id} />

        <GoalsSection profile={lastSubmission} userId={user?.id} />

        <PlanTeaserSection
          model={model}
          surplusBreakdown={!!priorityPlan.surplusBreakdown}
          onUnlock={handleUnlock}
        />

        <FeedbackCard pageContext="analyse" />

        <KeepGoingSection
          onTax={() => openContentHref("/calculators/tax-regime-2026")}
          onTracker={() => router.push("/(tabs)/tracker")}
          onLearn={() => openContentHref("/learn")}
        />
      </ScrollView>

      <PaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
      />
    </SafeAreaView>
  );
}

export default function AnalyseResultScreen() {
  return (
    <AnalyseErrorBoundary label="AnalyseResultErrorBoundary">
      <AnalyseResultContent />
    </AnalyseErrorBoundary>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  back: { minHeight: 44, justifyContent: "center", minWidth: 64 },
  backText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  retake: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryText,
  },
  retakeText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 48,
    gap: 20,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  empty: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    maxWidth: 300,
  },
}));
