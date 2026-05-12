"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useEffect, useState } from "react";

type GamData = {
  fk_balance: number | null;
  total_earned: number | null;
  streak_days: number | null;
  badges: unknown;
};

export default function RewardsPage() {
  const user = useAuthStore((s) => s.user);
  const [gam, setGam] = useState<GamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from("gamification").select("*").eq("user_id", user.id).maybeSingle();
        if (!cancelled && !error && data) {
          setGam(data as GamData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const fk = Number(gam?.fk_balance ?? 0);
  const earned = Number(gam?.total_earned ?? 0);
  const streak = Number(gam?.streak_days ?? 0);
  const badges = Array.isArray(gam?.badges) ? (gam!.badges as string[]) : [];

  return (
    <ProtectedGate>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-[#111110]">Rewards</h1>
        <p className="mt-2 text-sm text-[#5F5E5A]">Earn and spend Finkoin tokens (FK) across the app.</p>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent" />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <StatCard label="FK balance" value={`🪙 ${fk}`} />
            <StatCard label="Total earned (lifetime)" value={`🪙 ${earned}`} />
            <StatCard label="Streak" value={`🔥 ${streak} days`} />
            <StatCard label="Badges" value={badges.length ? badges.join(", ") : "—"} />
          </div>
        )}

        <section className="mt-10 rounded-2xl border border-[#F0EFF8] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#111110]">How to earn more</h2>
          <ul className="mt-4 space-y-3 text-sm text-[#5F5E5A]">
            <li className="flex justify-between gap-2">
              <span>Complete analysis</span>
              <span className="font-semibold text-[#1D9E75]">+100 FK</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Refer a friend (they sign up)</span>
              <span className="font-semibold text-[#1D9E75]">+200 FK</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Daily login streak</span>
              <span className="font-semibold text-[#1D9E75]">+10 FK / day</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Complete profile</span>
              <span className="font-semibold text-[#1D9E75]">+50 FK</span>
            </li>
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-[#EEEDFE] bg-[#EEEDFE]/50 p-6">
          <h2 className="text-lg font-bold text-[#3C3489]">How to use FK</h2>
          <p className="mt-2 text-sm text-[#5F5E5A]">
            Use <strong>500 FK</strong> toward discounted unlocks on the fix plan flow where shown — see{" "}
            <Link href="/analyse/result" className="font-semibold text-[#534AB7]">
              your analysis
            </Link>
            .
          </p>
        </section>
      </main>
    </ProtectedGate>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#F0EFF8] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[#111110]">{value}</p>
    </div>
  );
}
