import { describe, expect, it } from "vitest";
import {
  candidateFromExpense,
  decideObligationLearn,
  shouldLearnObligationFromExpense,
} from "./obligationLearn";

describe("decideObligationLearn", () => {
  it("skips non-positive or non-finite amounts", () => {
    expect(
      decideObligationLearn({
        description: "EMI",
        amount: 0,
        category: "loan_emi",
        existing: [],
        priorTransactions: [],
      }),
    ).toBe("skip");
    expect(
      decideObligationLearn({
        description: "EMI",
        amount: -100,
        category: "loan_emi",
        existing: [],
        priorTransactions: [],
      }),
    ).toBe("skip");
    expect(
      decideObligationLearn({
        description: "EMI",
        amount: Number.NaN,
        category: "loan_emi",
        existing: [],
        priorTransactions: [],
      }),
    ).toBe("skip");
  });

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

  it("does not skip when existing row is a different category", () => {
    expect(
      decideObligationLearn({
        description: "Netflix",
        amount: 649,
        category: "subscription",
        existing: [{ category: "loan_emi", amount: 649 }],
        priorTransactions: [],
      }),
    ).toBe("suggest");
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

  it("auto-adds when prior description is a shorter prefix match", () => {
    expect(
      decideObligationLearn({
        description: "LIC Premium June installment",
        amount: 10000,
        category: "insurance_life",
        existing: [],
        priorTransactions: [{ description: "LIC Premium", amount: 10000 }],
      }),
    ).toBe("auto");
  });

  it("ignores prior rows whose amount differs beyond the tolerance", () => {
    expect(
      decideObligationLearn({
        description: "LIC Premium",
        amount: 12000,
        category: "insurance_life",
        existing: [],
        priorTransactions: [
          { description: "LIC Premium", amount: 20000 }, // >15% and >₹100
        ],
      }),
    ).toBe("suggest");
  });

  it("ignores prior rows when either description is empty after normalize", () => {
    expect(
      decideObligationLearn({
        description: "   ",
        amount: 5000,
        category: "rent",
        existing: [],
        priorTransactions: [{ description: "Rent May", amount: 5000 }],
      }),
    ).toBe("suggest");
    expect(
      decideObligationLearn({
        description: "Rent",
        amount: 5000,
        category: "rent",
        existing: [],
        priorTransactions: [{ description: null, amount: 5000 }],
      }),
    ).toBe("suggest");
  });

  it("strips tracker tags when matching prior descriptions", () => {
    expect(
      decideObligationLearn({
        description: "SIP Axis [#abc]",
        amount: 5000,
        category: "investment_sip",
        existing: [],
        priorTransactions: [{ description: "SIP Axis [#xyz]", amount: 5000 }],
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

  it("builds a candidate title from description or category fallback", () => {
    expect(candidateFromExpense("SIP Axis", 5000, "investment_sip")).toEqual({
      title: "SIP Axis",
      category: "investment_sip",
      amount: 5000,
    });
    expect(candidateFromExpense(null, 5000, "investment_sip")).toEqual({
      title: "investment sip",
      category: "investment_sip",
      amount: 5000,
    });
    expect(candidateFromExpense("   ", 100, "rent")).toEqual({
      title: "rent",
      category: "rent",
      amount: 100,
    });
  });
});

describe("shouldLearnObligationFromExpense", () => {
  it("skips when obligation category is missing", () => {
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: null,
        decision: "auto",
        fromMappedSubcategory: true,
      }),
    ).toBe("skip");
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "  ",
        decision: "suggest",
        fromMappedSubcategory: true,
      }),
    ).toBe("skip");
  });

  it("never learns credit_card obligations from tracker expenses", () => {
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "credit_card",
        decision: "auto",
        fromMappedSubcategory: true,
      }),
    ).toBe("skip");
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "credit_card",
        decision: "suggest",
        fromMappedSubcategory: true,
      }),
    ).toBe("skip");
  });

  it("adds on auto decision for non-credit categories", () => {
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "loan_emi",
        decision: "auto",
        fromMappedSubcategory: false,
      }),
    ).toBe("add");
  });

  it("auto-adds mapped loan types; suggests unknown first-time patterns", () => {
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "loan_emi",
        decision: "suggest",
        fromMappedSubcategory: true,
      }),
    ).toBe("add");
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "subscription",
        decision: "suggest",
        fromMappedSubcategory: false,
      }),
    ).toBe("suggest");
  });

  it("on skip decision: mapped subcategory still adds; otherwise skips", () => {
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "loan_emi",
        decision: "skip",
        fromMappedSubcategory: true,
      }),
    ).toBe("add");
    expect(
      shouldLearnObligationFromExpense({
        obligationCategory: "subscription",
        decision: "skip",
        fromMappedSubcategory: false,
      }),
    ).toBe("skip");
  });
});
