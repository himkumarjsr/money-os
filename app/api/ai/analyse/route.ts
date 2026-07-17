import { buildPriorityPlan } from "@/lib/priorityEngine";
import { formatForPrompt, retrieveKnowledge } from "@/lib/rag/retriever";
import {
  getAuthedUser,
  rateLimit,
  tooManyRequests,
  unauthorized,
} from "@/lib/apiGuard";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const FINKOIN_SYSTEM = `You are Finkoin AI, a personal financial advisor for India.

CRITICAL RULES:
1. The code engine has calculated ALL numbers. Use them exactly.
2. Follow priority order exactly as given in the priority plan.
3. Use only retrieved knowledge for interest rates and benchmarks.
4. Never state or imply that Finkoin sells insurance. Guidance is educational only.
5. Return valid JSON only. No markdown. No explanation outside JSON.
6. EVERY field in your response MUST reference specific rupee amounts from the priorityPlan JSON. Never write generic advice.
7. debtStrategy MUST include: exact outstanding amount, exact interest rate, exact extra payment recommended, exact months to payoff, exact interest saved.
8. overallSummary MUST mention the user's actual monthly surplus, actual score, and top 2 specific issues with rupee amounts.
9. thisWeekAction MUST be one specific action with an exact rupee amount or exact step.
10. in12Months MUST describe the user's specific financial state in 12 months using their actual numbers.`;

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  let priorityPlan: any = null;
  let analysis: any = null;
  if (!groqKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  // Auth: this route triggers a paid third-party (Groq) call — require a
  // logged-in user and cap how often each user can invoke it.
  const user = await getAuthedUser();
  if (!user) {
    return unauthorized();
  }
  const limit = rateLimit(`ai-analyse:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter);
  }

  try {
    const { profile, analysis: analysisBody } = await req.json();
    analysis = analysisBody;
    if (!profile || !analysis) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    priorityPlan = buildPriorityPlan(profile, analysis);
    const knowledgeChunks = await retrieveKnowledge(profile, analysis, 10);
    const knowledgeContext = formatForPrompt(knowledgeChunks);
    const groq = new Groq({ apiKey: groqKey });

    const monthlySurplus =
      priorityPlan?.monthlySurplus ||
      priorityPlan?.surplusBreakdown?.netSurplus ||
      0;
    const topIssue = priorityPlan?.priorities?.[0];
    const debtItems = priorityPlan?.debts || [];
    const hasDebt = debtItems.length > 0;
    const healthScore = analysis?.overallScore ?? priorityPlan?.scoreToday ?? 0;
    const monthlyPlanRows = priorityPlan?.monthlyPlan || [];
    const firstMonth = monthlyPlanRows[0];
    const totalAllocated = firstMonth
      ? (firstMonth.emergency || 0) +
        (firstMonth.medical || 0) +
        (firstMonth.termYearly || 0) +
        (firstMonth.sip || 0) +
        (firstMonth.extraDebt || 0)
      : monthlyPlanRows.reduce((sum: number, row: any) => {
          return (
            sum +
            (row.emergency || 0) +
            (row.medical || 0) +
            (row.termYearly || 0) +
            (row.sip || 0) +
            (row.extraDebt || 0)
          );
        }, 0) / Math.max(monthlyPlanRows.length, 1);

    const debtContext = hasDebt
      ? debtItems
          .map(
            (d: any) =>
              `${d.displayName || d.type}: ₹${(d.outstanding || 0).toLocaleString("en-IN")} at ${d.rate || 0}% — EMI ₹${(d.emi || 0).toLocaleString("en-IN")}/month — extra EMI recommended ₹${(d.extraEMIRecommended || 0).toLocaleString("en-IN")} — ~${d.monthsToClearWithExtra || 0} months to clear with extra`,
          )
          .join("\n")
      : "No loans";

    const userMessage = `${knowledgeContext}

CALCULATED PRIORITY PLAN (use ALL numbers below in your response):
${JSON.stringify(priorityPlan, null, 2)}

KEY NUMBERS TO USE IN EVERY FIELD:
- Monthly surplus available: ₹${monthlySurplus.toLocaleString("en-IN")}
- Health score: ${healthScore}/100 (from analysis; scoreToday in plan is ${priorityPlan?.scoreToday ?? 0})
- Top priority: ${topIssue?.title || "none"}
- Debt situation:
${debtContext}
- Monthly plan row-1 allocation (emergency+medical+term+SIP+extra debt): ₹${Math.round(totalAllocated).toLocaleString("en-IN")}

RESPONSE REQUIREMENTS:
- debtStrategy: Must state exact outstanding, rate, current EMI, recommended extra payment, months to payoff, interest saved. If no debt say so specifically.
- overallSummary: Must mention ₹${monthlySurplus.toLocaleString("en-IN")} surplus and score ${healthScore}/100
- thisWeekAction: Single specific action with exact amount
- in12Months: Describe their exact financial state using actual numbers

Return ONLY this JSON structure (priorityExplanations keys MUST match each item's \`id\` from priorities[], e.g. "emergency_fund"):
{
  "greeting": "Personalised greeting using their score and top issue",
  "overallSummary": "2-3 sentences with their actual surplus, score, top 2 issues with rupee amounts",
  "priorityExplanations": {
    "<priority_id>": "Explanation with exact amounts from that priority row"
  },
  "debtStrategy": "Exact debt payoff plan with all numbers: outstanding, rate, EMI, extra payment, months, interest saved",
  "goalAdvice": "Specific advice based on their primary goal with amounts and timeline",
  "thisWeekAction": "One specific action with exact rupee amount or step",
  "in12Months": "Their specific financial state in 12 months with actual numbers",
  "encouragement": "Personalised encouragement referencing their actual situation",
  "disclaimer": "Educational only. Not SEBI registered investment advice."
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      max_tokens: 3000,
      temperature: 0.25,
      messages: [
        { role: "system", content: FINKOIN_SYSTEM },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("No JSON in model response");
    }

    const explanations = JSON.parse(raw.slice(start, end + 1));
    return NextResponse.json({
      priorityPlan,
      explanations,
      knowledgeUsed: knowledgeChunks.map((c) => c.title),
    });
  } catch (error: any) {
    console.error("AI route error:", error.message);

    // Return fallback using code engine data
    // User still gets a plan — just without
    // AI's personalised explanations
    if (priorityPlan) {
      const surplus = Math.round(
        priorityPlan.monthlySurplus ||
          priorityPlan.surplusBreakdown?.netSurplus ||
          0,
      );
      const score = analysis?.overallScore ?? priorityPlan.scoreToday ?? 0;
      const top2 = (priorityPlan.priorities || [])
        .filter((p: any) => p.status !== "complete" && Number(p.gap || 0) > 0)
        .slice(0, 2);
      const issueLine = top2
        .map(
          (p: any) =>
            `${p.title}: gap ₹${Number(p.gap || 0).toLocaleString("en-IN")}, allocate ₹${Number(p.monthlyContribution || 0).toLocaleString("en-IN")}/mo`,
        )
        .join("; ");
      const debtLines =
        priorityPlan.debts.length > 0
          ? priorityPlan.debts
              .map(
                (d: any) =>
                  `${d.displayName || d.type}: outstanding ₹${Number(d.outstanding || 0).toLocaleString("en-IN")} at ${d.rate}% — EMI ₹${Number(d.emi || 0).toLocaleString("en-IN")}/mo — add ₹${Number(d.extraEMIRecommended || 0).toLocaleString("en-IN")}/mo extra — clear in ~${d.monthsToClearWithExtra || 0} months (interest saved vs minimum payments estimated from engine order).`,
              )
              .join(" ")
          : "No loans in the plan — no extra EMI or interest-save timeline applies.";
      const fallbackExplanations = {
        greeting: `Based on your financial profile, we have identified ${priorityPlan.priorities.filter((p: any) => p.status !== "complete").length} areas that need attention.`,
        overallSummary: `Monthly surplus about ₹${surplus.toLocaleString("en-IN")} and score ${score}/100. ${issueLine || "Core buckets look funded — keep monitoring."}`,
        priorityExplanations: Object.fromEntries(
          priorityPlan.priorities.map((p: any) => [
            p.id,
            `${p.whyThisMatters || p.actionThisWeek} (gap ₹${Number(p.gap || 0).toLocaleString("en-IN")}, ₹${Number(p.monthlyContribution || 0).toLocaleString("en-IN")}/mo from surplus)`,
          ]),
        ),
        debtStrategy: debtLines,
        goalAdvice: priorityPlan.goals?.[0]
          ? `${priorityPlan.goals[0].goalType}: target ₹${Number(priorityPlan.goals[0].targetAmount || 0).toLocaleString("en-IN")}, saved ₹${Number(priorityPlan.goals[0].currentSaved || 0).toLocaleString("en-IN")}, allocate ~₹${Number(priorityPlan.goals[0].monthlyRequired || 0).toLocaleString("en-IN")}/mo over ~${priorityPlan.goals[0].yearsToGoal}y`
          : "Work through the priority items above before focusing heavily on goals.",
        thisWeekAction: priorityPlan.topAction,
        in12Months: `Following this plan your score could improve from ${priorityPlan.scoreToday} to ${priorityPlan.scoreAfter12Months} (with ~₹${surplus.toLocaleString("en-IN")}/mo deployable surplus in the model).`,
        encouragement:
          "Every step you take toward financial security compounds over time.",
        disclaimer:
          "Educational guidance only. Not SEBI registered investment advice.",
      };

      return NextResponse.json({
        priorityPlan,
        explanations: fallbackExplanations,
        knowledgeUsed: [],
        isFallback: true,
      });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
