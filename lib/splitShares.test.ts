import { describe, expect, it } from "vitest";
import { computeSplitShares } from "./splitShares";

const members = [
  { email: "a@x.com", display_name: "A" },
  { email: "b@x.com", display_name: "B" },
  { email: "c@x.com", display_name: "C" },
];

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

  it("equal split rounds so shares sum exactly", () => {
    const { shares, error } = computeSplitShares({
      amount: 100,
      splitType: "equal",
      includedMembers: members,
    });
    expect(error).toBeNull();
    const sum = shares.reduce((s, x) => s + x.share_amount, 0);
    expect(sum).toBe(100);
    expect(shares.every((s) => s.email.includes("@"))).toBe(true);
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
    expect(shares.reduce((s, x) => s + x.share_amount, 0)).toBe(3000);
  });

  it("percentage split requires 100%", () => {
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
    const sum = ok.shares.reduce((s, x) => s + x.share_amount, 0);
    expect(sum).toBe(200);
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
});
