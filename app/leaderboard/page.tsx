"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  fk_balance: number;
  streak_days: number;
  rank: number;
  percentile: number;
}

const CACHE_KEY = "finkoin_leaderboard";
const CACHE_TTL = 5 * 60 * 1000;

function LeaderboardContent() {
  const { user } = useAuthStore();
  const { rank, percentile, fkBalance } = useGamificationStore();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchLeaderboard = async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, fetchedAt } = JSON.parse(cached) as {
            data?: { top?: LeaderboardEntry[]; me?: LeaderboardEntry | null };
            fetchedAt?: number;
          };
          const age = Date.now() - Number(fetchedAt ?? 0);
          if (age < CACHE_TTL && data) {
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
        .from("leaderboard_view")
        .select("*")
        .limit(50);
      if (topError) throw topError;

      let me: LeaderboardEntry | null = null;
      if (user?.id) {
        const { data: myRow, error: meError } = await supabase
          .from("leaderboard_view")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (meError) throw meError;
        me = (myRow as LeaderboardEntry | null) ?? null;
      }

      const topData = (top as LeaderboardEntry[] | null) ?? [];
      setEntries(topData);
      setUserEntry(me);

      const now = Date.now();
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: { top: topData, me }, fetchedAt: now }),
      );
      setLastFetched(new Date(now).toLocaleTimeString());
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeaderboard();

    const supabase = getSupabase();
    const sub = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gamification",
        },
        () => {
          localStorage.removeItem(CACHE_KEY);
          void fetchLeaderboard(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [user?.id]);

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

  const me =
    userEntry ??
    (rank
      ? { rank, percentile: percentile ?? 0, fk_balance: fkBalance }
      : null);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px" }}>
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
            FK Leaderboard
          </h1>
          <p style={{ fontSize: 12, color: "#9B9A94", margin: "4px 0 0" }}>
            {lastFetched ? `Updated ${lastFetched}` : "Live rankings"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLeaderboard(true)}
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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              You · Rank #{me.rank}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
              Top {me.percentile}% of all users
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {me.fk_balance} FK
            </div>
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
            Top users this month
          </span>
          <span style={{ fontSize: 11, color: "#9B9A94" }}>FK Balance</span>
        </div>

        {loading ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: "#9B9A94",
              fontSize: 14,
            }}
          >
            Loading...
          </div>
        ) : (
          entries.map((entry, i) => {
            const isMe = entry.user_id === user?.id;
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

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isMe ? 700 : 500,
                      color: isMe ? "#534AB7" : "#111110",
                    }}
                  >
                    {isMe
                      ? `You · ${entry.name || "User"}`
                      : entry.name || "User"}
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
                  {entry.fk_balance} FK
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
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#9B9A94",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          HOW TO EARN FK
        </div>
        {[
          ["Complete health check", "+100 FK"],
          ["Buy fix plan", "+150 FK"],
          ["Refer a friend", "+200 FK"],
          ["Leave feedback", "+50 FK"],
          ["Daily login", "+10 FK/day"],
          ["Read daily tip", "+5 FK"],
        ].map(([action, reward]) => (
          <div
            key={action}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #F7F7F4",
            }}
          >
            <span style={{ fontSize: 13, color: "#5F5E5A" }}>{action}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#534AB7" }}>
              {reward}
            </span>
          </div>
        ))}
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
