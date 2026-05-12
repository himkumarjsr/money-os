import { buildPriorityPlan } from "@/lib/priorityEngine";
import { formatForPrompt, retrieveKnowledge } from "@/lib/rag/retriever";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const FINKOIN_SYSTEM = `You are Finkoin AI.
You are a personal financial advisor for India.
CRITICAL RULES:
1. Code engine has calculated ALL numbers.
2. Follow priority order exactly.
3. Use only retrieved knowledge for rates.
4. Never state or imply that Finkoin sells insurance or that users must buy insurance through Finkoin — guidance is educational only; purchasing is through licensed insurers or advisors the user chooses.
5. Return valid JSON only.`;

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY;
  let priorityPlan: any = null;
  if (!groqKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  try {
    const { profile, analysis } = await req.json();
    if (!profile || !analysis) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    priorityPlan = buildPriorityPlan(profile, analysis);
    const knowledgeChunks = await retrieveKnowledge(profile, analysis, 10);
    const knowledgeContext = formatForPrompt(knowledgeChunks);
    const groq = new Groq({ apiKey: groqKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      max_tokens: 3000,
      temperature: 0.25,
      messages: [
        { role: "system", content: FINKOIN_SYSTEM },
        {
          role: "user",
          content: `
${knowledgeContext}

CALCULATED PRIORITY PLAN (use these numbers):
${JSON.stringify(priorityPlan, null, 2)}

Return ONLY JSON:
{
  "greeting": "",
  "overallSummary": "",
  "priorityExplanations": {},
  "debtStrategy": "",
  "goalAdvice": "",
  "thisWeekAction": "",
  "in12Months": "",
  "encouragement": "",
  "disclaimer": "Educational only. Not SEBI registered investment advice."
}
`,
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
      const fallbackExplanations = {
        greeting: `Based on your financial profile, we have identified ${priorityPlan.priorities.filter((p: any) => p.status !== "complete").length} areas that need attention.`,
        overallSummary: "Your financial health score reflects your current safety net coverage. Focus on the priorities below in order.",
        priorityExplanations: Object.fromEntries(
          priorityPlan.priorities.map((p: any) => [
            p.id, p.whyThisMatters || p.actionThisWeek,
          ]),
        ),
        debtStrategy: priorityPlan.debts.length > 0
          ? "Clear debts in priority order starting with highest interest rate first."
          : "No consumer debt detected — great position.",
        goalAdvice: "Work through the priority items above before focusing heavily on goals.",
        thisWeekAction: priorityPlan.topAction,
        in12Months: `Following this plan your score could improve from ${priorityPlan.scoreToday} to ${priorityPlan.scoreAfter12Months}.`,
        encouragement: "Every step you take toward financial security compounds over time.",
        disclaimer: "Educational guidance only. Not SEBI registered investment advice.",
      };

      return NextResponse.json({
        priorityPlan,
        explanations: fallbackExplanations,
        knowledgeUsed: [],
        isFallback: true,
      });
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }
}
