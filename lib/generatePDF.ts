import { formatLakhCrore, projectNetWorth } from "@/lib/netWorthTrajectory";
import { NO_CONFLICT_BODY, NO_CONFLICT_TITLE } from "@/lib/reportTrust";
import jsPDF from "jspdf";
import {
  CITY_TIER_LABELS,
  LIFE_STAGE_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/lib/analyse-form-schema";
import { humaniseEnum } from "@/lib/analyseResultModel";
import { localISODate } from "@/lib/localDate";
import { scoreBand } from "@/lib/financialEngine";
import { COMPLETE_WHY, isPriorityComplete } from "@/lib/fixPlanMerge";
import { debtPayoffNumbers } from "@/lib/priorityEngine";
import { getUniversalBucketRows } from "@/lib/universal-buckets";

const PURPLE = [83, 74, 183] as const;
const GREEN = [29, 158, 117] as const;
const RED = [226, 75, 74] as const;
const AMBER = [186, 117, 23] as const;
const GREY = [155, 154, 148] as const;
const DARK = [17, 17, 16] as const;

function drawPieChart(
  doc: jsPDF,
  x: number,
  y: number,
  radius: number,
  data: { label: string; value: number; color: string }[],
) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let startAngle = -Math.PI / 2;

  data.forEach((segment) => {
    const sliceAngle = (segment.value / Math.max(total, 1)) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const steps = Math.max(10, Math.round(sliceAngle * 20));

    const r = parseInt(segment.color.slice(1, 3), 16);
    const g = parseInt(segment.color.slice(3, 5), 16);
    const b = parseInt(segment.color.slice(5, 7), 16);

    doc.setFillColor(r, g, b);
    for (let i = 0; i < steps; i++) {
      const a1 = startAngle + (sliceAngle * i) / steps;
      const a2 = startAngle + (sliceAngle * (i + 1)) / steps;
      doc.triangle(
        x,
        y,
        x + Math.cos(a1) * radius,
        y + Math.sin(a1) * radius,
        x + Math.cos(a2) * radius,
        y + Math.sin(a2) * radius,
        "F",
      );
    }
    startAngle = endAngle;
  });

  let legendY = y - radius + 4;
  data.forEach((segment, i) => {
    const r = parseInt(segment.color.slice(1, 3), 16);
    const g = parseInt(segment.color.slice(3, 5), 16);
    const b = parseInt(segment.color.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(x + radius + 10, legendY + i * 14 - 4, 8, 8, "F");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(
      `${segment.label}: ₹${segment.value.toLocaleString("en-IN")}`,
      x + radius + 22,
      legendY + i * 14,
    );
  });
}

export type FixPlanPdfOptions = {
  /** IANA zone for printed dates and the filename; defaults to the runtime's local zone. */
  timeZone?: string;
  /** Base64 TTFs with ₹ glyphs (Noto Sans). Without them Helvetica is used and ₹ prints as "Rs.". */
  fonts?: { regular: string; bold: string };
};

function labelOrDash(
  labels: Record<string, string>,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return labels[value] ?? humaniseEnum(value);
}

/** Bucket caps are stored as fractions (0.3); older rows may hold whole percents (30). */
export function formatCapPercent(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "0%";
  const pct = n <= 1 ? n * 100 : n;
  return `${Number(pct.toFixed(1))}%`;
}

const BUCKET_STATUS_LABELS: Record<string, string> = {
  good: "On track",
  ok: "On track",
  warning: "Near cap",
  critical: "Over cap",
  na: "—",
};

function bucketStatusLabel(status: unknown): string {
  if (typeof status !== "string" || !status) return "—";
  return BUCKET_STATUS_LABELS[status] ?? humaniseEnum(status);
}

/** Shrink `text` until it fits `maxWidth`, ending with "…". */
function fitSingleLine(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

const UNICODE_FONT = "NotoSans";
const CHECKBOX_CELL = "\u0000checkbox";

function registerUnicodeFont(
  doc: jsPDF,
  fonts: { regular: string; bold: string },
) {
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Regular.ttf", UNICODE_FONT, "normal");
  // No italic face is embedded; italic copy renders upright.
  doc.addFont("NotoSans-Regular.ttf", UNICODE_FONT, "italic");
  doc.addFont("NotoSans-Bold.ttf", UNICODE_FONT, "bold");
}

/** Helvetica (WinAnsi) has no ₹; keep amounts readable instead of printing garbage. */
function applyRupeeFallback(doc: jsPDF) {
  const original = doc.text.bind(doc) as (...args: any[]) => jsPDF;
  const swap = (t: unknown): unknown =>
    typeof t === "string"
      ? t.replace(/₹\s?/g, "Rs. ")
      : Array.isArray(t)
        ? t.map(swap)
        : t;
  (doc as any).text = (text: unknown, ...rest: any[]) =>
    original(swap(text), ...rest);
}

function drawCheckMark(
  doc: jsPDF,
  x: number,
  baselineY: number,
  color: readonly [number, number, number],
) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.5);
  doc.line(x, baselineY - 1.3, x + 1.1, baselineY - 0.2);
  doc.line(x + 1.1, baselineY - 0.2, x + 3, baselineY - 2.8);
  doc.setLineWidth(0.2);
}

