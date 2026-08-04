import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { Colors, Spacing, Radius, FontSize, Shadow } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { QuickTools } from "@/components/home/QuickTools";
import { DailyTip } from "@/components/home/DailyTip";
import { HealthScoreRing } from "@/components/ui/HealthScoreRing";

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const storeScore = useFinancialStore((s) => s.result?.overallScore ?? null);
  const [score, setScore] = useState<number | null>(storeScore);
  const [tip, setTip] = useState<{
    emoji?: string;
    title?: string;
    content?: string;
    body?: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    // Prefer local analysis result; then remote snapshots / user_analysis
    if (storeScore != null) {
      setScore(storeScore);
    }

    try {
      const { data: analysis } = await supabase
        .from("user_analysis")
        .select("analysis_result")
        .eq("user_id", user.id)
        .maybeSingle();

      const remoteScore = (
        analysis?.analysis_result as { overallScore?: number } | null
      )?.overallScore;
      if (typeof remoteScore === "number") {
        setScore(remoteScore);
      } else {
        const { data: snap } = await supabase
          .from("user_analyse_snapshots")
          .select("result_json")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const snapScore = (
          snap?.result_json as { overallScore?: number } | null
        )?.overallScore;
        if (typeof snapScore === "number") setScore(snapScore);
      }
    } catch {
      /* offline-friendly */
    }

    try {
      const { data: notification } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (notification) {
        setTip({
          emoji: (notification as { emoji?: string }).emoji,
          title: (notification as { title?: string }).title || "Tip",
          content:
            (notification as { content?: string; body?: string }).content ||
            (notification as { body?: string }).body ||
            "",
        });
      }
    } catch {
      /* ignore */
    }
  }, [user?.id, storeScore]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getScoreColor = (s: number) => {
    if (s >= 75) return "#1D9E75";
    if (s >= 50) return "#BA7517";
    return "#E24B4A";
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()} 👋</Text>
            <Text style={styles.userName}>{user?.name || "there"}</Text>
          </View>
          <View style={styles.fkBadge}>
            <Text style={styles.fkText}>⚡ {user?.fkBalance || 0} FK</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.scoreCard}
          onPress={() => router.push("/(tabs)/analyse")}
          activeOpacity={0.9}
        >
          {score !== null ? (
            <View style={styles.scoreContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreLabel}>Financial Health Score</Text>
                <Text
                  style={[styles.scoreValue, { color: getScoreColor(score) }]}
                >
                  {score}
                  <Text style={styles.scoreMax}>/100</Text>
                </Text>
                <Text style={styles.scoreSub}>
                  {score >= 75
                    ? "Great financial health"
                    : score >= 50
                      ? "Needs some attention"
                      : "Needs immediate action"}
                </Text>
              </View>
              <HealthScoreRing score={score} />
            </View>
          ) : (
            <View style={styles.scoreEmpty}>
              <Text style={styles.scoreEmptyTitle}>
                Know your financial health
              </Text>
              <Text style={styles.scoreEmptySub}>
                Free check · 5 minutes · No PAN
              </Text>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaText}>Check my score →</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Tools</Text>
        <QuickTools />

        {tip && tip.title ? (
          <DailyTip
            emoji={tip.emoji}
            title={tip.title}
            content={tip.content || ""}
          />
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  greeting: { fontSize: FontSize.md, color: Colors.textMuted },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  fkBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.round,
  },
  fkText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  scoreCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadow.strong,
  },
  scoreContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.md,
  },
  scoreLabel: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
    fontWeight: "600",
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 52,
  },
  scoreMax: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  scoreSub: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  scoreEmpty: { alignItems: "flex-start" },
  scoreEmptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.textWhite,
    marginBottom: 6,
  },
  scoreEmptySub: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.round,
  },
  ctaText: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
