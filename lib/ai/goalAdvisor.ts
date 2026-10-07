/**
 * Per-goal reasoning (server only). The engine has already computed every
 * number per goal; this fans out one focused RAG + LLM call per funded goal,
 * each grounded in that goal type's own reference notes, then the route
 * assembles the results. Each call gets only that goal's numbers plus age,
 * life stage, risk profile (and the child's age for child goals) — never
 * salary, loans or the full profile.
 */
import type Groq from "groq-sdk";
import type { GoalAdvice } from "@/lib/fixPlanMerge";
import type { GoalType } from "@/lib/goalDetection";
import type { GoalItem } from "@/lib/priorityEngine";
import { retrieveGoalKnowledge } from "@/lib/rag/retriever";

/** Upper bound on per-goal calls per report (cost + latency). */
export const GOAL_ADVISOR_MAX_GOALS = 6;
const CALL_TIMEOUT_MS = 15_000;
const FIELD_MAX_CHARS = 400;

const SYSTEM = `You are Finkoin AI explaining ONE financial goal for a user in India.
RULES:
1. The engine computed every number. Use them exactly; never invent numbers, returns or rates.
2. Use only the reference notes for facts, tax rules and instrument behaviour.
2a. The engine also fixed the instrument split (goal.instrumentSplit). Explain it as given; never change, add or drop an instrument or percentage.
3. Finkoin does not sell any product. Never name a specific fund house, insurer, bank or scheme brand; talk in instrument categories.
4. Educational guidance only, not SEBI-registered investment advice.
5. Return JSON only: {"why": string, "instrumentRationale": string, "watchOut": string}.
6. Each field: 1-2 sentences, at most 45 words, and include at least one exact rupee amount or year from the goal data.`;

