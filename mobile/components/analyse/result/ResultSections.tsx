/**
 * Result-screen sections, in web order (`app/analyse/result/page.tsx`).
 * Copy is verbatim from web.
 */
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { buildSpeedoMeterProps } from "@/lib/speedo-meter-buckets";
import { AppIcon } from "@/components/ui/AppIcon";
import { FIX_PLAN_PRICE_INR, PAYMENTS_ENABLED } from "@/lib/analyseEntitlement";
import { Colors, themedStyles, tintBg } from "@/constants/theme";
import { ResultColors as C, badgeTone, inr } from "./format";
import type { BucketView, ResultModel } from "./model";
import {
  profileSummaryLabels,
  safetyNetHeading,
  scoreGaugeTone,
} from "./resultDerivations";
import { SpeedoMeterMulti, SpeedoMeterSingle } from "./SpeedoMeter";

const leftColor = (v: number) => (v >= 0 ? C.teal : C.red);

export function ResultHero({
  model,
  profile,
}: {
  model: ResultModel;
  profile: FinancialProfile;
}) {
  const tone = badgeTone(model.band);
  return (
    <View style={styles.hero}>
      <Text style={styles.heroEyebrow}>Health report</Text>
      <Text style={styles.heroTitle}>Your financial health</Text>
      <Text style={styles.heroMeta}>
        {profileSummaryLabels(profile).join(" · ")}
      </Text>
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <Text style={[styles.badgeText, { color: tone.fg }]}>{model.band}</Text>
      </View>
      <View style={styles.heroGaugeBox}>
        <Text style={styles.heroGaugeLabel}>Health score</Text>
        <SpeedoMeterSingle
          score={model.score}
          tone={scoreGaugeTone(model.score)}
          width={210}
          textColor="#FFFFFF"
          subTextColor="rgba(255,255,255,0.85)"
        />
      </View>
    </View>
  );
}

export function MonthlySummaryCard({ model }: { model: ResultModel }) {
  const left = model.amountLeftInHand;
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Monthly summary</Text>
      <View style={styles.tile}>
        <Text style={styles.tileLabel}>Total income</Text>
        <Text style={[styles.tileValue, { color: C.ink }]}>
          {inr(model.income)}
        </Text>
        <Text style={styles.tileFoot}>per month</Text>
      </View>
      <View style={styles.tile}>
        <Text style={styles.tileLabel}>Total outflow</Text>
        <Text style={[styles.tileValue, { color: C.red }]}>
          {inr(model.totalOutflow)}
        </Text>
        <Text style={styles.tileFoot}>
          {model.epfMonthly > 0
            ? "from in-hand (EPF excluded)"
            : "needs + loans + insurance + wants + SIP"}
        </Text>
      </View>
      <View style={[styles.tile, { marginBottom: 0 }]}>
        <Text style={styles.tileLabel}>Left in hand</Text>
        <Text style={[styles.tileValue, { color: leftColor(left) }]}>
          {inr(Math.abs(left))}
        </Text>
        <Text
          style={[
            styles.tileFoot,
            { color: leftColor(left), fontWeight: "600" },
          ]}
        >
          {left >= 0 ? "available to invest" : "overspending"}
        </Text>
      </View>
    </View>
  );
}

export function NetWorthCard({ model }: { model: ResultModel }) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Live net worth summary</Text>
      <View style={styles.nwRow}>
        <Text style={styles.tileLabel}>Total assets</Text>
        <Text style={[styles.nwValue, { color: C.ink }]}>
          {inr(model.assets)}
        </Text>
      </View>
      <View style={styles.nwRow}>
        <Text style={styles.tileLabel}>Total liabilities</Text>
        <Text style={[styles.nwValue, { color: C.liability }]}>
          {inr(model.liabilities)}
        </Text>
      </View>
      <View style={styles.nwRow}>
        <Text style={styles.tileLabel}>Net worth</Text>
        <Text style={[styles.nwValue, { color: leftColor(model.netWorth) }]}>
          {inr(model.netWorth)}
        </Text>
      </View>
      <Text style={styles.smallNote}>
        Net worth is your total assets minus total liabilities, based on the
        values you entered.
      </Text>
    </View>
  );
}

