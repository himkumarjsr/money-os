"use client";

import BackLink from "@/components/ui/BackLink";
import {
  FK_EARN_ACTIONS,
  FK_EXPLAINER,
  FK_PER_RUPEE,
  POINTS_EARN_ACTIONS,
} from "@/lib/fkRewards";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

type FkSummary = {
  outstanding_fk: number | null;
  outstanding_inr: number | null;
  issued_this_month: number | null;
  issued_last_month: number | null;
  monthly_budget_fk: number | null;
};

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
        const { data, error } = await supabase
          .from("gamification")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
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
        <BackLink fallbackHref="/profile" label="Back" />
        <h1 className="mt-3 text-3xl font-bold text-[#111110]">Rewards</h1>
        <p className="mt-2 text-sm text-[#5F5E5A]">
          Earn points to climb the leaderboard and FK to save on Finkoin
          products.
        </p>

        <section className="mt-8 rounded-2xl border border-[#EEEDFE] bg-[#EEEDFE]/50 p-6">
          <h2 className="text-lg font-bold text-[#3C3489]">What is FK?</h2>
          <dl className="mt-4 space-y-4">
            {FK_EXPLAINER.map(([q, a]) => (
              <div key={q}>
                <dt className="text-sm font-semibold text-[#111110]">{q}</dt>
                <dd className="mt-1 text-sm text-[#5F5E5A]">{a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-[#9B9A94]">
            Using FK for discounts is coming soon.
          </p>
        </section>

        {user?.isAdmin ? <AdminFkCard /> : null}

        {loading ? (
          <BrandPageLoader
            fullScreen={false}
            size="sm"
            minHeight={160}
            label="Loading…"
          />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="FK balance"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon name="coin" size={18} color="#534AB7" />
                  {fk}
                </span>
              }
            />
            <StatCard
              label="Total earned (lifetime)"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon name="coin" size={18} color="#534AB7" />
                  {earned}
                </span>
              }
            />
            <StatCard
              label="Streak"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon name="flame" size={18} color="#534AB7" />
                  {streak} days
                </span>
              }
            />
            <StatCard
              label="Badges"
              value={badges.length ? badges.join(", ") : "-"}
            />
          </div>
        )}

        <EarnSection title="Earn FK" items={FK_EARN_ACTIONS} />
        <EarnSection title="Earn points" items={POINTS_EARN_ACTIONS} />
        <p className="mt-4 text-sm text-[#5F5E5A]">
          See where you stand on the{" "}
          <Link href="/leaderboard" className="font-semibold text-[#534AB7]">
            leaderboard
          </Link>
          .
        </p>
      </main>
    </ProtectedGate>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#F0EFF8] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-[#111110]">{value}</p>
    </div>
  );
}

function EarnSection({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-[#F0EFF8] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#111110]">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm text-[#5F5E5A]">
        {items.map(([action, reward]) => (
          <li key={action} className="flex justify-between gap-2">
            <span>{action}</span>
            <span className="shrink-0 font-semibold text-[#1D9E75]">
              {reward}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Admin-only view of FK owed to users; the RPC refuses non-admins. */
function AdminFkCard() {
  const [summary, setSummary] = useState<FkSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await getSupabase().rpc("admin_fk_summary");
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
    <section className="mt-6 rounded-2xl border border-[#F0EFF8] bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9B9A94]">
        FK liability (admin)
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[#5F5E5A]">{label}</dt>
            <dd className="text-right font-semibold text-[#111110]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
