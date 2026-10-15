import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  snap: null as unknown,
  hydrated: [] as unknown[],
  store: { result: null as unknown, lastSubmission: null as unknown },
}));

vi.mock("@/lib/userAnalyseSnapshot", () => ({
  fetchUserAnalyseSnapshot: async () => state.snap,
}));
vi.mock("@/lib/analysisSnapshotValidation", () => ({
  isValidStoredAnalysis: () => true,
}));
vi.mock("@/lib/financialEngine", () => ({
  analyseFinances: () => ({ overallScore: 1 }),
}));
vi.mock("@/store/financialStore", () => ({
  useFinancialStore: {
    getState: () => ({
      ...state.store,
      hydrateFromSnapshot: (profile: unknown) => {
        state.hydrated.push(profile);
        state.store = { result: { overallScore: 50 }, lastSubmission: profile };
      },
    }),
  },
}));

import { stableJson, syncAnalyseFromCloud } from "./syncAnalyseFromCloud";

describe("syncAnalyseFromCloud", () => {
  beforeEach(() => {
    state.snap = null;
    state.hydrated = [];
    state.store = { result: null, lastSubmission: null };
  });

  it("ignores key order", () => {
    expect(stableJson({ a: 1, b: { c: 2, d: 3 } })).toBe(
      stableJson({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it("loads the saved report into an empty store", async () => {
    state.snap = {
      lastSubmission: { monthlySalary: 100 },
      result: { overallScore: 60 },
    };
    expect(await syncAnalyseFromCloud("u1")).toBe(true);
    expect(state.hydrated).toHaveLength(1);
  });

  it("replaces this device's copy when Profile changed it elsewhere", async () => {
    state.store = {
      result: { overallScore: 40 },
      lastSubmission: { monthlySalary: 100 },
    };
    state.snap = {
      lastSubmission: { monthlySalary: 120 },
      result: { overallScore: 60 },
    };
    await syncAnalyseFromCloud("u1");
    expect(state.hydrated).toEqual([{ monthlySalary: 120 }]);
  });

  it("keeps the local copy (and its draft) when nothing changed", async () => {
    state.store = {
      result: { overallScore: 40 },
      lastSubmission: { a: 1, b: 2 },
    };
    state.snap = { lastSubmission: { b: 2, a: 1 }, result: null };
    expect(await syncAnalyseFromCloud("u1")).toBe(true);
    expect(state.hydrated).toHaveLength(0);
  });

  it("reports no report when nothing is saved anywhere", async () => {
    expect(await syncAnalyseFromCloud("u1")).toBe(false);
  });
});
