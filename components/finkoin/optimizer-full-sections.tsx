"use client";

import type { FinancialProfile } from "@/lib/analyse-form-schema";
import type {
  FinkoinInsuranceGap,
  FinkoinKvpStrategy,
} from "@/lib/finkoinAiPlan";
import { computeRealEmergencyFund } from "@/lib/financialEngine";
import { fmt, fmtWords } from "@/lib/optimizer-format";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const MIS_RATE_APR = 0.074;

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function computeMisladder(
  profile: FinancialProfile | null | undefined,
  kvp: FinkoinKvpStrategy | undefined,
) {
  const totalYearlyPremiums = Math.round(n(kvp?.totalYearlyPremiums));
  const rdMonthlyFromKvp = Math.round(n(kvp?.rdMonthlyAmount));
  const rdMonthly =
    rdMonthlyFromKvp > 0
      ? rdMonthlyFromKvp
      : totalYearlyPremiums > 0
        ? Math.max(1, Math.ceil(totalYearlyPremiums / 12))
        : 0;

  let idleLiquid = 0;
  let needsMonthly = 0;
  if (profile) {
    const b = getUniversalBucketActuals(profile);
    needsMonthly = b.needs;
    const sav = n(profile.savingsAccountBalance);
    const fdWeighted = n(profile.fdValue) * 0.7;
    const buffer = needsMonthly * 3;
    idleLiquid = Math.max(0, Math.round(sav + fdWeighted - buffer));
  }

  const kvpLump = Math.round(n(kvp?.kvpAmount));
  let misInvestment =
    kvpLump > 0 ? Math.min(kvpLump, idleLiquid || kvpLump) : 0;
  if (misInvestment === 0 && idleLiquid >= 50_000) {
    misInvestment = Math.min(
      idleLiquid,
      Math.max(totalYearlyPremiums, rdMonthly * 12),
    );
  }
  misInvestment = Math.max(0, misInvestment);

  const misMonthlyInterest = Math.round((misInvestment * MIS_RATE_APR) / 12);
  const salaryTopUp = Math.max(0, rdMonthly - misMonthlyInterest);
  const misCoveragePct =
    rdMonthly > 0
      ? Math.min(100, Math.round((misMonthlyInterest / rdMonthly) * 100))
      : 0;
  const showMisStep = misInvestment >= 10_000 && misMonthlyInterest > 0;
  const yearlySaving = totalYearlyPremiums;

  return {
    totalYearlyPremiums,
    rdMonthly,
    misInvestment,
    misMonthlyInterest,
    salaryTopUp,
    misCoveragePct,
    showMisStep,
    yearlySaving,
    misInterest: misMonthlyInterest,
  };
}

