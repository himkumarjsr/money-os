import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error: { message: string } | null };

const state = vi.hoisted(() => ({
  snapshot: null as unknown,
  analysisProfile: null as unknown,
  upserts: [] as Record<string, unknown>[][],
  upsertResults: [] as Result[],
}));

vi.mock("@/lib/supabaseClient", () => {
  const table = (name: string) => {
    const single: Result =
      name === "user_analyse_snapshots"
        ? {
            data: state.snapshot ? { payload: state.snapshot } : null,
            error: null,
          }
        : name === "user_analysis"
          ? {
              data: state.analysisProfile
                ? { profile: state.analysisProfile }
                : null,
              error: null,
            }
          : { data: [], error: null };
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => single,
      then: (resolve: (r: Result) => unknown) => resolve(single),
      upsert: async (rows: Record<string, unknown>[]) => {
        state.upserts.push(rows);
        return state.upsertResults.shift() ?? { error: null };
      },
    };
    return chain;
  };
  return { supabase: { from: table } };
});

import { importAnalysePolicies } from "./userPolicies";

const profile = {
  hasTermInsurance: true,
  termInsuranceSumAssured: 10_000_000,
  termInsurancePremiumInput: 19_899,
  termInsurancePremiumFrequency: "yearly",
};

describe("importAnalysePolicies", () => {
  beforeEach(() => {
    state.snapshot = null;
    state.analysisProfile = null;
    state.upserts = [];
    state.upsertResults = [];
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("imports from the latest snapshot ahead of the old user_analysis row", async () => {
    state.snapshot = { profile };
    state.analysisProfile = {};
    const { changed } = await importAnalysePolicies("u1", []);
    expect(changed).toBe(true);
    expect(state.upserts[0]?.some((r) => r.analyse_source_key === "term")).toBe(
      true,
    );
  });

  it("retries without status when the live table has no status column", async () => {
    state.snapshot = { profile };
    state.upsertResults = [
      {
        error: {
          message:
            "Could not find the 'status' column of 'user_policies' in the schema cache",
        },
      },
    ];
    const { changed } = await importAnalysePolicies("u1", []);
    expect(changed).toBe(true);
    expect(state.upserts).toHaveLength(2);
    expect(state.upserts[1]?.every((r) => !("status" in r))).toBe(true);
  });

  it("does nothing without a saved profile", async () => {
    const { changed } = await importAnalysePolicies("u1", []);
    expect(changed).toBe(false);
    expect(state.upserts).toHaveLength(0);
  });
});
