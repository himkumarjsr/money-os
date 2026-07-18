import { describe, expect, it } from "vitest";
import {
  computeNetBalances,
  simplifyDebts,
  type BalanceExpense,
  type BalanceMember,
} from "@/lib/splitBalances";

describe("Split — Balance Calculation (lib/splitBalances)", () => {
  const members: BalanceMember[] = [
    { email: "him@test.com", display_name: "Himanshu" },
    { email: "anshu@test.com", display_name: "Anshu" },
  ];

  const dinner: BalanceExpense = {
    amount: 3000,
    paid_by_email: "him@test.com",
    shares: [
      {
        email: "him@test.com",
        display_name: "Himanshu",
        share_amount: 1500,
      },
      {
        email: "anshu@test.com",
        display_name: "Anshu",
        share_amount: 1500,
      },
    ],
  };

  it("calculates correct net after equal dinner split", () => {
    const net = computeNetBalances(members, [dinner]);
    const him = net.find((n) => n.email === "him@test.com")!;
    const anshu = net.find((n) => n.email === "anshu@test.com")!;
    expect(him.net).toBe(1500);
    expect(anshu.net).toBe(-1500);
  });

  it("shows zero nets when settlement clears the debt", () => {
    const net = computeNetBalances(
      members,
      [dinner],
      [
        {
          from_email: "anshu@test.com",
          to_email: "him@test.com",
          amount: 1500,
        },
      ],
    );
    expect(net.find((n) => n.email === "him@test.com")!.net).toBe(0);
    expect(net.find((n) => n.email === "anshu@test.com")!.net).toBe(0);
  });

  it("handles three-way equal split", () => {
    const three: BalanceMember[] = [
      ...members,
      { email: "b@test.com", display_name: "B" },
    ];
    const expense: BalanceExpense = {
      amount: 3000,
      paid_by_email: "him@test.com",
      shares: [
        { email: "him@test.com", display_name: "Himanshu", share_amount: 1000 },
        { email: "anshu@test.com", display_name: "Anshu", share_amount: 1000 },
        { email: "b@test.com", display_name: "B", share_amount: 1000 },
      ],
    };
    const edges = simplifyDebts(computeNetBalances(three, [expense]));
    expect(edges).toHaveLength(2);
    for (const e of edges) {
      expect(e.to_email).toBe("him@test.com");
      expect(e.amount).toBe(1000);
    }
  });
});