export function OptimizerStopPayingInsuranceSection({
  kvp,
  ladder,
}: {
  kvp: FinkoinKvpStrategy | undefined;
  ladder: ReturnType<typeof computeMisladder>;
}) {
  const applicable = Boolean(
    kvp?.applicable || ladder.totalYearlyPremiums > 0 || ladder.rdMonthly > 0,
  );
  if (!applicable) return null;

  const {
    totalYearlyPremiums,
    rdMonthly,
    misInvestment,
    misMonthlyInterest,
    salaryTopUp,
    misCoveragePct,
    showMisStep,
  } = ladder;

  const box: React.CSSProperties = {
    background: "#534AB7",
    borderRadius: 16,
    padding: "20px 24px",
    marginBottom: 20,
    color: "white",
  };

  const cardBase: React.CSSProperties = {
    borderRadius: 14,
    padding: "18px 20px",
    marginBottom: 16,
    background: "white",
  };

  const metricBox: React.CSSProperties = {
    flex: 1,
    minWidth: 90,
    background: "#F7F7F4",
    borderRadius: 8,
    padding: "10px 12px",
    textAlign: "center" as const,
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-slate-900">
        Stop paying insurance from salary
      </h3>
      <p className="text-sm text-slate-600">Set this up once. Works forever.</p>

      <div style={box}>
        <div
          style={{
            fontSize: 13,
            color: "#AFA9EC",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          The idea in simple words
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.8, color: "white" }}>
          You pay <strong>{fmt(totalYearlyPremiums)}/year</strong> for
          insurance. Right now this money comes from your salary every year.
          <br />
          <br />
          We will fix this in 2 steps:
          <br />
          1. Move your idle FD/savings to <strong> Post Office MIS</strong>. MIS
          pays you <strong>{fmt(misMonthlyInterest)}/month</strong> interest
          automatically.
          <br />
          2. That interest goes into an <strong> RD account</strong> every
          month. After 12 months the RD has enough to pay all your insurance.
          <br />
          <br />
          <strong>Result: Your salary never touches insurance again.</strong>
        </div>
      </div>

      {showMisStep ? (
        <div style={{ ...cardBase, borderLeft: "4px solid #1D9E75" }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: "#1D9E75" }}
              >
                1
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  Open Post Office MIS account
                </p>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                  One time
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            Go to your nearest post office. Invest {fmt(misInvestment)} from
            your FD or savings. Post office pays you {fmt(misMonthlyInterest)}{" "}
            every month directly to your bank account. Your money is 100% safe
            here — government backed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <div style={metricBox}>
              <div className="text-[11px] text-[#9B9A94]">You invest</div>
              <div className="text-sm font-bold text-slate-900">
                {fmt(misInvestment)}
              </div>
              <div className="text-[10px] text-[#9B9A94]">one time only</div>
            </div>
            <div style={metricBox}>
              <div className="text-[11px] text-[#9B9A94]">You receive</div>
              <div className="text-sm font-bold text-slate-900">
                {fmt(misMonthlyInterest)}/mo
              </div>
              <div className="text-[10px] text-[#9B9A94]">
                every month automatically
              </div>
            </div>
            <div style={metricBox}>
              <div className="text-[11px] text-[#9B9A94]">Rate</div>
              <div className="text-sm font-bold text-slate-900">
                7.4% per year
              </div>
              <div className="text-[10px] text-[#9B9A94]">
                guaranteed, not market linked
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ ...cardBase, borderLeft: "4px solid #534AB7" }}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: "#534AB7" }}
          >
            {showMisStep ? 2 : 1}
          </div>
          <div>
            <p className="font-bold text-slate-900">Start RD at post office</p>
            <span className="rounded-md bg-[#EEEDFE] px-2 py-0.5 text-[10px] font-bold uppercase text-[#3C3489]">
              Monthly
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-700">
          Open a Recurring Deposit account at the same post office. Set up
          auto-debit from your bank.
        </p>
        {showMisStep ? (
          <div className="mt-4 rounded-xl border border-[#E8E6F0] bg-[#FAFAFE] p-4">
            <p className="text-sm font-semibold text-slate-900">
              Your monthly RD of {fmt(rdMonthly)}:
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>MIS interest pays</span>
                <span className="font-medium">{fmt(misMonthlyInterest)}</span>
              </div>
              <div className="flex justify-between">
                <span>You add from salary</span>
                <span className="font-medium">{fmt(salaryTopUp)}</span>
              </div>
            </div>
            <div className="my-2 border-t border-[#E8E6F0]" />
            <p className="text-sm font-bold text-[#534AB7]">
              Total RD: {fmt(rdMonthly)}/month
            </p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="flex h-full w-full">
                <div
                  className="h-full bg-[#1D9E75]"
                  style={{ width: `${misCoveragePct}%` }}
                />
                <div
                  className="h-full bg-[#534AB7]"
                  style={{ width: `${100 - misCoveragePct}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              MIS covers {misCoveragePct}% of your RD automatically
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[#E8E6F0] bg-[#FAFAFE] p-4 text-sm text-slate-700">
            Put {fmt(rdMonthly)}/month into RD. Set up auto-debit so it happens
            automatically every month. You do not need to visit post office
            again after setup.
          </div>
        )}
      </div>

      <div style={{ ...cardBase, borderLeft: "4px solid #BA7517" }}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: "#BA7517" }}
          >
            {showMisStep ? 3 : 2}
          </div>
          <div>
            <p className="font-bold text-slate-900">RD pays your insurance</p>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
              Every year
            </span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">
          After 12 months your RD matures. You will have{" "}
          {fmt(totalYearlyPremiums)}. Use this to pay ALL your insurance
          premiums for the whole year. Immediately start a new RD. The cycle
          repeats automatically. Your salary is now free. Forever.
        </p>
      </div>
    </div>
  );
}

export function OptimizerYearByYearSection({
  ladder,
}: {
  ladder: ReturnType<typeof computeMisladder>;
}) {
  const {
    totalYearlyPremiums,
    misInvestment,
    salaryTopUp,
    misMonthlyInterest,
    yearlySaving,
    showMisStep,
  } = ladder;
  if (totalYearlyPremiums <= 0 && ladder.rdMonthly <= 0) return null;

  const box = (bg: string, border: string) =>
    ({
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: "16px 18px",
    }) as React.CSSProperties;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">
        What happens each year
      </h3>
      <div className="grid gap-3 md:grid-cols-3">
        <div style={box("#FCEBEB", "#F7C1C1")}>
          <p className="font-bold text-[#791F1F]">Year 1 — Getting started</p>
          <p className="mt-2 text-xs font-semibold text-[#791F1F]">
            What you do:
          </p>
          <ul className="mt-1 list-none space-y-1 text-xs text-[#5F5E5A]">
            {showMisStep ? <li>→ Open MIS with {fmt(misInvestment)}</li> : null}
            <li>→ Start RD {fmt(salaryTopUp)}/month</li>
            <li>→ Pay this year&apos;s premium from salary (last time)</li>
          </ul>
          <p className="mt-2 text-xs font-semibold text-[#791F1F]">
            What happens automatically:
          </p>
          <ul className="mt-1 list-none space-y-1 text-xs text-[#5F5E5A]">
            <li>→ MIS pays {fmt(misMonthlyInterest)}/month to your bank</li>
            <li>→ RD gets funded every month</li>
            <li>→ Premium corpus builds up</li>
          </ul>
        </div>
        <div style={box("#FEF9E8", "#F5E0A8")}>
          <p className="font-bold text-amber-900">Year 2 — Salary is free</p>
          <p className="mt-2 text-xs font-semibold text-amber-900">
            What you do:
          </p>
          <ul className="mt-1 list-none space-y-1 text-xs text-[#5F5E5A]">
            <li>→ RD matures → {fmt(totalYearlyPremiums)}</li>
            <li>→ Pay ALL premiums from RD maturity</li>
            <li>→ Start new RD immediately</li>
          </ul>
          <p className="mt-2 text-xs font-semibold text-amber-900">
            What happens automatically:
          </p>
          <ul className="mt-1 list-none space-y-1 text-xs text-[#5F5E5A]">
            <li>→ MIS still pays {fmt(misMonthlyInterest)}/month</li>
            <li>→ New RD builds for year 3</li>
            <li>→ Salary not touched for insurance ✓</li>
          </ul>
        </div>
        <div style={box("#E1F5EE", "#B8E0D0")}>
          <p className="font-bold text-emerald-900">
            Year 3 onwards — Autopilot
          </p>
          <p className="mt-2 text-xs text-emerald-900">
            Everything runs itself:
          </p>
          <ul className="mt-1 list-none space-y-1 text-xs text-[#5F5E5A]">
            <li>→ MIS keeps paying every month ✓</li>
            <li>→ RD keeps building ✓</li>
            <li>→ Premium paid every year ✓</li>
            <li>→ You do nothing ✓</li>
          </ul>
          <p className="mt-3 text-sm font-bold text-emerald-900">
            Your salary saving: {fmt(yearlySaving)}/year
          </p>
          <p className="text-xs text-emerald-800">every year forever</p>
        </div>
      </div>
    </div>
  );
}

type PhaseDef = {
  phaseLabel: string;
  phaseTitle: string;
  phaseSub: string;
  phaseColor: string;
  phaseColorLight: string;
  phaseIcon: AppIconName;
  checklist: Array<{ title: string; detail?: string }>;
  results: string[];
};

function PhaseCard({ def }: { def: PhaseDef }) {
  return (
    <div
      style={{
        border: `2px solid ${def.phaseColor}`,
        borderRadius: 14,
        padding: "20px 24px",
        marginBottom: 16,
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#9B9A94",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 2,
            }}
          >
            {def.phaseLabel}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111110" }}>
            {def.phaseTitle}
          </div>
          <div style={{ fontSize: 13, color: "#9B9A94" }}>{def.phaseSub}</div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: def.phaseColorLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppIcon name={def.phaseIcon} size={24} color={def.phaseColor} />
        </div>
      </div>
      {def.checklist.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 12,
            padding: "10px 12px",
            background: "#F7F7F4",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: "2px solid #E8E6F0",
              background: "white",
              flexShrink: 0,
              marginTop: 1,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111110",
                marginBottom: 2,
              }}
            >
              {item.title}
            </div>
            {item.detail ? (
              <div style={{ fontSize: 12, color: "#9B9A94", lineHeight: 1.5 }}>
                {item.detail}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <div
        style={{
          background: def.phaseColorLight,
          borderRadius: 8,
          padding: "10px 14px",
          marginTop: 4,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: def.phaseColor,
            marginBottom: 4,
          }}
        >
          BY END OF THIS PHASE:
        </div>
        {def.results.map((r, i) => (
          <div
            key={i}
            style={{ fontSize: 12, color: def.phaseColor, marginBottom: 2 }}
          >
            ✓ {r}
          </div>
        ))}
      </div>
    </div>
  );
}

export function OptimizerTwelveMonthPhasesSection({
  profile,
  ladder,
  termPremium,
  healthTarget,
  investmentMonthly,
  emergencyTarget,
  emergencyCurrent,
  emergencyMonthly,
  emergencyMonths,
  taxUsed,
  taxBalance,
}: {
  profile: FinancialProfile | null | undefined;
  ladder: ReturnType<typeof computeMisladder>;
  termPremium: number;
  healthTarget: number;
  investmentMonthly: number;
  emergencyTarget: number;
  emergencyCurrent: number;
  emergencyMonthly: number;
  emergencyMonths: number;
  taxUsed: number;
  taxBalance: number;
}) {
  const { misInvestment, salaryTopUp, totalYearlyPremiums } = ladder;
  const showMis = ladder.showMisStep;

  const phases: PhaseDef[] = [
    {
      phaseLabel: "Phase 1",
      phaseTitle: "Month 1 — Foundation",
      phaseSub: "Do these in the first 2 weekends",
      phaseColor: "#E24B4A",
      phaseColorLight: "#FCEBEB",
      phaseIcon: "home",
      checklist: [
        ...(showMis
          ? [
              {
                title: "Open MIS account at post office",
                detail: `${fmt(misInvestment)} one-time deposit. Carry: Aadhaar + PAN + cheque. Time needed: 45 minutes`,
              },
            ]
          : []),
        {
          title: "Open RD account at post office",
          detail: `${fmt(salaryTopUp)}/month auto-debit. Time needed: 20 minutes`,
        },
        {
          title: "Compare term cover (get quotes)",
          detail:
            "Compare at least 3 pure-term plans from licensed insurers. Time needed: 30 minutes",
        },
        {
          title: "Pay this year premium from salary",
          detail: "Last time you do this",
        },
      ],
      results: [
        showMis ? "MIS running ✓" : "",
        "RD running ✓",
        "Term cover compared ✓",
      ].filter(Boolean),
    },
    {
      phaseLabel: "Phase 2",
      phaseTitle: "Month 2-3 — Protection",
      phaseSub: "Complete your protection layer",
      phaseColor: "#BA7517",
      phaseColorLight: "#FEF9E8",
      phaseIcon: "shield",
      checklist: [
        {
          title: "Put term cover in place",
          detail: `Decision deadline: Month 2. Premium per month: ~${fmt(termPremium)}`,
        },
        {
          title: "Check health insurance",
          detail: `Is your cover enough? Target: ${fmt(healthTarget)} family cover`,
        },
        {
          title: "MIS interest arriving? ✓",
          detail: `Check bank account — ${fmt(ladder.misInterest)} should be there`,
        },
        {
          title: "RD auto-debit working? ✓",
          detail: "Check bank statement",
        },
      ],
      results: ["Protection layer in place ✓", "Premium fund building ✓"],
    },
    {
      phaseLabel: "Phase 3",
      phaseTitle: "Month 4-9 — Build wealth",
      phaseSub: "Safety is set — now grow",
      phaseColor: "#0D9488",
      phaseColorLight: "#E0F2F1",
      phaseIcon: "trending",
      checklist: [
        {
          title: "Start index fund SIP",
          detail: `Amount: ${fmt(investmentMonthly)}/month. Where: Nifty 50 index fund (Zerodha, Groww, or Parag Parikh)`,
        },
        {
          title: "Emergency fund check",
          detail: `Target: ${fmt(emergencyTarget)}. Current: ${fmt(emergencyCurrent)}. Monthly top-up needed: ${fmt(emergencyMonthly)}`,
        },
        {
          title: "RD and MIS running on autopilot ✓",
          detail: "No action needed — just check once",
        },
        {
          title: "Month 6: Review spending",
          detail:
            "Cut any new lifestyle inflation. Redirect savings to investments",
        },
      ],
      results: [
        `Emergency fund: ${emergencyMonths} months ✓`,
        "Investments growing ✓",
      ],
    },
    {
      phaseLabel: "Phase 4",
      phaseTitle: "Month 10-12 — Year end review",
      phaseSub: "Prepare for year 2",
      phaseColor: "#534AB7",
      phaseColorLight: "#EEEDFE",
      phaseIcon: "checkCircle",
      checklist: [
        {
          title: "RD maturing next month",
          detail: `Keep ${fmt(totalYearlyPremiums)} ready. Do NOT spend this money`,
        },
        {
          title: "Pay all insurance premiums",
          detail: "From RD maturity — not salary ✓ First time salary is FREE",
        },
        {
          title: "Restart RD immediately",
          detail: "Same amount, same post office. Cycle repeats for year 2",
        },
        {
          title: "Tax saving check",
          detail: `80C limit: ₹1,50,000. Used so far: ${fmt(taxUsed)}. Balance to use: ${fmt(taxBalance)}`,
        },
        {
          title: "Increase SIP by 10-15%",
          detail: "If salary increased this year",
        },
        {
          title: "Re-analyse on Finkoin",
          detail: "Update your numbers. See new recommendations",
        },
      ],
      results: [
        "Year 1 COMPLETE ✓",
        "Year 2 starts on autopilot ✓",
        "Salary free from insurance ✓",
      ],
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-slate-900">
        Your 12-month action plan
      </h3>
      <p className="text-sm text-slate-600">Exactly what to do each month</p>
      {phases.map((p, i) => (
        <PhaseCard key={i} def={p} />
      ))}
    </div>
  );
}

export function TermInsuranceGapCard({ gap }: { gap: FinkoinInsuranceGap }) {
  const router = useRouter();
  const termHave = Math.round(n(gap.currentCover));
  const termNeeded = Math.round(n(gap.recommendedCover));
  const termGap = Math.max(0, Math.round(n(gap.gap)));
  const termPremium = Math.round(n(gap.monthlyPremiumEstimate));

  const items = [
    {
      label: "You have",
      value: fmtWords(termHave),
      amount: fmt(termHave),
      color: "#1D9E75",
      icon: "✓",
    },
    {
      label: "You need",
      value: fmtWords(termNeeded),
      amount: fmt(termNeeded),
      color: "#BA7517",
      icon: "→",
    },
    {
      label: "Gap to fill",
      value: fmtWords(termGap),
      amount: fmt(termGap),
      color: "#E24B4A",
      icon: "!",
    },
  ];

  return (
    <div
      style={{
        border: "1px solid #F7C1C1",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          background: "#FCEBEB",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#791F1F",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AppIcon name="alert" size={16} color="currentColor" />
          Term life insurance gap
        </span>
        <span style={{ fontSize: 12, color: "#791F1F", fontWeight: 600 }}>
          THIS WEEK
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                background: "#F7F7F4",
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "#9B9A94", marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>
                {item.icon} {item.amount}
              </div>
              <div style={{ fontSize: 11, color: "#9B9A94", marginTop: 2 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#5F5E5A",
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          Getting {fmt(termGap)} more cover costs approximately{" "}
          <strong> {fmt(termPremium)}/month</strong>. That is the price of
          protecting your family&apos;s future.
        </div>
        <div
          style={{
            background: "#FCEBEB",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#791F1F",
            marginBottom: 12,
          }}
        >
          <strong>If you skip this:</strong> Your family gets zero income
          replacement if something happens to you. All EMIs and living costs
          continue with no salary coming in.
        </div>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "12px",
            background: "#534AB7",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() =>
            router.push(
              "/learn/term-insurance-vs-endowment-why-most-indians-buy-wrong",
            )
          }
        >
          Term cover guide (educational) →
        </button>
      </div>
    </div>
  );
}

export function getOptimizerPhaseNumbers(
  profile: FinancialProfile | null | undefined,
  surplus: number,
) {
  if (!profile) {
    return {
      termPremium: 0,
      healthTarget: 10_00_000,
      investmentMonthly: Math.max(5000, Math.round(surplus * 0.15)),
      emergencyTarget: 0,
      emergencyCurrent: 0,
      emergencyMonthly: 0,
      emergencyMonths: 0,
      taxUsed: 0,
      taxBalance: 1_50_000,
    };
  }
  const b = getUniversalBucketActuals(profile);
  const er = computeRealEmergencyFund(profile);
  const emergencyTarget = Math.round(b.needs * 6);
  const emergencyCurrent = Math.round(er.realTotal);
  const emergencyGap = Math.max(0, emergencyTarget - emergencyCurrent);
  const emergencyMonthly = Math.max(0, Math.round(emergencyGap / 12));
  const emergencyMonths = Math.max(0, Math.floor(er.monthsCovered));

  const termPm = n(profile.termInsurancePremiumMonthly);
  const taxUsed = Math.min(
    1_50_000,
    Math.round(n(profile.monthlyPPFContribution) * 12),
  );
  const healthTarget = profile.cityTier === "metro" ? 20_00_000 : 10_00_000;

  let investmentMonthly = Math.max(5000, Math.round(surplus * 0.15));
  if (n(profile.monthlySIP) > 0)
    investmentMonthly = Math.round(n(profile.monthlySIP));

  return {
    termPremium: termPm,
    healthTarget,
    investmentMonthly,
    emergencyTarget,
    emergencyCurrent,
    emergencyMonthly,
    emergencyMonths,
    taxUsed,
    taxBalance: Math.max(0, 1_50_000 - taxUsed),
  };
}
