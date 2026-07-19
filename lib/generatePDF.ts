import jsPDF from "jspdf";
import { localISODate } from "@/lib/localDate";
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

export async function downloadOptimizerPDF(
  profile: any,
  analysis: any,
  priorityPlan: any,
  explanations: any,
  optimizerData: any,
) {
  const doc = new jsPDF("p", "mm", "a4");
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

  const addPageNumber = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`Finkoin · finkoin.com · Page ${pageNum}`, M, H - 8);
    doc.text("Educational only. Not SEBI advice.", W - M - 60, H - 8);
  };

  const newPage = () => {
    doc.addPage();
    y = 20;
    doc.setFillColor(248, 246, 255);
    doc.rect(0, 0, W, 14, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE);
    doc.text("Finkoin Financial Health Report", M, 9);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GREY);
    doc.text(`Prepared for: ${userName}`, W - M - 60, 9);
    addPageNumber();
  };

  const addText = (
    text: string,
    fontSize = 10,
    color: readonly [number, number, number] = DARK,
    bold = false,
    indent = 0,
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
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
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE);

    let x = M;
    headers.forEach((h, i) => {
      doc.text(h, x + 2, y);
      x += colWidths[i];
    });
    y += 8;

    rows.forEach((row, ri) => {
      if (y > H - 20) newPage();
      if (ri % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(M, y - 4, UW, 7, "F");
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      x = M;
      row.forEach((cell, ci) => {
        doc.text(String(cell).slice(0, 30), x + 2, y);
        x += colWidths[ci];
      });
      y += 7;
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
            ? `Get quotes to close ${debts[0].type}`
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
            ? `Pay extra ₹${(debts[0].extraEMIRecommended || 0).toLocaleString("en-IN")} on ${debts[0].type}`
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
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("FINKOIN · Personal Financial Fix Plan", M, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(175, 169, 236);
  doc.text(
    new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
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
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`${score}/100`, M + 8, y + 18);
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Financial Health Score", M + 50, y + 12);
  const scoreLabel =
    score < 40
      ? "Needs urgent attention"
      : score < 70
        ? "On track"
        : "Doing well";
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
  doc.text("Income split", M + 45, y + 8);
  doc.text(`Needs: ${fmt(needsPie)}`, M + 45, y + 14);
  doc.text(`Loans: ${fmt(loansPie)}`, M + 45, y + 20);
  doc.text(`Wants: ${fmt(wantsPie)}`, M + 45, y + 26);
  doc.text(`Security: ${fmt(securityPie)}`, M + 45, y + 32);
  doc.text(`Investment: ${fmt(investPie)}`, M + 45, y + 38);
  y += 46;

  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.text(
    [
      `Life stage: ${profile?.lifeStage || "—"}`,
      `City: ${profile?.cityTier || "—"}`,
      `Goal: ${profile?.primaryGoal || "—"}`,
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
    doc.setFont("helvetica", "italic");
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
  addPageNumber();

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
  const buckets = analysis?.universalBuckets || analysis?.buckets || null;
  if (buckets && Object.keys(buckets).length > 0) {
    const bucketRows = Object.entries(buckets).map(([key, bucket]: any) => [
      key.charAt(0).toUpperCase() + key.slice(1),
      `${bucket.capPercent ?? bucket.capPct ?? 0}%`,
      fmt(bucket.capAmount ?? bucket.cap ?? 0),
      fmt(bucket.actual ?? bucket.actualAmount ?? 0),
      bucket.status || "—",
    ]);
    addSmallTable(
      ["Category", "Cap%", "Cap₹", "Actual₹", "Status"],
      bucketRows,
      [35, 20, 35, 35, 25],
    );
  } else {
    const fallbackBuckets = getUniversalBucketRows(profile).map((row) => [
      row.label,
      `${Math.round(row.capPercent * 100)}%`,
      fmt(row.capAmount),
      fmt(row.actual),
      row.status,
    ]);
    addSmallTable(
      ["Category", "Cap%", "Cap₹", "Actual₹", "Status"],
      fallbackBuckets,
      [35, 20, 35, 35, 25],
    );
  }

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
    doc.rect(M, y - 3, 3, 20, "F");
    doc.setFillColor(245, 244, 253);
    doc.rect(M + 3, y - 3, UW - 3, 20, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE);
    doc.text(`${i + 1}. ${p.title}`, M + 6, y + 5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
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
    y += 24;
    if (p.instrument) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text("Where: ", M + 6, y);
      doc.setFont("helvetica", "normal");
      doc.text(p.instrument, M + 22, y);
      y += 6;
    }
    const explanation = explanations?.priorityExplanations?.[p.id];
    if (explanation) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...GREY);
      const lines = doc.splitTextToSize(explanation, UW - 6);
      lines.slice(0, 3).forEach((line: string) => {
        doc.text(line, M + 6, y);
        y += 5;
      });
    }
    if (p.actionThisWeek) {
      doc.setFillColor(235, 248, 243);
      doc.rect(M, y, UW, 10, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN);
      doc.text("This week: ", M + 3, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(8, 80, 65);
      doc.text(
        doc.splitTextToSize(p.actionThisWeek, UW - 30)[0],
        M + 25,
        y + 6,
      );
      y += 14;
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
      debts.map((d: any) => [
        d.displayName || d.type,
        `${d.rate}%`,
        fmt(d.emi),
        fmt(d.extraEMIRecommended),
        d.monthsToClearWithExtra > 0
          ? new Date(
              new Date().getFullYear(),
              new Date().getMonth() + Number(d.monthsToClearWithExtra),
              1,
            ).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
          : "—",
        String(d.priorityRank),
      ]),
      [35, 15, 25, 25, 20, 15],
    );
    const totalInterestSavedEstimate = debts.reduce(
      (sum: number, d: any) =>
        sum +
        Math.max(
          0,
          Number(d.extraEMIRecommended || 0) *
            Math.max(0, Number(d.monthsToClearWithExtra || 0)) *
            0.35,
        ),
      0,
    );
    addText(
      `Estimated interest saved by debt priority order: ${fmt(totalInterestSavedEstimate)}`,
      9,
      GREEN,
      true,
    );
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
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`PHASE ${phase.phase}: ${phase.title}`, M + 4, y + 9);
    y += 16;
    if (phase.subtitle) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...GREY);
      doc.text(phase.subtitle, M + 2, y);
      y += 8;
    }
    phase.tasks?.forEach((task: string) => {
      if (y > H - 20) newPage();
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.rect(M + 2, y - 3, 4, 4, "S");
      doc.text(doc.splitTextToSize(task, UW - 12), M + 10, y);
      y += doc.splitTextToSize(task, UW - 12).length * 5 + 2;
    });
    y += 4;
    if (phase.outcomes?.length > 0) {
      doc.setFillColor(245, 250, 247);
      const outH = phase.outcomes.length * 6 + 8;
      doc.rect(M, y, UW, outH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN);
      doc.text("BY END OF THIS PHASE:", M + 3, y + 6);
      phase.outcomes.forEach((outcome: string, i: number) => {
        doc.setFont("helvetica", "normal");
        doc.text(`✓ ${outcome}`, M + 3, y + 12 + i * 6);
      });
      y += outH + 8;
    }
  });

  newPage();
  addHeading("GOALS & SCORE PROJECTION");
  const firstGoal = priorityPlan?.goals?.[0];
  if (firstGoal) {
    addSmallTable(
      ["Goal", "Target", "Saved", "Monthly needed", "Timeline"],
      [
        [
          firstGoal.goalType,
          fmt(firstGoal.targetAmount),
          fmt(firstGoal.currentSaved),
          fmt(firstGoal.monthlyRequired),
          `${firstGoal.yearsToGoal}y`,
        ],
      ],
      [35, 35, 35, 40, 30],
    );
    addText(`Instrument: ${firstGoal.instrument || "—"}`, 10, DARK);
  } else {
    addText("No goal data available.", 10, GREY);
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
        "□",
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
          label: p.title.slice(0, 20),
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
        doc.setTextColor(...DARK);
        doc.text(item.label, M, y + 1);
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
        a.where?.slice(0, 20) || "—",
        a.why?.slice(0, 25) || "—",
      ]),
      [8, 45, 25, 45, 55],
    );
  }

  newPage();
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, W, 20, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Finkoin", M, 13);
  y = 35;
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
    `Generated on ${new Date().toLocaleDateString("en-IN")} · finkoin.com`,
    9,
    GREY,
  );

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`finkoin.com · Page ${i} of ${totalPages}`, W - M - 35, H - 8);
    doc.text("Educational only. Not SEBI advice.", M, H - 8);
  }

  const safeUser =
    userName
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "User";
  const fileName = `Finkoin-Report-${safeUser}-${localISODate()}.pdf`;
  doc.save(fileName);
}
