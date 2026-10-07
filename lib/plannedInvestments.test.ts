import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allocateGoalPortfolio } from "@/lib/portfolioAllocation";
import type { GoalItem } from "@/lib/priorityEngine";
import {
  buildPlannedDrafts,
  isPlannedReminderDue,
  monthStart,
  plannedProgressBySource,
  plannedReminderCopy,
  savePlannedInvestments,
  setPlannedInvestmentStatus,
  type PlannedInvestment,
} from "@/lib/plannedInvestments";

function goal(over: Partial<GoalItem>): GoalItem {
  const monthly = over.monthlyAllocated ?? 10_000;
  return {
    goalType: "retirement",
    goalId: "retirement",
    label: "Retirement",
    targetAmount: 10_000_000,
    currentSaved: 0,
    monthlyRequired: monthly,
    monthlyAllocated: monthly,
    yearsToGoal: 25,
    instrument: "",
    readyToStart: true,
    blockedBy: null,
    icon: "",
    allocation: allocateGoalPortfolio({ yearsToGoal: over.yearsToGoal ?? 25, monthly }),
    ...over,
  } as GoalItem;
}

function row(over: Partial<PlannedInvestment>): PlannedInvestment {
  return {
    id: "r1",
    user_id: "u1",
    source_kind: "goal",
    source_id: "retirement",
    source_label: "Retirement",
    instrument_key: "equity_index",
    instrument_label: "Nifty 50 index fund",
    monthly_amount: 5_000,
    start_month: "2026-11-01",
    consent_given_at: "2026-10-07T00:00:00Z",
    consent_version: "v1",
    status: "pending",
    started_at: null,
    reminded_at: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("monthStart", () => {
  it("returns the first of this or next month, across year ends", () => {
    expect(monthStart(new Date(2026, 9, 7))).toBe("2026-10-01");
    expect(monthStart(new Date(2026, 9, 7), 1)).toBe("2026-11-01");
    expect(monthStart(new Date(2026, 11, 20), 1)).toBe("2027-01-01");
  });
});

describe("buildPlannedDrafts", () => {
  it("creates one draft per instrument slice of each funded goal", () => {
    const goals = [goal({}), goal({ goalId: "home", label: "Home", yearsToGoal: 5 })];
    const drafts = buildPlannedDrafts(goals, "2026-11-01");
    const sliceCount = goals.reduce((s, g) => s + (g.allocation?.slices.length ?? 0), 0);
    expect(drafts).toHaveLength(sliceCount);
    expect(drafts.every((d) => d.start_month === "2026-11-01")).toBe(true);
    expect(drafts.filter((d) => d.source_id === "home").reduce((s, d) => s + d.monthly_amount, 0)).toBe(10_000);
  });

  it("skips goals without an id or a split", () => {
    expect(buildPlannedDrafts([goal({ goalId: undefined })], "2026-11-01")).toEqual([]);
    expect(buildPlannedDrafts([goal({ allocation: undefined })], "2026-11-01")).toEqual([]);
    expect(buildPlannedDrafts(undefined, "2026-11-01")).toEqual([]);
  });
});

describe("plannedProgressBySource", () => {
  it("counts started and done as started, and tracks the next pending start", () => {
    const p = plannedProgressBySource([
      row({ id: "a", status: "started" }),
      row({ id: "b", status: "done" }),
      row({ id: "c", start_month: "2026-12-01" }),
      row({ id: "d", start_month: "2026-11-01" }),
      row({ id: "e", source_id: "home", status: "started" }),
    ]);
    expect(p.retirement).toEqual({ total: 4, started: 2, nextStart: "2026-11-01" });
    expect(p.home).toEqual({ total: 1, started: 1, nextStart: null });
  });
});

describe("isPlannedReminderDue", () => {
  const nov = row({ start_month: "2026-11-01" });
  it("fires within 3 days of the start month, or once it has begun", () => {
    expect(isPlannedReminderDue(nov, new Date(2026, 9, 28))).toBe(false);
    expect(isPlannedReminderDue(nov, new Date(2026, 9, 29))).toBe(true);
    expect(isPlannedReminderDue(nov, new Date(2026, 10, 15))).toBe(true);
  });
  it("never fires twice or for started rows", () => {
    const today = new Date(2026, 10, 1);
    expect(isPlannedReminderDue({ ...nov, reminded_at: "x" }, today)).toBe(false);
    expect(isPlannedReminderDue({ ...nov, status: "started" }, today)).toBe(false);
  });
});

describe("plannedReminderCopy", () => {
  it("states nothing is automatic and carries no rupee amounts", () => {
    const c = plannedReminderCopy(3, "2026-11-01");
    expect(c.body).toMatch(/Nothing is invested automatically/);
    expect(c.body).toMatch(/3 planned investments start/);
    expect(`${c.title} ${c.body}`).not.toMatch(/₹|\d,\d{3}|\/mo/);
  });
});

/** Minimal chainable Supabase double recording every call. */
function fakeSupabase(pendingRows: Array<{ id: string; source_id: string; instrument_key: string }>) {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const builder = (result: unknown) => {
    const b: any = {
      then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
    };
    for (const m of ["select", "eq", "in", "is", "order", "lte"]) {
      b[m] = (...args: unknown[]) => {
        calls.push({ op: m, args });
        return b;
      };
    }
    return b;
  };
  const sb: any = {
    from: (table: string) => {
      calls.push({ op: "from", args: [table] });
      return {
        upsert: (...args: unknown[]) => {
          calls.push({ op: "upsert", args });
          return builder({ error: null });
        },
        select: (...args: unknown[]) => {
          calls.push({ op: "select", args });
          return builder({ data: pendingRows, error: null });
        },
        delete: () => {
          calls.push({ op: "delete", args: [] });
          return builder({ error: null });
        },
        update: (...args: unknown[]) => {
          calls.push({ op: "update", args });
          return builder({ error: null });
        },
      };
    },
  };
  return { sb, calls };
}

describe("savePlannedInvestments", () => {
  it("upserts drafts with consent and only deletes stale pending rows, scoped to the user", async () => {
    const drafts = buildPlannedDrafts([goal({})], "2026-11-01");
    const { sb, calls } = fakeSupabase([
      { id: "keep", source_id: "retirement", instrument_key: drafts[0].instrument_key },
      { id: "stale", source_id: "old_goal", instrument_key: "fd_cd" },
    ]);
    await savePlannedInvestments(sb, "u1", drafts, new Date("2026-10-07T10:00:00Z"));

    const upsert = calls.find((c) => c.op === "upsert")!;
    const rows = upsert.args[0] as Array<Record<string, unknown>>;
    expect(rows.every((r) => r.user_id === "u1")).toBe(true);
    expect(rows.every((r) => r.consent_given_at === "2026-10-07T10:00:00.000Z")).toBe(true);
    expect(rows.every((r) => !("status" in r))).toBe(true);
    expect(upsert.args[1]).toEqual({ onConflict: "user_id,source_id,instrument_key" });

    expect(calls).toContainEqual({ op: "eq", args: ["status", "pending"] });
    const delIdx = calls.findIndex((c) => c.op === "delete");
    const afterDelete = calls.slice(delIdx);
    expect(afterDelete).toContainEqual({ op: "in", args: ["id", ["stale"]] });
    expect(afterDelete).toContainEqual({ op: "eq", args: ["user_id", "u1"] });
  });
});

describe("setPlannedInvestmentStatus", () => {
  it("stamps started_at when started and clears it on undo", async () => {
    const { sb, calls } = fakeSupabase([]);
    const now = new Date("2026-11-02T00:00:00Z");
    await setPlannedInvestmentStatus(sb, "u1", "r1", "started", now);
    await setPlannedInvestmentStatus(sb, "u1", "r1", "pending", now);
    const updates = calls.filter((c) => c.op === "update").map((c) => c.args[0] as any);
    expect(updates[0]).toMatchObject({ status: "started", started_at: now.toISOString() });
    expect(updates[1]).toMatchObject({ status: "pending", started_at: null });
    expect(calls.filter((c) => c.op === "eq" && (c.args as any)[0] === "user_id")).toHaveLength(2);
  });
});

describe("migration 040", () => {
  const sql = readFileSync(
    join(__dirname, "../supabase/migrations/040_user_planned_investments.sql"),
    "utf8",
  );
  it("enables owner-only RLS on the new table", () => {
    expect(sql).toMatch(/ALTER TABLE public\.user_planned_investments ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/USING \(auth\.uid\(\) = user_id\)/);
    expect(sql).toMatch(/WITH CHECK \(auth\.uid\(\) = user_id\)/);
  });
  it("matches the upsert conflict target and status values", () => {
    expect(sql).toMatch(/UNIQUE \(user_id, source_id, instrument_key\)/);
    expect(sql).toMatch(/status IN \('pending', 'started', 'done'\)/);
  });
  it("is removed on account deletion", () => {
    const route = readFileSync(join(__dirname, "../app/api/account/delete/route.ts"), "utf8");
    expect(route).toContain('"user_planned_investments"');
  });
});
