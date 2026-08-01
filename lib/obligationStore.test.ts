import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const upsert = vi.fn();
const insert = vi.fn();
const update = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const order = vi.fn();
const single = vi.fn();

function chain(methods: Record<string, unknown>) {
  const api: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(methods)) {
    api[k] = typeof v === "function" ? v : vi.fn(() => api);
  }
  return api;
}

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      if (table === "financial_obligations") {
        return chain({
          select: () =>
            chain({
              eq: () =>
                chain({
                  eq: () =>
                    chain({
                      order: async () => ({ data: [], error: null }),
                    }),
                }),
            }),
          insert: () =>
            chain({
              select: () =>
                chain({
                  single: async () => ({
                    data: {
                      id: "ob-1",
                      user_id: "u1",
                      title: "Home Loan EMI",
                      category: "loan_emi",
                      amount: 22000,
                      frequency: "monthly",
                      source: "manual",
                      is_active: true,
                      remind_days_before: 7,
                    },
                    error: null,
                  }),
                }),
            }),
          upsert: (...args: unknown[]) => {
            upsert(...args);
            return Promise.resolve({ error: null });
          },
          update: () =>
            chain({
              eq: async () => ({ error: null }),
            }),
        });
      }
      if (table === "obligation_checklist") {
        return chain({
          select: () =>
            chain({
              eq: () =>
                chain({
                  eq: () =>
                    chain({
                      order: async () => ({
                        data: [
                          {
                            id: "c1",
                            obligation_id: "ob-1",
                            checklist_month: "2026-07-01",
                            expected_amount: 22000,
                            status: "pending",
                            obligation: {
                              id: "ob-1",
                              user_id: "u1",
                              title: "Home Loan EMI",
                              category: "loan_emi",
                              amount: 22000,
                              frequency: "monthly",
                              due_day: 5,
                              source: "health_check",
                              is_active: true,
                              remind_days_before: 3,
                            },
                          },
                        ],
                        error: null,
                      }),
                    }),
                }),
            }),
          update: () =>
            chain({
              eq: async () => ({ error: null }),
            }),
          delete: () =>
            chain({
              eq: async () => ({ error: null }),
            }),
        });
      }
      return chain({});
    },
    rpc: (...args: unknown[]) => rpc(...args),
  }),
}));

describe("useObligationStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    rpc.mockReset();
    rpc.mockResolvedValue({ error: null });
  });

  it("fetchChecklist computes obligated / paid / pending totals", async () => {
    const { useObligationStore } = await import("@/store/obligationStore");
    await useObligationStore
      .getState()
      .fetchChecklist("u1", new Date(2026, 6, 1));
    const s = useObligationStore.getState();
    expect(s.checklist).toHaveLength(1);
    expect(s.totalObligated).toBe(22000);
    expect(s.totalPending).toBe(22000);
    expect(s.totalPaid).toBe(0);
  });

  it("markPaid moves amount from pending to paid", async () => {
    const { useObligationStore } = await import("@/store/obligationStore");
    await useObligationStore
      .getState()
      .fetchChecklist("u1", new Date(2026, 6, 1));
    await useObligationStore.getState().markPaid("c1", 22000);
    const s = useObligationStore.getState();
    expect(s.checklist[0]?.status).toBe("paid");
    expect(s.totalPaid).toBe(22000);
    expect(s.totalPending).toBe(0);
  });

  it("addObligation returns new id", async () => {
    const { useObligationStore } = await import("@/store/obligationStore");
    const id = await useObligationStore.getState().addObligation({
      user_id: "u1",
      title: "Home Loan EMI",
      category: "loan_emi",
      amount: 22000,
      frequency: "monthly",
      source: "manual",
    });
    expect(id).toBe("ob-1");
    expect(useObligationStore.getState().obligations).toHaveLength(1);
  });

  it("syncFromHealthCheck upserts derived obligations then generates checklist", async () => {
    const { useObligationStore } = await import("@/store/obligationStore");
    await useObligationStore.getState().syncFromHealthCheck("u1", {
      termInsurancePremiumInput: 7200,
      termInsurancePremiumFrequency: "yearly",
      termInsuranceRenewalMonth: 4,
      termInsuranceRenewalDay: 15,
      homeLoanEMI: 22000,
      homeLoanEMIDay: 5,
      monthlySIP: 5000,
      sipAutoDebitDay: 1,
    });
    expect(rpc).toHaveBeenCalled();
  });

  it("syncFromHealthCheck respects monthly premium frequency", async () => {
    upsert.mockClear();
    const { useObligationStore } = await import("@/store/obligationStore");
    await useObligationStore.getState().syncFromHealthCheck("u1", {
      healthInsurancePremiumInput: 1500,
      healthInsurancePremiumFrequency: "monthly",
      healthInsuranceRenewalDay: 10,
    });
    expect(upsert).toHaveBeenCalled();
    const payload = upsert.mock.calls[0]?.[0] as {
      frequency?: string;
      amount?: number;
    };
    expect(payload?.frequency).toBe("monthly");
    expect(payload?.amount).toBe(1500);
  });

  it("monthStartIso uses local calendar month (not UTC)", async () => {
    const { monthStartIso } = await import("@/store/obligationStore");
    // IST evening of Jul 1 is still Jun 30 in UTC — local format must stay July
    expect(monthStartIso(new Date(2026, 6, 1))).toBe("2026-07-01");
    expect(monthStartIso(new Date(2026, 0, 15))).toBe("2026-01-01");
  });

  it("generateChecklist passes local YYYY-MM-01 to RPC", async () => {
    const { useObligationStore } = await import("@/store/obligationStore");
    await useObligationStore
      .getState()
      .generateChecklist("u1", new Date(2026, 6, 26));
    expect(rpc).toHaveBeenCalledWith("generate_monthly_checklist", {
      p_user_id: "u1",
      p_month: "2026-07-01",
    });
  });
});
