"use client";

import { SCORE_BAND_UI } from "@/app/analyse/result/resultModel";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import {
  buildBillsMonth,
  parseYmd,
  toYmd,
  type BillItem,
} from "@/lib/billsCalendar";
import { loadBillsData, type BillsData } from "@/lib/billsCalendarData";
import { analyseFinances, scoreBand } from "@/lib/financialEngine";
import { timeGreeting } from "@/lib/greeting";
import { syncAnalyseFromCloud } from "@/lib/syncAnalyseFromCloud";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useSplitStore } from "@/store/splitStore";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const CARD = "rounded-2xl border border-[#F0EFF8] bg-white p-5";
const UPCOMING_DAYS = 7;

const PLAN_LABEL = {
  free: "Free plan",
  pro: "Pro",
  promax: "Pro Max",
} as const;

const PLAN_PILL = {
  free: "bg-slate-100 text-slate-700",
  pro: "bg-[#EEEDFE] text-[#534AB7]",
  promax: "bg-slate-900 text-white",
} as const;

const QUICK_ACTIONS: { icon: AppIconName; label: string; href: string }[] = [
  { icon: "receipt", label: "Add expense", href: "/tracker" },
  { icon: "calendar", label: "Add bill", href: "/bills" },
  { icon: "users", label: "New split", href: "/split" },
  { icon: "chart", label: "Check money score", href: "/analyse" },
];

function rupees(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function shortDay(ymd: string, todayYmd: string, tomorrowYmd: string) {
  if (ymd === todayYmd) return "Today";
  if (ymd === tomorrowYmd) return "Tomorrow";
  const d = parseYmd(ymd);
  return d
    ? d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : ymd;
}

function Skeleton({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-[#F0EFF8] ${className}`}
    />
  );
}

function CardHeader({
  icon,
  title,
  href,
  linkLabel,
}: {
  icon: AppIconName;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-bold text-[#111110]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE]">
          <AppIcon name={icon} size={16} color="#534AB7" />
        </span>
        <span className="truncate">{title}</span>
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold text-[#534AB7] hover:underline"
        >
          {linkLabel} ›
        </Link>
      ) : null}
    </div>
  );
}

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscriptionTier ?? "free";
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "there";
  const greeting = useMemo(() => timeGreeting(), []);

  return (
    <div className="min-w-0 flex-1 space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-[#111110] sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#5F5E5A]">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_PILL[tier]}`}
            >
              {PLAN_LABEL[tier]}
            </span>
            {tier === "free" ? (
              <Link
                href="/plans"
                className="text-xs font-semibold text-[#534AB7] hover:underline"
              >
                See plans
              </Link>
            ) : null}
          </p>
        </div>
      </section>

      <nav
        aria-label="Quick actions"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#F0EFF8] bg-white px-3 py-3 text-[13px] font-semibold text-[#3D3A5C] transition-colors hover:border-[#534AB7]/30 hover:text-[#534AB7]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE]">
              <AppIcon name={a.icon} size={16} color="#534AB7" />
            </span>
            <span className="min-w-0 leading-tight">{a.label}</span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 md:grid-cols-2">
        <MoneyScoreCard userId={user?.id ?? null} />
        <RewardsCard />
      </div>

      <BillsCard userId={user?.id ?? null} />

      <div className="grid gap-4 md:grid-cols-2">
        <SpendingCard />
        <SplitCard userId={user?.id ?? null} email={user?.email ?? null} />
      </div>
    </div>
  );
}

function MoneyScoreCard({ userId }: { userId: string | null }) {
  const result = useFinancialStore((s) => s.result);
  const submission = useFinancialStore((s) => s.lastSubmission);
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const [syncing, setSyncing] = useState(true);

  // Same source as Profile: the saved analysis, or a newer one from another device.
  useEffect(() => {
    if (!userId) {
      setSyncing(false);
      return;
    }
    let cancelled = false;
    void syncAnalyseFromCloud(userId)
      .catch((e) => console.warn("Dashboard analysis sync failed:", e))
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const analysisSnapshot = useMemo(() => {
    if (!submission) return null;
    return result ?? analyseFinances(submission);
  }, [submission, result]);

  const loading = !analysisSnapshot && (syncing || !hasHydrated);
  const score = analysisSnapshot
    ? Math.round(analysisSnapshot.overallScore)
    : null;
  const band = score != null ? SCORE_BAND_UI[scoreBand(score)] : null;
  const toFix = analysisSnapshot
    ? analysisSnapshot.issues.filter(
        (i) => i.severity === "critical" || i.severity === "warning",
      ).length
    : 0;

  return (
    <section className={`${CARD} min-h-[176px]`} aria-busy={loading}>
      <CardHeader icon="chart" title="Money score" />
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
      ) : score != null && band ? (
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#111110]">
              {score}
            </span>
            <span className="text-sm font-semibold text-[#9B9A94]">/100</span>
            <span
              className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${band.badgeTone}`}
            >
              {band.label}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#5F5E5A]">
            {toFix > 0
              ? `${toFix} thing${toFix === 1 ? "" : "s"} to fix in your latest check.`
              : "Nothing urgent in your latest check."}
          </p>
          <Link
            href="/analyse/result"
            className="mt-3 inline-flex rounded-[10px] bg-[#534AB7] px-4 py-2 text-[13px] font-bold text-white"
          >
            View my analysis
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-[13px] text-[#5F5E5A]">
            Get your money score in about 3 minutes: savings, insurance, loans
            and goals in one check.
          </p>
          <Link
            href="/analyse"
            className="mt-3 inline-flex rounded-[10px] bg-[#534AB7] px-4 py-2 text-[13px] font-bold text-white"
          >
            Check my money score
          </Link>
        </div>
      )}
    </section>
  );
}

