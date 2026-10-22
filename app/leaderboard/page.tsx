"use client";

import BackLink from "@/components/ui/BackLink";
import {
  FK_EARN_ACTIONS,
  MONTHLY_PRIZES_FK,
  POINTS_EARN_ACTIONS,
  rankSummary,
} from "@/lib/fkRewards";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import PremiumAvatarRing from "@/components/ui/PremiumAvatarRing";
import PremiumBadge from "@/components/ui/PremiumBadge";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useThemeStore } from "@/store/themeStore";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { uniqueChannelName } from "@/lib/realtimeChannel";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  fk_balance: number;
  streak_days: number;
  points: number;
  rank: number;
  percentile: number;
  /** From the views once migration 052 is live; missing means false. */
  is_premium?: boolean;
}

type Tab = "month" | "all";

const TABS: ReadonlyArray<{ id: Tab; label: string; view: string }> = [
  { id: "month", label: "This month", view: "leaderboard_view" },
  { id: "all", label: "All time", view: "leaderboard_all_view" },
];

const CACHE_KEY = "finkoin_leaderboard";
const CACHE_TTL = 5 * 60 * 1000;

const cacheKey = (tab: Tab) => `${CACHE_KEY}_${tab}`;

const formatPoints = (n: number | null | undefined) =>
  `${Number(n ?? 0).toLocaleString("en-IN")} pts`;

function EarnList({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#9B9A94",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {items.map(([action, reward]) => (
        <div
          key={action}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "8px 0",
            borderBottom: "1px solid #F7F7F4",
          }}
        >
          <span style={{ fontSize: 13, color: "#5F5E5A" }}>{action}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#534AB7",
              whiteSpace: "nowrap",
            }}
          >
            {reward}
          </span>
        </div>
      ))}
    </div>
  );
}

