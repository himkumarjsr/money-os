"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState } from "react";

type GamRow = {
  user_id: string;
  fk_balance: number | null;
  total_earned: number | null;
  streak_days: number | null;
  badges: unknown;
};

function anonymizeDisplayName(name: string | null | undefined): string {
  const n = name?.trim();
  if (!n) return "Finkoin user";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

function badgePreview(badges: unknown): string {
  if (!Array.isArray(badges) || badges.length === 0) return "—";
  const first = badges[0];
  return typeof first === "string" ? first : "🏅";
}

export default function LeaderboardPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GamRow[]>([]);
  const [names, setNames] = useState<Record<string, string | null>>({});
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabase();
        const { data: top, error: topErr } = await supabase
          .from("gamification")
          .select("user_id, fk_balance, total_earned, streak_days, badges")
          .order("fk_balance", { ascending: false })
          .limit(50);

        if (topErr) throw topErr;
        const list = (top ?? []) as GamRow[];
        if (cancelled) return;
        setRows(list);

        const ids = Array.from(new Set(list.map((r) => r.user_id)));
        if (ids.length > 0) {
          const { data: usersRows } = await supabase.from("users").select("id, name").in("id", ids);
          const map: Record<string, string | null> = {};
          for (const u of usersRows ?? []) {
            map[(u as { id: string }).id] = (u as { name: string | null }).name ?? null;
          }
          if (!cancelled) setNames(map);
        }

        const { count } = await supabase.from("gamification").select("*", { count: "exact", head: true });
        if (!cancelled) setTotalPlayers(count ?? 0);

        if (userId) {
          const mine = list.find((r) => r.user_id === userId);
          let myBal = mine ? Number(mine.fk_balance ?? 0) : 0;
          if (!mine) {
            const { data: mineRow } = await supabase.from("gamification").select("fk_balance").eq("user_id", userId).maybeSingle();
            myBal = Number(mineRow?.fk_balance ?? 0);
          }
          const { count: above } = await supabase
            .from("gamification")
            .select("*", { count: "exact", head: true })
            .gt("fk_balance", myBal);
          if (!cancelled) setMyRank((above ?? 0) + 1);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not load leaderboard";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const placeholder = useMemo(() => (totalPlayers !== null ? totalPlayers < 5 : false), [totalPlayers]);

  return (
    <ProtectedGate>
      <div className="min-h-dvh bg-white px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold text-[#111110]">Finkoin Leaderboard</h1>
          <p className="mt-2 text-sm text-[#5F5E5A]">Top earners by FK balance · Updated live from your cohort</p>

          {myRank !== null ? (
            <p className="mt-4 rounded-xl bg-[#EEEDFE] px-4 py-3 text-sm font-semibold text-[#3C3489]">
              Your rank: #{myRank}
            </p>
          ) : null}

          {loading ? (
            <div className="mt-10 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent" />
            </div>
          ) : error ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
          ) : placeholder ? (
            <div className="mt-10 rounded-2xl border border-[#F0EFF8] bg-[#F7F7F4] px-6 py-12 text-center">
              <p className="text-lg font-bold text-[#111110]">Be one of the first to top the Finkoin leaderboard!</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#5F5E5A]">
                Complete lessons, refer friends, and run your analysis to climb the ranks as more users join.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-[#F0EFF8] shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F7F7F4] text-[#5F5E5A]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Rank</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">FK balance</th>
                    <th className="px-4 py-3 font-semibold">Streak</th>
                    <th className="px-4 py-3 font-semibold">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isYou = userId && row.user_id === userId;
                    const label = anonymizeDisplayName(names[row.user_id]);
                    return (
                      <tr
                        key={row.user_id}
                        className={`border-t border-[#F0EFF8] ${isYou ? "bg-[#EEEDFE]/90" : ""}`}
                      >
                        <td className="px-4 py-3 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-[#111110]">{label}</span>
                          {isYou ? (
                            <span className="ml-2 rounded-full bg-[#534AB7] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                              You
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-semibold">🪙 {Number(row.fk_balance ?? 0)}</td>
                        <td className="px-4 py-3">🔥 {Number(row.streak_days ?? 0)} days</td>
                        <td className="px-4 py-3">{badgePreview(row.badges)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <section className="mt-10 rounded-2xl border border-[#F0EFF8] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#111110]">Referral rewards</h2>
            <p className="mt-2 text-sm text-[#5F5E5A]">Earn FK when friends join via your link — see the Refer page for your code.</p>
          </section>
        </div>
      </div>
    </ProtectedGate>
  );
}