function RewardsCard() {
  const fkBalance = useGamificationStore((s) => s.fkBalance);
  const badges = useGamificationStore((s) => s.badges.length);
  const streakDays = useGamificationStore((s) => s.streakDays);

  const stats: { value: ReactNode; label: string }[] = [
    {
      value: (
        <>
          <AppIcon name="coin" size={16} color="#534AB7" />
          {fkBalance}
        </>
      ),
      label: "FK balance",
    },
    { value: badges, label: "badges" },
    {
      value: (
        <>
          <AppIcon name="flame" size={16} color="#534AB7" />
          {streakDays}
        </>
      ),
      label: "day streak",
    },
  ];

  return (
    <section className={`${CARD} min-h-[176px]`}>
      <CardHeader
        icon="trophy"
        title="Your rewards"
        href="/rewards"
        linkLabel="Rewards"
      />
      <div className="grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-[#F4F2FC] px-1 py-3">
            <p className="flex items-center justify-center gap-1 text-lg font-bold text-[#111110]">
              {s.value}
            </p>
            <p className="text-[11px] text-[#5F5E5A]">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
        <Link href="/leaderboard" className="text-[#534AB7] hover:underline">
          Leaderboard
        </Link>
        <Link href="/refer" className="text-[#534AB7] hover:underline">
          Refer & earn
        </Link>
      </div>
    </section>
  );
}

