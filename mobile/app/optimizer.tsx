/**
 * Money optimizer — port of web app/optimizer/page.tsx. Built from the saved
 * analysis (redirects to Analyse when there is none): summary, income split,
 * where every rupee goes, surplus allocation, debt payoff, goal timeline, FD
 * alert and the AI plan from the last fix plan.
 */
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, router, type Href } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { PageScaffold } from "@/components/ui/PageScaffold";
import {
  Colors,
  onPrimaryAlpha,
  themedStyles,
} from "@/constants/theme";
import { useFinancialStore } from "@/store/financialStore";
import { monthlyTotalIncome } from "@/lib/financialEngine";
import { buildPriorityPlan } from "@/lib/priorityEngine";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";
import { shareFixPlanPdf } from "@/lib/fixPlanPdf";

const fmt = (n: number) =>
  "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

/** Same helper as web lib/optimizer-format.ts. */
function fmtWords(n: number): string {
  n = Math.round(Number(n) || 0);
  if (n < 0) return fmtWords(-n);
  if (n >= 1_00_00_000) {
    const cr = Math.floor(n / 1_00_00_000);
    const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
    return lakh > 0 ? `${cr} crore ${lakh} lakh` : `${cr} crore`;
  }
  if (n >= 1_00_000) {
    const lakh = Math.floor(n / 1_00_000);
    const th = Math.floor((n % 1_00_000) / 1_000);
    return th > 0 ? `${lakh} lakh ${th} thousand` : `${lakh} lakh`;
  }
  if (n >= 1_000) return `${Math.floor(n / 1_000)} thousand`;
  return String(n);
}

function Donut({ parts }: { parts: { pct: number; color: string }[] }) {
  const size = 176;
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size} viewBox="0 0 176 176">
      <Circle cx={88} cy={88} r={r} stroke={Colors.border} strokeWidth={56} fill="none" />
      {parts.map((p, i) => {
        const len = (Math.max(0, p.pct) / 100) * c;
        const el = (
          <Circle
            key={i}
            cx={88}
            cy={88}
            r={r}
            stroke={p.color}
            strokeWidth={56}
            fill="none"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            rotation={-90}
            origin="88, 88"
          />
        );
        offset += len;
        return el;
      })}
    </Svg>
  );
}

