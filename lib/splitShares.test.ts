import { describe, expect, it } from "vitest";
import { computeSplitShares } from "./splitShares";

const members = [
  { email: "a@x.com", display_name: "A" },
  { email: "b@x.com", display_name: "B" },
  { email: "c@x.com", display_name: "C" },
];

function sumShares(shares: { share_amount: number }[]) {
  return Math.round(shares.reduce((s, x) => s + x.share_amount, 0) * 100) / 100;
}

describe("computeSplitShares", () => {
  it("rejects empty members and non-positive amounts", () => {
    expect(
      computeSplitShares({
        amount: 100,
        splitType: "equal",
        includedMembers: [],
      }).error,
    ).toBeTruthy();
    expect(
      computeSplitShares({
        amount: 0,
        splitType: "equal",
        includedMembers: members,
      }).error,
    ).toBeTruthy();
    expect(
      computeSplitShares({
        amount: -5,
        splitType: "equal",
        includedMembers: members,
      }).error,
    ).toBeTruthy();
  });

  describe("equal split", () => {
    it("two people split ₹1000 exactly in half", () => {
      const { shares, error } = computeSplitShares({
        amount: 1000,
        splitType: "equal",
        includedMembers: members.slice(0, 2),
      });
      expect(error).toBeNull();
      expect(shares).toHaveLength(2);
      expect(shares[0].share_amount).toBe(500);
      expect(shares[1].share_amount).toBe(500);
      expect(sumShares(shares)).toBe(1000);
    });

    it("three people: shares differ by at most 1 paise and sum exactly", () => {
      const { shares, error } = computeSplitShares({
        amount: 100,
        splitType: "equal",
        includedMembers: members,
      });
      expect(error).toBeNull();
      expect(sumShares(shares)).toBe(100);
      const amounts = shares.map((s) => s.share_amount);
      const spread =
        Math.round((Math.max(...amounts) - Math.min(...amounts)) * 100) / 100;
      expect(spread).toBeLessThanOrEqual(0.01);
    });

    it("odd paise amount stays fair (₹100.01 / 2)", () => {
      const { shares, error } = computeSplitShares({
        amount: 100.01,
        splitType: "equal",
        includedMembers: members.slice(0, 2),
      });
      expect(error).toBeNull();
      expect(sumShares(shares)).toBe(100.01);
      expect(
        Math.abs(shares[0].share_amount - shares[1].share_amount),
      ).toBeLessThanOrEqual(0.01);
    });

    it("single member takes the full amount", () => {
      const { shares, error } = computeSplitShares({
        amount: 750,
        splitType: "equal",
        includedMembers: [members[0]],
      });
      expect(error).toBeNull();
      expect(shares[0].share_amount).toBe(750);
    });

    it("equal split rounds so shares sum exactly for ₹100 / 3", () => {
      const { shares, error } = computeSplitShares({
        amount: 100,
        splitType: "equal",
        includedMembers: members,
      });
      expect(error).toBeNull();
      expect(sumShares(shares)).toBe(100);
      expect(shares.every((s) => s.email.includes("@"))).toBe(true);
    });
  });

  it("exact split validates total", () => {
    const bad = computeSplitShares({
      amount: 300,
      splitType: "exact",
      includedMembers: members,
      exactAmounts: { "a@x.com": 100, "b@x.com": 100, "c@x.com": 50 },
    });
    expect(bad.error).toMatch(/total/i);

    const ok = computeSplitShares({
      amount: 300,
      splitType: "exact",
      includedMembers: members,
      exactAmounts: { "a@x.com": 100, "b@x.com": 100, "c@x.com": 100 },
    });
    expect(ok.error).toBeNull();
    expect(ok.shares).toHaveLength(3);
    expect(sumShares(ok.shares)).toBe(300);
  });

  it("shares split divides proportionally (2:1)", () => {
    const { shares, error } = computeSplitShares({
      amount: 3000,
      splitType: "shares",
      includedMembers: members.slice(0, 2),
      shareCounts: { "a@x.com": 2, "b@x.com": 1 },
    });
    expect(error).toBeNull();
    expect(shares).toHaveLength(2);
    const byEmail = Object.fromEntries(
      shares.map((s) => [s.email, s.share_amount]),
    );
    expect(byEmail["a@x.com"]).toBe(2000);
    expect(byEmail["b@x.com"]).toBe(1000);
    expect(sumShares(shares)).toBe(3000);
  });

  it("percentage split requires 100% and sums exactly", () => {
    const bad = computeSplitShares({
      amount: 200,
      splitType: "percentage",
      includedMembers: members.slice(0, 2),
      percentages: { "a@x.com": 40, "b@x.com": 40 },
    });
    expect(bad.error).toMatch(/100/);

    const ok = computeSplitShares({
      amount: 200,
      splitType: "percentage",
      includedMembers: members.slice(0, 2),
      percentages: { "a@x.com": 60, "b@x.com": 40 },
    });
    expect(ok.error).toBeNull();
    expect(sumShares(ok.shares)).toBe(200);
    expect(ok.shares[0].share_amount).toBe(120);
    expect(ok.shares[1].share_amount).toBe(80);
  });

  it("normalizes emails to lowercase", () => {
    const { shares, error } = computeSplitShares({
      amount: 50,
      splitType: "equal",
      includedMembers: [{ email: "A@X.COM", display_name: "A" }],
    });
    expect(error).toBeNull();
    expect(shares[0]?.email).toBe("a@x.com");
  });

  it("rejects unsupported split type", () => {
    const res = computeSplitShares({
      amount: 100,
      // @ts-expect-error intentional invalid type
      splitType: "weird",
      includedMembers: members.slice(0, 1),
    });
    expect(res.error).toMatch(/unsupported/i);
  });
});