function BillsCard({ userId }: { userId: string | null }) {
  const [data, setData] = useState<BillsData | null>(null);
  const [error, setError] = useState(false);
  const [showAmounts, setShowAmounts] = useState(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // Same loader as /bills; obligations, cards and policies don't depend on
    // the month, so one load also covers next month's first days.
    loadBillsData(userId, today.getFullYear(), today.getMonth())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        console.error("dashboard bills load failed:", err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, today]);

  const upcoming = useMemo(() => {
    if (!data) return null;
    const todayYmd = toYmd(today);
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + UPCOMING_DAYS,
    );
    const endYmd = toYmd(end);
    const thisMonth = buildBillsMonth({
      year: today.getFullYear(),
      monthIndex: today.getMonth(),
      today,
      ...data,
    });
    const items: BillItem[] = [...thisMonth.items];
    if (end.getMonth() !== today.getMonth()) {
      items.push(
        ...buildBillsMonth({
          year: end.getFullYear(),
          monthIndex: end.getMonth(),
          today,
          ...data,
        }).items,
      );
    }
    const due = items
      .filter(
        (i) =>
          i.date >= todayYmd &&
          i.date <= endYmd &&
          i.status !== "paid" &&
          i.status !== "skipped",
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    const total = due.reduce((sum, i) => sum + (i.amount ?? 0), 0);
    return { due, total, overdue: thisMonth.totals.overdueCount };
  }, [data, today]);

  const todayYmd = toYmd(today);
  const tomorrowYmd = toYmd(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
  );
  const amountText = (n: number) => (showAmounts ? rupees(n) : "₹••••");
  const loading = !upcoming && !error;

  return (
    <section className={`${CARD} min-h-[200px]`} aria-busy={loading}>
      <CardHeader
        icon="calendar"
        title="Bills due in the next 7 days"
        href="/bills"
        linkLabel="All bills"
      />
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      ) : error || !upcoming ? (
        <div className="py-4 text-center">
          <p className="text-sm text-[#5F5E5A]">
            Couldn&apos;t load your bills right now.
          </p>
          <Link
            href="/bills"
            className="mt-2 inline-block text-[13px] font-semibold text-[#534AB7] underline"
          >
            Open Bills & renewals
          </Link>
        </div>
      ) : (
        <>
          {upcoming.overdue > 0 ? (
            <Link
              href="/bills"
              className="mb-3 block rounded-xl bg-[#FCEBEB] px-3 py-2 text-[13px] font-semibold text-[#E24B4A]"
            >
              {upcoming.overdue} overdue this month · Review ›
            </Link>
          ) : null}
          {upcoming.due.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-sm font-semibold text-[#111110]">
                Nothing due this week
              </p>
              <p className="mt-1 text-[13px] text-[#5F5E5A]">
                Add rent, EMIs, premiums or renewals and we&apos;ll remind you
                before each one.
              </p>
              <Link
                href="/bills"
                className="mt-3 inline-flex rounded-[10px] bg-[#534AB7] px-4 py-2 text-[13px] font-bold text-white"
              >
                Add a bill
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[#5F5E5A]">
                <span>
                  {upcoming.due.length} due · {amountText(upcoming.total)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAmounts((v) => !v)}
                  className="font-semibold text-[#534AB7]"
                >
                  {showAmounts ? "Hide amounts" : "Show amounts"}
                </button>
              </div>
              <ul className="divide-y divide-[#F7F7F4]">
                {upcoming.due.slice(0, 5).map((item) => (
                  <li key={item.key} className="flex items-center gap-3 py-2.5">
                    <span className="shrink-0 text-xl" aria-hidden>
                      {item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#111110]">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#9B9A94]">
                        {shortDay(item.date, todayYmd, tomorrowYmd)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-[#111110]">
                      {item.amount != null ? amountText(item.amount) : "-"}
                    </span>
                  </li>
                ))}
              </ul>
              {upcoming.due.length > 5 ? (
                <Link
                  href="/bills"
                  className="mt-2 block text-center text-xs font-semibold text-[#534AB7]"
                >
                  +{upcoming.due.length - 5} more
                </Link>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  );
}

function SpendingCard() {
  // The tracker's monthly total needs its full card/EMI ledger fetch, so the
  // dashboard links there instead of duplicating that query.
  return (
    <section className={`${CARD} min-h-[164px]`}>
      <CardHeader
        icon="notebook"
        title="This month's spending"
        href="/tracker"
        linkLabel="Tracker"
      />
      <p className="text-[13px] text-[#5F5E5A]">
        See where your money went this month, by bucket and card, and how it
        compares with your plan.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/tracker"
          className="inline-flex rounded-[10px] bg-[#534AB7] px-4 py-2 text-[13px] font-bold text-white"
        >
          Open tracker
        </Link>
        <Link
          href="/tracker"
          className="inline-flex rounded-[10px] border border-[#E8E6F0] px-4 py-2 text-[13px] font-semibold text-[#534AB7]"
        >
          Add expense
        </Link>
      </div>
    </section>
  );
}

function SplitCard({
  userId,
  email,
}: {
  userId: string | null;
  email: string | null;
}) {
  const groups = useSplitStore((s) => s.groups);
  const fetchGroups = useSplitStore((s) => s.fetchGroups);
  const cacheKey = userId ? `groups_${userId}` : "";
  const fetched = useSplitStore((s) =>
    cacheKey ? Boolean(s.lastFetched[cacheKey]) : false,
  );
  const [done, setDone] = useState(false);

  // Same cached group list /split loads (2-minute cache in the store).
  useEffect(() => {
    if (!userId || !email) {
      setDone(true);
      return;
    }
    let cancelled = false;
    void fetchGroups(userId, email).finally(() => {
      if (!cancelled) setDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, email, fetchGroups]);

  const loading = !fetched && !done;
  const count = groups.length;

  return (
    <section className={`${CARD} min-h-[164px]`} aria-busy={loading}>
      <CardHeader
        icon="users"
        title="Settle Up"
        href="/split"
        linkLabel="Open"
      />
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      ) : (
        <>
          <p className="text-[13px] text-[#5F5E5A]">
            {count > 0
              ? `You're in ${count} group${count === 1 ? "" : "s"}. Open a group to see who owes whom and settle up.`
              : "Split rent, trips and dinners with friends and see who owes whom."}
          </p>
          <Link
            href="/split"
            className="mt-3 inline-flex rounded-[10px] bg-[#534AB7] px-4 py-2 text-[13px] font-bold text-white"
          >
            {count > 0 ? "View groups" : "Start a split"}
          </Link>
        </>
      )}
    </section>
  );
}
