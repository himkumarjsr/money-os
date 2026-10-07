import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  writeDelayMs: 0,
}));

vi.mock("@/lib/supabaseClient", () => {
  const table = {
    upsert: (row: { payload: Record<string, unknown> }) =>
      new Promise((resolve) =>
        setTimeout(() => {
          db.row = row.payload;
          resolve({ error: null });
        }, db.writeDelayMs),
      ),
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: db.row ? { payload: db.row } : null,
          error: null,
        }),
      }),
    }),
  };
  return { supabase: { from: () => table } };
});

import {
  fetchUserAnalyseSnapshot,
  saveUserAnalyseSnapshotAiPlan,
  upsertUserAnalyseSnapshot,
  type UserAnalyseSnapshotPayload,
} from "./userAnalyseSnapshot";

const payload = (spouseAge: number) =>
  ({
    profile: { lifeStage: "married", spouseAge, spouseIncome: 40_000 },
    result: { overallScore: 60 },
    submittedAt: "2026-10-07T00:00:00.000Z",
    version: "1.1",
    aiPlan: null,
    analysis: { spouseAge },
  }) as unknown as UserAnalyseSnapshotPayload;

describe("userAnalyseSnapshot write queue", () => {
  beforeEach(() => {
    db.row = payload(0) as unknown as Record<string, unknown>;
    db.writeDelayMs = 0;
  });

  it("a read started during a save returns the new submission, not the old one", async () => {
    db.writeDelayMs = 30;
    const saving = upsertUserAnalyseSnapshot("u1", payload(31));
    const snap = await fetchUserAnalyseSnapshot("u1");
    await saving;
    expect(snap?.lastSubmission.spouseAge).toBe(31);
  });

  it("attaching the AI plan keeps the saved profile", async () => {
    db.writeDelayMs = 10;
    void upsertUserAnalyseSnapshot("u1", payload(29));
    const plan = { not: "validated here" } as never;
    await saveUserAnalyseSnapshotAiPlan("u1", plan);
    expect((db.row?.profile as { spouseAge: number }).spouseAge).toBe(29);
    expect(db.row?.aiPlan).toBe(plan);
  });
});
