import { describe, expect, it } from "vitest";
import {
  countsTowardTrackerTotals,
  findSubcategory,
} from "./tracker-categories";
import {
  countsTowardCashSpend,
  displayPaymentMethod,
  sumCashSpend,
} from "./trackerCreditCards";
import { EXPENSE_SUBCATEGORY_TO_OBLIGATION } from "./trackerMonthIncome";
import { isPaidFromSavings } from "./trackerSavingsPayment";

describe("premiums paid from RD savings", () => {
  const monthlyRd = {
    amount: 2000,
    bucket: "security",
    subcategory: "premium_rd",
    payment_method: "upi",
  };
  const renewal = {
    amount: 24000,
    bucket: "security",
    subcategory: "health_insurance",
    payment_method: "rd_savings",
  };

  it("monthly RD contributions count under Security and reduce Left", () => {
    expect(findSubcategory("security", "premium_rd")?.label).toBe(
      "RD for insurance premiums",
    );
    expect(countsTowardTrackerTotals(monthlyRd)).toBe(true);
    expect(countsTowardCashSpend(monthlyRd)).toBe(true);
    expect(EXPENSE_SUBCATEGORY_TO_OBLIGATION.premium_rd).toBe("insurance_rd");
  });

  it("the renewal paid from the RD is not counted again", () => {
    expect(isPaidFromSavings(renewal)).toBe(true);
    expect(countsTowardTrackerTotals(renewal)).toBe(false);
    expect(countsTowardCashSpend(renewal)).toBe(false);
    expect(sumCashSpend([monthlyRd, renewal])).toBe(2000);
    expect(displayPaymentMethod("rd_savings")).toBe("RD savings");
  });

  it("other payment methods are unaffected", () => {
    expect(isPaidFromSavings({ payment_method: "upi" })).toBe(false);
    expect(isPaidFromSavings({ payment_method: null })).toBe(false);
    expect(
      countsTowardTrackerTotals({ ...renewal, payment_method: "netbanking" }),
    ).toBe(true);
  });
});
