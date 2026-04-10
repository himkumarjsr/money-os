"use client";

import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/finance";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface SpeedoMeterProps {
  income: number;
  needs: number;
  wants: number;
  loans: number;
  investment: number;
  hasHomeLoan?: boolean;
}

const CX = 70;
const CY = 80;
const R_OUT = 54;
const R_IN = 41;
const R_PROGRESS = (R_OUT + R_IN) / 2;

const COLORS = {
  needs: "#534AB7",
  wants: "#BA7517",
  loans: "#E24B4A",
  investment: "#1D9E75",
  green: "#1D9E75",
  amber: "#BA7517",
  red: "#E24B4A",
  zoneGreen: "#E1F5EE",
  zoneAmber: "#FAEEDA",
  zoneRed: "#FCEBEB",
} as const;

const WANTS_CAP = 0.1;
const LOANS_CAP = 0.3;
const INVEST_CAP = 0.2;

const SPEND_RANGE_MULT = 1.5;
const INVEST_RANGE_MULT = 2;

const CHIP = {
  good: "bg-[#E1F5EE] text-[#085041]",
  warning: "bg-[#FAEEDA] text-[#633806]",
  critical: "bg-[#FCEBEB] text-[#791F1F]",
} as const;

type Status = "good" | "warning" | "critical";

function rf(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function polarToXY(angleDeg: number, radius: number, cx: number, cy: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad),
  };
}

/**
 * Open arc on the upper semicircle (angles 0° = right … 180° = left).
 * Use startAngleDeg > endAngleDeg so the bulge faces upward (smaller y).
 */
