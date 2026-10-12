/**
 * Leaderboard — port of web app/leaderboard/page.tsx.
 * Ranks by points: `leaderboard_view` (this month) or `leaderboard_all_view`
 * (all time). Refetches on `gamification` updates.
 */
import {
  FK_EARN_ACTIONS,
  MONTHLY_PRIZES_FK,
  POINTS_EARN_ACTIONS,
} from "@/lib/fkRewards";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, themedStyles, brand, onPrimaryAlpha } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { uniqueChannelName } from "@/lib/realtimeChannel";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { PremiumAvatarRing } from "@/components/ui/PremiumAvatarRing";
import { PremiumBadge } from "@/components/ui/PremiumBadge";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  fk_balance: number;
  streak_days: number;
  points: number;
  rank: number;
  percentile: number;
  /** Premium (Finkoin) member; absent until the views expose the column. */
  is_premium?: boolean;
}

interface CachedLeaderboard {
  data?: { top?: LeaderboardEntry[]; me?: LeaderboardEntry | null };
  fetchedAt?: number;
  userId?: string | null;
}

type Tab = "month" | "all";

const TABS: ReadonlyArray<{ id: Tab; label: string; view: string }> = [
  { id: "month", label: "This month", view: "leaderboard_view" },
  { id: "all", label: "All time", view: "leaderboard_all_view" },
];

const CACHE_KEY = "finkoin_leaderboard";
const CACHE_TTL = 5 * 60 * 1000;

const cacheKey = (tab: Tab) => `${CACHE_KEY}_${tab}`;

function formatPoints(n: number | null | undefined) {
  return `${Number(n ?? 0).toLocaleString("en-IN")} pts`;
}

function getInitials(name: string) {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function getRankColor(r: number) {
  if (r === 1) return brand("#534AB7");
  if (r === 2) return brand("#7F77DD");
  if (r === 3) return brand("#AFA9EC");
  return "#9B9A94";
}

function formatTime(ms: number) {
  try {
    return new Date(ms).toLocaleTimeString();
  } catch {
    return "";
  }
}

function EarnList({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.earnTitle}>{title}</Text>
      {items.map(([action, reward]) => (
        <View key={action} style={styles.earnRow}>
          <Text style={styles.earnAction}>{action}</Text>
          <Text style={styles.earnReward}>{reward}</Text>
        </View>
      ))}
    </View>
  );
}

