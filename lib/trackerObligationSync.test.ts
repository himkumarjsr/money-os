import { describe, expect, it } from "vitest";
import {
  expenseCoversChecklistItem,
  findPendingChecklistForExpense,
  obligationCategoryFromExpense,
  obligationMatchScore,
  planObligationExpenseSync,
} from "./trackerObligationSync";

describe("obligationCategoryFromExpense", () => {
  it("maps home loan EMI subcategory", () => {
    expect(
      obligationCategoryFromExpense({
        subcategory: "home_loan_emi",
        category: "home_loan_emi",
      }),
    ).toBe("loan_emi");
  });

  it("maps tracker Personal loan EMI id (personal_loan)", () => {
    expect(
      obligationCategoryFromExpense({
        bucket: "loans",
        subcategory: "personal_loan",
      }),
    ).toBe("loan_emi");
  });

  it("maps credit card, SIP bucket, and description hints", () => {
    expect(
      obligationCategoryFromExpense({
        bucket: "loans",
        subcategory: "credit_card",
      }),
    ).toBe("credit_card");
    expect(
      obligationCategoryFromExpense({
        bucket: "loans",
        subcategory: "others",
      }),
    ).toBeNull();
    expect(
      obligationCategoryFromExpense({
        bucket: "investment",
        subcategory: "sip",
      }),
    ).toBe("investment_sip");
    expect(obligationCategoryFromExpense({ bucket: "investment" })).toBe(
      "investment_sip",
    );
    expect(
      obligationCategoryFromExpense({
        bucket: "needs",
        description: "Paid health insurance premium",
      }),
    ).toBe("insurance_health");
    expect(
      obligationCategoryFromExpense({
        bucket: "needs",
        description: "PPF deposit",
      }),
    ).toBe("investment_ppf");
  });
});

describe("obligationMatchScore", () => {
  it("scores category, title, and bucket hints", () => {
    const item = {
      id: "c1",
      status: "pending",
      expected_amount: 1000,
      obligation: { title: "Home EMI", category: "loan_emi" },
    };
    expect(
      obligationMatchScore(
        {
          amount: 1000,
          bucket: "loans",
          subcategory: "home_loan_emi",
          description: "Home EMI July",
        },
        item,
      ),
    ).toBeGreaterThan(10);
    expect(
      obligationMatchScore(
        { amount: 1000, bucket: "needs", description: "rent house" },
        {
          ...item,
          obligation: { title: "Rent", category: "rent" },
        },
      ),
    ).toBeGreaterThan(0);
  });
});

describe("planObligationExpenseSync — amount first", () => {
  const homeLoan = {
    id: "c1",
    status: "pending" as const,
    expected_amount: 28760,
    paid_amount: null as number | null,
    obligation: { title: "Home loan", category: "loan_emi" },
  };

  it("ticks home loan when any non-income expense has the same amount", () => {
    const plan = planObligationExpenseSync({
      checklist: [homeLoan],
      expenses: [
        {
          id: "t1",
          amount: 28760,
          bucket: "loans",
          subcategory: "personal_loan", // wrong subtype — amount still wins
          description: null,
        },
      ],
    });
    expect(plan.markPaid).toEqual([{ id: "c1", amount: 28760 }]);
  });

  it("ticks HDFC/ICICI by amount alone", () => {
    const plan = planObligationExpenseSync({
      checklist: [
        {
          id: "c-hdfc",
          status: "pending",
          expected_amount: 66172,
          obligation: { title: "HDFC LOAN EMI", category: "loan_emi" },
        },
        {
          id: "c-icici",
          status: "pending",
          expected_amount: 42055,
          obligation: { title: "ICICI LOAN EMI", category: "loan_emi" },
        },
      ],
      expenses: [
        {
          id: "t1",
          amount: 66172,
          bucket: "loans",
          subcategory: "personal_loan",
        },
        {
          id: "t2",
          amount: 42055,
          bucket: "loans",
          subcategory: "personal_loan",
        },
      ],
    });
    expect(plan.markPaid).toEqual([
      { id: "c-hdfc", amount: 66172 },
      { id: "c-icici", amount: 42055 },
    ]);
  });

  it("does not use income rows to tick obligations", () => {
    const plan = planObligationExpenseSync({
      checklist: [homeLoan],
      expenses: [
        {
          id: "t1",
          amount: 28760,
          bucket: "income",
          subcategory: "salary",
        },
      ],
    });
    expect(plan.markPaid).toEqual([]);
  });

  it("unmarks when matching amount expense is gone", () => {
    const plan = planObligationExpenseSync({
      checklist: [
        {
          ...homeLoan,
          status: "paid",
          paid_amount: 28760,
        },
      ],
      expenses: [],
    });
    expect(plan.markUnpaid).toEqual(["c1"]);
  });

  it("when two obligations share an amount, prefers category/title hint", () => {
    const plan = planObligationExpenseSync({
      checklist: [
        {
          id: "c-rent",
          status: "pending",
          expected_amount: 10000,
          obligation: { title: "Rent", category: "rent" },
        },
        {
          id: "c-emi",
          status: "pending",
          expected_amount: 10000,
          obligation: { title: "Small EMI", category: "loan_emi" },
        },
      ],
      expenses: [
        {
          id: "t1",
          amount: 10000,
          bucket: "loans",
          subcategory: "home_loan_emi",
          description: "Small EMI",
        },
      ],
    });
    expect(plan.markPaid).toEqual([{ id: "c-emi", amount: 10000 }]);
  });
});

