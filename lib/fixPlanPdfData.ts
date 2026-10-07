import { debtRateLabel, estSuffix } from "@/lib/fixPlanMerge";
import { debtPayoffNumbers } from "@/lib/priorityEngine";

export type FixPlanPdfPhase = {
  phase: number;
  title: string;
  subtitle: string;
  color: [number, number, number];
  tasks: string[];
  outcomes: string[];
};

export type FixPlanPdfData = {
  phases: FixPlanPdfPhase[];
  keySnapshot: string[];
};

/** `phases` / `keySnapshot` for the Fix Plan PDF's 12-month action plan page. */
export function buildFixPlanPdfData(pp: any, expl: any): FixPlanPdfData {
  const pri = [...(pp?.priorities || [])].sort(
    (a: any, b: any) => (a.rank || 0) - (b.rank || 0),
  );
  const phase1Tasks = pri
    .filter((p: any) => p.rank === 1)
    .map((p: any) =>
      `${p.title}: ${p.actionThisWeek || p.description || p.whyThisMatters || ""}`.trim(),
    );
  const phase2Tasks = pri
    .filter((p: any) => p.rank === 2 || p.rank === 3)
    .map(
      (p: any) =>
        `${p.title}${p.actionThisWeek ? ` — ${p.actionThisWeek}` : ""}`,
    );
  const phase3Tasks = pri
    .filter((p: any) => (p.rank || 0) > 3)
    .map((p: any) => p.title);
  const emerg = pri.find((p: any) => p.id === "emergency_fund");
  const term = pri.find((p: any) => p.id === "term_insurance");
  const health = pri.find((p: any) => p.id === "health_insurance");
  const keySnapshot = [
    `Monthly surplus: ₹${Math.round(pp?.monthlySurplus || 0).toLocaleString("en-IN")}`,
    ...(pp?.debts?.length
      ? (pp.debts as any[]).map(
          (d) =>
            `${d.displayName || d.type}: outstanding ₹${Number(d.outstanding || 0).toLocaleString("en-IN")}${d.outstandingEstimated ? " (est.)" : ""} @ ${debtRateLabel(d)} · EMI ₹${Number(d.emi || 0).toLocaleString("en-IN")}/mo · extra ₹${Number(d.extraEMIRecommended || 0).toLocaleString("en-IN")}/mo · ~${debtPayoffNumbers(d).monthsNow} mo to clear${estSuffix(d)}`,
        )
      : ["Debt: none in engine plan"]),
    emerg && Number(emerg.gap || 0) > 0
      ? `Emergency fund gap: ₹${Number(emerg.gap || 0).toLocaleString("en-IN")}`
      : null,
    term && Number(term.gap || 0) > 0
      ? `Term cover gap: ₹${Number(term.gap || 0).toLocaleString("en-IN")}`
      : null,
    health && Number(health.gap || 0) > 0
      ? `Health cover gap: ₹${Number(health.gap || 0).toLocaleString("en-IN")}`
      : null,
  ].filter(Boolean) as string[];

  const phases = [
    {
      phase: 1,
      title: "Phase 1 — Immediate (This Week)",
      subtitle: "Highest-ranked actions",
      color: [226, 75, 74] as [number, number, number],
      tasks:
        phase1Tasks.length > 0
          ? phase1Tasks
          : ["Complete your financial review"],
      outcomes: [
        `Address top risk: ${pri[0]?.title || "safety and liquidity"}`,
      ],
    },
    {
      phase: 2,
      title: "Phase 2 — Short term (1–3 months)",
      subtitle: "Protection and foundation",
      color: [186, 117, 23] as [number, number, number],
      tasks:
        phase2Tasks.length > 0 ? phase2Tasks : ["Build financial foundation"],
      outcomes: [
        typeof expl?.in12Months === "string"
          ? expl.in12Months.slice(0, 160)
          : "Improved financial health",
      ],
    },
    {
      phase: 3,
      title: "Phase 3 — Medium term (3–12 months)",
      subtitle: "Wealth and consistency",
      color: [29, 158, 117] as [number, number, number],
      tasks:
        phase3Tasks.length > 0 ? phase3Tasks : ["Grow wealth systematically"],
      outcomes: ["Financial independence on track"],
    },
    {
      phase: 4,
      title: "Phase 4 — Year end",
      subtitle: "Review and upgrade",
      color: [83, 74, 183] as [number, number, number],
      tasks: [
        "80C / tax-saving check — use actual salary and 80C numbers next run",
        "Re-analyse on Finkoin with updated balances",
        "Review insurance covers vs income",
      ],
      outcomes: ["Year 1 complete", "Year 2 plan ready"],
    },
  ];

  return { phases, keySnapshot };
}
