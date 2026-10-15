import { describe, expect, it } from "vitest";
import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
  type FinancialProfile,
} from "./analyse-form-schema";
import { analyseFinances } from "./financialEngine";
import {
  addCustomGoal,
  applyGoalEdit,
  detectGoals,
  dismissGoal,
  MAX_CUSTOM_GOALS,
} from "./goalDetection";
import { buildGoalsHub, goalStatus, goalStatusLine } from "./goalsHub";
import { ownSipDraft, type PlannedInvestment } from "./plannedInvestments";
import { buildPriorityPlan } from "./priorityEngine";

const NOW = new Date(2026, 9, 15);

function profile(over: Partial<AnalyseFormValues>): FinancialProfile {
  return normalizeAnalyseFormValues({
    ...analyseDefaultValues,
    monthlySalary: 150_000,
    selfAge: 30,
    ownsHome: true,
    ownsCar: true,
    ...over,
  } as AnalyseFormValues);
}

const sip = (o: Partial<PlannedInvestment>): PlannedInvestment => ({
  id: o.id ?? "s1",
  user_id: "u",
  source_kind: o.source_kind ?? "goal",
  source_id: o.source_id ?? "retirement",
  source_label: "Retirement",
  instrument_key: o.instrument_key ?? "equity",
  instrument_label: o.instrument_label ?? "Flexi cap fund",
  monthly_amount: o.monthly_amount ?? 5000,
  start_month: o.start_month ?? "2026-10-01",
  consent_given_at: "",
  consent_version: "v1",
  status: o.status ?? "started",
  started_at: null,
  reminded_at: null,
  created_at: "",
  updated_at: "",
});

describe("custom goals", () => {
  it("adds, edits and deletes a goal the user created", () => {
    const base = profile({});
    const added = addCustomGoal(
      base,
      { label: "  Japan trip ", targetAmount: 300_000.4, targetYear: 2028 },
      "abc",
    );
    const goal = detectGoals(added, NOW).find((g) => g.id === "custom:abc");
    expect(goal).toMatchObject({
      type: "custom",
      label: "Japan trip",
      targetAmount: 300_000,
      targetYear: 2028,
      yearsToGoal: 2,
      removable: true,
      editable: { amount: true, year: true },
    });

    const edited = applyGoalEdit(added, "custom:abc", {
      targetAmount: 450_000,
      targetYear: 2029,
    });
    expect(edited.customGoals).toEqual([
      {
        id: "abc",
        label: "Japan trip",
        targetAmount: 450_000,
        targetYear: 2029,
      },
    ]);

    const removed = dismissGoal(edited, "custom:abc");
    expect(removed.customGoals).toEqual([]);
    expect(removed.dismissedGoals ?? []).not.toContain("custom:abc");
  });

  it("ignores empty input and caps the list", () => {
    const base = profile({});
    expect(
      addCustomGoal(base, { label: " ", targetAmount: 1, targetYear: 2030 }),
    ).toBe(base);
    expect(
      addCustomGoal(base, { label: "X", targetAmount: 0, targetYear: 2030 }),
    ).toBe(base);
    let p = base;
    for (let i = 0; i < MAX_CUSTOM_GOALS + 2; i++) {
      p = addCustomGoal(
        p,
        { label: `G${i}`, targetAmount: 1000, targetYear: 2030 },
        `g${i}`,
      );
    }
    expect(p.customGoals).toHaveLength(MAX_CUSTOM_GOALS);
  });

  it("survives a round trip through the form values", () => {
    const p = addCustomGoal(
      profile({}),
      { label: "Bike", targetAmount: 200_000, targetYear: 2028 },
      "bike",
    );
    expect(
      normalizeAnalyseFormValues(p as unknown as AnalyseFormValues).customGoals,
    ).toEqual(p.customGoals);
  });

  it("gets a share of the goal budget in the priority plan", () => {
    const p = addCustomGoal(
      profile({}),
      { label: "Japan trip", targetAmount: 300_000, targetYear: 2028 },
      "jp",
    );
    const plan = buildPriorityPlan(p, analyseFinances(p));
    const g = plan.goals.find((x) => x.goalId === "custom:jp");
    expect(g?.monthlyRequired).toBeGreaterThan(0);
  });
});

