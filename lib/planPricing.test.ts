import { describe, expect, it } from "vitest";
import { planPriceDisplay, yearlySavingPct } from "./planPricing";

describe("plan pricing", () => {
  it("yearly savings match the plan cards", () => {
    expect(yearlySavingPct("pro")).toBe(32);
    expect(yearlySavingPct("promax")).toBe(33);
  });
  it("shows the per-month note for yearly only", () => {
    expect(planPriceDisplay("pro", "yearly")).toMatchObject({
      price: "₹399",
      period: "/year",
      note: "₹33/month, billed yearly",
      saveLabel: "Save 32%",
    });
    expect(planPriceDisplay("promax", "yearly").note).toBe(
      "₹67/month, billed yearly",
    );
    expect(planPriceDisplay("pro", "monthly")).toMatchObject({
      price: "₹49",
      period: "/month",
      note: null,
      saveLabel: null,
    });
  });
});
