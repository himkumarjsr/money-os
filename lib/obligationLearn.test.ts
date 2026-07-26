import { describe, expect, it } from "vitest";
import { candidateFromExpense, decideObligationLearn } from "./obligationLearn";

describe("decideObligationLearn", () => {
  it("skips when a similar obligation already exists", () => {
    expect(
      decideObligationLearn({
        description: "HDFC Home Loan EMI",
        amount: 25000,
        category: "loan_emi",
        existing: [{ category: "loan_emi", amount: 24950 }],
        priorTransactions: [],
      }),
    ).toBe("skip");
  });

  it("auto-adds when a prior month had a similar payment", () => {
    expect(
      decideObligationLearn({
        description: "LIC Premium",
        amount: 12000,
        category: "insurance_life",
        existing: [],
        priorTransactions: [
          { description: "LIC Premium May", amount: 12000, date: "2026-05-10" },
        ],
      }),
    ).toBe("auto");
  });

  it("suggests when first time seeing the pattern", () => {
    expect(
      decideObligationLearn({
        description: "Netflix",
        amount: 649,
        category: "subscription",
        existing: [],
        priorTransactions: [],
      }),
    ).toBe("suggest");
  });

  it("builds a candidate title from description", () => {
    expect(candidateFromExpense("SIP Axis", 5000, "investment_sip")).toEqual({
      title: "SIP Axis",
      category: "investment_sip",
      amount: 5000,
    });
  });
});
