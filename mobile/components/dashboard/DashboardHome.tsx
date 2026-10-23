/**
 * Signed-in home - port of web components/dashboard/DashboardHome.tsx.
 * Greeting, quick actions, money score, rewards, bills due this week, and
 * link cards for the tracker and Settle Up. Each card loads on its own so one
 * slow source doesn't hold up the rest.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { IntroTourButton } from "@/components/IntroTourButton";
import {
  Colors,
  FontSize,
  Radius,
  Shadow,
  Spacing,
  themedStyles,
  tintBg,
  tintFg,
} from "@/constants/theme";
import {
  buildBillsMonth,
  parseYmd,
  toYmd,
  type BillItem,
} from "@/lib/billsCalendar";
import { loadBillsData, type BillsData } from "@/lib/billsCalendarData";
import {
  analyseFinances,
  scoreBand,
  type ScoreBand,
} from "@/lib/financialEngine";
import { timeGreeting } from "@/lib/greeting";
import { syncAnalyseFromCloud } from "@/lib/syncAnalyseFromCloud";
import { useGamification } from "@/lib/useGamification";
import { useAuthStore } from "@/store/authStore";
import { reportScrollY } from "@/store/chromeStore";
import { useFinancialStore } from "@/store/financialStore";
import { useSplitStore } from "@/store/splitStore";

const UPCOMING_DAYS = 7;

type Tier = "free" | "pro" | "promax";

const PLAN_LABEL: Record<Tier, string> = {
  free: "Free plan",
  pro: "Pro",
  promax: "Pro Max",
};

const QUICK_ACTIONS: { icon: AppIconName; label: string; href: Href }[] = [
  { icon: "receipt", label: "Add expense", href: "/(tabs)/tracker" },
  { icon: "calendar", label: "Add bill", href: "/bills" as Href },
  { icon: "users", label: "New split", href: "/(tabs)/split" },
  { icon: "chart", label: "Check money score", href: "/(tabs)/analyse" },
];

// Web SCORE_BAND_UI tones, written for light; tintBg/tintFg adapt them.
const BAND_UI: Record<ScoreBand, { label: string; bg: string; fg: string }> = {
  critical: { label: "Critical", bg: "#FDEDED", fg: "#991B1B" },
  warning: { label: "Warning", bg: "#FFF4E5", fg: "#92400E" },
  good: { label: "Good", bg: "#DCFCE7", fg: "#166534" },
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function toTier(value: string | null | undefined): Tier {
  return value === "pro" || value === "promax" ? value : "free";
}

function planPillColors(tier: Tier): { bg: string; fg: string } {
  switch (tier) {
    case "pro":
      return { bg: Colors.primaryLight, fg: Colors.primaryText };
    case "promax":
      return { bg: Colors.inverseSurface, fg: Colors.textWhite };
    default:
      return { bg: Colors.surfaceAlt, fg: Colors.textSecondary };
  }
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

const go = (href: Href) => router.push(href);

function Skeleton({
  width,
  height,
  round,
}: {
  width: number | `${number}%`;
  height: number;
  round?: boolean;
}) {
  return (
    <View
      style={[
        styles.skeleton,
        { width, height },
        round && { borderRadius: Radius.round },
      ]}
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
  href?: Href;
  linkLabel?: string;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleRow}>
        <View style={styles.iconBubble}>
          <AppIcon name={icon} size={16} />
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {href && linkLabel ? (
        <Pressable onPress={() => go(href)} hitSlop={8}>
          <Text style={styles.headerLink}>{linkLabel} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PrimaryButton({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable
      onPress={() => go(href)}
      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable
      onPress={() => go(href)}
      style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
    >
      <Text style={styles.outlineBtnText}>{label}</Text>
    </Pressable>
  );
}

export function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const tier = toTier(user?.subscriptionTier);
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "there";
  const greeting = useMemo(() => timeGreeting(), []);
  const pill = planPillColors(tier);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScroll={(e) => reportScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View>
          <Text style={styles.h1}>
            {greeting}, {firstName}
          </Text>
          <View style={styles.planRow}>
            <View style={[styles.planPill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.planPillText, { color: pill.fg }]}>
                {PLAN_LABEL[tier]}
              </Text>
            </View>
            {tier === "free" ? (
              <Pressable onPress={() => go("/plans" as Href)} hitSlop={8}>
                <Text style={styles.smallLink}>See plans</Text>
              </Pressable>
            ) : null}
          </View>
          <IntroTourButton
            location="dashboard_header"
            label="Take the tour"
            style={{ alignSelf: "flex-start", marginTop: 12 }}
          />
        </View>

        <View style={styles.quickGrid} accessibilityLabel="Quick actions">
          {QUICK_ACTIONS.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => go(a.href)}
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.quickAction,
                pressed && styles.quickActionPressed,
              ]}
            >
              <View style={styles.iconBubble}>
                <AppIcon name={a.icon} size={16} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <MoneyScoreCard userId={user?.id ?? null} />
        <RewardsCard
          userId={user?.id ?? null}
          fallbackBalance={user?.fkBalance ?? 0}
        />
        <BillsCard userId={user?.id ?? null} />
        <SpendingCard />
        <SplitCard userId={user?.id ?? null} email={user?.email ?? null} />
      </ScrollView>
    </View>
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
  const band = score != null ? BAND_UI[scoreBand(score)] : null;
  const toFix = analysisSnapshot
    ? analysisSnapshot.issues.filter(
        (i) => i.severity === "critical" || i.severity === "warning",
      ).length
    : 0;

  return (
    <View style={styles.card} aria-busy={loading}>
      <CardHeader icon="chart" title="Money score" />
      {loading ? (
        <View style={styles.skeletonStack}>
          <Skeleton width={112} height={40} />
          <Skeleton width={192} height={16} />
          <Skeleton width={160} height={36} />
        </View>
      ) : score != null && band ? (
        <View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreOutOf}>/100</Text>
            <View
              style={[styles.bandPill, { backgroundColor: tintBg(band.bg) }]}
            >
              <Text style={[styles.bandPillText, { color: tintFg(band.fg) }]}>
                {band.label}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            {toFix > 0
              ? `${toFix} thing${toFix === 1 ? "" : "s"} to fix in your latest check.`
              : "Nothing urgent in your latest check."}
          </Text>
          <View style={styles.btnRow}>
            <PrimaryButton
              label="View my analysis"
              href={"/analyse/result" as Href}
            />
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.body}>
            Get your money score in about 3 minutes: savings, insurance, loans
            and goals in one check.
          </Text>
          <View style={styles.btnRow}>
            <PrimaryButton
              label="Check my money score"
              href="/(tabs)/analyse"
            />
          </View>
        </View>
      )}
    </View>
  );
}

function RewardsCard({
  userId,
  fallbackBalance,
}: {
  userId: string | null;
  fallbackBalance: number;
}) {
  // Same `gamification` row Profile and Rewards read.
  const { stats, loading } = useGamification(userId ?? undefined);

  const items: { value: ReactNode; label: string }[] = [
    {
      value: (
        <>
          <AppIcon name="coin" size={16} />
          <Text style={styles.statValue}>
            {stats?.fkBalance ?? fallbackBalance}
          </Text>
        </>
      ),
      label: "FK balance",
    },
    {
      value: <Text style={styles.statValue}>{stats?.badges.length ?? 0}</Text>,
      label: "badges",
    },
    {
      value: (
        <>
          <AppIcon name="flame" size={16} />
          <Text style={styles.statValue}>{stats?.streakDays ?? 0}</Text>
        </>
      ),
      label: "day streak",
    },
  ];

  return (
    <View style={styles.card} aria-busy={loading}>
      <CardHeader
        icon="trophy"
        title="Your rewards"
        href={"/rewards" as Href}
        linkLabel="Rewards"
      />
      <View style={styles.statsRow}>
        {items.map((s) => (
          <View key={s.label} style={styles.statBox}>
            <View style={styles.statValueRow}>
              {loading && !stats ? (
                <Skeleton width={36} height={20} />
              ) : (
                s.value
              )}
            </View>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.linkRow}>
        <Pressable onPress={() => go("/leaderboard" as Href)} hitSlop={8}>
          <Text style={styles.smallLink}>Leaderboard</Text>
        </Pressable>
        <Pressable onPress={() => go("/refer" as Href)} hitSlop={8}>
          <Text style={styles.smallLink}>Refer & earn</Text>
        </Pressable>
      </View>
    </View>
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
    // Same loader as Bills; obligations, cards and policies don't depend on
    // the month, so one load also covers next month's first days.
    loadBillsData(userId, today.getFullYear(), today.getMonth())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        console.warn("dashboard bills load failed:", err);
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
    <View style={styles.card} aria-busy={loading}>
      <CardHeader
        icon="calendar"
        title="Bills due in the next 7 days"
        href={"/bills" as Href}
        linkLabel="All bills"
      />
      {loading ? (
        <View style={styles.skeletonStack}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.billRow}>
              <Skeleton width={32} height={32} round />
              <View style={styles.billText}>
                <Skeleton width="66%" height={14} />
                <View style={{ height: 6 }} />
                <Skeleton width="33%" height={12} />
              </View>
              <Skeleton width={56} height={16} />
            </View>
          ))}
        </View>
      ) : error || !upcoming ? (
        <View style={styles.centerBlock}>
          <Text style={styles.body}>
            Couldn&apos;t load your bills right now.
          </Text>
          <Pressable onPress={() => go("/bills" as Href)} hitSlop={8}>
            <Text style={[styles.smallLink, styles.underline]}>
              Open Bills & renewals
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {upcoming.overdue > 0 ? (
            <Pressable
              onPress={() => go("/bills" as Href)}
              style={styles.overdueBanner}
            >
              <Text style={styles.overdueText}>
                {upcoming.overdue} overdue this month · Review ›
              </Text>
            </Pressable>
          ) : null}
          {upcoming.due.length === 0 ? (
            <View style={styles.centerBlock}>
              <Text style={styles.emptyTitle}>Nothing due this week</Text>
              <Text style={[styles.body, styles.centerText]}>
                Add rent, EMIs, premiums or renewals and we&apos;ll remind you
                before each one.
              </Text>
              <View style={styles.btnRow}>
                <PrimaryButton label="Add a bill" href={"/bills" as Href} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.billsSummary}>
                <Text style={styles.summaryText}>
                  {upcoming.due.length} due · {amountText(upcoming.total)}
                </Text>
                <Pressable
                  onPress={() => setShowAmounts((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.smallLink}>
                    {showAmounts ? "Hide amounts" : "Show amounts"}
                  </Text>
                </Pressable>
              </View>
              {upcoming.due.slice(0, 5).map((item, idx) => (
                <View
                  key={item.key}
                  style={[styles.billRow, idx > 0 && styles.billDivider]}
                >
                  <Text style={styles.billEmoji}>{item.emoji}</Text>
                  <View style={styles.billText}>
                    <Text style={styles.billTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.billDate}>
                      {shortDay(item.date, todayYmd, tomorrowYmd)}
                    </Text>
                  </View>
                  <Text style={styles.billAmount}>
                    {item.amount != null ? amountText(item.amount) : "-"}
                  </Text>
                </View>
              ))}
              {upcoming.due.length > 5 ? (
                <Pressable onPress={() => go("/bills" as Href)} hitSlop={8}>
                  <Text style={[styles.smallLink, styles.centerText]}>
                    +{upcoming.due.length - 5} more
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </>
      )}
    </View>
  );
}

function SpendingCard() {
  // The tracker's monthly total needs its full card/EMI ledger fetch, so the
  // dashboard links there instead of duplicating that query.
  return (
    <View style={styles.card}>
      <CardHeader
        icon="notebook"
        title="This month's spending"
        href="/(tabs)/tracker"
        linkLabel="Tracker"
      />
      <Text style={styles.body}>
        See where your money went this month, by bucket and card, and how it
        compares with your plan.
      </Text>
      <View style={styles.btnRow}>
        <PrimaryButton label="Open tracker" href="/(tabs)/tracker" />
        <OutlineButton label="Add expense" href="/(tabs)/tracker" />
      </View>
    </View>
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

  // Same cached group list the Split tab loads (2-minute cache in the store).
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
    <View style={styles.card} aria-busy={loading}>
      <CardHeader
        icon="users"
        title="Settle Up"
        href="/(tabs)/split"
        linkLabel="Open"
      />
      {loading ? (
        <View style={styles.skeletonStack}>
          <Skeleton width={160} height={16} />
          <Skeleton width={224} height={16} />
          <Skeleton width={128} height={36} />
        </View>
      ) : (
        <>
          <Text style={styles.body}>
            {count > 0
              ? `You're in ${count} group${count === 1 ? "" : "s"}. Open a group to see who owes whom and settle up.`
              : "Split rent, trips and dinners with friends and see who owes whom."}
          </Text>
          <View style={styles.btnRow}>
            <PrimaryButton
              label={count > 0 ? "View groups" : "Start a split"}
              href="/(tabs)/split"
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
    gap: Spacing.lg,
  },
  // Web: text-2xl font-bold
  h1: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  planRow: {
    marginTop: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  planPill: {
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  planPillText: { fontSize: FontSize.xs, fontWeight: "600" },
  smallLink: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  underline: { marginTop: Spacing.sm, textDecorationLine: "underline" },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  // Web: grid-cols-2 tiles with an icon bubble
  quickAction: {
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  quickActionPressed: { borderColor: Colors.primaryTintBorder },
  quickLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.tabIdle,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  cardHeader: {
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  cardTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconBubble: {
    height: 32,
    width: 32,
    borderRadius: Radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  headerLink: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  centerText: { textAlign: "center" },
  btnRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  outlineBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  outlineBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  pressed: { opacity: 0.85 },
  skeleton: {
    borderRadius: 6,
    backgroundColor: Colors.borderLight,
  },
  skeletonStack: { gap: Spacing.md },
  // Web: text-4xl font-extrabold, then /100 and the band pill
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  scoreValue: {
    fontSize: FontSize.xxxxl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  scoreOutOf: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  bandPill: {
    alignSelf: "center",
    marginLeft: Spacing.xs,
    borderRadius: Radius.round,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  bandPillText: { fontSize: FontSize.xs, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: Spacing.sm },
  statBox: {
    flex: 1,
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  statValueRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  statLabel: { fontSize: FontSize.caption, color: Colors.textSecondary },
  linkRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: Spacing.lg,
    rowGap: Spacing.xs,
  },
  centerBlock: { alignItems: "center", paddingVertical: Spacing.md },
  emptyTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  overdueBanner: {
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  overdueText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.error,
  },
  billsSummary: {
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  summaryText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: 10,
  },
  billDivider: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  billEmoji: { fontSize: FontSize.xl },
  billText: { flex: 1, minWidth: 0 },
  billTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  billDate: { fontSize: FontSize.caption, color: Colors.textMuted },
  billAmount: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
}));
