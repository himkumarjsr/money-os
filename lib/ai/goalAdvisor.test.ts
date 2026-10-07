import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseServer", () => ({ supabaseAdmin: null }));

import {
  adviseGoals,
  assembleGoalAdvice,
  engineGoalAdvice,
  GOAL_ADVISOR_MAX_GOALS,
  goalAdvisorContext,
  goalsForAdvice,
  parseGoalAdvice,
} from "@/lib/ai/goalAdvisor";
import type { GoalItem } from "@/lib/priorityEngine";
import { GOAL_KNOWLEDGE } from "@/lib/rag/goalKnowledge";
import { retrieveGoalKnowledge } from "@/lib/rag/retriever";

function goal(over: Partial<GoalItem>): GoalItem {
  return {
    goalType: "retirement",
    goalId: "retirement",
    label: "Retirement",
    targetAmount: 10_000_000,
    yearsToGoal: 25,
    currentSaved: 0,
    monthlyRequired: 8_000,
    monthlyAllocated: 6_000,
    sharePct: 60,
    instrument: "Equity index fund SIP",
    ...over,
  } as GoalItem;
}

describe("goalsForAdvice", () => {
  it("keeps only funded goals with an id, capped", () => {
    const goals = [
      goal({ goalId: "a" }),
      goal({ goalId: undefined }),
      goal({ goalId: "b", monthlyAllocated: 0 }),
      ...Array.from({ length: 10 }, (_, i) => goal({ goalId: `g${i}` })),
    ];
    const out = goalsForAdvice(goals);
    expect(out[0].goalId).toBe("a");
    expect(out.every((g) => g.goalId && (g.monthlyAllocated ?? 0) > 0)).toBe(true);
    expect(out).toHaveLength(GOAL_ADVISOR_MAX_GOALS);
    expect(goalsForAdvice(undefined)).toEqual([]);
  });
});

describe("goalAdvisorContext", () => {
  it("sends only goal numbers and age/life stage/risk — no income or loans", () => {
    const profile = {
      selfAge: 34,
      lifeStage: "married_with_kids",
      riskTolerance: "moderate",
      kidsAges: [4, 9],
      monthlySalary: 250_000,
      homeLoanEMI: 40_000,
    } as any;
    const ctx = goalAdvisorContext(
      goal({ goalType: "kid_education", goalId: "kid_education:1" }),
      profile,
    );
    const json = JSON.stringify(ctx);
    expect(json).not.toContain("250000");
    expect(json).not.toContain("40000");
    expect(json).not.toMatch(/salary|loan|emi/i);
    expect(ctx.person).toEqual({
      age: 34,
      lifeStage: "married_with_kids",
      riskTolerance: "moderate",
      childAge: 9,
    });
  });
});

describe("parseGoalAdvice", () => {
  it("accepts complete JSON, even with surrounding text", () => {
    expect(
      parseGoalAdvice('ok {"why":"a","instrumentRationale":"b","watchOut":"c"}'),
    ).toEqual({ why: "a", instrumentRationale: "b", watchOut: "c" });
  });

  it("rejects missing fields and junk", () => {
    expect(parseGoalAdvice('{"why":"a","instrumentRationale":"b"}')).toBeNull();
    expect(parseGoalAdvice('{"why":"","instrumentRationale":"b","watchOut":"c"}')).toBeNull();
    expect(parseGoalAdvice("no json")).toBeNull();
    expect(parseGoalAdvice("{not json}")).toBeNull();
  });

  it("caps very long fields", () => {
    const long = "x".repeat(2000);
    const out = parseGoalAdvice(
      JSON.stringify({ why: long, instrumentRationale: "b", watchOut: "c" }),
    );
    expect(out!.why.length).toBeLessThanOrEqual(400);
  });
});

describe("engineGoalAdvice", () => {
  it("uses the engine numbers and notes underfunding", () => {
    const a = engineGoalAdvice(goal({}));
    expect(a.source).toBe("engine");
    expect(a.why).toContain("₹6,000");
    expect(a.why).toContain("75%");
    expect(a.instrumentRationale).toContain("Equity index fund SIP");
  });

  it("explains near-deadline goals as capital protection", () => {
    const a = engineGoalAdvice(
      goal({ goalType: "vehicle_purchase", yearsToGoal: 2, monthlyAllocated: 8_000 }),
    );
    expect(a.why).toMatch(/near deadline/);
    expect(a.instrumentRationale).toMatch(/protecting/);
  });
});

describe("adviseGoals", () => {
  it("falls back to engine copy per goal when AI is unavailable", async () => {
    const goals = [goal({ goalId: "retirement" }), goal({ goalId: "home", goalType: "home_purchase" })];
    const plans = await adviseGoals(null, "m", goals, {});
    expect(Object.keys(plans)).toEqual(["retirement", "home"]);
    expect(plans.home.source).toBe("engine");
  });

  it("keeps AI answers and falls back only for the goal that failed", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        choices: [
          { message: { content: '{"why":"w","instrumentRationale":"i","watchOut":"o"}' } },
        ],
      })
      .mockRejectedValueOnce(new Error("timeout"));
    const groq = { chat: { completions: { create } } } as any;
    const goals = [goal({ goalId: "retirement" }), goal({ goalId: "home", goalType: "home_purchase" })];
    const plans = await adviseGoals(groq, "m", goals, {});
    expect(plans.retirement).toEqual({
      why: "w",
      instrumentRationale: "i",
      watchOut: "o",
      source: "ai",
    });
    expect(plans.home.source).toBe("engine");
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].response_format).toEqual({ type: "json_object" });
  });
});

describe("assembleGoalAdvice", () => {
  it("summarises every goal with its allocation", () => {
    const goals = [goal({ goalId: "a", label: "A" }), goal({ goalId: "b", label: "B", monthlyAllocated: 4_000 })];
    const text = assembleGoalAdvice(goals, {});
    expect(text).toContain("₹10,000/month");
    expect(text).toContain("2 goals");
    expect(text).toContain("A (₹6,000/mo");
    expect(text).toContain("B (₹4,000/mo");
  });

  it("handles no funded goals", () => {
    expect(assembleGoalAdvice([], {})).toMatch(/priority items/);
  });
});

describe("goal knowledge", () => {
  it("falls back to bundled notes without a database", async () => {
    const notes = await retrieveGoalKnowledge("kid_education");
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.some((n) => /education/i.test(n.title))).toBe(true);
  });

  it("migration 039 seeds every bundled entry", () => {
    const sql = readFileSync(
      join(__dirname, "../../supabase/migrations/039_goal_knowledge.sql"),
      "utf8",
    );
    for (const entry of GOAL_KNOWLEDGE) {
      expect(sql).toContain(`'${entry.title.replace(/'/g, "''")}'`);
    }
  });
});