export function describeArc(
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

/** Ring sector with angleHigh > angleLow (upper semicircle, decreasing angle along outer arc). */
export function annularSectorPath(
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

export function needlePath(angleDeg: number, cx: number, cy: number, outerRadius: number): string {
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

function investStatus(actualPct: number): Status {
  if (actualPct >= 20 - 1e-6) return "good";
  if (actualPct >= 17 - 1e-6) return "warning";
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

type AnimFracs = { needs: number; wants: number; loans: number; investment: number };

function useAnimatedFracs(targets: AnimFracs, durationMs = 600): AnimFracs {
  const [out, setOut] = useState<AnimFracs>({ needs: 0, wants: 0, loans: 0, investment: 0 });
  const fromRef = useRef<AnimFracs>({ needs: 0, wants: 0, loans: 0, investment: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = { ...fromRef.current };
    fromRef.current = { ...targets };
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const ease = 1 - (1 - t) * (1 - t);
      setOut({
        needs: from.needs + (targets.needs - from.needs) * ease,
        wants: from.wants + (targets.wants - from.wants) * ease,
        loans: from.loans + (targets.loans - from.loans) * ease,
        investment: from.investment + (targets.investment - from.investment) * ease,
      });
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [targets, durationMs]);

  return out;
}

function needleTargetFrac(amount: number, income: number, capFraction: number, rangeMultiplier: number) {
  const maxScaleFrac = capFraction * rangeMultiplier;
  if (income <= 0 || maxScaleFrac <= 0) return 0;
  return Math.min(1, amount / income / maxScaleFrac);
}

function GaugeSvg({
  kind,
  amount,
  income,
  capFraction,
  rangeMultiplier,
  capLabel,
  needleFrac,
  compact,
}: {
  kind: "spend" | "invest";
  amount: number;
  income: number;
  capFraction: number;
  rangeMultiplier: number;
  capLabel: string;
  needleFrac: number;
  compact: boolean;
}) {
  const actualPct = income > 0 ? (amount / income) * 100 : 0;
  const maxScaleFrac = capFraction * rangeMultiplier;

  const needleAngle = 180 - needleFrac * 180;
  const capAngle = 180 - (capFraction / maxScaleFrac) * 180;

  const status: Status =
    kind === "spend" ? spendStatus(actualPct, capFraction * 100) : investStatus(actualPct);
  const needleCol = statusColor(status);

  const progStroke = compact ? 6 : 7;

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
  const capLbl = polarToXY(capAngle, R_OUT + (compact ? 15 : 18), CX, CY);

  const progressEndAngle = 180 - needleFrac * 180;
  const progressPath =
    needleFrac > 0.001 ? describeArc(CX, CY, R_PROGRESS, 180, progressEndAngle) : "";

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 -6 140 96"
        className={cn("w-full max-w-[140px]", compact && "max-w-[100px]")}
        aria-hidden
      >
        {zonePaths.map((z) => (
          <path
            key={`${z.a0}-${z.a1}`}
            d={annularSectorPath(CX, CY, R_OUT, R_IN, z.a0, z.a1)}
            fill={z.c}
            stroke="none"
          />
        ))}

        {progressPath ? (
          <path
            d={progressPath}
            fill="none"
            stroke={needleCol}
            strokeWidth={progStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        <line
          x1={capTickOuter.x}
          y1={capTickOuter.y}
          x2={capTickInner.x}
          y2={capTickInner.y}
          stroke="#64748b"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <text
          x={capLbl.x}
          y={capLbl.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-600"
          style={{ fontSize: compact ? 7 : 8 }}
        >
          {capLabel}
        </text>

        <path
          d={needlePath(needleAngle, CX, CY, R_OUT - 4)}
          fill={needleCol}
          className="transition-colors duration-300"
        />
        <circle cx={CX} cy={CY} r={compact ? 3.5 : 4} fill="#fff" stroke={needleCol} strokeWidth={1.5} />

        <text
          x={CX}
          y={compact ? 54 : 52}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-bold tabular-nums"
          fill={needleCol}
          style={{ fontSize: compact ? 13 : 16 }}
        >
          {income > 0 ? `${actualPct.toFixed(0)}%` : "—"}
        </text>
      </svg>
    </div>
  );
}

function GaugeColumn({
  title,
  labelColor,
  children,
  amount,
  chipClass,
  chipText,
  compact,
}: {
  title: string;
  labelColor: string;
  children: ReactNode;
  amount: number;
  chipClass: string;
  chipText: string;
  compact: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <p className="text-center text-[0.7rem] font-bold uppercase tracking-wide" style={{ color: labelColor }}>
        {title}
      </p>
      {children}
      {!compact ? (
        <p className="text-center text-xs font-semibold tabular-nums text-slate-800">
          {formatCurrency(amount, "en-IN", "INR")}
        </p>
      ) : null}
      <span className={cn("rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold", chipClass)}>{chipText}</span>
    </div>
  );
}

function GaugesBlock({
  props,
  compact,
  anim,
}: {
  props: SpeedoMeterProps;
  compact: boolean;
  anim: AnimFracs;
}) {
  const { income, needs, wants, loans, investment, hasHomeLoan = false } = props;
  const needsCap = hasHomeLoan ? 0.25 : 0.2;

  const pct = {
    needs: income > 0 ? (needs / income) * 100 : 0,
    wants: income > 0 ? (wants / income) * 100 : 0,
    loans: income > 0 ? (loans / income) * 100 : 0,
    investment: income > 0 ? (investment / income) * 100 : 0,
  };

  const stN = spendStatus(pct.needs, needsCap * 100);
  const stW = spendStatus(pct.wants, WANTS_CAP * 100);
  const stL = spendStatus(pct.loans, LOANS_CAP * 100);
  const stI = investStatus(pct.investment);

  return (
    <div className="grid grid-cols-4 gap-1 sm:gap-3">
      <GaugeColumn
        title="Needs"
        labelColor={COLORS.needs}
        amount={needs}
        chipClass={CHIP[stN]}
        chipText={`${income > 0 ? pct.needs.toFixed(0) : "—"}% · ${chipLabelSpend(stN)}`}
        compact={compact}
      >
        <GaugeSvg
          kind="spend"
          amount={needs}
          income={income}
          capFraction={needsCap}
          rangeMultiplier={SPEND_RANGE_MULT}
          capLabel={`cap ${Math.round(needsCap * 100)}%`}
          needleFrac={anim.needs}
          compact={compact}
        />
      </GaugeColumn>
      <GaugeColumn
        title="Wants"
        labelColor={COLORS.wants}
        amount={wants}
        chipClass={CHIP[stW]}
        chipText={`${income > 0 ? pct.wants.toFixed(0) : "—"}% · ${chipLabelSpend(stW)}`}
        compact={compact}
      >
        <GaugeSvg
          kind="spend"
          amount={wants}
          income={income}
          capFraction={WANTS_CAP}
          rangeMultiplier={SPEND_RANGE_MULT}
          capLabel="cap 10%"
          needleFrac={anim.wants}
          compact={compact}
        />
      </GaugeColumn>
      <GaugeColumn
        title="Loans"
        labelColor={COLORS.loans}
        amount={loans}
        chipClass={CHIP[stL]}
        chipText={`${income > 0 ? pct.loans.toFixed(0) : "—"}% · ${chipLabelSpend(stL)}`}
        compact={compact}
      >
        <GaugeSvg
          kind="spend"
          amount={loans}
          income={income}
          capFraction={LOANS_CAP}
          rangeMultiplier={SPEND_RANGE_MULT}
          capLabel="cap 30%"
          needleFrac={anim.loans}
          compact={compact}
        />
      </GaugeColumn>
      <GaugeColumn
        title="Investment"
        labelColor={COLORS.investment}
        amount={investment}
        chipClass={CHIP[stI]}
        chipText={`${income > 0 ? pct.investment.toFixed(0) : "—"}% · ${chipLabelInvest(stI)}`}
        compact={compact}
      >
        <GaugeSvg
          kind="invest"
          amount={investment}
          income={income}
          capFraction={INVEST_CAP}
          rangeMultiplier={INVEST_RANGE_MULT}
          capLabel="min 20%"
          needleFrac={anim.investment}
          compact={compact}
        />
      </GaugeColumn>
    </div>
  );
}

function ChipsRow({ props }: { props: SpeedoMeterProps }) {
  const { income, needs, wants, loans, investment, hasHomeLoan = false } = props;
  const needsCap = hasHomeLoan ? 25 : 20;
  const pct = {
    n: income > 0 ? (needs / income) * 100 : 0,
    w: income > 0 ? (wants / income) * 100 : 0,
    l: income > 0 ? (loans / income) * 100 : 0,
    i: income > 0 ? (investment / income) * 100 : 0,
  };
  const stN = spendStatus(pct.n, needsCap);
  const stW = spendStatus(pct.w, WANTS_CAP * 100);
  const stL = spendStatus(pct.l, LOANS_CAP * 100);
  const stI = investStatus(pct.i);

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", CHIP[stN])}>
        Needs {income > 0 ? `${pct.n.toFixed(0)}%` : "—"} · {chipLabelSpend(stN)}
      </span>
      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", CHIP[stW])}>
        Wants {income > 0 ? `${pct.w.toFixed(0)}%` : "—"} · {chipLabelSpend(stW)}
      </span>
      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", CHIP[stL])}>
        Loans {income > 0 ? `${pct.l.toFixed(0)}%` : "—"} · {chipLabelSpend(stL)}
      </span>
      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", CHIP[stI])}>
        Investment {income > 0 ? `${pct.i.toFixed(0)}%` : "—"} · {chipLabelInvest(stI)}
      </span>
    </div>
  );
}

function InsightBlock({ props }: { props: SpeedoMeterProps }) {
  const { income, needs, wants, loans, investment, hasHomeLoan = false } = props;
  const needsCap = hasHomeLoan ? 25 : 20;
  const pct = {
    n: income > 0 ? (needs / income) * 100 : 0,
    w: income > 0 ? (wants / income) * 100 : 0,
    l: income > 0 ? (loans / income) * 100 : 0,
    i: income > 0 ? (investment / income) * 100 : 0,
  };
  const issues: string[] = [];
  if (spendStatus(pct.n, needsCap) !== "good") {
    issues.push(
      spendStatus(pct.n, needsCap) === "critical"
        ? `Needs are critically above the ${needsCap}% guide.`
        : `Needs are above the ${needsCap}% guide — review core spending.`,
    );
  }
  if (spendStatus(pct.w, WANTS_CAP * 100) !== "good") {
    issues.push("Wants are over the 10% cap — ease discretionary spend.");
  }
  if (spendStatus(pct.l, LOANS_CAP * 100) !== "good") {
    issues.push("Loan outflows exceed the 30% safety guide.");
  }
  if (investStatus(pct.i) !== "good") {
    issues.push(
      investStatus(pct.i) === "critical"
        ? "Investment flow is below 17% — increase long-term contributions when possible."
        : "Investment flow is under 20% — try to step up toward 20% of income.",
    );
  }
  const t = needs + wants + loans + investment;
  if (income > 0 && t > income + 1e-6) {
    issues.push("Total allocations exceed take-home — recheck inputs.");
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
      {issues.length === 0 ? (
        <p className="text-center font-medium text-[#085041]">All gauges in the green.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {issues.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SpeedoMeter({
  title = "Your financial health gauges",
  className,
  ...props
}: SpeedoMeterProps & { title?: string; className?: string }) {
  const { income, needs, wants, loans, investment, hasHomeLoan = false } = props;
  const targets = useMemo(() => {
    const needsCap = hasHomeLoan ? 0.25 : 0.2;
    return {
      needs: needleTargetFrac(needs, income, needsCap, SPEND_RANGE_MULT),
      wants: needleTargetFrac(wants, income, WANTS_CAP, SPEND_RANGE_MULT),
      loans: needleTargetFrac(loans, income, LOANS_CAP, SPEND_RANGE_MULT),
      investment: needleTargetFrac(investment, income, INVEST_CAP, INVEST_RANGE_MULT),
    };
  }, [income, needs, wants, loans, investment, hasHomeLoan]);
  const anim = useAnimatedFracs(targets);

  return (
    <section className={cn("rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6", className)}>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      <GaugesBlock props={props} compact={false} anim={anim} />
      <ChipsRow props={props} />
      <InsightBlock props={props} />
      <p className="mt-3 text-center text-[0.65rem] text-slate-500">
        Monthly figures; yearly premiums use a monthly equivalent (÷12).
      </p>
    </section>
  );
}

export function SpeedoMeterCompact({ className, ...props }: SpeedoMeterProps & { className?: string }) {
  const { income, needs, wants, loans, investment, hasHomeLoan = false } = props;
  const targets = useMemo(() => {
    const needsCap = hasHomeLoan ? 0.25 : 0.2;
    return {
      needs: needleTargetFrac(needs, income, needsCap, SPEND_RANGE_MULT),
      wants: needleTargetFrac(wants, income, WANTS_CAP, SPEND_RANGE_MULT),
      loans: needleTargetFrac(loans, income, LOANS_CAP, SPEND_RANGE_MULT),
      investment: needleTargetFrac(investment, income, INVEST_CAP, INVEST_RANGE_MULT),
    };
  }, [income, needs, wants, loans, investment, hasHomeLoan]);
  const anim = useAnimatedFracs(targets);

  return (
    <div
      className={cn(
        "sticky top-0 z-30 border-b border-slate-200 bg-white/95 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90",
        className,
      )}
    >
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:max-w-2xl">
        <GaugesBlock props={props} compact anim={anim} />
      </div>
    </div>
  );
}
