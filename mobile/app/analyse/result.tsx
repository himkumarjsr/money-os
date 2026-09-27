/**
 * Analyse result — summary entry for Report "See full report".
 * Full buckets / gauges / unlock land in Sprint 2; this screen must exist
 * so Report navigation matches the plan.
 */
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { fetchUserAnalyseSnapshot } from "@/lib/userAnalyseSnapshot";
import { isValidStoredAnalysis } from "@/lib/analysisSnapshotValidation";
import type { AnalysisResult } from "@/lib/financialEngine";
import { Colors, FontSize, Spacing, Radius } from "@/constants/theme";
import Button from "@/components/ui/Button";
import { ResultCard } from "@/components/analyse/ResultCard";
import { IssueCard } from "@/components/analyse/IssueCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function scoreLabel(s: number) {
  if (s < 40) return "Critical";
  if (s < 70) return "Needs attention";
  return "Looking good";
}

function scoreColors(s: number) {
  if (s < 40) return { bg: "#FDEDED", fg: "#991B1B" };
  if (s < 70) return { bg: "#FFF4E5", fg: "#92400E" };
  return { bg: "#DCFCE7", fg: "#166534" };
}

export default function AnalyseResultScreen() {
  const user = useAuthStore((s) => s.user);
  const result = useFinancialStore((s) => s.result);
  const hydrateFromSnapshot = useFinancialStore((s) => s.hydrateFromSnapshot);
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    if (result || !user?.id) {
      setLoading(false);
      return;
    }
    void (async () => {
      const snap = await fetchUserAnalyseSnapshot(user.id);
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
            {
              analysisPatch: snap.analysis ?? undefined,
            },
          );
        }
      }
      setLoading(false);
    })();
  }, [user?.id, result, hydrateFromSnapshot]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <LoadingSpinner full />
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No analysis found</Text>
          <Text style={styles.emptySub}>
            Complete a health check to see your full report.
          </Text>
          <Button
            label="Start analysis →"
            onPress={() => router.replace("/analyse/consent")}
            style={{ marginTop: 20, minHeight: 52 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const score = result.overallScore ?? 0;
  const tone = scoreColors(score);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/analyse")
          }
          hitSlop={12}
          style={styles.back}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Full report</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.scoreBanner, { backgroundColor: tone.bg }]}>
          <Text style={[styles.scoreNum, { color: tone.fg }]}>{score}</Text>
          <Text style={[styles.scoreMeta, { color: tone.fg }]}>
            /100 · {scoreLabel(score)}
          </Text>
        </View>

        <ResultCard
          score={score}
          title={scoreLabel(score)}
          subtitle="Financial Health Score"
        />

        <Text style={styles.sectionTitle}>What needs attention</Text>
        {(result.issues ?? []).slice(0, 8).map((issue, i) => (
          <View key={`${issue.code}-${i}`} style={{ marginBottom: Spacing.md }}>
            <IssueCard severity={issue.severity} title={issue.message} />
          </View>
        ))}

        <Button
          label="View fix plan →"
          onPress={() => router.push("/analyse/fixplan")}
          style={{ marginTop: Spacing.xl, minHeight: 52 }}
        />
        <Button
          label="Retake health check"
          variant="secondary"
          onPress={() => router.push("/analyse/consent")}
          style={{ marginTop: Spacing.md, minHeight: 52 }}
        />
      </ScrollView>
    </SafeAreaView>
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
  scoreBanner: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  scoreNum: { fontSize: 56, fontWeight: "900", lineHeight: 64 },
  scoreMeta: { fontSize: FontSize.md, fontWeight: "700", marginTop: 4 },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  empty: { padding: Spacing.xl, alignItems: "center", paddingTop: 48 },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
