import { describe, expect, it } from "vitest";
import {
  TRACKER_CATEGORIES,
  countsTowardTrackerTotals,
  findSubcategory,
  pickerSubcategories,
  type BucketType,
} from "./tracker-categories";

const BUCKETS = Object.keys(TRACKER_CATEGORIES) as BucketType[];

describe("TRACKER_CATEGORIES", () => {
  it("includes Others in expense/savings sections; income uses Other income", () => {
    for (const bucket of BUCKETS) {
      if (bucket === "income") {
        expect(findSubcategory("income", "other_income")).toEqual(
          expect.objectContaining({
            id: "other_income",
            label: "Other income",
          }),
        );
        expect(findSubcategory("income", "others")).toBeNull();
        continue;
      }
      const others = TRACKER_CATEGORIES[bucket].subcategories.find(
        (s) => s.id === "others",
      );
      expect(others, `${bucket} missing others`).toEqual(
        expect.objectContaining({ id: "others", label: "Others" }),
      );
    }
  });

  it("includes savings account and loan repayment under investments", () => {
    expect(findSubcategory("investment", "savings_account")).toEqual(
      expect.objectContaining({
        id: "savings_account",
        label: "Savings account / cash",
      }),
    );
    expect(findSubcategory("investment", "loan_prepayment")).toEqual(
      expect.objectContaining({
        id: "loan_prepayment",
        label: "Loan repayment (extra / lump sum)",
      }),
    );
  });

  it("picker hides legacy transport_essential but keeps others", () => {
    const needs = pickerSubcategories("needs");
    const ids = needs.map((s) => s.id as string);
    expect(ids).not.toContain("transport_essential");
    expect(ids).toContain("others");
    expect(ids).toContain("rent");
  });

  it("keeps loan_prepayment out of investment bucket totals", () => {
    expect(
      countsTowardTrackerTotals({
        bucket: "investment",
        subcategory: "loan_prepayment",
        payment_method: "upi",
      }),
    ).toBe(false);
    expect(countsTowardTrackerTotals({ subcategory: "rent" })).toBe(true);
    expect(countsTowardTrackerTotals({ subcategory: "sip" })).toBe(true);
  });

  it("excludes credit-card purchases from tracker totals; keeps bill pays", () => {
    expect(
      countsTowardTrackerTotals({
        bucket: "needs",
        subcategory: "rent",
        payment_method: "credit_card::c1::HDFC",
      }),
    ).toBe(false);
    expect(
      countsTowardTrackerTotals({
        bucket: "loans",
        subcategory: "credit_card",
        payment_method: "upi",
      }),
    ).toBe(true);
    expect(
      countsTowardTrackerTotals({
        bucket: "needs",
        subcategory: "rent",
        payment_method: "upi",
      }),
    ).toBe(true);
  });
});
