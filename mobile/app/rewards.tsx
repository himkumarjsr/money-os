/**
 * Rewards — port of web app/rewards/page.tsx.
 */
import {
  FK_EARN_ACTIONS,
  FK_EXPLAINER,
  POINTS_EARN_ACTIONS,
} from "@/lib/fkRewards";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { Colors, themedStyles } from "@/constants/theme";
import { useGamification } from "@/lib/useGamification";
import { useAuthStore } from "@/store/authStore";
import { GoldText } from "@/components/ui/GoldMirror";

export default function RewardsScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [refreshKey, setRefreshKey] = useState(0);
  const { stats, loading } = useGamification(userId, refreshKey);

  return (
    <PageScaffold
      title="Rewards"
      subtitle="Earn points to climb the leaderboard and FK to save on Finkoin products."
      requireAuth
      refreshing={loading && refreshKey > 0}
      onRefresh={() => setRefreshKey((k) => k + 1)}
    >
      <View style={[styles.useCard, { marginTop: 0, marginBottom: 24 }]}>
        <GoldText style={[styles.sectionTitle, { color: Colors.primaryDark }]}>
          What is FK?
        </GoldText>
        <View style={{ marginTop: 12, gap: 14 }}>
          {FK_EXPLAINER.map(([q, a]) => (
            <View key={q}>
              <Text style={styles.question}>{q}</Text>
              <Text style={styles.useText}>{a}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>Using FK for discounts is coming soon.</Text>
      </View>

      {loading && !stats ? (
        <ActivityIndicator
          color={Colors.primaryText}
          style={{ marginTop: 40 }}
        />
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
                <AppIcon name="flame" size={18} color={Colors.primaryText} />
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

      <EarnCard title="Earn FK" items={FK_EARN_ACTIONS} />
      <EarnCard title="Earn points" items={POINTS_EARN_ACTIONS} />
      <Text style={[styles.useText, { marginTop: 16 }]}>
        See where you stand on the{" "}
        <Text
          style={pageStyles.link}
          onPress={() => router.push("/leaderboard")}
        >
          leaderboard
        </Text>
        .
      </Text>
    </PageScaffold>
  );
}

function EarnCard({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <View style={[pageStyles.card, { marginTop: 24 }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 12, gap: 12 }}>
        {items.map(([label, reward]) => (
          <View key={label} style={styles.earnRow}>
            <Text style={styles.earnLabel}>{label}</Text>
            <Text style={styles.earnFk}>{reward}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Coin({ value }: { value: number }) {
  return (
    <View style={styles.inline}>
      <AppIcon name="coin" size={18} color={Colors.primaryText} />
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

const styles = themedStyles(() => ({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexBasis: "47%", flexGrow: 1, padding: 16 },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  earnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  earnLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  earnFk: { fontSize: 14, fontWeight: "600", color: Colors.success },
  useCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryTint,
    padding: 20,
  },
  question: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  note: { marginTop: 14, fontSize: 12, color: Colors.textMuted },
  useText: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
}));