export type GoalAdvisorProfile = {
  selfAge?: number;
  lifeStage?: string;
  riskTolerance?: string;
  kidsAges?: Array<number | null | undefined>;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** The goals that get their own call: funded by the split, capped. */
export function goalsForAdvice(goals: GoalItem[] | undefined): GoalItem[] {
  return (goals ?? [])
    .filter((g) => g.goalId && (g.monthlyAllocated ?? 0) > 0)
    .slice(0, GOAL_ADVISOR_MAX_GOALS);
}

/** Minimal per-goal payload — the only user data that leaves for this call. */
export function goalAdvisorContext(goal: GoalItem, profile: GoalAdvisorProfile) {
  const kidIndex = goal.goalId?.includes(":")
    ? Number(goal.goalId.split(":")[1])
    : undefined;
  const kidAge =
    kidIndex != null && Number.isFinite(kidIndex)
      ? profile.kidsAges?.[kidIndex] ?? undefined
      : undefined;
  return {
    goal: {
      label: goal.label ?? goal.goalType,
      type: goal.goalType,
      targetAmount: goal.targetAmount,
      yearsToGoal: goal.yearsToGoal,
      targetYear: new Date().getFullYear() + goal.yearsToGoal,
      monthlyRequired: goal.monthlyRequired,
      monthlyAllocated: goal.monthlyAllocated ?? 0,
      sharePctOfGoalBudget: goal.sharePct ?? null,
      currentSaved: goal.currentSaved,
      instrumentSplit: (goal.allocation?.slices ?? []).map((s) => ({
        instrument: s.label,
        pct: s.pct,
        monthly: s.monthly,
      })),
      ...(goal.allocation?.realEstateNote
        ? { realEstateNote: goal.allocation.realEstateNote }
        : {}),
    },
    person: {
      age: profile.selfAge ?? null,
      lifeStage: profile.lifeStage ?? null,
      riskTolerance: profile.riskTolerance ?? "not answered",
      ...(kidAge != null ? { childAge: kidAge } : {}),
    },
  };
}

const WATCH_OUT: Partial<Record<GoalType, string>> = {
  kid_education:
    "Education costs tend to rise faster than general inflation — step this SIP up each year with your income.",
  kid_marriage:
    "Keep this separate from the education fund so one doesn't quietly fund the other.",
  home_purchase:
    "Budget another 7–10% on top for stamp duty, registration and interiors, and keep the EMI within about a third of take-home pay.",
  vehicle_purchase:
    "Add insurance, fuel and maintenance to the budget, and avoid financing a depreciating asset if you can.",
  parents_eldercare:
    "Check senior health cover waiting periods and co-pays — this buffer covers what insurance won't.",
  retirement:
    "Don't pause this to fund shorter goals — every year skipped is compounding lost.",
  marriage:
    "Fund it monthly rather than with a personal loan, and keep the emergency fund separate.",
  baby:
    "Check whether your health policy's maternity waiting period has finished.",
};

/** Deterministic copy from engine numbers — used when a call fails or AI is off. */
export function engineGoalAdvice(goal: GoalItem): GoalAdvice {
  const monthly = goal.monthlyAllocated ?? goal.monthlyRequired;
  const year = new Date().getFullYear() + goal.yearsToGoal;
  const gold = goal.allocation?.slices.find((s) => s.key === "gold");
  const funded =
    goal.monthlyRequired > 0
      ? Math.min(100, Math.round((monthly / goal.monthlyRequired) * 100))
      : 100;
  const why =
    goal.yearsToGoal <= 3
      ? `${inr(monthly)}/month toward ${inr(goal.targetAmount)} by ${year} — a near deadline, so it gets a bigger share of your goal budget.`
      : `${inr(monthly)}/month toward ${inr(goal.targetAmount)} by ${year} — started now so ${goal.yearsToGoal} years of compounding do most of the work.`;
  return {
    why:
      funded < 100
        ? `${why} That's ${funded}% of the ${inr(goal.monthlyRequired)}/month needed.`
        : why,
    instrumentRationale: `${
      goal.yearsToGoal <= 3
        ? `With ${goal.yearsToGoal} ${goal.yearsToGoal === 1 ? "year" : "years"} to go, protecting the money matters more than returns, so it sits in low-volatility instruments.`
        : goal.yearsToGoal <= 7
          ? `A ${goal.yearsToGoal}-year horizon blends growth with lower volatility.`
          : `Over ${goal.yearsToGoal} years, equity's ups and downs even out and compounding does the work.`
    }${gold ? ` ${gold.pct}% (${inr(gold.monthly)}/month) goes to gold as a hedge.` : ""}`,
    watchOut:
      WATCH_OUT[goal.goalType as GoalType] ??
      "Review this goal once a year and adjust the amount if your plans change.",
    source: "engine",
  };
}

function cleanField(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > FIELD_MAX_CHARS ? `${t.slice(0, FIELD_MAX_CHARS - 1)}…` : t;
}

export function parseGoalAdvice(raw: string): Omit<GoalAdvice, "source"> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const why = cleanField(obj.why);
    const instrumentRationale = cleanField(obj.instrumentRationale);
    const watchOut = cleanField(obj.watchOut);
    if (!why || !instrumentRationale || !watchOut) return null;
    return { why, instrumentRationale, watchOut };
  } catch {
    return null;
  }
}

async function adviseOne(
  groq: Groq,
  model: string,
  goal: GoalItem,
  profile: GoalAdvisorProfile,
): Promise<GoalAdvice> {
  const notes = await retrieveGoalKnowledge(goal.goalType as GoalType);
  const user = `REFERENCE NOTES (use only these for facts):
${notes.map((n, i) => `[${i + 1}] ${n.title}\n${n.content}`).join("\n\n")}

GOAL AND PERSON (engine numbers — use exactly):
${JSON.stringify(goalAdvisorContext(goal, profile), null, 2)}

Explain why this goal gets ${inr(goal.monthlyAllocated ?? 0)}/month now, why this instrument split fits its ${goal.yearsToGoal}-year horizon${profile.riskTolerance ? " and the person's risk profile" : ""} (including the gold hedge), and one thing to watch out for.`;

  const completion = await groq.chat.completions.create(
    {
      model,
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    },
    { timeout: CALL_TIMEOUT_MS, maxRetries: 0 },
  );
  const parsed = parseGoalAdvice(completion.choices[0]?.message?.content || "");
  if (!parsed) throw new Error("goal advice: unusable model output");
  return { ...parsed, source: "ai" };
}

/** One call per goal, in parallel; a failed call falls back to engine copy for that goal only. */
export async function adviseGoals(
  groq: Groq | null,
  model: string,
  goals: GoalItem[],
  profile: GoalAdvisorProfile,
): Promise<Record<string, GoalAdvice>> {
  const settled = await Promise.allSettled(
    goals.map((g) =>
      groq ? adviseOne(groq, model, g, profile) : Promise.reject(new Error("no ai")),
    ),
  );
  const out: Record<string, GoalAdvice> = {};
  goals.forEach((g, i) => {
    const r = settled[i];
    out[g.goalId as string] =
      r.status === "fulfilled" ? r.value : engineGoalAdvice(g);
  });
  return out;
}

/** Orchestrator summary for the single goalAdvice line (engine numbers + per-goal "why"). */
export function assembleGoalAdvice(
  goals: GoalItem[],
  plans: Record<string, GoalAdvice>,
): string {
  if (goals.length === 0) {
    return "Work through the priority items above before focusing heavily on goals.";
  }
  const total = goals.reduce((s, g) => s + (g.monthlyAllocated ?? 0), 0);
  const lines = goals.map((g) => {
    const plan = g.goalId ? plans[g.goalId] : undefined;
    return `${g.label ?? g.goalType} (${inr(g.monthlyAllocated ?? 0)}/mo${g.sharePct != null ? `, ${g.sharePct}%` : ""}): ${plan?.why ?? engineGoalAdvice(g).why}`;
  });
  return `Your ${inr(total)}/month goal budget funds ${goals.length} ${goals.length === 1 ? "goal" : "goals"} in parallel. ${lines.join(" ")}`;
}
