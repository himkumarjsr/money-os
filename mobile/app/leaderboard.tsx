/**
 * FK Leaderboard — port of web app/leaderboard/page.tsx.
 * Reads `leaderboard_view` directly and refetches on `gamification` updates.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { uniqueChannelName } from "@/lib/realtimeChannel";
import { useAuthStore } from "@/store/authStore";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  fk_balance: number;
  streak_days: number;
  rank: number;
  percentile: number;
}

interface CachedLeaderboard {
  data?: { top?: LeaderboardEntry[]; me?: LeaderboardEntry | null };
  fetchedAt?: number;
  userId?: string | null;
}

const CACHE_KEY = "finkoin_leaderboard";
const CACHE_TTL = 5 * 60 * 1000;

const EARN_ACTIONS: [string, string][] = [
  ["Complete health check", "+100 FK"],
  ["Buy fix plan", "+150 FK"],
  ["Refer a friend", "+200 FK"],
  ["Leave feedback", "+50 FK"],
  ["Daily login", "+10 FK/day"],
  ["Read daily tip", "+5 FK"],
];

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
  if (r === 1) return "#534AB7";
  if (r === 2) return "#7F77DD";
  if (r === 3) return "#AFA9EC";
  return "#9B9A94";
}

function formatTime(ms: number) {
  try {
    return new Date(ms).toLocaleTimeString();
  } catch {
    return "";
  }
}

function Avatar({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(entry.avatar_url) && !failed;
  return (
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
  );
}

export default function LeaderboardScreen() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const userId = user?.id ?? null;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchLeaderboard = useCallback(
    async (force = false) => {
      if (!force) {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw) {
            const { data, fetchedAt, userId: cachedFor } = JSON.parse(
              raw,
            ) as CachedLeaderboard;
            const age = Date.now() - Number(fetchedAt ?? 0);
            if (age < CACHE_TTL && data && (cachedFor ?? null) === userId) {
              if (!mounted.current) return;
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

      if (mounted.current) setLoading(true);
      try {
        const { data: top, error: topError } = await supabase
          .from("leaderboard_view")
          .select("*")
          .limit(50);
        if (topError) throw topError;

        let me: LeaderboardEntry | null = null;
        if (userId) {
          const { data: myRow, error: meError } = await supabase
            .from("leaderboard_view")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();
          if (meError) throw meError;
          me = (myRow as LeaderboardEntry | null) ?? null;
        }

        const topData = (top as LeaderboardEntry[] | null) ?? [];
        const now = Date.now();
        if (mounted.current) {
          setEntries(topData);
          setUserEntry(me);
          setLastFetched(formatTime(now));
        }
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: { top: topData, me },
            fetchedAt: now,
            userId,
          } satisfies CachedLeaderboard),
        ).catch(() => undefined);
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn) return;
    void fetchLeaderboard();

    const sub = supabase
      .channel(uniqueChannelName("leaderboard-updates"))
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "gamification" },
        () => {
          void AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
          void fetchLeaderboard(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [hasInitialized, isLoggedIn, fetchLeaderboard]);

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
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
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
          <Text style={styles.gateText}>
            Sign in to see the FK leaderboard.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={styles.gateBtn}
            accessibilityRole="button"
          >
            <Text style={styles.gateBtnText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const me = userEntry;

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
            <Text style={styles.h1}>FK Leaderboard</Text>
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

        {me ? (
          <View style={styles.meCard}>
            <View style={styles.meAvatar}>
              <Text style={styles.meAvatarText}>
                {getInitials(user?.name || "You")}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.meTitle}>You · Rank #{me.rank}</Text>
              <Text style={styles.meSub}>
                Top {me.percentile}% of all users
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.meFk}>{me.fk_balance} FK</Text>
              <Text style={styles.meSub}>{me.streak_days ?? 0} day streak</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.tableHead}>
            <Text style={styles.tableHeadLabel}>Top users this month</Text>
            <Text style={styles.tableHeadRight}>FK Balance</Text>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loaderText}>Loading…</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.loader}>
              <Text style={styles.loaderText}>No rankings yet.</Text>
            </View>
          ) : (
            entries.map((entry, i) => {
              const isMe = entry.user_id === userId;
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

                  <Avatar entry={entry} isMe={isMe} />

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.name, isMe && styles.nameMe]}
                    >
                      {isMe
                        ? `You · ${entry.name || "User"}`
                        : entry.name || "User"}
                    </Text>
                    {entry.streak_days > 0 ? (
                      <Text style={styles.streak}>
                        {entry.streak_days} day streak
                      </Text>
                    ) : null}
                  </View>

                  <Text style={[styles.fk, isMe && styles.nameMe]}>
                    {entry.fk_balance} FK
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.card, styles.earnCard]}>
          <Text style={styles.earnTitle}>HOW TO EARN FK</Text>
          {EARN_ACTIONS.map(([action, reward]) => (
            <View key={action} style={styles.earnRow}>
              <Text style={styles.earnAction}>{action}</Text>
              <Text style={styles.earnReward}>{reward}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 120 },
  back: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingRight: 16,
  },
  backText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  gate: { padding: 24, alignItems: "center" },
  gateText: { color: "#5F5E5A", marginBottom: 16, fontSize: 15 },
  gateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  gateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  h1: { fontSize: 22, fontWeight: "800", color: "#111110" },
  sub: { marginTop: 4, fontSize: 12, color: "#9B9A94" },
  refreshBtn: {
    backgroundColor: "#EEEDFE",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  refreshText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
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
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  meAvatarText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  meTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  meSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  meFk: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    overflow: "hidden",
  },
  tableHead: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFF8",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFE",
  },
  tableHeadLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9B9A94",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableHeadRight: { fontSize: 11, color: "#9B9A94" },
  loader: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loaderText: { fontSize: 13, color: "#9B9A94" },
  row: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "#F7F7F4" },
  rowMe: { backgroundColor: "#EEEDFE" },
  rank: { fontWeight: "700", minWidth: 28, textAlign: "center" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarMe: { backgroundColor: Colors.primary },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  avatarTextMe: { color: "#FFFFFF" },
  name: { fontSize: 13, fontWeight: "500", color: "#111110" },
  nameMe: { fontWeight: "700", color: Colors.primary },
  streak: { fontSize: 11, color: "#9B9A94", marginTop: 1 },
  fk: { fontSize: 14, fontWeight: "700", color: "#111110" },
  earnCard: { padding: 16, marginTop: 16 },
  earnTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9B9A94",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  earnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F7F4",
  },
  earnAction: { fontSize: 13, color: "#5F5E5A" },
  earnReward: { fontSize: 12, fontWeight: "700", color: Colors.primary },
});