describe("findPendingChecklistForExpense", () => {
  it("picks the row with the matching amount", () => {
    const checklist = [
      {
        id: "c1",
        status: "pending",
        expected_amount: 27860,
        obligation: { title: "Home loan", category: "loan_emi" },
      },
      {
        id: "c2",
        status: "pending",
        expected_amount: 66172,
        obligation: { title: "HDFC LOAN EMI", category: "loan_emi" },
      },
    ];
    const hit = findPendingChecklistForExpense(checklist, {
      amount: 66172,
      bucket: "loans",
      subcategory: "other_loan",
    });
    expect(hit?.id).toBe("c2");
  });

  it("returns undefined for income / no match / ties broken by score", () => {
    expect(
      findPendingChecklistForExpense(
        [{ id: "c1", status: "pending", expected_amount: 100 }],
        { amount: 100, bucket: "income" },
      ),
    ).toBeUndefined();
    expect(
      findPendingChecklistForExpense(
        [{ id: "c1", status: "pending", expected_amount: 100 }],
        { amount: 99, bucket: "needs" },
      ),
    ).toBeUndefined();

    const tied = findPendingChecklistForExpense(
      [
        {
          id: "a",
          status: "pending",
          expected_amount: 500,
          obligation: { title: "Rent", category: "rent" },
        },
        {
          id: "b",
          status: "pending",
          expected_amount: 500,
          obligation: { title: "EMI", category: "loan_emi" },
        },
      ],
      {
        amount: 500,
        bucket: "loans",
        subcategory: "home_loan_emi",
        description: "EMI",
      },
    );
    expect(tied?.id).toBe("b");
  });

  it("matches paid_amount as well as expected_amount", () => {
    expect(
      expenseCoversChecklistItem(200, null, null, {
        expected_amount: 999,
        paid_amount: 200,
      }),
    ).toBe(true);
  });
});

describe("planObligationExpenseSync edge cases", () => {
  it("ignores skipped/auto_debit and avoids double-assigning one expense", () => {
    const plan = planObligationExpenseSync({
      checklist: [
        {
          id: "skip",
          status: "skipped",
          expected_amount: 1000,
          obligation: { title: "X", category: "loan_emi" },
        },
        {
          id: "auto",
          status: "auto_debit",
          expected_amount: 1000,
          obligation: { title: "Y", category: "loan_emi" },
        },
        {
          id: "p1",
          status: "pending",
          expected_amount: 1000,
          obligation: { title: "A", category: "loan_emi" },
        },
        {
          id: "p2",
          status: "pending",
          expected_amount: 1000,
          obligation: { title: "B", category: "loan_emi" },
        },
      ],
      expenses: [
        {
          id: "e1",
          amount: 1000,
          bucket: "loans",
          subcategory: "home_loan_emi",
        },
      ],
    });
    expect(plan.markPaid).toHaveLength(1);
    expect(["p1", "p2"]).toContain(plan.markPaid[0]?.id);
  });

  it("keeps paid rows paid when still covered", () => {
    const plan = planObligationExpenseSync({
      checklist: [
        {
          id: "c1",
          status: "paid",
          expected_amount: 500,
          paid_amount: 500,
          obligation: { title: "EMI", category: "loan_emi" },
        },
      ],
      expenses: [{ id: "e1", amount: 500, bucket: "loans" }],
    });
    expect(plan.markPaid).toEqual([]);
    expect(plan.markUnpaid).toEqual([]);
  });
});

describe("expenseCoversChecklistItem", () => {
  it("is true when amounts match even if category hint differs", () => {
    expect(
      expenseCoversChecklistItem(28760, "anything", "rent", {
        expected_amount: 28760,
        obligation: { title: "Home loan", category: "loan_emi" },
      }),
    ).toBe(true);
  });

  it("is false when amounts differ", () => {
    expect(
      expenseCoversChecklistItem(66172, "Home loan", "loan_emi", {
        expected_amount: 28760,
        obligation: { title: "Home loan", category: "loan_emi" },
      }),
    ).toBe(false);
  });
});