function LeaderboardContent() {
  const { user } = useAuthStore();
  const { rank, percentile } = useGamificationStore();

  const [tab, setTab] = useState<Tab>("month");
  const tabRef = useRef<Tab>(tab);
  tabRef.current = tab;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  /** People on the current board, for "#1 of 5". */
  const [total, setTotal] = useState<number | null>(null);

  const fetchLeaderboard = async (force = false, which: Tab = tab) => {
    const view = TABS.find((t) => t.id === which)?.view ?? "leaderboard_view";
    if (!force) {
      try {
        const cached = localStorage.getItem(cacheKey(which));
        if (cached) {
          const { data, fetchedAt } = JSON.parse(cached) as {
            data?: { top?: LeaderboardEntry[]; me?: LeaderboardEntry | null };
            fetchedAt?: number;
          };
          const age = Date.now() - Number(fetchedAt ?? 0);
          if (age < CACHE_TTL && data) {
            if (tabRef.current !== which) return;
            setEntries(data.top ?? []);
            setUserEntry(data.me ?? null);
            setLoading(false);
            setLastFetched(
              new Date(fetchedAt ?? Date.now()).toLocaleTimeString(),
            );
            return;
          }
        }
      } catch {
        // ignore malformed cache
      }
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: top, error: topError } = await supabase
        .from(view)
        .select("*")
        .limit(50);
      if (topError) throw topError;

      let me: LeaderboardEntry | null = null;
      if (user?.id) {
        const { data: myRow, error: meError } = await supabase
          .from(view)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (meError) throw meError;
        me = (myRow as LeaderboardEntry | null) ?? null;
      }

      const topData = (top as LeaderboardEntry[] | null) ?? [];
      const now = Date.now();
      localStorage.setItem(
        cacheKey(which),
        JSON.stringify({ data: { top: topData, me }, fetchedAt: now }),
      );
      // The user may have switched tabs while this was loading.
      if (tabRef.current !== which) return;
      setEntries(topData);
      setUserEntry(me);
      setLastFetched(new Date(now).toLocaleTimeString());
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      if (tabRef.current === which) setLoading(false);
    }
  };

  useEffect(() => {
    const view = TABS.find((t) => t.id === tab)?.view ?? "leaderboard_view";
    let cancelled = false;
    setTotal(null);
    void getSupabase()
      .from(view)
      .select("user_id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (!cancelled && !error) setTotal(count ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    void fetchLeaderboard();

    // RLS only ever delivers the viewer's own gamification row, so filter on
    // it server-side; an unfiltered subscription costs a policy check per
    // subscriber on every FK change (free-plan Realtime quota).
    if (!user?.id) return;
    const supabase = getSupabase();
    const sub = supabase
      .channel(uniqueChannelName("leaderboard-updates"))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gamification",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          for (const t of TABS) localStorage.removeItem(cacheKey(t.id));
          void fetchLeaderboard(true, tabRef.current);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [user?.id, tab]);

  const getInitials = (name: string) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  const getRankColor = (r: number) => {
    if (r === 1) return "#534AB7";
    if (r === 2) return "#7F77DD";
    if (r === 3) return "#AFA9EC";
    return "#9B9A94";
  };

  // The store's rank is this month's rank; fall back to it while the
  // monthly row is missing (points unknown there, so none are shown).
  const me: { rank: number; percentile: number; points?: number } | null =
    userEntry ??
    (tab === "month" && rank ? { rank, percentile: percentile ?? 0 } : null);
  const tabLabel = tab === "month" ? "this month" : "all time";
  // Local unlock covers the user's own row before the views expose is_premium.
  const mePremium =
    useThemeStore((s) => s.premium?.unlocked ?? false) ||
    userEntry?.is_premium === true;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
      <BackLink fallbackHref="/rewards" label="Back" className="mb-3" />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#111110",
              margin: 0,
            }}
          >
            Leaderboard
          </h1>
          <p style={{ fontSize: 12, color: "#9B9A94", margin: "4px 0 0" }}>
            {lastFetched ? `Updated ${lastFetched}` : "Live rankings"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLeaderboard(true, tab)}
          style={{
            background: "#EEEDFE",
            border: "none",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "#534AB7",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Leaderboard period"
        style={{
          display: "flex",
          gap: 4,
          background: "#EEEDFE",
          borderRadius: 12,
          padding: 4,
          marginBottom: 12,
        }}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (active) return;
                setEntries([]);
                setUserEntry(null);
                setLastFetched(null);
                setLoading(true);
                setTab(t.id);
              }}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 9,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: active ? "white" : "transparent",
                color: active ? "#534AB7" : "#7F77DD",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "month" ? (
        <p
          style={{
            fontSize: 12,
            color: "#5F5E5A",
            background: "#FAFAFE",
            border: "1px solid #E8E6F0",
            borderRadius: 10,
            padding: "8px 12px",
            margin: "0 0 16px",
          }}
        >
          Top 3 on the 1st win {MONTHLY_PRIZES_FK.join(" / ")} FK
        </p>
      ) : null}

      {me ? (
        <div
          style={{
            background: "#534AB7",
            borderRadius: 14,
            padding: "16px",
            marginBottom: 16,
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <PremiumAvatarRing premium={mePremium}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name || "You")}
            </div>
          </PremiumAvatarRing>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              You · Rank #{me.rank}
              {mePremium ? <PremiumBadge size="sm" /> : null}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
              {rankSummary(me.rank, total, me.percentile, tabLabel)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {me.points != null ? (
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {formatPoints(me.points)}
              </div>
            ) : null}
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {userEntry?.streak_days ?? 0} day streak
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #E8E6F0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #F0EFF8",
            display: "flex",
            justifyContent: "space-between",
            background: "#FAFAFE",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#9B9A94",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Top users {tabLabel}
          </span>
          <span style={{ fontSize: 11, color: "#9B9A94" }}>Points</span>
        </div>

        {loading ? (
          <BrandPageLoader
            fullScreen={false}
            size="sm"
            minHeight={120}
            label="Loading…"
          />
        ) : entries.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: "#9B9A94",
              textAlign: "center",
              padding: "32px 16px",
              margin: 0,
            }}
          >
            No rankings yet.
          </p>
        ) : (
          entries.map((entry, i) => {
            const isMe = entry.user_id === user?.id;
            const isPremium = entry.is_premium === true || (isMe && mePremium);
            return (
              <div
                key={entry.user_id}
                style={{
                  padding: "13px 16px",
                  borderBottom:
                    i < entries.length - 1 ? "1px solid #F7F7F4" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: isMe ? "#EEEDFE" : "white",
                }}
              >
                <div
                  style={{
                    fontSize: i < 3 ? 16 : 13,
                    fontWeight: 700,
                    color: getRankColor(entry.rank),
                    minWidth: 28,
                    textAlign: "center",
                  }}
                >
                  {entry.rank <= 3 ? "★" : entry.rank}
                </div>

                <PremiumAvatarRing premium={isPremium}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isMe ? "#534AB7" : "#EEEDFE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: isMe ? "white" : "#534AB7",
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {entry.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.avatar_url}
                        alt="avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      getInitials(entry.name || "U")
                    )}
                  </div>
                </PremiumAvatarRing>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isMe ? 700 : 500,
                      color: isMe ? "#534AB7" : "#111110",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isMe
                        ? `You · ${entry.name || "User"}`
                        : entry.name || "User"}
                    </span>
                    {isPremium ? <PremiumBadge size="sm" /> : null}
                  </div>
                  {entry.streak_days > 0 ? (
                    <div
                      style={{ fontSize: 11, color: "#9B9A94", marginTop: 1 }}
                    >
                      {entry.streak_days} day streak
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isMe ? "#534AB7" : "#111110",
                  }}
                >
                  {formatPoints(entry.points)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #E8E6F0",
          padding: "16px",
          marginTop: 16,
        }}
      >
        <EarnList title="Earn points" items={POINTS_EARN_ACTIONS} />
        <EarnList title="Earn FK" items={FK_EARN_ACTIONS} />
        <Link
          href="/rewards"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#534AB7",
            textDecoration: "none",
          }}
        >
          What is FK? →
        </Link>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedGate>
      <LeaderboardContent />
    </ProtectedGate>
  );
}