describe("goalStatus", () => {
  it("grades linked SIPs against the monthly need", () => {
    expect(goalStatus(10_000, 10_000, 0)).toBe("on_track");
    expect(goalStatus(10_000, 9_900, 0)).toBe("on_track");
    expect(goalStatus(10_000, 4_000, 6_000)).toBe("behind");
    expect(goalStatus(10_000, 0, 6_000)).toBe("planned");
    expect(goalStatus(10_000, 0, 0)).toBe("not_started");
    expect(goalStatus(0, 0, 0)).toBe("on_track");
  });
});

describe("buildGoalsHub", () => {
  it("links SIPs to goals by id and totals coverage", () => {
    const p = profile({});
    const hub = buildGoalsHub(
      p,
      [
        {
          goalType: "retirement",
          goalId: "retirement",
          label: "Retirement",
          targetAmount: 1,
          currentSaved: 200_000,
          monthlyRequired: 20_000,
          monthlyAllocated: 15_000,
          yearsToGoal: 30,
          instrument: "",
          readyToStart: true,
          blockedBy: null,
          icon: "",
        },
      ],
      [
        sip({ id: "a", monthly_amount: 5000, status: "started" }),
        sip({
          id: "b",
          monthly_amount: 3000,
          status: "done",
          instrument_key: "own:x",
        }),
        sip({
          id: "c",
          monthly_amount: 4000,
          status: "pending",
          instrument_key: "debt",
          start_month: "2026-11-01",
        }),
        sip({ id: "d", source_id: "custom:gone" }),
        sip({ id: "e", source_kind: "priority", source_id: "emergency_fund" }),
      ],
      NOW,
    );
    const r = hub.items.find((i) => i.goal.id === "retirement")!;
    expect(r).toMatchObject({
      monthlyRequired: 20_000,
      suggestedMonthly: 15_000,
      currentSaved: 200_000,
      linkedMonthly: 8000,
      plannedMonthly: 4000,
      nextStart: "2026-11-01",
      coveragePct: 40,
      gapMonthly: 12_000,
      status: "behind",
    });
    expect(r.sips.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(hub.orphanSips.map((s) => s.id)).toEqual(["d"]);
    expect(hub.totals).toEqual({
      goals: hub.items.length,
      onTrack: 0,
      monthlyRequired: 20_000,
      linkedMonthly: 8000,
    });
    expect(goalStatusLine(r, (m) => m)).toBe("Behind by ₹12,000/month");
  });

  it("marks debt-free as paid by EMIs", () => {
    const p = profile({
      hasLoans: true,
      unifiedLoans: [
        {
          id: "l1",
          loanType: "personal_loan",
          monthlyEMI: 10_000,
          outstandingAmount: 200_000,
          remainingMonths: 24,
        },
      ],
    } as Partial<AnalyseFormValues>);
    const hub = buildGoalsHub(p, [], [], NOW);
    const debt = hub.items.find((i) => i.goal.type === "debt_free");
    if (debt) {
      expect(debt.status).toBe("via_emi");
      expect(goalStatusLine(debt, (m) => m)).toBe(
        "Paid down by your loan EMIs",
      );
    }
  });
});

describe("ownSipDraft", () => {
  it("builds a started-SIP row for a goal and rejects bad input", () => {
    expect(
      ownSipDraft(
        { id: "home_purchase", label: "Home" },
        " Axis ELSS ",
        2500.6,
        NOW,
        "k1",
      ),
    ).toEqual({
      source_kind: "goal",
      source_id: "home_purchase",
      source_label: "Home",
      instrument_key: "own:k1",
      instrument_label: "Axis ELSS",
      monthly_amount: 2501,
      start_month: "2026-10-01",
    });
    expect(ownSipDraft({ id: "x", label: "X" }, "", 100, NOW)).toBeNull();
    expect(ownSipDraft({ id: "x", label: "X" }, "Fund", 0, NOW)).toBeNull();
  });
});
