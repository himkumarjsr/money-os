/**
 * Analyse result — web parity with `app/analyse/result/page.tsx`: hero gauge,
 * monthly summary, net worth, category caps, gauges, safety net, issues,
 * fix-plan teaser + paywall, cross-sell links.
 */
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import { analyseFinances, type AnalysisResult } from "@/lib/financialEngine";
import { canOpenFixPlanDirectly } from "@/lib/analyseEntitlement";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import Button from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { IssueCard } from "@/components/analyse/IssueCard";
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

const SITE = process.env.EXPO_PUBLIC_SITE_URL || "https://www.finkoin.com";

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/analyse");
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Full report</Text>
      <View style={{ width: 64 }} />
    </View>
  );
}

function AnalyseResultContent() {
  const user = useAuthStore((s) => s.user);
  const result = useFinancialStore((s) => s.result);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);
  const [restoring, setRestoring] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);

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
        <Header />
        <View style={styles.empty}>
          <AppIcon name="chart" size={44} color={Colors.primary} />
          <Text style={styles.emptyTitle}>No analysis found</Text>
          <Text style={styles.emptySub}>
            Please complete the financial analysis form to see your results.
          </Text>
          <Button
            label="Start analysis →"
            onPress={() => router.replace("/analyse/consent")}
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

  const issues = (result.issues ?? []).slice(0, 8);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ResultHero model={model} profile={lastSubmission} />
        <MonthlySummaryCard model={model} />
        <NetWorthCard model={model} />
        <BucketCapsSection model={model} />
        <GaugesSection profile={lastSubmission} />
        <SafetyNetSection
          model={model}
          onTermLearn={() =>
            void WebBrowser.openBrowserAsync(
              `${SITE}/learn/term-insurance-vs-endowment-why-most-indians-buy-wrong`,
            )
          }
        />

        {issues.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>What needs attention</Text>
            {issues.map((issue, i) => (
              <View
                key={`${issue.code}-${i}`}
                style={{ marginBottom: Spacing.md }}
              >
                <IssueCard severity={issue.severity} title={issue.message} />
              </View>
            ))}
          </View>
        ) : null}

        <PlanTeaserSection
          model={model}
          surplusBreakdown={!!priorityPlan.surplusBreakdown}
          onUnlock={handleUnlock}
        />

        <KeepGoingSection
          onTax={() =>
            router.push("/calculators/tax-regime" as Href)
          }
          onTracker={() => router.push("/(tabs)/tracker")}
          onLearn={() => void WebBrowser.openBrowserAsync(`${SITE}/learn`)}
        />

        <Button
          label="Retake health check"
          variant="secondary"
          onPress={() => router.push("/analyse/consent")}
          style={{ minHeight: 52 }}
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

const styles = StyleSheet.create({
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
  backText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
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
});