export default function OptimizerScreen() {
  const hasHydrated = useFinancialStore((s) => s.hasHydrated);
  const lastSubmission = useFinancialStore((s) => s.lastSubmission);
  const analysisResult = useFinancialStore((s) => s.result);
  const aiPlan = useFinancialStore((s) => s.aiPlan);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const bucketSummary = useMemo(() => {
    if (!lastSubmission) return null;
    const b = getUniversalBucketActuals(lastSubmission);
    const income = monthlyTotalIncome(lastSubmission);
    const out = b.needs + b.wants + b.security + b.loans + b.investment;
    return { income, out, surplus: Math.max(0, income - out) };
  }, [lastSubmission]);

  const computedPlan = useMemo(
    () =>
      lastSubmission && analysisResult
        ? buildPriorityPlan(lastSubmission, analysisResult)
        : null,
    [lastSubmission, analysisResult],
  );

  useEffect(() => {
    setPdfError("");
  }, [aiPlan]);

  if (!hasHydrated) {
    return (
      <PageScaffold title="Your money optimizer">
        <ActivityIndicator color={Colors.primaryText} style={{ marginTop: 40 }} />
      </PageScaffold>
    );
  }
  if (!lastSubmission) return <Redirect href="/(tabs)/analyse" />;

  if (!analysisResult) {
    return (
      <PageScaffold title="Run analysis first">
        <View style={styles.center}>
          <Text style={styles.muted}>
            We need your saved health report to call the AI. Submit the analyse
            form, then open this page again.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/analyse")}
            style={styles.primaryBtn}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Go to analyse →</Text>
          </Pressable>
          <Text style={styles.tiny}>
            Or open{" "}
            <Text
              style={styles.linkText}
              onPress={() => router.push("/analyse/result" as Href)}
            >
              your last result
            </Text>{" "}
            once after submitting.
          </Text>
        </View>
      </PageScaffold>
    );
  }

  const income = Math.round(bucketSummary?.income ?? 0);
  const outflow = Math.round(bucketSummary?.out ?? 0);
  const surplus = Math.round(bucketSummary?.surplus ?? 0);
  const plan: any = (aiPlan as any)?.priorityPlan ?? computedPlan;

  const totalIncome =
    (lastSubmission.monthlySalary || 0) +
    (lastSubmission.spouseIncome || 0) +
    (lastSubmission.otherIncome || 0);
  const ub: any = analysisResult.universalBuckets ?? {};
  const needs = ub.needs?.actual || 0;
  const loans = ub.loans?.actual || 0;
  const wants = ub.wants?.actual || 0;
  const security = ub.security?.actual || 0;
  const investment = ub.investment?.actual || 0;
  const totalExpenses = needs + loans + wants + security + investment;
  const left = Math.round(totalIncome - totalExpenses);
  const alloc = {
    emergencyFund: Math.max(0, Math.round(left * 0.3)),
    termInsurance: Math.max(0, Math.round(left * 0.1)),
    sip: Math.max(0, Math.round(left * 0.4)),
    medicalFund: Math.max(0, Math.round(left * 0.2)),
  };
  const pieTotal = Math.max(totalIncome, totalExpenses, 1);
  const rows: [string, number, string][] = [
    ["Needs", needs, Colors.primary],
    ["Loans", loans, Colors.error],
    ["Wants", wants, Colors.warning],
    ["Security", security, Colors.success],
    ["Investment", investment, Colors.primaryDark],
  ];

  const handleDownload = async () => {
    if (!aiPlan) return;
    setDownloading(true);
    setPdfError("");
    try {
      const priorityPlan =
        (aiPlan as any)?.priorityPlan ??
        buildPriorityPlan(lastSubmission, analysisResult);
      const explanations: any = {
        greeting: aiPlan.oneLiner || "Your personalised report is ready.",
        overallSummary:
          aiPlan.lifeStageInsight?.headline || aiPlan.topPriorityAction || "",
        debtStrategy: aiPlan.debtPlan?.[0]?.reasoning || "",
        disclaimer: aiPlan.disclaimer,
      };
      const res = await shareFixPlanPdf({
        profile: lastSubmission,
        result: analysisResult,
        priorityPlan,
        explanations,
      } as never);
      if (res.error) setPdfError(res.error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PageScaffold
      eyebrow="Finkoin optimizer"
      title="Your money optimizer"
      subtitle="Based on your income and expenses, here is what you have left to build wealth with every month."
      backLabel="← Back to report"
      backTo={"/analyse/result" as Href}
    >
      <View style={{ gap: 20 }}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>From your saved profile</Text>
          <View style={styles.heroGrid}>
            <HeroStat label="Monthly income" value={income} />
            <HeroStat label="Monthly expenses" value={outflow} />
            <HeroStat label="Available to optimize" value={surplus} perMonth />
          </View>
          <Text style={styles.heroNote}>
            If the AI service is unavailable, you still see a rule-based plan
            that follows Finkoin safety ordering.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>MONTHLY SUMMARY</Text>
          <View style={styles.sumRow}>
            <View style={styles.sumCol}>
              <Text style={styles.small}>Total income</Text>
              <Text style={styles.big}>{fmt(totalIncome)}</Text>
            </View>
            <View style={styles.sumCol}>
              <Text style={styles.small}>Total outflow</Text>
              <Text style={[styles.big, { color: Colors.error }]}>
                {fmt(totalExpenses)}
              </Text>
            </View>
            <View style={styles.sumCol}>
              <Text style={styles.small}>Left in hand</Text>
              <Text
                style={[
                  styles.big,
                  { color: left >= 0 ? Colors.success : Colors.error },
                ]}
              >
                {fmt(Math.abs(left))}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <Donut
              parts={rows.map(([, v, color]) => ({
                pct: (v / pieTotal) * 100,
                color,
              }))}
            />
          </View>
          <Text style={[styles.strong, { marginTop: 12 }]}>
            Income split pie (monthly)
          </Text>
          {rows.map(([label, v, color]) => (
            <View key={label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>
                {label}: {fmt(v)} ({((v / pieTotal) * 100).toFixed(1)}%)
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>SECTION 2 — Where Every Rupee Goes</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {rows.map(([label, v, color]) => {
              const pct =
                totalIncome > 0 ? Math.min(100, (v / totalIncome) * 100) : 0;
              return (
                <View key={label}>
                  <View style={styles.splitRow}>
                    <Text style={styles.body}>{label}</Text>
                    <Text style={styles.body}>
                      {fmt(v)} ({pct.toFixed(1)}%)
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${pct}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>SECTION 3 — Your Surplus Allocation</Text>
          <Text style={[styles.muted, { marginTop: 4 }]}>
            You have {fmt(Math.max(0, left))} left each month. Here is the
            optimal way to use it:
          </Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            {[
              `Emergency fund top-up: ${fmt(alloc.emergencyFund)}/month`,
              `Term insurance premium: ${fmt(alloc.termInsurance)}/month`,
              `SIP investment: ${fmt(alloc.sip)}/month`,
              `Medical emergency fund: ${fmt(alloc.medicalFund)}/month`,
            ].map((t) => (
              <View key={t} style={styles.chip}>
                <Text style={styles.body}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 16, gap: 8 }}>
            {((plan?.priorities ?? []) as any[]).slice(0, 4).map((p, idx) => (
              <View key={`${p.id}-${idx}`} style={styles.inner}>
                <Text style={styles.strong}>
                  Priority {idx + 1}: {p.title}
                </Text>
                <Text style={styles.muted}>
                  Invest {fmt(p.monthlyContribution || 0)}/month · Achieve in{" "}
                  {p.monthsToComplete || 0} months
                </Text>
                <Text style={styles.accent}>
                  Where: {p.instrument || "As suggested in your AI plan"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>SECTION 4 — Debt Payoff Calculator</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            {((plan?.debts ?? []) as any[]).map((d) => {
              const current =
                d.emi > 0 ? Math.ceil((d.outstanding || 0) / d.emi) : 0;
              const improved = d.monthsToClearWithExtra || current;
              return (
                <View key={`${d.type}-${d.priorityRank}`} style={styles.chip}>
                  <Text style={[styles.body, { fontWeight: "500" }]}>
                    {d.displayName || d.type}
                  </Text>
                  <Text style={styles.body}>
                    Current payoff: {current} months · With extra{" "}
                    {fmt(d.extraEMIRecommended || 0)}/month: {improved} months
                  </Text>
                  <Text style={styles.body}>
                    Months saved: {Math.max(0, current - improved)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>SECTION 5 — Goal Timeline</Text>
          {plan?.goals?.[0] ? (
            <>
              <Text style={[styles.muted, { marginTop: 4 }]}>
                {plan.goals[0].goalType}: target{" "}
                {fmt(plan.goals[0].targetAmount || 0)} · timeline{" "}
                {plan.goals[0].yearsToGoal || 0} years
              </Text>
              <View style={[styles.track, { marginTop: 12 }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: Colors.primary,
                      width: `${Math.min(
                        100,
                        ((plan.goals[0].currentSaved || 0) /
                          Math.max(plan.goals[0].targetAmount || 1, 1)) *
                          100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.muted, { marginTop: 8 }]}>
                Monthly required: {fmt(plan.goals[0].monthlyRequired || 0)} ·
                instrument: {plan.goals[0].instrument || "As suggested"}
              </Text>
            </>
          ) : (
            <Text style={[styles.muted, { marginTop: 8 }]}>
              Goal timeline will appear once the AI goal plan is generated.
            </Text>
          )}
        </View>

        {plan?.fdSuggestion ? (
          <View style={styles.card}>
            <Text style={styles.h3}>SECTION 6 — FD Rate Alert</Text>
            <Text style={[styles.muted, { marginTop: 8 }]}>
              {plan.fdSuggestion.message}
            </Text>
            <Text style={[styles.accent, { marginTop: 4 }]}>
              Current: {plan.fdSuggestion.currentRate}% · Better:{" "}
              {plan.fdSuggestion.bestRate}% · Extra/year:{" "}
              {fmt(plan.fdSuggestion.extraAnnual || 0)}
            </Text>
          </View>
        ) : null}

        {aiPlan ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>AI ACTION PLAN</Text>
            {aiPlan.oneLiner ? (
              <Text style={[styles.strong, { marginTop: 8 }]}>
                {aiPlan.oneLiner}
              </Text>
            ) : null}
            {aiPlan.topPriorityAction ? (
              <Text style={[styles.body, { marginTop: 8 }]}>
                Top priority: {aiPlan.topPriorityAction}
              </Text>
            ) : null}
            {aiPlan.lifeStageInsight?.headline ? (
              <View style={[styles.inner, { marginTop: 12 }]}>
                <Text style={styles.strong}>
                  {aiPlan.lifeStageInsight.headline}
                </Text>
                {aiPlan.lifeStageInsight.keyChallenge ? (
                  <Text style={styles.muted}>
                    Key challenge: {aiPlan.lifeStageInsight.keyChallenge}
                  </Text>
                ) : null}
                {aiPlan.lifeStageInsight.smartMove ? (
                  <Text style={styles.muted}>
                    Smart move: {aiPlan.lifeStageInsight.smartMove}
                  </Text>
                ) : null}
                {aiPlan.lifeStageInsight.nextMilestone ? (
                  <Text style={styles.muted}>
                    Next milestone: {aiPlan.lifeStageInsight.nextMilestone}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {(aiPlan.mandatoryFunds ?? []).map((f, i) => (
              <View key={`${f.fundName}-${i}`} style={[styles.inner, { marginTop: 8 }]}>
                <Text style={styles.strong}>{f.fundName}</Text>
                {f.purpose ? <Text style={styles.muted}>{f.purpose}</Text> : null}
                <Text style={styles.muted}>
                  Target {fmt(f.targetAmount ?? 0)} · Save{" "}
                  {fmt(f.monthlyContribution ?? 0)}/month
                  {f.whereToKeep ? ` · ${f.whereToKeep}` : ""}
                </Text>
              </View>
            ))}
            {aiPlan.disclaimer ? (
              <Text style={[styles.tiny, { marginTop: 12 }]}>
                {aiPlan.disclaimer}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.muted}>
            Want the short version? See the same AI block on your{" "}
            <Text
              style={styles.linkText}
              onPress={() => router.push("/analyse/result" as Href)}
            >
              analyse result
            </Text>
            .
          </Text>
          <Pressable
            onPress={() => void handleDownload()}
            disabled={downloading || !aiPlan}
            style={[styles.outlineBtn, (downloading || !aiPlan) && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Text style={styles.outlineBtnText}>
              {downloading ? "Generating PDF..." : "Download full report PDF"}
            </Text>
          </Pressable>
          {pdfError ? <Text style={styles.err}>{pdfError}</Text> : null}
        </View>
      </View>
    </PageScaffold>
  );
}

function HeroStat({
  label,
  value,
  perMonth = false,
}: {
  label: string;
  value: number;
  /** Web: surplus shows "{words} per month" whenever it is above zero. */
  perMonth?: boolean;
}) {
  const showWords = perMonth ? value > 0 : value >= 1_00_000;
  return (
    <View>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroValue}>{fmt(value)}</Text>
      {showWords ? (
        <Text style={styles.heroWords}>
          {fmtWords(value)}
          {perMonth ? " per month" : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  center: { alignItems: "center", gap: 16, paddingVertical: 24 },
  hero: {
    borderRadius: 24,
    backgroundColor: Colors.primary,
    padding: 24,
  },
  heroKicker: { fontSize: 14, fontWeight: "500", color: onPrimaryAlpha(0.9) },
  heroGrid: { marginTop: 16, gap: 16 },
  heroLabel: { fontSize: 12, color: onPrimaryAlpha(0.75) },
  heroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.onPrimary,
    fontVariant: ["tabular-nums"],
  },
  heroWords: { marginTop: 4, fontSize: 12, color: onPrimaryAlpha(0.7) },
  heroNote: { marginTop: 16, fontSize: 14, color: onPrimaryAlpha(0.85) },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 20,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: Colors.primaryText,
  },
  sumRow: { marginTop: 16, gap: 16 },
  sumCol: {},
  small: { fontSize: 12, color: Colors.textMuted },
  big: { fontSize: 24, fontWeight: "700", color: Colors.textPrimary },
  h3: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  strong: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  body: { fontSize: 14, color: Colors.textPrimary },
  muted: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  tiny: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  accent: { fontSize: 14, color: Colors.primaryText },
  linkText: { color: Colors.primaryText, fontWeight: "600", textDecorationLine: "underline" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  legendDot: { height: 8, width: 8, borderRadius: 4 },
  legendText: { fontSize: 14, color: Colors.textSecondary },
  splitRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceMuted, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  chip: { borderRadius: 8, backgroundColor: Colors.surfaceAlt, padding: 12, gap: 2 },
  inner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 12,
    gap: 2,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "600" },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 24,
    gap: 12,
    alignItems: "center",
  },
  outlineBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
  err: { fontSize: 12, color: Colors.errorText },
}));
