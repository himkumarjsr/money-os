/**
 * React Native port of web `components/ui/SpeedoMeter.tsx` (single-score
 * hero gauge + the 4-gauge bucket meter). Geometry, thresholds and copy match web.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import {
  investStatus,
  investmentTargetPct,
  type SpeedoMeterCaps,
  type SpeedoMeterProps,
} from "@/lib/speedo-meter-buckets";
import { inr } from "./format";
import {
  themedStyles,
  Colors,
  tintBg,
  tintFg,
  themed,
  brand,
} from "@/constants/theme";

function resolveCaps(
  hasHomeLoan: boolean,
  caps?: SpeedoMeterCaps,
): Required<SpeedoMeterCaps> {
  return {
    needs: caps?.needs ?? (hasHomeLoan ? 0.3 : 0.2),
    wants: caps?.wants ?? 0.05,
    security: caps?.security ?? 0.1,
    loans: caps?.loans ?? 0.3,
    investment: caps?.investment ?? (hasHomeLoan ? 0.25 : 0.35),
  };
}

const CX = 70;
const CY = 80;
const R_OUT = 54;
const R_IN = 41;
const R_PROGRESS = (R_OUT + R_IN) / 2;

const COLORS = themed(
  () =>
    ({
      needs: brand("#534AB7"),
      wants: "#BA7517",
      security: "#2E7DB5",
      loans: "#E24B4A",
      investment: "#1D9E75",
      green: "#1D9E75",
      amber: "#BA7517",
      red: "#E24B4A",
      zoneGreen: tintBg("#E1F5EE"),
      zoneAmber: tintBg("#FAEEDA"),
      zoneRed: tintBg("#FCEBEB"),
    }) as const,
);

const SPEND_RANGE_MULT = 1.5;
const INVEST_RANGE_MULT = 2;

const CHIP = themed(
  () =>
    ({
      good: { bg: tintBg("#E1F5EE"), fg: tintFg("#085041") },
      warning: { bg: tintBg("#FAEEDA"), fg: tintFg("#633806") },
      critical: { bg: tintBg("#FCEBEB"), fg: tintFg("#791F1F") },
    }) as const,
);

type Status = "good" | "warning" | "critical";

function rf(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function polarToXY(angleDeg: number, radius: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const start = polarToXY(startAngleDeg, radius, cx, cy);
  const end = polarToXY(endAngleDeg, radius, cx, cy);
  const span = Math.abs(startAngleDeg - endAngleDeg);
  const largeArcFlag = span > 180 ? 1 : 0;
  const sweepFlag = startAngleDeg > endAngleDeg ? 1 : 0;
  return `M ${rf(start.x)} ${rf(start.y)} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${rf(end.x)} ${rf(end.y)}`;
}

function annularSectorPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  angleHigh: number,
  angleLow: number,
): string {
  const poH = polarToXY(angleHigh, rOuter, cx, cy);
  const poL = polarToXY(angleLow, rOuter, cx, cy);
  const piL = polarToXY(angleLow, rInner, cx, cy);
  const piH = polarToXY(angleHigh, rInner, cx, cy);
  const span = angleHigh - angleLow;
  const large = span > 180 ? 1 : 0;
  return [
    `M ${rf(poH.x)} ${rf(poH.y)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${rf(poL.x)} ${rf(poL.y)}`,
    `L ${rf(piL.x)} ${rf(piL.y)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${rf(piH.x)} ${rf(piH.y)}`,
    "Z",
  ].join(" ");
}

function needlePath(
  angleDeg: number,
  cx: number,
  cy: number,
  outerRadius: number,
): string {
  const tip = polarToXY(angleDeg, outerRadius, cx, cy);
  const hub = polarToXY(angleDeg, outerRadius * 0.22, cx, cy);
  const rad = (angleDeg * Math.PI) / 180;
  const px = -Math.sin(rad) * 5.5;
  const py = Math.cos(rad) * 5.5;
  return `M ${rf(tip.x)} ${rf(tip.y)} L ${rf(hub.x + px)} ${rf(hub.y + py)} L ${rf(hub.x - px)} ${rf(hub.y - py)} Z`;
}

function spendStatus(actualPct: number, capPct: number): Status {
  if (actualPct <= capPct + 1e-6) return "good";
  if (actualPct <= capPct * 1.15 + 1e-6) return "warning";
  return "critical";
}

function statusColor(st: Status): string {
  if (st === "good") return COLORS.green;
  if (st === "warning") return COLORS.amber;
  return COLORS.red;
}

function chipLabelSpend(st: Status): string {
  if (st === "good") return "Good";
  if (st === "warning") return "Watch";
  return "Over limit";
}

function chipLabelInvest(st: Status): string {
  if (st === "good") return "Good";
  if (st === "warning") return "Watch";
  return "Low";
}

type AnimFracs = {
  needs: number;
  wants: number;
  security: number;
  loans: number;
  investment: number;
};

const ZERO_FRACS: AnimFracs = {
  needs: 0,
  wants: 0,
  security: 0,
  loans: 0,
  investment: 0,
};

function useAnimatedFracs(targets: AnimFracs, durationMs = 600): AnimFracs {
  const [out, setOut] = useState<AnimFracs>(ZERO_FRACS);
  const fromRef = useRef<AnimFracs>(ZERO_FRACS);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = { ...fromRef.current };
    fromRef.current = { ...targets };
    const start = Date.now();

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const ease = 1 - (1 - t) * (1 - t);
      setOut({
        needs: from.needs + (targets.needs - from.needs) * ease,
        wants: from.wants + (targets.wants - from.wants) * ease,
        security: from.security + (targets.security - from.security) * ease,
        loans: from.loans + (targets.loans - from.loans) * ease,
        investment:
          from.investment + (targets.investment - from.investment) * ease,
      });
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [targets, durationMs]);

  return out;
}

function needleTargetFrac(
  amount: number,
  income: number,
  capFraction: number,
  rangeMultiplier: number,
) {
  const maxScaleFrac = capFraction * rangeMultiplier;
  if (income <= 0 || maxScaleFrac <= 0) return 0;
  return Math.min(1, amount / income / maxScaleFrac);
}

const GAUGE_W = 132;
const GAUGE_H = (GAUGE_W * 96) / 140;

function GaugeSvg({
  kind,
  amount,
  income,
  capFraction,
  rangeMultiplier,
  capLabel,
  needleFrac,
}: {
  kind: "spend" | "invest";
  amount: number;
  income: number;
  capFraction: number;
  rangeMultiplier: number;
  capLabel: string;
  needleFrac: number;
}) {
  const actualPct = income > 0 ? (amount / income) * 100 : 0;
  const maxScaleFrac = capFraction * rangeMultiplier;
  const needleAngle = 180 - needleFrac * 180;
  const capAngle = 180 - (capFraction / maxScaleFrac) * 180;
  const status: Status =
    kind === "spend"
      ? spendStatus(actualPct, capFraction * 100)
      : investStatus(actualPct, investmentTargetPct(capFraction));
  const needleCol = statusColor(status);

  const zonePaths =
    kind === "spend"
      ? [
          { a0: 180, a1: 72, c: COLORS.zoneGreen },
          { a0: 72, a1: 18, c: COLORS.zoneAmber },
          { a0: 18, a1: 0, c: COLORS.zoneRed },
        ]
      : [
          { a0: 180, a1: 90, c: COLORS.zoneRed },
          { a0: 90, a1: 27, c: COLORS.zoneAmber },
          { a0: 27, a1: 0, c: COLORS.zoneGreen },
        ];

  const capTickOuter = polarToXY(capAngle, R_OUT + 2, CX, CY);
  const capTickInner = polarToXY(capAngle, R_OUT - 8, CX, CY);
  const capLbl = polarToXY(capAngle, R_OUT + 18, CX, CY);
  const progressPath =
    needleFrac > 0.001 ? describeArc(CX, CY, R_PROGRESS, 180, needleAngle) : "";

  return (
    <Svg width={GAUGE_W} height={GAUGE_H} viewBox="0 -6 140 96">
      {zonePaths.map((z) => (
        <Path
          key={`${z.a0}-${z.a1}`}
          d={annularSectorPath(CX, CY, R_OUT, R_IN, z.a0, z.a1)}
          fill={z.c}
        />
      ))}
      {progressPath ? (
        <Path
          d={progressPath}
          fill="none"
          stroke={needleCol}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      <Line
        x1={capTickOuter.x}
        y1={capTickOuter.y}
        x2={capTickInner.x}
        y2={capTickInner.y}
        stroke="#64748b"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <SvgText
        x={capLbl.x}
        y={capLbl.y + 3}
        textAnchor="middle"
        fill="#475569"
        fontSize={8}
      >
        {capLabel}
      </SvgText>
      <Path d={needlePath(needleAngle, CX, CY, R_OUT - 4)} fill={needleCol} />
      <Circle
        cx={CX}
        cy={CY}
        r={4}
        fill="#fff"
        stroke={needleCol}
        strokeWidth={1.5}
      />
      <SvgText
        x={CX}
        y={52 + 6}
        textAnchor="middle"
        fill={needleCol}
        fontSize={16}
        fontWeight="bold"
      >
        {income > 0 ? `${actualPct.toFixed(0)}%` : "—"}
      </SvgText>
    </Svg>
  );
}

function Chip({ status, text }: { status: Status; text: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: CHIP[status].bg }]}>
      <Text style={[styles.chipText, { color: CHIP[status].fg }]}>{text}</Text>
    </View>
  );
}

function GaugeColumn({
  title,
  labelColor,
  amount,
  status,
  chipText,
  children,
}: {
  title: string;
  labelColor: string;
  amount: number;
  status: Status;
  chipText: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.gaugeCol}>
      <Text style={[styles.gaugeTitle, { color: labelColor }]}>{title}</Text>
      {children}
      <Text style={styles.gaugeAmount}>{inr(amount)}</Text>
      <Chip status={status} text={chipText} />
    </View>
  );
}

/** Web: `SpeedoMeter` with `singleScore` — hero gauge. */
export function SpeedoMeterSingle({
  score: rawScore,
  tone,
  width = 200,
  textColor = "#0F172A",
  subTextColor = "#334155",
}: {
  score: number;
  tone: "red" | "amber" | "green";
  width?: number;
  textColor?: string;
  subTextColor?: string;
}) {
  const score = Math.max(0, Math.min(100, Number(rawScore) || 0));
  const toneColor =
    tone === "red"
      ? COLORS.red
      : tone === "amber"
        ? COLORS.amber
        : COLORS.green;
  const angle = -180 + (score / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const x2 = 70 + Math.cos(rad) * 43;
  const y2 = 70 + Math.sin(rad) * 43;
  return (
    <Svg width={width} height={(width * 90) / 140} viewBox="0 0 140 90">
      <Path
        d="M 15 70 A 55 55 0 0 1 59 17"
        stroke={COLORS.zoneRed}
        strokeWidth={12}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 59 17 A 55 55 0 0 1 107 31"
        stroke={COLORS.zoneAmber}
        strokeWidth={12}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 107 31 A 55 55 0 0 1 125 70"
        stroke={COLORS.zoneGreen}
        strokeWidth={12}
        fill="none"
        strokeLinecap="round"
      />
      <Line
        x1={70}
        y1={70}
        x2={x2}
        y2={y2}
        stroke={toneColor}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Circle cx={70} cy={70} r={5} fill={toneColor} />
      <SvgText
        x={70}
        y={56}
        textAnchor="middle"
        fill={textColor}
        fontSize={20}
        fontWeight="bold"
      >
        {String(Math.round(score))}
      </SvgText>
      <SvgText
        x={70}
        y={68}
        textAnchor="middle"
        fill={subTextColor}
        fontSize={10}
        fontWeight="600"
      >
        /100
      </SvgText>
    </Svg>
  );
}

/** Web: `SpeedoMeter` multi mode — 5 bucket gauges, chips, insights, footnote. */
export function SpeedoMeterMulti(props: SpeedoMeterProps) {
  const {
    income,
    needs,
    wants,
    security = 0,
    loans,
    investment,
    hasHomeLoan = false,
    caps,
  } = props;
  const c = resolveCaps(hasHomeLoan, caps);
  const targets = useMemo(
    () => ({
      needs: needleTargetFrac(needs, income, c.needs, SPEND_RANGE_MULT),
      wants: needleTargetFrac(wants, income, c.wants, SPEND_RANGE_MULT),
      security: needleTargetFrac(
        security,
        income,
        c.security,
        SPEND_RANGE_MULT,
      ),
      loans: needleTargetFrac(loans, income, c.loans, SPEND_RANGE_MULT),
      investment: needleTargetFrac(
        investment,
        income,
        c.investment,
        INVEST_RANGE_MULT,
      ),
    }),
    [
      income,
      needs,
      wants,
      security,
      loans,
      investment,
      c.needs,
      c.wants,
      c.security,
      c.loans,
      c.investment,
    ],
  );
  const anim = useAnimatedFracs(targets);

  const pct = {
    needs: income > 0 ? (needs / income) * 100 : 0,
    wants: income > 0 ? (wants / income) * 100 : 0,
    security: income > 0 ? (security / income) * 100 : 0,
    loans: income > 0 ? (loans / income) * 100 : 0,
    investment: income > 0 ? (investment / income) * 100 : 0,
  };
  const stN = spendStatus(pct.needs, c.needs * 100);
  const stW = spendStatus(pct.wants, c.wants * 100);
  const stS = spendStatus(pct.security, c.security * 100);
  const stL = spendStatus(pct.loans, c.loans * 100);
  const investTarget = investmentTargetPct(c.investment);
  const stI = investStatus(pct.investment, investTarget);
  const fmtPct = (v: number) => (income > 0 ? v.toFixed(0) : "—");

  const needsCapPct = Math.round(c.needs * 100);
  const wantsCapPct = Math.round(c.wants * 100);
  const securityCapPct = Math.round(c.security * 100);
  const loansCapPct = Math.round(c.loans * 100);
  const issues: string[] = [];
  if (spendStatus(pct.needs, needsCapPct) !== "good") {
    issues.push(
      spendStatus(pct.needs, needsCapPct) === "critical"
        ? `Needs are critically above the ${needsCapPct}% guide.`
        : `Needs are above the ${needsCapPct}% guide — review core spending.`,
    );
  }
  if (spendStatus(pct.wants, wantsCapPct) !== "good") {
    issues.push(
      `Wants are over the ${wantsCapPct}% cap — ease discretionary spend.`,
    );
  }
  if (income > 0 && security <= 0) {
    issues.push(
      "No insurance premiums on file — health and term cover protect everything else.",
    );
  } else if (spendStatus(pct.security, securityCapPct) !== "good") {
    issues.push(
      `Insurance premiums are above the ${securityCapPct}% guide — review overlapping or investment-linked policies.`,
    );
  }
  if (spendStatus(pct.loans, loansCapPct) !== "good") {
    issues.push(`Loan outflows exceed the ${loansCapPct}% safety guide.`);
  }
  if (stI !== "good") {
    issues.push(
      stI === "critical"
        ? `Investment flow is below 15% of income — increase long-term contributions when possible.`
        : `Investment flow is under your ${investTarget}% target — try to step up toward it.`,
    );
  }
  const t = needs + wants + security + loans + investment;
  if (income > 0 && t > income + 1e-6) {
    issues.push("Total allocations exceed take-home — recheck inputs.");
  }

  return (
    <View style={styles.multi}>
      <View style={styles.grid}>
        <GaugeColumn
          title="Needs"
          labelColor={COLORS.needs}
          amount={needs}
          status={stN}
          chipText={`${fmtPct(pct.needs)}% · ${chipLabelSpend(stN)}`}
        >
          <GaugeSvg
            kind="spend"
            amount={needs}
            income={income}
            capFraction={c.needs}
            rangeMultiplier={SPEND_RANGE_MULT}
            capLabel={`cap ${needsCapPct}%`}
            needleFrac={anim.needs}
          />
        </GaugeColumn>
        <GaugeColumn
          title="Wants"
          labelColor={COLORS.wants}
          amount={wants}
          status={stW}
          chipText={`${fmtPct(pct.wants)}% · ${chipLabelSpend(stW)}`}
        >
          <GaugeSvg
            kind="spend"
            amount={wants}
            income={income}
            capFraction={c.wants}
            rangeMultiplier={SPEND_RANGE_MULT}
            capLabel={`cap ${wantsCapPct}%`}
            needleFrac={anim.wants}
          />
        </GaugeColumn>
        <GaugeColumn
          title="Insurance"
          labelColor={COLORS.security}
          amount={security}
          status={stS}
          chipText={`${fmtPct(pct.security)}% · ${chipLabelSpend(stS)}`}
        >
          <GaugeSvg
            kind="spend"
            amount={security}
            income={income}
            capFraction={c.security}
            rangeMultiplier={SPEND_RANGE_MULT}
            capLabel={`cap ${securityCapPct}%`}
            needleFrac={anim.security}
          />
        </GaugeColumn>
        <GaugeColumn
          title="Loans"
          labelColor={COLORS.loans}
          amount={loans}
          status={stL}
          chipText={`${fmtPct(pct.loans)}% · ${chipLabelSpend(stL)}`}
        >
          <GaugeSvg
            kind="spend"
            amount={loans}
            income={income}
            capFraction={c.loans}
            rangeMultiplier={SPEND_RANGE_MULT}
            capLabel={`cap ${loansCapPct}%`}
            needleFrac={anim.loans}
          />
        </GaugeColumn>
        <GaugeColumn
          title="Investment"
          labelColor={COLORS.investment}
          amount={investment}
          status={stI}
          chipText={`${fmtPct(pct.investment)}% · ${chipLabelInvest(stI)}`}
        >
          <GaugeSvg
            kind="invest"
            amount={investment}
            income={income}
            capFraction={c.investment}
            rangeMultiplier={INVEST_RANGE_MULT}
            capLabel={`target ${investTarget}%`}
            needleFrac={anim.investment}
          />
        </GaugeColumn>
      </View>

      <View style={styles.chipsRow}>
        <Chip
          status={stN}
          text={`Needs ${income > 0 ? `${pct.needs.toFixed(0)}%` : "—"} · ${chipLabelSpend(stN)}`}
        />
        <Chip
          status={stW}
          text={`Wants ${income > 0 ? `${pct.wants.toFixed(0)}%` : "—"} · ${chipLabelSpend(stW)}`}
        />
        <Chip
          status={stS}
          text={`Insurance ${income > 0 ? `${pct.security.toFixed(0)}%` : "—"} · ${chipLabelSpend(stS)}`}
        />
        <Chip
          status={stL}
          text={`Loans ${income > 0 ? `${pct.loans.toFixed(0)}%` : "—"} · ${chipLabelSpend(stL)}`}
        />
        <Chip
          status={stI}
          text={`Investment ${income > 0 ? `${pct.investment.toFixed(0)}%` : "—"} · ${chipLabelInvest(stI)}`}
        />
      </View>

      <View style={styles.insight}>
        {issues.length === 0 ? (
          <Text style={styles.allGreen}>All gauges in the green.</Text>
        ) : (
          issues.map((line, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))
        )}
      </View>
      <Text style={styles.footnote}>
        Monthly figures; yearly premiums use a monthly equivalent (÷12).
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  multi: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 12,
  },
  gaugeCol: {
    width: "50%",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  gaugeTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  gaugeAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: "600" },
  chipsRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  insight: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceMuted,
    paddingTop: 16,
    gap: 4,
  },
  allGreen: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    color: Colors.successText,
  },
  bulletRow: { flexDirection: "row", gap: 6 },
  bulletDot: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footnote: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
}));
