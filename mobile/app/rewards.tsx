/**
 * Rewards — port of web app/rewards/page.tsx.
 */
import { useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { Colors } from "@/constants/theme";
import { useGamification } from "@/lib/useGamification";
import { useAuthStore } from "@/store/authStore";

const EARN = [
  ["Complete analysis", "+100 FK"],
  ["Refer a friend (they sign up)", "+200 FK"],
  ["Daily login streak", "+10 FK / day"],
  ["Complete profile", "+50 FK"],
] as const;

export default function RewardsScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [refreshKey, setRefreshKey] = useState(0);
  const { stats, loading } = useGamification(userId, refreshKey);

  return (
    <PageScaffold
      title="Rewards"
      subtitle="Earn and spend Finkoin tokens (FK) across the app."
      requireAuth
      refreshing={loading && refreshKey > 0}
      onRefresh={() => setRefreshKey((k) => k + 1)}
    >
      {loading && !stats ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          <StatCard
            label="FK balance"
            value={<Coin value={stats?.fkBalance ?? 0} />}
          />
          <StatCard
            label="Total earned (lifetime)"
            value={<Coin value={stats?.totalEarned ?? 0} />}
          />
          <StatCard
            label="Streak"
            value={
              <View style={styles.inline}>
                <AppIcon name="flame" size={18} color={Colors.primary} />
                <Text style={styles.statValue}>
                  {stats?.streakDays ?? 0} days
                </Text>
              </View>
            }
          />
          <StatCard
            label="Badges"
            value={
              <Text style={styles.statValue}>
                {stats?.badges.length ? stats.badges.join(", ") : "—"}
              </Text>
            }
          />
        </View>
      )}

      <View style={[pageStyles.card, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>How to earn more</Text>
        <View style={{ marginTop: 12, gap: 12 }}>
          {EARN.map(([label, fk]) => (
            <View key={label} style={styles.earnRow}>
              <Text style={styles.earnLabel}>{label}</Text>
              <Text style={styles.earnFk}>{fk}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.useCard}>
        <Text style={[styles.sectionTitle, { color: "#3C3489" }]}>
          How to use FK
        </Text>
        <Text style={styles.useText}>
          Use <Text style={{ fontWeight: "700" }}>500 FK</Text> toward
          discounted unlocks on the fix plan flow where shown — see{" "}
          <Text
            style={pageStyles.link}
            onPress={() => router.push("/(tabs)/analyse")}
          >
            your analysis
          </Text>
          .
        </Text>
      </View>
    </PageScaffold>
  );
}

function Coin({ value }: { value: number }) {
  return (
    <View style={styles.inline}>
      <AppIcon name="coin" size={18} color={Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={[pageStyles.card, styles.stat]}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <View style={{ marginTop: 8 }}>{value}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexBasis: "47%", flexGrow: 1, padding: 16 },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9B9A94",
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#111110" },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111110" },
  earnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  earnLabel: { flex: 1, fontSize: 14, color: "#5F5E5A" },
  earnFk: { fontSize: 14, fontWeight: "600", color: "#1D9E75" },
  useCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEDFE",
    backgroundColor: "rgba(238,237,254,0.5)",
    padding: 20,
  },
  useText: { marginTop: 8, fontSize: 14, color: "#5F5E5A", lineHeight: 21 },
});
