import { describe, expect, it } from "vitest";
import {
  computeNetBalances,
  simplifyDebts,
  computeGroupBalances,
  type BalanceExpense,
  type BalanceMember,
} from "./splitBalances";

const members: BalanceMember[] = [
  { email: "a@x.com", display_name: "Aa" },
  { email: "b@x.com", display_name: "Bb" },
  { email: "c@x.com", display_name: "Cc" },
];

function equalExpense(amount: number, payer: string): BalanceExpense {
  const per = Math.round((amount / members.length) * 100) / 100;
  return {
    amount,
    paid_by_email: payer,
    shares: members.map((m, i) => ({
      email: m.email,
      display_name: m.display_name,
      share_amount:
        i === members.length - 1 ? amount - per * (members.length - 1) : per,
    })),
  };
}

describe("computeNetBalances", () => {
  it("payer is a creditor for what others consumed", () => {
    const net = computeNetBalances(members, [equalExpense(300, "a@x.com")]);
    const a = net.find((n) => n.email === "a@x.com")!;
    const b = net.find((n) => n.email === "b@x.com")!;
    const c = net.find((n) => n.email === "c@x.com")!;
    expect(a.net).toBe(200); // paid 300, own share 100
    expect(b.net).toBe(-100);
    expect(c.net).toBe(-100);
  });

  it("net balances always sum to zero", () => {
    const net = computeNetBalances(members, [
      equalExpense(300, "a@x.com"),
      equalExpense(90, "b@x.com"),
    ]);
    const sum = net.reduce((s, n) => s + n.net, 0);
    expect(Math.round(sum * 100) / 100).toBe(0);
  });

  it("settlement reduces debt and credit by exact amount", () => {
    const net = computeNetBalances(
      members,
      [equalExpense(300, "a@x.com")],
      [{ from_email: "b@x.com", to_email: "a@x.com", amount: 100 }],
    );
    expect(net.find((n) => n.email === "b@x.com")!.net).toBe(0);
    expect(net.find((n) => n.email === "a@x.com")!.net).toBe(100);
    expect(net.find((n) => n.email === "c@x.com")!.net).toBe(-100);
  });
});

describe("simplifyDebts", () => {
  it("produces a single edge for a simple two-person debt", () => {
    const net = computeNetBalances(members, [equalExpense(300, "a@x.com")]);
    const edges = simplifyDebts(net);
    expect(edges.length).toBe(2); // b->a, c->a
    for (const e of edges) {
      expect(e.to_email).toBe("a@x.com");
      expect(e.amount).toBe(100);
    }
  });

  it("minimizes transactions in a cyclic scenario", () => {
    // A paid 300 (all owe), B paid 300 (all owe). Net: A +200-100=... compute.
    const { net, edges } = computeGroupBalances(members, [
      equalExpense(300, "a@x.com"),
      equalExpense(300, "b@x.com"),
    ]);
    // A: paid 600? no. A paid 300 once. B paid 300 once.
    // A net = 300 - 100 - 100 = +100 (from own two shares 100+100=200, paid 300) => 100
    // Actually A shares: 100 (exp1) + 100 (exp2) = 200 consumed; paid 300 => +100
    // B similarly +100; C: consumed 200, paid 0 => -200
    expect(net.find((n) => n.email === "c@x.com")!.net).toBe(-200);
    // C must pay A and B: 2 edges, no more.
    expect(edges.length).toBe(2);
    const sumOut = edges.reduce((s, e) => s + e.amount, 0);
    expect(Math.round(sumOut * 100) / 100).toBe(200);
  });

  it("returns no edges when everyone is settled", () => {
    const net = computeNetBalances(
      members,
      [equalExpense(300, "a@x.com")],
      [
        { from_email: "b@x.com", to_email: "a@x.com", amount: 100 },
        { from_email: "c@x.com", to_email: "a@x.com", amount: 100 },
      ],
    );
    expect(simplifyDebts(net)).toHaveLength(0);
  });

  it("never creates more than n-1 edges", () => {
    const { edges } = computeGroupBalances(members, [
      equalExpense(300, "a@x.com"),
      equalExpense(150, "b@x.com"),
      equalExpense(90, "c@x.com"),
    ]);
    expect(edges.length).toBeLessThanOrEqual(members.length - 1);
  });
});