function BucketRow({ b }: { b: BucketView }) {
  const [open, setOpen] = useState(false);
  const tone = badgeTone(b.status);
  const total = b.items.reduce((sum, item) => sum + (item.value || 0), 0);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [
        styles.bucket,
        pressed && { backgroundColor: tintBg("#F3F2FB") },
      ]}
    >
      <View style={styles.bucketHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.bucketTitleRow}>
            <Text
              style={[
                styles.caret,
                { transform: [{ rotate: open ? "90deg" : "0deg" }] },
              ]}
            >
              ▸
            </Text>
            <Text style={styles.bucketTitle}>{b.label}</Text>
          </View>
          <Text style={styles.bucketDetails}>{b.details}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.fg }]}>{b.status}</Text>
        </View>
      </View>
      <View style={styles.dl}>
        <View style={styles.dlHalf}>
          <Text style={styles.dt}>Cap %</Text>
          <Text style={styles.dd}>{b.capPercent}%</Text>
        </View>
        <View style={styles.dlHalf}>
          <Text style={styles.dt}>Cap ₹</Text>
          <Text style={styles.dd}>{inr(b.capAmount)}</Text>
        </View>
        <View style={{ width: "100%" }}>
          <Text style={styles.dt}>Actual ₹</Text>
          <Text style={[styles.dd, { fontSize: 18, fontWeight: "800" }]}>
            {inr(b.actual)}
          </Text>
        </View>
      </View>
      {open ? (
        <View style={styles.items}>
          {b.items.length === 0 ? (
            <Text style={styles.noItems}>
              No line items in this category yet.
            </Text>
          ) : null}
          {b.items.map((item) => (
            <View key={item.label} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{inr(item.value || 0)}</Text>
            </View>
          ))}
          {b.items.length > 0 ? (
            <View style={styles.itemTotal}>
              <Text style={styles.itemTotalText}>Total</Text>
              <Text style={styles.itemTotalText}>{inr(total)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function BucketCapsSection({ model }: { model: ResultModel }) {
  const left = model.amountLeftInHand;
  return (
    <View style={[styles.card, { borderWidth: 0 }]}>
      <Text style={styles.eyebrow}>Category caps vs actual</Text>
      {model.smartNote ? (
        <Text style={styles.smartNote}>{model.smartNote}</Text>
      ) : null}
      <View style={{ gap: 12 }}>
        {model.buckets.map((b) => (
          <BucketRow key={b.key} b={b} />
        ))}
        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total income</Text>
            <Text style={[styles.totalsValue, { color: C.ink }]}>
              {inr(model.income)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>
              Total outflow{model.epfMonthly > 0 ? " (excl. EPF)" : ""}
            </Text>
            <Text style={[styles.totalsValue, { color: C.red }]}>
              {inr(model.totalOutflow)}
            </Text>
          </View>
          <View style={[styles.totalsRow, styles.totalsDivider]}>
            <Text
              style={[styles.totalsLabel, { color: C.ink, fontWeight: "600" }]}
            >
              Amount left
            </Text>
            <Text
              style={[
                styles.totalsValue,
                { color: leftColor(left), fontWeight: "700" },
              ]}
            >
              {inr(left)}
            </Text>
          </View>
          <Text style={[styles.smallNote, { marginTop: 8 }]}>
            {model.epfMonthly > 0
              ? `EPF ${inr(model.epfMonthly)}/mo is deducted at source and is not subtracted from in-hand surplus.`
              : "Income not mapped into these buckets."}
          </Text>
        </View>
      </View>
    </View>
  );
}

const GAUGE_TIPS = [
  "Needs should stay close to cap for stability.",
  "Loan ratio under 40% improves flexibility.",
  "Investment consistency drives score growth.",
];

export function GaugesSection({ profile }: { profile: FinancialProfile }) {
  return (
    <View style={[styles.card, { borderWidth: 0 }]}>
      <Text style={styles.h2}>Your financial health gauges</Text>
      <View style={styles.gaugeWrap}>
        <SpeedoMeterMulti {...buildSpeedoMeterProps(profile)} />
      </View>
      <View style={{ marginTop: 12, gap: 4 }}>
        {GAUGE_TIPS.map((tip) => (
          <View key={tip} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SafetyNetSection({
  model,
  onTermLearn,
}: {
  model: ResultModel;
  onTermLearn: () => void;
}) {
  const term = model.safetyItems.find((i) => i.id === "term");
  const total = model.safetyItems.length;
  return (
    <View style={[styles.card, { borderWidth: 0 }]}>
      <Text style={styles.h2}>{safetyNetHeading(total)}</Text>
      <Text style={styles.sub}>
        {model.safetyItems.map((i) => i.title).join(" · ")}
      </Text>
      <View style={{ marginTop: 12, gap: 8 }}>
        {model.safetyItems.map((item) => {
          const partial = item.status === "partial";
          const tone = partial
            ? { bg: tintBg("#FFF3E6"), fg: "#BA7517", glyph: "⚠" }
            : item.isOk
              ? { bg: tintBg("#E8F6F1"), fg: "#1D9E75", glyph: "✓" }
              : { bg: tintBg("#FDEDEC"), fg: "#E24B4A", glyph: "✕" };
          return (
            <View key={item.id} style={styles.safetyRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.safetyTitleRow}>
                  <AppIcon name={item.icon} size={18} color={Colors.primary} />
                  <Text style={styles.safetyTitle}>{item.title}</Text>
                </View>
                <Text style={styles.safetyMeta}>
                  Current {item.currentText} vs target {item.targetText}
                </Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: tone.bg }]}>
                <Text style={[styles.statusGlyph, { color: tone.fg }]}>
                  {tone.glyph}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      {term?.infoText ? (
        <Text style={[styles.smallNote, { marginTop: 8 }]}>
          {term.infoText}
        </Text>
      ) : null}
      {model.termStatus === "missing" ? (
        <Pressable
          onPress={onTermLearn}
          accessibilityRole="link"
          style={styles.termLearnBtn}
        >
          <Text style={styles.termLearnText}>
            Why term cover matters (educational) →
          </Text>
        </Pressable>
      ) : null}
      <Text style={styles.progressLabel}>
        {model.completeCount} of {total} in place
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${total > 0 ? (model.completeCount / total) * 100 : 0}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const PAYWALL_CHECKLIST = [
  "Complete priority plan",
  "Debt clearance strategy",
  "12-month action plan",
  "PDF download",
  "Insurance gap checklist (educational)",
];

function LockedStep({ n, title }: { n: number; title: string }) {
  return (
    <View style={styles.lockedRow} accessibilityLabel={`Step ${n} locked`}>
      <AppIcon name="lock" size={14} color={C.body} />
      <Text style={styles.lockedText}>
        Step {n}: {title} — unlock to see
      </Text>
    </View>
  );
}

export function PlanTeaserSection({
  model,
  surplusBreakdown,
  onUnlock,
}: {
  model: ResultModel;
  surplusBreakdown: boolean;
  onUnlock: () => void;
}) {
  const { first, teaserTitles, moreCount } = model.planTeaser;
  return (
    <View style={[styles.card, { borderColor: Colors.primaryLight }]}>
      <Text style={styles.h2}>Your personalised 12-month plan</Text>
      <View style={styles.teaserBox}>
        {first ? (
          <>
            <Text style={styles.teaserStep}>✓ Step 1: {first.title}</Text>
            {first.actionThisWeek ? (
              <Text style={styles.teaserAction}>{first.actionThisWeek}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.teaserAction}>
            No open gaps right now. The full plan shows how to keep it that way.
          </Text>
        )}
        {teaserTitles.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            {teaserTitles.map((title, i) => (
              <LockedStep key={`${i}-${title}`} n={i + 2} title={title} />
            ))}
          </View>
        ) : null}
        {moreCount > 0 ? (
          <Text style={[styles.smallNote, { marginTop: 8 }]}>
            + {moreCount} more personalised {moreCount === 1 ? "step" : "steps"}
          </Text>
        ) : null}
      </View>

      <View style={styles.paywallCard}>
        <Text style={styles.paywallTitle}>Your complete financial roadmap</Text>
        {/* No in-app price until a Play Billing flow exists: Play rejects
            apps that advertise digital purchases they can't sell in-app. */}
        <Text style={styles.paywallPrice}>
          {PAYMENTS_ENABLED
            ? `₹${FIX_PLAN_PRICE_INR} one-time · Yours forever`
            : "Free during early access"}
        </Text>
        <Text style={styles.paywallFk}>
          {PAYMENTS_ENABLED ? `Pay ₹${FIX_PLAN_PRICE_INR} · ` : ""}Earn Finkoin
          Keys (FK) for activity on Finkoin — use them on partner perks where
          available.
          {PAYMENTS_ENABLED ? " FK do not reduce this unlock price." : ""}
        </Text>
        {surplusBreakdown ? (
          <View style={styles.surplus}>
            <SurplusRow label="Monthly Income" value={inr(model.income)} />
            <SurplusRow
              label="Less: Living expenses (Needs)"
              value={`-${inr(model.needsActual)}`}
            />
            <SurplusRow
              label="Less: Loan EMIs"
              value={`-${inr(model.loansActual)}`}
            />
            <SurplusRow
              label="Less: Wants + lifestyle"
              value={`-${inr(model.lifestyleActual)}`}
            />
            <SurplusRow
              label="Less: Insurance premiums + investment"
              value={`-${inr(model.securityActual + model.investmentActual)}`}
            />
            <View style={styles.surplusTotal}>
              <Text style={styles.surplusTotalText}>Your Monthly Surplus</Text>
              <Text style={styles.surplusTotalText}>
                {inr(model.amountLeftInHand)}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={{ marginTop: 12, gap: 4 }}>
          {PAYWALL_CHECKLIST.map((line) => (
            <Text key={line} style={styles.checkItem}>
              ✓ {line}
            </Text>
          ))}
        </View>
        <Pressable
          onPress={onUnlock}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.unlockBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.unlockText}>{model.ctaCopy.title}</Text>
        </Pressable>
        <Text style={styles.ctaSub}>{model.ctaCopy.subText}</Text>
        <Text style={styles.ctaSub}>Educational only</Text>
      </View>
    </View>
  );
}

function SurplusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.surplusRow}>
      <Text style={styles.surplusText}>{label}</Text>
      <Text style={styles.surplusText}>{value}</Text>
    </View>
  );
}

export function KeepGoingSection({
  onTax,
  onTracker,
  onLearn,
}: {
  onTax: () => void;
  onTracker: () => void;
  onLearn: () => void;
}) {
  const links = [
    { label: "Tax regime calculator", onPress: onTax },
    { label: "Expense tracker", onPress: onTracker },
    { label: "Learn personal finance", onPress: onLearn },
  ];
  return (
    <View style={[styles.card, { borderColor: Colors.border }]}>
      <Text style={[styles.h2, { color: Colors.textPrimary }]}>Keep going</Text>
      <Text style={[styles.sub, { color: Colors.textSecondary, marginTop: 4 }]}>
        Explore calculators and tools that pair with your report.
      </Text>
      <View style={styles.linksRow}>
        {links.map((l) => (
          <Pressable
            key={l.label}
            onPress={l.onPress}
            accessibilityRole="link"
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  hero: {
    borderRadius: 24,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    padding: 20,
    alignItems: "center",
  },
  heroEyebrow: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "700",
    color: Colors.onPrimary,
  },
  heroMeta: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  badge: {
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  heroGaugeBox: {
    marginTop: 20,
    width: "100%",
    maxWidth: 280,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    alignItems: "center",
  },
  heroGaugeLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.onPrimary,
    marginBottom: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  smartNote: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.successLight,
    color: Colors.successText,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  eyebrow: {
    marginBottom: 12,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.primary,
  },
  h2: { fontSize: 20, fontWeight: "600", color: C.ink },
  sub: { fontSize: 14, fontWeight: "500", lineHeight: 20, color: C.body },
  tile: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderSoft,
    backgroundColor: C.softBg,
    padding: 16,
    marginBottom: 12,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.label,
    marginBottom: 4,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  tileFoot: { marginTop: 4, fontSize: 12, fontWeight: "500", color: C.label },
  nwRow: { marginBottom: 12 },
  nwValue: { fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
  smallNote: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: C.label,
  },
  bucket: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.softBg,
    padding: 16,
    minHeight: 44,
  },
  bucketHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bucketTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  caret: { color: Colors.primary, fontSize: 14 },
  bucketTitle: { fontSize: 15, fontWeight: "600", color: C.ink },
  bucketDetails: { marginTop: 4, fontSize: 12, lineHeight: 16, color: C.label },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: "700" },
  dl: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  dlHalf: { width: "50%", paddingRight: 12 },
  dt: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.label,
  },
  dd: {
    fontSize: 14,
    fontWeight: "700",
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  items: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  noItems: { paddingVertical: 6, fontSize: 13, color: C.muted },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  itemLabel: { flex: 1, fontSize: 13, lineHeight: 18, color: C.body },
  itemValue: {
    fontSize: 13,
    fontWeight: "600",
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  itemTotal: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  itemTotalText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
    fontVariant: ["tabular-nums"],
  },
  totals: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border,
    backgroundColor: C.pageBg,
    padding: 16,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    marginBottom: 0,
  },
  totalsLabel: { fontSize: 13, color: C.label },
  totalsValue: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  gaugeWrap: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: C.softBg,
    padding: 12,
  },
  bulletRow: { flexDirection: "row", gap: 6 },
  bulletDot: { fontSize: 14, lineHeight: 20, color: C.body },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: C.body,
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    padding: 12,
  },
  safetyTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  safetyTitle: { fontSize: 14, fontWeight: "600", color: C.ink },
  safetyMeta: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    color: C.body,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusGlyph: { fontSize: 14, fontWeight: "700" },
  termLearnBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
  },
  termLearnText: { fontSize: 12, fontWeight: "600", color: Colors.onPrimary },
  progressLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: C.body,
  },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: Colors.surfaceMuted,
  },
  progressFill: { height: "100%", backgroundColor: Colors.primary },
  teaserBox: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceMuted,
    padding: 12,
  },
  teaserStep: { fontSize: 14, fontWeight: "500", color: C.ink },
  teaserAction: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: C.body,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
    opacity: 0.35,
  },
  lockedText: { fontSize: 14, color: C.body },
  paywallCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  paywallTitle: { fontSize: 18, fontWeight: "600", color: C.ink },
  paywallPrice: { fontSize: 14, fontWeight: "500", color: C.body },
  paywallFk: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.primary,
  },
  surplus: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.softBg,
    padding: 12,
  },
  surplusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 1,
  },
  surplusText: { fontSize: 12, color: C.label, flexShrink: 1 },
  surplusTotal: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  surplusTotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primaryDark,
  },
  checkItem: { fontSize: 14, color: C.label },
  unlockBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockText: { fontSize: 15, fontWeight: "700", color: Colors.onPrimary },
  ctaSub: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: C.label,
  },
  linksRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 16,
  },
  linkBtn: { minHeight: 44, justifyContent: "center" },
  linkText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
}));
