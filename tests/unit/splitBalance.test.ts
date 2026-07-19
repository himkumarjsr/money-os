import { describe, it, expect } from "vitest";
import {
  computeGroupBalances,
  computeNetBalances,
  simplifyDebts,
} from "@/lib/splitBalances";

describe("Split Balance Calculation", () => {
  it("two-person equal split", () => {
    const members = [
      { email: "a@test.com", display_name: "A" },
      { email: "b@test.com", display_name: "B" },
    ];
    const expenses = [
      {
        amount: 2000,
        paid_by_email: "a@test.com",
        paid_by_name: "A",
        shares: [
          { email: "a@test.com", display_name: "A", share_amount: 1000 },
          { email: "b@test.com", display_name: "B", share_amount: 1000 },
        ],
      },
    ];
    const { net, edges } = computeGroupBalances(members, expenses, []);
    expect(net.find((n) => n.email === "a@test.com")?.net).toBe(1000);
    expect(net.find((n) => n.email === "b@test.com")?.net).toBe(-1000);
    expect(edges).toHaveLength(1);
    expect(edges[0].from_email).toBe("b@test.com");
    expect(edges[0].to_email).toBe("a@test.com");
    expect(edges[0].amount).toBe(1000);
  });

  it("settlements reduce nets to zero", () => {
    const members = [
      { email: "a@test.com", display_name: "A" },
      { email: "b@test.com", display_name: "B" },
    ];
    const expenses = [
      {
        amount: 2000,
        paid_by_email: "a@test.com",
        paid_by_name: "A",
        shares: [
          { email: "a@test.com", share_amount: 1000 },
          { email: "b@test.com", share_amount: 1000 },
        ],
      },
    ];
    const settlements = [
      {
        from_email: "b@test.com",
        to_email: "a@test.com",
        amount: 1000,
      },
    ];
    const net = computeNetBalances(members, expenses, settlements);
    expect(
      Math.abs(net.find((n) => n.email === "a@test.com")?.net ?? 99),
    ).toBeLessThan(0.02);
    expect(
      Math.abs(net.find((n) => n.email === "b@test.com")?.net ?? 99),
    ).toBeLessThan(0.02);
    expect(simplifyDebts(net)).toHaveLength(0);
  });

  it("multiple expenses calculate correctly", () => {
    const members = [
      { email: "a@test.com", display_name: "A" },
      { email: "b@test.com", display_name: "B" },
    ];
    const expenses = [
      {
        amount: 3000,
        paid_by_email: "a@test.com",
        paid_by_name: "A",
        shares: [
          { email: "a@test.com", share_amount: 1500 },
          { email: "b@test.com", share_amount: 1500 },
        ],
      },
      {
        amount: 1000,
        paid_by_email: "b@test.com",
        paid_by_name: "B",
        shares: [
          { email: "a@test.com", share_amount: 500 },
          { email: "b@test.com", share_amount: 500 },
        ],
      },
    ];
    const { edges } = computeGroupBalances(members, expenses, []);
    expect(edges).toHaveLength(1);
    expect(edges[0].amount).toBeCloseTo(1000, 0);
    expect(edges[0].from_email).toBe("b@test.com");
    expect(edges[0].to_email).toBe("a@test.com");
  });

  it("zero balance no edges", () => {
    const { edges } = computeGroupBalances(
      [{ email: "a@test.com", display_name: "A" }],
      [],
      [],
    );
    expect(edges).toHaveLength(0);
  });
});
