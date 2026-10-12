/**
 * Rewards — port of web app/rewards/page.tsx.
 */
import {
  FK_PER_RUPEE,
  FK_EARN_ACTIONS,
  FK_EXPLAINER,
  POINTS_EARN_ACTIONS,
} from "@/lib/fkRewards";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/ui/AppIcon";
import { PageScaffold, pageStyles } from "@/components/ui/PageScaffold";
import { Colors, themedStyles } from "@/constants/theme";
import { useGamification } from "@/lib/useGamification";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { GoldText } from "@/components/ui/GoldMirror";

export default function RewardsScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin === true);
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

      {isAdmin ? <AdminFkCard /> : null}

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

type FkSummary = {
  outstanding_fk: number | null;
  outstanding_inr: number | null;
  issued_this_month: number | null;
  issued_last_month: number | null;
  monthly_budget_fk: number | null;
};

/** Admin-only view of FK owed to users; the RPC refuses non-admins. */
function AdminFkCard() {
  const [summary, setSummary] = useState<FkSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("admin_fk_summary");
        if (cancelled || error) return;
        const row = (Array.isArray(data) ? data[0] : data) as
          | FkSummary
          | null
          | undefined;
        if (row) setSummary(row);
      } catch {
        // admin-only extra; ignore failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!summary) return null;

  const fk = (n: number | null) => Number(n ?? 0).toLocaleString("en-IN");
  const inr =
    summary.outstanding_inr != null
      ? Number(summary.outstanding_inr)
      : Number(summary.outstanding_fk ?? 0) / FK_PER_RUPEE;
  const rows: Array<[string, string]> = [
    ["Outstanding", `${fk(summary.outstanding_fk)} FK`],
    ["Worth", `₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`],
    ["Issued this month", `${fk(summary.issued_this_month)} FK`],
    ["Issued last month", `${fk(summary.issued_last_month)} FK`],
    [
      "Monthly budget",
      summary.monthly_budget_fk == null
        ? "No limit"
        : `${fk(summary.monthly_budget_fk)} FK`,
    ],
  ];

  return (
    <View style={[pageStyles.card, { marginBottom: 24 }]}>
      <Text style={styles.adminTitle}>FK LIABILITY (ADMIN)</Text>
      <View style={{ marginTop: 12, gap: 8 }}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.earnRow}>
            <Text style={styles.earnLabel}>{label}</Text>
            <Text style={styles.statValue2}>{value}</Text>
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
  adminTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  statValue2: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
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