function isoDateInZone(timeZone?: string): string {
  if (!timeZone) return localISODate();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function downloadOptimizerPDF(
  profile: any,
  analysis: any,
  priorityPlan: any,
  explanations: any,
  optimizerData: any,
) {
  const { doc, fileName } = buildFixPlanPdf(
    profile,
    analysis,
    priorityPlan,
    explanations,
    optimizerData,
  );
  doc.save(fileName);
}

/** Builds the Fix Plan PDF without saving it, so it can run in the browser or on the server. */
export function buildFixPlanPdf(
  profile: any,
  analysis: any,
  priorityPlan: any,
  explanations: any,
  optimizerData: any,
  options: FixPlanPdfOptions = {},
): { doc: jsPDF; fileName: string } {
  const { timeZone, fonts } = options;
  const doc = new jsPDF("p", "mm", "a4");
  const FONT = fonts ? UNICODE_FONT : "helvetica";
  if (fonts) registerUnicodeFont(doc, fonts);
  else applyRupeeFallback(doc);
  doc.setFont(FONT, "normal");
  const userName =
    profile?.name?.trim() ||
    profile?.fullName?.trim() ||
    profile?.email?.split("@")[0] ||
    "User";
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  const M = 14;
  const UW = W - M * 2;
  let y = 0;

  const newPage = () => {
    doc.addPage();
    y = 20;
    doc.setFillColor(248, 246, 255);
    doc.rect(0, 0, W, 14, "F");
    doc.setFontSize(9);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...PURPLE);
    doc.text("Finkoin Financial Health Report", M, 9);
    doc.setFontSize(8);
    doc.setFont(FONT, "normal");
    doc.setTextColor(...GREY);
    doc.text(`Prepared for: ${userName}`, W - M - 60, 9);
  };

  const addText = (
    text: string,
    fontSize = 10,
    color: readonly [number, number, number] = DARK,
    bold = false,
    indent = 0,
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont(FONT, bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, UW - indent);
    lines.forEach((line: string) => {
      if (y > H - 20) newPage();
      doc.text(line, M + indent, y);
      y += fontSize * 0.45 + 1.5;
    });
    y += 1;
  };

  const addHeading = (
    text: string,
    size = 14,
    color: readonly [number, number, number] = PURPLE,
  ) => {
    if (y > H - 30) newPage();
    y += 4;
    addText(text, size, color, true);
    doc.setDrawColor(...color);
    doc.line(M, y, M + UW, y);
    y += 6;
  };

  const addSmallTable = (
    headers: string[],
    rows: string[][],
    colWidths: number[],
  ) => {
    if (y > H - 30) newPage();
    doc.setFillColor(240, 239, 248);
    doc.rect(M, y - 4, UW, 8, "F");
    doc.setFontSize(9);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...PURPLE);

    let x = M;
    headers.forEach((h, i) => {
      doc.text(h, x + 2, y);
      x += colWidths[i];
    });
    y += 8;

    const lineH = 4.2;
    rows.forEach((row, ri) => {
      doc.setFontSize(9);
      doc.setFont(FONT, "normal");
      const cellLines = row.map((cell, ci) =>
        cell === CHECKBOX_CELL
          ? [cell]
          : (doc.splitTextToSize(
              String(cell ?? ""),
              Math.max(4, colWidths[ci] - 4),
            ) as string[]),
      );
      const lineCount = Math.max(1, ...cellLines.map((l) => l.length));
      const rowH = 7 + (lineCount - 1) * lineH;
      if (y + rowH > H - 14) newPage();
      if (ri % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(M, y - 4, UW, rowH, "F");
      }

      doc.setTextColor(...DARK);
      x = M;
      cellLines.forEach((lines, ci) => {
        if (lines[0] === CHECKBOX_CELL) {
          doc.setDrawColor(...DARK);
          doc.rect(x + 3, y - 3, 3.5, 3.5, "S");
        } else {
          lines.forEach((line, li) => doc.text(line, x + 2, y + li * lineH));
        }
        x += colWidths[ci];
      });
      y += rowH;
    });
    y += 4;
  };

  const fmt = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
  const fmtCr = (n: number) => {
    if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + " crore";
    if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + " lakh";
    return fmt(n);
  };
  const drawPieChart = (
    cx: number,
    cy: number,
    r: number,
    slices: Array<{ value: number; color: [number, number, number] }>,
  ) => {
    const total = Math.max(
      1,
      slices.reduce((s, sl) => s + Math.max(0, sl.value), 0),
    );
    let startAngle = -Math.PI / 2;
    slices.forEach((slice) => {
      const value = Math.max(0, slice.value);
      if (value <= 0) return;
      const sweep = (value / total) * Math.PI * 2;
      const segments = Math.max(6, Math.ceil((sweep * 180) / Math.PI / 4));
      doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);
      for (let i = 0; i < segments; i++) {
        const a1 = startAngle + (sweep * i) / segments;
        const a2 = startAngle + (sweep * (i + 1)) / segments;
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);
        doc.triangle(cx, cy, x1, y1, x2, y2, "F");
      }
      startAngle += sweep;
    });
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, r * 0.45, "F");
  };
  const calcAssets =
    (profile.savingsAccountBalance || 0) +
    (profile.fdValue || 0) +
    (profile.liquidMFValue || 0) +
    (profile.mfValue || 0) +
    (profile.indianStocksValue || 0) +
    (profile.ppfBalance || 0) +
    (profile.npsBalance || 0) +
    (profile.epfBalance || 0) +
    (profile.goldValue || 0) +
    (profile.homeMarketValue || 0) +
    (profile.carMarketValue || 0) +
    (profile.usStocksValueINR || 0) +
    (profile.usMFValueINR || 0) +
    (profile.rsuValueINR || 0);
  const calcLiabilities =
    (profile.homeLoanOutstanding || (profile.homeLoanEMI || 0) * 120) +
    (profile.carLoanOutstanding || (profile.carLoanEMI || 0) * 36) +
    (profile.personalLoanOutstanding || (profile.personalLoanEMI || 0) * 24) +
    (profile.bikeEMI || 0) * 24 +
    (profile.creditCardBillMonthly || 0) * 3;
  const calcNetWorth = calcAssets - calcLiabilities;
  const monthlyIncome =
    (profile?.monthlySalary || 0) +
    (profile?.spouseIncome || 0) +
    (profile?.otherIncome || 0);
  const bucketRowsForSummary = getUniversalBucketRows(profile);
  const totalOutflow = bucketRowsForSummary.reduce(
    (sum, row) => sum + (row.actual || 0),
    0,
  );
  const amountLeftInHand = Math.round(monthlyIncome - totalOutflow);
  const buildPhases = () => {
    const surplus = priorityPlan?.monthlySurplus || 0;
    const debts = priorityPlan?.debts || [];
    const priorities = priorityPlan?.priorities || [];
    const criticals = priorities.filter(
      (p: any) => p.urgency === "critical" && p.status !== "complete",
    );
    return [
      {
        phase: 1,
        title: "Month 1 — Foundation",
        subtitle: "First two weekends",
        tasks: [
          criticals[0]?.actionThisWeek || "Open liquid mutual fund account",
          debts[0]
            ? `Get quotes to close ${debts[0].displayName || humaniseEnum(debts[0].type)}`
            : "Review monthly spending buckets",
          "Set up Parag Parikh or HDFC liquid fund",
        ],
        outcomes: ["Safety baseline created"],
      },
      {
        phase: 2,
        title: "Month 2-3 — Protection",
        subtitle: "Close critical gaps",
        tasks: [
          criticals[1]?.actionThisWeek || "Buy term insurance this month",
          "Check health insurance — upgrade if needed",
          surplus > 5000
            ? `Start SIP ₹${Math.round(surplus * 0.15).toLocaleString("en-IN")}/month`
            : "Build 3-month emergency fund",
        ],
        outcomes: ["Insurance in place", "Debt plan started"],
      },
      {
        phase: 3,
        title: "Month 4-9 — Build Wealth",
        subtitle: "Safety set — now grow",
        tasks: [
          `Increase SIP to ₹${Math.round(surplus * 0.2).toLocaleString("en-IN")}/month`,
          "Emergency fund — top up to target",
          debts.length > 0
            ? `Pay extra ₹${(debts[0].extraEMIRecommended || 0).toLocaleString("en-IN")} on ${debts[0].displayName || humaniseEnum(debts[0].type)}`
            : "Max PPF contribution ₹1.5L/year",
          "Month 6: review spending drift",
        ],
        outcomes: ["SIP running consistently", "Debt reducing monthly"],
      },
      {
        phase: 4,
        title: "Month 10-12 — Year End",
        subtitle: "Consolidate and upgrade",
        tasks: [
          "80C tax saving — check balance used",
          "Increase SIP by 10-15% if salary grew",
          "Re-analyse on Finkoin — update numbers",
          "Review insurance cover — increase if needed",
        ],
        outcomes: ["Year 1 complete", "Year 2 plan ready"],
      },
    ];
  };

  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, W, 45, "F");
  doc.setFontSize(22);
  doc.setFont(FONT, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("FINKOIN · Personal Financial Fix Plan", M, 20);
  doc.setFontSize(11);
  doc.setFont(FONT, "normal");
  doc.setTextColor(175, 169, 236);
  doc.text(
    new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    }),
    M,
    30,
  );
  doc.text(`Prepared for: ${userName}`, M, 38);
  y = 60;

  const score = analysis?.overallScore || 0;
  const scoreColor: readonly [number, number, number] =
    score < 40 ? RED : score < 70 ? AMBER : GREEN;
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(M, y, UW, 28, 3, 3, "F");
  doc.setFontSize(28);
  doc.setFont(FONT, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`${score}/100`, M + 8, y + 18);
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Financial Health Score", M + 50, y + 12);
  const scoreLabel = {
    critical: "Needs urgent attention",
    warning: "On track",
    good: "Doing well",
  }[scoreBand(score)];
  doc.setFontSize(11);
  doc.text(scoreLabel, M + 50, y + 21);
  y += 36;
  const needsPie =
    bucketRowsForSummary.find((b) => b.key === "needs")?.actual || 0;
  const wantsPie =
    bucketRowsForSummary.find((b) => b.key === "wants")?.actual || 0;
  const securityPie =
    bucketRowsForSummary.find((b) => b.key === "security")?.actual || 0;
  const loansPie =
    bucketRowsForSummary.find((b) => b.key === "loans")?.actual || 0;
  const investPie =
    bucketRowsForSummary.find((b) => b.key === "investment")?.actual || 0;
  drawPieChart(M + 22, y + 20, 16, [
    { value: needsPie, color: [83, 74, 183] },
    { value: loansPie, color: [226, 75, 74] },
    { value: wantsPie, color: [186, 117, 23] },
    { value: securityPie, color: [29, 158, 117] },
    { value: investPie, color: [60, 52, 137] },
  ]);
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.setFont(FONT, "bold");
  doc.text("Income split", M + 45, y + 8);
  doc.setFont(FONT, "normal");
  doc.text(`Needs: ${fmt(needsPie)}`, M + 45, y + 14);
  doc.text(`Loans: ${fmt(loansPie)}`, M + 45, y + 20);
  doc.text(`Wants: ${fmt(wantsPie)}`, M + 45, y + 26);
  doc.text(`Security: ${fmt(securityPie)}`, M + 45, y + 32);
  doc.text(`Investment: ${fmt(investPie)}`, M + 45, y + 38);
  y += 46;

  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont(FONT, "normal");
  doc.text(
    [
      `Life stage: ${labelOrDash(LIFE_STAGE_LABELS, profile?.lifeStage)}`,
      `City: ${labelOrDash(CITY_TIER_LABELS, profile?.cityTier)}`,
      `Goal: ${labelOrDash(PRIMARY_GOAL_LABELS, profile?.primaryGoal)}`,
      `Monthly income: ${fmt((profile?.monthlySalary || 0) + (profile?.spouseIncome || 0))}`,
      `Monthly surplus: ${fmt(priorityPlan?.monthlySurplus || 0)}`,
    ],
    M,
    y,
    { lineHeightFactor: 1.8 },
  );
  y += 50;
  if (explanations?.greeting) {
    doc.setFontSize(10);
    doc.setFont(FONT, "italic");
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(`"${explanations.greeting}"`, UW);
    doc.text(lines, M, y);
    y += lines.length * 6 + 4;
  }
  y += 2;
  addSmallTable(
    ["MONTHLY SUMMARY", "Amount"],
    [
      ["Total Income", fmt(monthlyIncome)],
      ["Total Outflow", fmt(totalOutflow)],
      [
        "Left in hand",
        `${fmt(Math.abs(amountLeftInHand))} ${amountLeftInHand >= 0 ? "(available to invest)" : "(overspending)"}`,
      ],
      ["Net Worth", fmt(calcNetWorth)],
    ],
    [120, 60],
  );
  addText("Top 3 actions this week", 11, DARK, true);
  (priorityPlan?.priorities || []).slice(0, 3).forEach((p: any, i: number) => {
    addText(`${i + 1}. ${p.actionThisWeek || p.title}`, 9, GREY);
  });

  newPage();
  addHeading("FINANCIAL SNAPSHOT — CORRECTED NUMBERS");
  addText("Net Worth Summary", 11, DARK, true);
  y += 2;
  addSmallTable(
    ["Item", "Amount"],
    [
      ["Total assets", fmt(calcAssets)],
      ["Total liabilities", fmt(calcLiabilities)],
      ["Net worth", fmt(calcNetWorth)],
    ],
    [100, 80],
  );
  y += 4;
  addText("Monthly Budget Allocation", 11, DARK, true);
  y += 2;
  // Always the engine's five rows: stored analysis buckets can predate the
  // Security bucket and would print caps that total 95%.
  const shortBucketLabel: Record<string, string> = {
    needs: "Needs",
    wants: "Wants",
    security: "Insurance",
    loans: "Loans",
    investment: "Investment",
  };
  const bucketRows = getUniversalBucketRows(profile).map((row) => [
    shortBucketLabel[row.key] ?? row.label,
    formatCapPercent(row.capPercent),
    fmt(row.capAmount),
    fmt(row.actual),
    bucketStatusLabel(row.status),
  ]);
  addSmallTable(
    ["Category", "Cap%", "Cap₹", "Actual₹", "Status"],
    bucketRows,
    [35, 20, 35, 35, 25],
  );

  if (priorityPlan?.surplusBreakdown) {
    y += 2;
    addText("How recommendations are funded", 11, DARK, true);
    addSmallTable(
      ["Item", "Amount"],
      [
        ["Monthly income", fmt(priorityPlan.surplusBreakdown.totalIncome || 0)],
        [
          "Living expenses (needs)",
          `-${fmt(priorityPlan.surplusBreakdown.needsActual || 0)}`,
        ],
        [
          "Loan EMIs",
          `-${fmt(priorityPlan.surplusBreakdown.loansActual || 0)}`,
        ],
        [
          "Insurance premiums",
          `-${fmt(priorityPlan.surplusBreakdown.existingInsurancePremiums || 0)}`,
        ],
        [
          "Lifestyle / wants",
          `-${fmt(priorityPlan.surplusBreakdown.wantsActual || 0)}`,
        ],
        [
          "Surplus available",
          fmt(priorityPlan.surplusBreakdown.netSurplus || 0),
        ],
      ],
      [120, 60],
    );
  }

  newPage();
  addHeading("YOUR MONEY MAP — WHERE EVERY RUPEE GOES");
  addText(
    `This page answers one question: where does the money come from for each recommendation? Every step is funded from your surplus of ${fmt(priorityPlan?.monthlySurplus || 0)}.`,
    9,
    GREY,
  );
  if (priorityPlan?.surplusBreakdown) {
    addSmallTable(
      ["Category", "Amount/Month", "% Income", "Notes"],
      [
        [
          "Monthly income",
          fmt(priorityPlan.surplusBreakdown.totalIncome || 0),
          "100%",
          "Take-home salary + other income",
        ],
        [
          "Less: Living expenses",
          `-${fmt(priorityPlan.surplusBreakdown.needsActual || 0)}`,
          `${Math.round(((priorityPlan.surplusBreakdown.needsActual || 0) / Math.max(priorityPlan.surplusBreakdown.totalIncome || 1, 1)) * 100)}%`,
          "Needs bucket",
        ],
        [
          "Less: Loan EMIs",
          `-${fmt(priorityPlan.surplusBreakdown.loansActual || 0)}`,
          `${Math.round(((priorityPlan.surplusBreakdown.loansActual || 0) / Math.max(priorityPlan.surplusBreakdown.totalIncome || 1, 1)) * 100)}%`,
          "All EMIs (deduped)",
        ],
        [
          "Less: Insurance",
          `-${fmt(priorityPlan.surplusBreakdown.existingInsurancePremiums || 0)}`,
          `${Math.round(((priorityPlan.surplusBreakdown.existingInsurancePremiums || 0) / Math.max(priorityPlan.surplusBreakdown.totalIncome || 1, 1)) * 100)}%`,
          "Protection premiums",
        ],
        [
          "Less: Wants",
          `-${fmt(priorityPlan.surplusBreakdown.wantsActual || 0)}`,
          `${Math.round(((priorityPlan.surplusBreakdown.wantsActual || 0) / Math.max(priorityPlan.surplusBreakdown.totalIncome || 1, 1)) * 100)}%`,
          "Lifestyle bucket",
        ],
        [
          "= Your surplus",
          fmt(priorityPlan.surplusBreakdown.netSurplus || 0),
          `${Math.round(((priorityPlan.surplusBreakdown.netSurplus || 0) / Math.max(priorityPlan.surplusBreakdown.totalIncome || 1, 1)) * 100)}%`,
          "Available for priorities",
        ],
      ],
      [58, 35, 20, 67],
    );
  }
  addText("How your surplus gets deployed", 11, DARK, true);
  addSmallTable(
    ["Step", "Purpose", "Monthly", "When", "Surplus left"],
    (priorityPlan?.priorities || [])
      .slice(0, 4)
      .map((p: any, idx: number) => [
        `Step ${idx + 1}`,
        p.title,
        fmt(p.monthlyContribution || 0),
        idx === 0 ? "Month 1+" : "Month 2+",
        fmt(p.surplusAfterThis || 0),
      ]),
    [20, 70, 28, 25, 37],
  );

  newPage();
  addHeading("PRIORITY STEPS — DETAILED PLAN");
  addText(
    explanations?.overallSummary || "Follow these priorities in order.",
    10,
    GREY,
  );
  y += 4;
  const priorities = priorityPlan?.priorities || [];
  priorities.forEach((p: any, i: number) => {
    if (y > H - 50) newPage();
    const urgencyColor: readonly [number, number, number] =
      p.urgency === "critical" ? RED : p.urgency === "high" ? AMBER : GREEN;
    doc.setFillColor(urgencyColor[0], urgencyColor[1], urgencyColor[2]);
    doc.rect(M, y - 3, 3, 24, "F");
    doc.setFillColor(245, 244, 253);
    doc.rect(M + 3, y - 3, UW - 3, 24, "F");
    doc.setFontSize(12);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...PURPLE);
    doc.text(`${i + 1}. ${p.title}`, M + 6, y + 5);
    doc.setFontSize(9);
    doc.setFont(FONT, "normal");
    doc.setTextColor(...GREY);
    doc.text(
      `Gap: ${fmtCr(p.gap || 0)} · Monthly: ${fmt(p.monthlyContribution || 0)} · ${p.monthsToComplete || 0} months`,
      M + 6,
      y + 13,
    );
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(
      `From surplus ₹${Math.round(priorityPlan?.monthlySurplus || 0).toLocaleString("en-IN")} · left after this step ₹${Math.round(p.surplusAfterThis || 0).toLocaleString("en-IN")}`,
      M + 6,
      y + 18,
    );
    y += 26;
    if (p.instrument) {
      doc.setFontSize(9);
      doc.setFont(FONT, "bold");
      doc.setTextColor(...DARK);
      doc.text("Where: ", M + 6, y);
      doc.setFont(FONT, "normal");
      const whereLines = doc.splitTextToSize(
        String(p.instrument),
        UW - 22,
      ) as string[];
      whereLines.forEach((line, li) => doc.text(line, M + 22, y + li * 5));
      y += whereLines.length * 5 + 1;
    }
    const explanation = isPriorityComplete(p)
      ? COMPLETE_WHY
      : explanations?.priorityExplanations?.[p.id];
    if (explanation) {
      doc.setFontSize(9);
      doc.setFont(FONT, "italic");
      doc.setTextColor(...GREY);
      const lines = doc.splitTextToSize(explanation, UW - 6) as string[];
      lines.forEach((line) => {
        if (y > H - 16) newPage();
        doc.text(line, M + 6, y);
        y += 5;
      });
    }
    if (p.actionThisWeek) {
      doc.setFontSize(9);
      doc.setFont(FONT, "normal");
      const weekLines = doc.splitTextToSize(
        String(p.actionThisWeek),
        UW - 28,
      ) as string[];
      const boxH = 10 + (weekLines.length - 1) * 4.5;
      if (y + boxH > H - 14) newPage();
      doc.setFillColor(235, 248, 243);
      doc.rect(M, y, UW, boxH, "F");
      doc.setFont(FONT, "bold");
      doc.setTextColor(...GREEN);
      doc.text("This week: ", M + 3, y + 6);
      doc.setFont(FONT, "normal");
      doc.setTextColor(8, 80, 65);
      weekLines.forEach((line, li) => doc.text(line, M + 25, y + 6 + li * 4.5));
      y += boxH + 4;
    }
    y += 4;
  });

  const debts = priorityPlan?.debts || [];
  if (debts.length > 0) {
    newPage();
    addHeading("DEBT CLEARANCE — STEP-BY-STEP STRATEGY");
    if (explanations?.debtStrategy) {
      addText(explanations.debtStrategy, 10, GREY);
      y += 4;
    }
    addSmallTable(
      ["Debt", "Rate", "EMI", "Extra/mo", "Payoff date", "Rank"],
      debts.map((d: any) => {
        const { monthsNow } = debtPayoffNumbers(d);
        return [
          d.displayName || humaniseEnum(d.type),
          `${d.rate}%`,
          fmt(d.emi),
          fmt(d.extraEMIRecommended),
          monthsNow > 0
            ? new Date(
                new Date().getFullYear(),
                new Date().getMonth() + monthsNow,
                1,
              ).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })
            : "—",
          String(d.priorityRank),
        ];
      }),
      [44, 18, 30, 30, 34, 16],
    );
    const totalInterestSaved = debts.reduce(
      (sum: number, d: any) => sum + debtPayoffNumbers(d).interestSaved,
      0,
    );
    if (totalInterestSaved > 0) {
      addText(
        `Interest saved by paying the recommended extra each month: ${fmt(totalInterestSaved)}`,
        9,
        GREEN,
        true,
      );
    }
  }

  newPage();
  addHeading("12-MONTH ACTION PLAN");
  if (
    Array.isArray(optimizerData?.keySnapshot) &&
    optimizerData.keySnapshot.length > 0
  ) {
    addText("Your numbers at a glance:", 11, DARK, true);
    y += 2;
    optimizerData.keySnapshot.forEach((line: string) => {
      if (y > H - 14) newPage();
      addText(line, 9, GREY);
      y += 5;
    });
    y += 6;
  }
  const phases =
    Array.isArray(optimizerData?.phases) && optimizerData.phases.length > 0
      ? optimizerData.phases
      : buildPhases();
  phases.forEach((phase: any) => {
    if (y > H - 60) newPage();
    const phaseColor: readonly [number, number, number] =
      Array.isArray(phase.color) && phase.color.length === 3
        ? [
            Number(phase.color[0]) || PURPLE[0],
            Number(phase.color[1]) || PURPLE[1],
            Number(phase.color[2]) || PURPLE[2],
          ]
        : PURPLE;
    doc.setFillColor(phaseColor[0], phaseColor[1], phaseColor[2]);
    doc.rect(M, y, UW, 14, "F");
    doc.setFontSize(12);
    doc.setFont(FONT, "bold");
    doc.setTextColor(255, 255, 255);
    const phaseTitle = /^phase\s/i.test(String(phase.title || ""))
      ? String(phase.title)
      : `PHASE ${phase.phase}: ${phase.title}`;
    doc.text(fitSingleLine(doc, phaseTitle, UW - 8), M + 4, y + 9);
    y += 19;
    if (phase.subtitle) {
      doc.setFontSize(9);
      doc.setFont(FONT, "italic");
      doc.setTextColor(...GREY);
      const subLines = doc.splitTextToSize(
        String(phase.subtitle),
        UW - 4,
      ) as string[];
      subLines.forEach((line, li) => doc.text(line, M + 2, y + li * 4.5));
      y += subLines.length * 4.5 + 3.5;
    }
    phase.tasks?.forEach((task: string) => {
      if (y > H - 20) newPage();
      doc.setFontSize(9);
      doc.setFont(FONT, "normal");
      doc.setTextColor(...DARK);
      doc.rect(M + 2, y - 3, 4, 4, "S");
      doc.text(doc.splitTextToSize(task, UW - 12), M + 10, y);
      y += doc.splitTextToSize(task, UW - 12).length * 5 + 2;
    });
    y += 4;
    if (phase.outcomes?.length > 0) {
      doc.setFontSize(8);
      doc.setFont(FONT, "normal");
      const outcomeLines = (phase.outcomes as string[]).map(
        (o) => doc.splitTextToSize(String(o), UW - 11) as string[],
      );
      const totalLines = outcomeLines.reduce((n, l) => n + l.length, 0);
      const outH = totalLines * 4 + phase.outcomes.length * 2 + 8;
      if (y + outH > H - 14) newPage();
      doc.setFillColor(245, 250, 247);
      doc.rect(M, y, UW, outH, "F");
      doc.setFont(FONT, "bold");
      doc.setTextColor(...GREEN);
      doc.text("BY END OF THIS PHASE:", M + 3, y + 6);
      doc.setFont(FONT, "normal");
      let oy = y + 12;
      outcomeLines.forEach((lines) => {
        drawCheckMark(doc, M + 3, oy, GREEN);
        lines.forEach((line, li) => doc.text(line, M + 7.5, oy + li * 4));
        oy += lines.length * 4 + 2;
      });
      y += outH + 8;
    }
  });

  newPage();
  addHeading("GOALS & SCORE PROJECTION");
  const pdfGoals: any[] = priorityPlan?.goals ?? [];
  if (pdfGoals.length > 0) {
    addSmallTable(
      ["Goal", "Target", "Monthly", "Needed", "Timeline"],
      pdfGoals.map((g) => [
        g.label ?? labelOrDash(PRIMARY_GOAL_LABELS, g.goalType),
        fmt(g.targetAmount),
        fmt(g.monthlyAllocated ?? g.monthlyRequired),
        fmt(g.monthlyRequired),
        `${g.yearsToGoal}y`,
      ]),
      [45, 35, 30, 30, 35],
    );
    for (const g of pdfGoals) {
      const slices: any[] = g.allocation?.slices ?? [];
      addText(
        `${g.label ?? g.goalType}: ${
          slices.length
            ? slices
                .map((s) => `${s.label} ${fmt(s.monthly)}/mo (${s.pct}%)`)
                .join(", ")
            : g.instrument || "—"
        }`,
        9,
        DARK,
      );
    }
    if (pdfGoals.some((g) => g.allocation?.riskAssumed)) {
      addText(
        "Splits assume a moderate risk profile where the risk questions were skipped.",
        8,
        GREY,
      );
    }
  } else {
    addText("No goal data available.", 10, GREY);
  }

  if (profile && priorityPlan) {
    const trajectory = projectNetWorth(profile, priorityPlan);
    y += 4;
    addText("Net worth projection (today's rupees)", 11, DARK, true);
    addSmallTable(
      ["When", "Age", "Assets", "Loans", "Net worth"],
      trajectory.points.map((p) => [
        p.year === 0 ? "Today" : `In ${p.year} years`,
        p.age != null ? String(p.age) : "—",
        formatLakhCrore(p.assets),
        formatLakhCrore(p.liabilities),
        formatLakhCrore(p.netWorth),
      ]),
      [35, 20, 40, 40, 40],
    );
    addText(
      `Includes EPF/PPF/NPS compounding, current SIPs, this plan's goal SIPs and loans paying down.${
        trajectory.spentGoals.length
          ? ` Goal money is used when due: ${trajectory.spentGoals
              .map((g) => `${g.label} (year ${g.year})`)
              .join(", ")}.`
          : ""
      } Assumes 12% equity, 6% FDs/cash, 8% gold, 6% inflation. Projections, not guarantees.`,
      8,
      GREY,
    );
  }

  newPage();
  addHeading("YOUR 12-MONTH CHECKLIST");
  const checklistRows: string[][] = [];
  (priorityPlan?.priorities || [])
    .slice(0, 6)
    .forEach((p: any, idx: number) => {
      checklistRows.push([
        String(idx + 1),
        idx === 0 ? "Month 1, Week 1" : `Month ${Math.min(12, idx + 1)}`,
        p.actionThisWeek || p.title,
        CHECKBOX_CELL,
      ]);
    });
  if (checklistRows.length > 0) {
    addSmallTable(
      ["#", "When", "Action", "Done?"],
      checklistRows,
      [10, 32, 128, 10],
    );
  } else {
    addText("Checklist will populate after generating priorities.", 10, GREY);
  }

  newPage();
  addHeading("Monthly Allocation");
  if (
    priorityPlan?.allocationPlan?.length > 0 ||
    priorityPlan?.debts?.length > 0 ||
    priorityPlan?.priorities?.length > 0
  ) {
    const chartItems = [
      ...(priorityPlan?.debts?.slice(0, 1).map((d: any) => ({
        label: "Debt repayment",
        value: d.emi || 0,
        color: "#E24B4A",
      })) || []),
      ...(priorityPlan?.priorities
        ?.filter((p: any) => p.monthlyContribution > 0)
        .slice(0, 4)
        .map((p: any, i: number) => ({
          label: String(p.title || ""),
          value: p.monthlyContribution,
          color: ["#534AB7", "#1D9E75", "#BA7517", "#6366F1"][i % 4],
        })) || []),
    ].filter((item) => item.value > 0);
    if (chartItems.length > 0) {
      addText("Monthly surplus allocation", 11, DARK, true);
      y += 2;
      const maxVal = Math.max(...chartItems.map((c) => c.value), 1);
      chartItems.forEach((item) => {
        if (y > H - 20) newPage();
        const r = parseInt(item.color.slice(1, 3), 16);
        const g = parseInt(item.color.slice(3, 5), 16);
        const b = parseInt(item.color.slice(5, 7), 16);
        doc.setFontSize(9);
        doc.setFont(FONT, "normal");
        doc.setTextColor(...DARK);
        doc.text(fitSingleLine(doc, item.label, 54), M, y + 1);
        const barW = (item.value / maxVal) * 95;
        doc.setFillColor(r, g, b);
        doc.rect(M + 58, y - 4, barW, 7, "F");
        doc.setTextColor(...DARK);
        doc.text(fmt(item.value), M + 158, y + 1);
        y += 10;
      });
      y += 4;
    }
  }
  if (priorityPlan?.allocationPlan?.length > 0) {
    addSmallTable(
      ["#", "Category", "Amount", "Where", "Why"],
      priorityPlan.allocationPlan.map((a: any, i: number) => [
        String(i + 1),
        a.category,
        fmt(a.amount),
        a.where || "—",
        a.why || "—",
      ]),
      [8, 45, 25, 45, 55],
    );
  }

  newPage();
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, W, 20, "F");
  doc.setFontSize(14);
  doc.setFont(FONT, "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Finkoin", M, 13);
  y = 35;
  addHeading(NO_CONFLICT_TITLE, 13, DARK);
  addText(NO_CONFLICT_BODY, 10, DARK);
  y += 6;
  addHeading("Important Disclaimer", 13, RED);
  addText(
    explanations?.disclaimer ||
      "This report is for educational purposes only and does not constitute SEBI registered investment advice. Please consult a qualified advisor before making investment decisions.",
    10,
    DARK,
  );
  y += 8;
  addText(
    "Finkoin is not a registered investment advisor, broker, or financial institution. Recommendations are algorithmic and educational.",
    9,
    GREY,
  );
  y += 8;
  addText(
    `Generated on ${new Date().toLocaleDateString("en-IN", { timeZone, day: "numeric", month: "long", year: "numeric" })} · finkoin.com`,
    9,
    GREY,
  );

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`finkoin.com · Page ${i} of ${totalPages}`, W - M, H - 8, {
      align: "right",
    });
    doc.text("Educational only. Not SEBI advice.", M, H - 8);
  }

  const safeUser =
    userName
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "User";
  const fileName = `Finkoin-Report-${safeUser}-${isoDateInZone(timeZone)}.pdf`;
  return { doc, fileName };
}
