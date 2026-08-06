import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Issue = {
  title?: string;
  message?: string;
  description?: string;
  severity?: string;
};

export default function AnalyseScreen() {
  const { user } = useAuthStore();
  const [result, setResult] = useState<{
    overallScore?: number;
    issues?: Issue[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadResult = useCallback(async () => {
    if (!user?.id) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_analysis")
      .select("analysis_result, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    setResult((data?.analysis_result as typeof result) || null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  const score = result?.overallScore ?? 0;

  const getScoreColor = (s: number) => {
    if (s >= 75) return Colors.success;
    if (s >= 50) return Colors.warning;
    return Colors.error;
  };

  const getScoreLabel = (s: number) => {
    if (s >= 75) return "Great shape";
    if (s >= 50) return "Needs attention";
    return "Take action now";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Health</Text>
          {result ? (
            <TouchableOpacity onPress={() => router.push("/analyse/form")}>
              <Text style={styles.retake}>Retake →</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {result ? (
          <>
            <View
              style={[
                styles.scoreHero,
                { backgroundColor: getScoreColor(score) },
              ]}
            >
              <Text style={styles.scoreNum}>{score}</Text>
              <Text style={styles.scoreOf}>/100</Text>
              <Text style={styles.scoreLabel}>{getScoreLabel(score)}</Text>
              <Text style={styles.scoreSubtitle}>Financial Health Score</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What needs attention</Text>
              {(result.issues ?? []).slice(0, 5).map((issue, i) => {
                const title = issue.title || issue.message || "Issue";
                const description = issue.description;
                const sev = issue.severity || "warning";
                return (
                  <Card key={i} style={styles.issueCard}>
                    <View style={styles.issueRow}>
                      <View
                        style={[
                          styles.issueDot,
                          {
                            backgroundColor:
                              sev === "critical"
                                ? Colors.error
                                : sev === "warning"
                                  ? Colors.warning
                                  : Colors.success,
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.issueTitle}>{title}</Text>
                        {description ? (
                          <Text style={styles.issueDesc} numberOfLines={2}>
                            {description}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.issueSeverity,
                          {
                            color:
                              sev === "critical"
                                ? Colors.error
                                : Colors.warning,
                            backgroundColor:
                              sev === "critical"
                                ? Colors.errorLight
                                : Colors.warningLight,
                          },
                        ]}
                      >
                        {sev}
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </View>

            <View style={styles.ctaSection}>
              <Card style={styles.ctaCard}>
                <Text style={styles.ctaTitle}>Get your complete fix plan</Text>
                <Text style={styles.ctaSub}>
                  Step-by-step actions with exact ₹ numbers. AI powered.
                  Personal to you.
                </Text>
                <Button
                  label="View fix plan → ₹99"
                  onPress={() => router.push("/analyse/fixplan")}
                  style={{ marginTop: 14 }}
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
              onPress={() => router.push("/analyse/form")}
              style={{ marginTop: 24 }}
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
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
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
  retake: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: "700",
  },
  scoreHero: {
    margin: Spacing.xl,
    borderRadius: Radius.xxl,
    padding: 32,
    alignItems: "center",
    ...Shadow.strong,
  },
  scoreNum: {
    fontSize: 80,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 88,
  },
  scoreOf: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginTop: -8,
  },
  scoreLabel: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#fff",
    marginTop: 8,
  },
  scoreSubtitle: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  issueCard: {
    padding: Spacing.lg,
  },
  issueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  issueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  issueTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  issueDesc: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  issueSeverity: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.round,
    textTransform: "uppercase",
    overflow: "hidden",
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