function Avatar({
  entry,
  isMe,
  premium,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  premium: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(entry.avatar_url) && !failed;
  return (
    <PremiumAvatarRing premium={premium} size={36}>
      <View style={[styles.avatar, isMe && styles.avatarMe]}>
        {showImage ? (
          <Image
            source={{ uri: entry.avatar_url as string }}
            style={styles.avatarImg}
            onError={() => setFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={[styles.avatarText, isMe && styles.avatarTextMe]}>
            {getInitials(entry.name || "U")}
          </Text>
        )}
      </View>
    </PremiumAvatarRing>
  );
}

export default function LeaderboardScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const userId = user?.id ?? null;
  const premiumUnlocked = useThemeStore((s) => s.premium?.unlocked ?? false);

  const [tab, setTab] = useState<Tab>("month");
  const tabRef = useRef<Tab>(tab);
  tabRef.current = tab;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  // This month's rank from leaderboard_view (web: gamification store).
  const [storeRank, setStoreRank] = useState<{
    rank: number;
    percentile: number;
  } | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchLeaderboard = useCallback(
    async (force = false) => {
      const which = tab;
      const view = TABS.find((t) => t.id === which)?.view ?? "leaderboard_view";
      const current = () => mounted.current && tabRef.current === which;
      if (!force) {
        try {
          const raw = await AsyncStorage.getItem(cacheKey(which));
          if (raw) {
            const {
              data,
              fetchedAt,
              userId: cachedFor,
            } = JSON.parse(raw) as CachedLeaderboard;
            const age = Date.now() - Number(fetchedAt ?? 0);
            if (age < CACHE_TTL && data && (cachedFor ?? null) === userId) {
              if (!current()) return;
              setEntries(data.top ?? []);
              setUserEntry(data.me ?? null);
              setLoading(false);
              setLastFetched(formatTime(fetchedAt ?? Date.now()));
              return;
            }
          }
        } catch {
          // ignore malformed cache
        }
      }

      if (current()) setLoading(true);
      try {
        const { data: top, error: topError } = await supabase
          .from(view)
          .select("*")
          .limit(50);
        if (topError) throw topError;

        let me: LeaderboardEntry | null = null;
        if (userId) {
          const { data: myRow, error: meError } = await supabase
            .from(view)
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();
          if (meError) throw meError;
          me = (myRow as LeaderboardEntry | null) ?? null;
        }

        const topData = (top as LeaderboardEntry[] | null) ?? [];
        const now = Date.now();
        if (current()) {
          setEntries(topData);
          setUserEntry(me);
          setLastFetched(formatTime(now));
        }
        await AsyncStorage.setItem(
          cacheKey(which),
          JSON.stringify({
            data: { top: topData, me },
            fetchedAt: now,
            userId,
          } satisfies CachedLeaderboard),
        ).catch(() => undefined);
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        if (current()) setLoading(false);
      }
    },
    [userId, tab],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("leaderboard_view")
        .select("rank, percentile")
        .eq("user_id", userId)
        .maybeSingle();
      const rank = Number(data?.rank ?? 0);
      if (cancelled || error || !rank) return;
      setStoreRank({ rank, percentile: Number(data?.percentile ?? 0) });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn) return;
    void fetchLeaderboard();
    if (!userId) return;

    // RLS only delivers the viewer's own row; filter server-side so Realtime
    // doesn't run a policy check per subscriber on every FK change.
    const sub = supabase
      .channel(uniqueChannelName("leaderboard-updates"))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gamification",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void AsyncStorage.multiRemove(TABS.map((t) => cacheKey(t.id))).catch(
            () => undefined,
          );
          void fetchLeaderboard(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [hasInitialized, isLoggedIn, userId, fetchLeaderboard]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");

  const onPullRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard(true);
    setRefreshing(false);
  };

  if (!hasInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator
          color={Colors.primaryText}
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Pressable
          onPress={goBack}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.gate}>
          <Text style={styles.gateText}>Sign in to see the leaderboard.</Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(auth)/login",
                params: { next: "/leaderboard" },
              })
            }
            style={styles.gateBtn}
            accessibilityRole="button"
          >
            <Text style={styles.gateBtnText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Fall back to this month's rank while the row is missing (points unknown).
  const me: {
    rank: number;
    percentile: number;
    points?: number;
    streak_days?: number;
    is_premium?: boolean;
  } | null =
    userEntry ??
    (tab === "month" && storeRank
      ? { rank: storeRank.rank, percentile: storeRank.percentile }
      : null);
  // Rows carry `is_premium` once the views expose it; the viewer's own row
  // also counts their locally known Premium status.
  const isPremiumEntry = (entry: LeaderboardEntry) =>
    entry.is_premium === true || (entry.user_id === userId && premiumUnlocked);
  const tabLabel = tab === "month" ? "this month" : "all time";

  const selectTab = (next: Tab) => {
    if (next === tab) return;
    setEntries([]);
    setUserEntry(null);
    setLastFetched(null);
    setLoading(true);
    setTab(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.primary}
            onRefresh={() => void onPullRefresh()}
          />
        }
      >
        <Pressable
          onPress={goBack}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>Leaderboard</Text>
            <Text style={styles.sub}>
              {lastFetched ? `Updated ${lastFetched}` : "Live rankings"}
            </Text>
          </View>
          <Pressable
            onPress={() => void fetchLeaderboard(true)}
            style={({ pressed }) => [
              styles.refreshBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refresh leaderboard"
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Pressable
                key={t.id}
                onPress={() => selectTab(t.id)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "month" ? (
          <Text style={styles.prize}>
            Top 3 on the 1st win {MONTHLY_PRIZES_FK.join(" / ")} FK
          </Text>
        ) : null}

        {me ? (
          <View style={styles.meCard}>
            <PremiumAvatarRing
              premium={me.is_premium === true || premiumUnlocked}
              size={44}
            >
              <View style={styles.meAvatar}>
                <Text style={styles.meAvatarText}>
                  {getInitials(user?.name || "You")}
                </Text>
              </View>
            </PremiumAvatarRing>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.meTitle}>You · Rank #{me.rank}</Text>
              <Text style={styles.meSub}>
                Top {me.percentile}% {tabLabel}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {me.points != null ? (
                <Text style={styles.meFk}>{formatPoints(me.points)}</Text>
              ) : null}
              <Text style={styles.meSub}>{me.streak_days ?? 0} day streak</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.tableHead}>
            <Text style={styles.tableHeadLabel}>Top users {tabLabel}</Text>
            <Text style={styles.tableHeadRight}>Points</Text>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={Colors.primaryText} />
              <Text style={styles.loaderText}>Loading…</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.loader}>
              <Text style={styles.loaderText}>No rankings yet.</Text>
            </View>
          ) : (
            entries.map((entry, i) => {
              const isMe = entry.user_id === userId;
              const premium = isPremiumEntry(entry);
              return (
                <View
                  key={entry.user_id}
                  style={[
                    styles.row,
                    i < entries.length - 1 && styles.rowDivider,
                    isMe && styles.rowMe,
                  ]}
                >
                  <Text
                    style={[
                      styles.rank,
                      {
                        fontSize: i < 3 ? 16 : 13,
                        color: getRankColor(entry.rank),
                      },
                    ]}
                  >
                    {entry.rank <= 3 ? "★" : entry.rank}
                  </Text>

                  <Avatar entry={entry} isMe={isMe} premium={premium} />

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.nameRow}>
                      <Text
                        numberOfLines={1}
                        style={[styles.name, isMe && styles.nameMe]}
                      >
                        {isMe
                          ? `You · ${entry.name || "User"}`
                          : entry.name || "User"}
                      </Text>
                      {premium ? <PremiumBadge size="sm" /> : null}
                    </View>
                    {entry.streak_days > 0 ? (
                      <Text style={styles.streak}>
                        {entry.streak_days} day streak
                      </Text>
                    ) : null}
                  </View>

                  <Text style={[styles.fk, isMe && styles.nameMe]}>
                    {formatPoints(entry.points)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.card, styles.earnCard]}>
          <EarnList title="Earn points" items={POINTS_EARN_ACTIONS} />
          <EarnList title="Earn FK" items={FK_EARN_ACTIONS} />
          <Pressable
            onPress={() => router.push("/rewards")}
            style={styles.fkLink}
            accessibilityRole="link"
          >
            <Text style={styles.backText}>What is FK? →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 120 },
  back: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingRight: 16,
  },
  backText: { color: Colors.primaryText, fontWeight: "700", fontSize: 14 },
  gate: { padding: 24, alignItems: "center" },
  gateText: { color: Colors.textSecondary, marginBottom: 16, fontSize: 15 },
  gateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  gateBtnText: { color: Colors.onPrimary, fontWeight: "700", fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  h1: { fontSize: 22, fontWeight: "800", color: Colors.textPrimary },
  sub: { marginTop: 4, fontSize: 12, color: Colors.textMuted },
  refreshBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  refreshText: { fontSize: 12, fontWeight: "600", color: Colors.primaryText },
  tabs: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: Colors.card },
  tabText: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  tabTextActive: { color: Colors.primaryText },
  prize: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  fkLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  meCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  meAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: onPrimaryAlpha(0.2),
    alignItems: "center",
    justifyContent: "center",
  },
  meAvatarText: { fontSize: 16, fontWeight: "700", color: Colors.onPrimary },
  meTitle: { fontSize: 14, fontWeight: "700", color: Colors.onPrimary },
  meSub: {
    fontSize: 11,
    color: onPrimaryAlpha(0.7),
    marginTop: 2,
  },
  meFk: { fontSize: 20, fontWeight: "800", color: Colors.onPrimary },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  tableHead: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
  },
  tableHeadLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableHeadRight: { fontSize: 11, color: Colors.textMuted },
  loader: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loaderText: { fontSize: 13, color: Colors.textMuted },
  row: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.background },
  rowMe: { backgroundColor: Colors.primaryLight },
  rank: { fontWeight: "700", minWidth: 28, textAlign: "center" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarMe: { backgroundColor: Colors.primary },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { fontSize: 13, fontWeight: "700", color: Colors.primaryText },
  avatarTextMe: { color: Colors.onPrimary },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  nameMe: { fontWeight: "700", color: Colors.primaryText },
  streak: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  fk: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  earnCard: { padding: 16, marginTop: 16 },
  earnTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  earnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  earnAction: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  earnReward: { fontSize: 12, fontWeight: "700", color: Colors.primaryText },
}));
