import { describe, expect, it } from "vitest";
import { legacyFixPlanAccess, parseFixPlanAccessRow } from "./fixPlanAccess";

describe("fix plan access", () => {
  it("parses the RPC row (array or object)", () => {
    expect(
      parseFixPlanAccessRow([
        { has_access: true, reason: "purchase", expires_at: "2027-01-01" },
      ]),
    ).toEqual({ hasAccess: true, reason: "purchase", expiresAt: "2027-01-01" });
    expect(
      parseFixPlanAccessRow({ has_access: false, reason: "expired" }),
    ).toEqual({ hasAccess: false, reason: "expired", expiresAt: null });
    expect(parseFixPlanAccessRow([])).toBeNull();
    expect(parseFixPlanAccessRow(null)).toBeNull();
  });

  it("falls back to Pro / admin before migration 061", () => {
    expect(legacyFixPlanAccess({ subscriptionTier: "pro" }).hasAccess).toBe(
      true,
    );
    expect(legacyFixPlanAccess({ isAdmin: true }).hasAccess).toBe(true);
    expect(legacyFixPlanAccess({ subscriptionTier: "free" }).hasAccess).toBe(
      false,
    );
    expect(legacyFixPlanAccess(null).hasAccess).toBe(false);
  });
});
