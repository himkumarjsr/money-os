import { describe, expect, it } from "vitest";
import {
  EXPENSE_SUBCATEGORY_TO_OBLIGATION,
  SAVINGS_CARRY_FORWARD_DESC,
  computeMonthLeftover,
  isNextTrackerMonthUnlocked,
  isSavingsCarryForwardTxn,
  lastFridayOfMonth,
  listSavingsCarryForward,
  monthHasStarted,
  planAutoIncomeCleanup,
  planMonthIncomeFromPrior,
  primarySalaryAmount,
  primarySavingsCarryForward,
  salaryPocketTotal,
  sumCanonicalMonthIncome,
  sumLoggedIncome,
  sumSalaryIncome,
  sumSavingsCarryForward,
  trackerForwardLimit,
} from "./trackerMonthIncome";

describe("monthHasStarted", () => {
  it("is false before the 1st of a future month", () => {
    expect(monthHasStarted(7, 2026, new Date(2026, 6, 31))).toBe(false); // Jul 31 → Aug
  });

  it("is true on/after the 1st", () => {
    expect(monthHasStarted(7, 2026, new Date(2026, 7, 1))).toBe(true);
    expect(monthHasStarted(6, 2026, new Date(2026, 6, 15))).toBe(true);
  });
});

describe("last Friday next-month unlock", () => {
  it("finds last Friday of August 2026 (28th)", () => {
    const d = lastFridayOfMonth(2026, 7); // August
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(28);
    expect(d.getDay()).toBe(5);
  });

  it("keeps next month locked before last Friday", () => {
    // 4 Aug 2026 — well before last Friday (28 Aug)
    expect(isNextTrackerMonthUnlocked(new Date(2026, 7, 4))).toBe(false);
    expect(trackerForwardLimit(new Date(2026, 7, 4))).toEqual({
      month: 7,
      year: 2026,
    });
  });

  it("unlocks next month on last Friday", () => {
    expect(isNextTrackerMonthUnlocked(new Date(2026, 7, 28))).toBe(true);
    expect(trackerForwardLimit(new Date(2026, 7, 28))).toEqual({
      month: 8,
      year: 2026,
    });
  });

  it("stays unlocked after last Friday through month end", () => {
    expect(isNextTrackerMonthUnlocked(new Date(2026, 7, 31))).toBe(true);
    expect(trackerForwardLimit(new Date(2026, 7, 31))).toEqual({
      month: 8,
      year: 2026,
    });
  });

  it("wraps year from December last Friday", () => {
    // Dec 2026 last Friday = 25 Dec
    expect(lastFridayOfMonth(2026, 11).getDate()).toBe(25);
    expect(trackerForwardLimit(new Date(2026, 11, 25))).toEqual({
      month: 0,
      year: 2027,
    });
    expect(trackerForwardLimit(new Date(2026, 11, 20))).toEqual({
      month: 11,
      year: 2026,
    });
  });
});

describe("primarySalaryAmount", () => {
  it("uses the largest salary row instead of summing duplicates", () => {
    expect(
      primarySalaryAmount([
        { bucket: "income", subcategory: "salary", amount: 270000 },
        { bucket: "income", subcategory: "salary", amount: 282460 },
        {
          bucket: "income",
          subcategory: "other_income",
          amount: 21292,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
      ]),
    ).toBe(282460);
  });
});

describe("planMonthIncomeFromPrior", () => {
  it("carries leftover savings and prior salary into next month display", () => {
    const previousTxns = [
      {
        bucket: "income",
        subcategory: "salary",
        amount: 100000,
        description: "Salary",
      },
      {
        bucket: "needs",
        subcategory: "groceries",
        amount: 20000,
        payment_method: "upi",
      },
    ];
    const plan = planMonthIncomeFromPrior({
      previousTxns,
      currentTxns: [],
      profileSalary: 90000,
    });
    expect(plan.salaryAmount).toBe(100000);
    expect(plan.savingsAmount).toBe(80000);
    expect(plan.displayTotal).toBe(180000);
    expect(plan.needsSalaryRow).toBe(true);
    expect(plan.needsSavingsRow).toBe(true);
  });

  it("does not double-count when current month already has rows", () => {
    const previousTxns = [
      {
        bucket: "income",
        subcategory: "salary",
        amount: 100000,
        description: "Salary",
      },
    ];
    const currentTxns = [
      {
        bucket: "income",
        subcategory: "salary",
        amount: 100000,
        description: "Salary",
      },
      {
        bucket: "income",
        subcategory: "other_income",
        amount: 5000,
        description: SAVINGS_CARRY_FORWARD_DESC,
      },
    ];
    const plan = planMonthIncomeFromPrior({
      previousTxns,
      currentTxns,
      profileSalary: 100000,
    });
    expect(plan.displayTotal).toBe(105000);
    expect(plan.needsSalaryRow).toBe(false);
    expect(plan.needsSavingsRow).toBe(false);
  });

  it("keeps savings carry-forward when only salary is logged early", () => {
    const previousTxns = [
      {
        bucket: "income",
        subcategory: "salary",
        amount: 100000,
        description: "Salary",
      },
      {
        bucket: "needs",
        subcategory: "groceries",
        amount: 20000,
        payment_method: "upi",
      },
    ];
    const plan = planMonthIncomeFromPrior({
      previousTxns,
      currentTxns: [
        {
          bucket: "income",
          subcategory: "salary",
          amount: 110000,
          description: "Salary",
        },
      ],
      profileSalary: 100000,
    });
    expect(plan.needsSalaryRow).toBe(false);
    expect(plan.needsSavingsRow).toBe(true);
    expect(plan.displayTotal).toBe(190000); // 110k salary + 80k leftover
  });

  it("does not carry forward leftover from non-salary other income", () => {
    // Bonus-only month: no salary pocket → no CF; salary seeds from profile.
    const previousTxns = [
      {
        bucket: "income",
        subcategory: "other_income",
        amount: 213000,
        description: "Bonus",
      },
      {
        bucket: "needs",
        amount: 193440,
        payment_method: "upi",
      },
    ];
    const plan = planMonthIncomeFromPrior({
      previousTxns,
      currentTxns: [],
      profileSalary: 270000,
    });
    expect(plan.savingsAmount).toBe(0);
    expect(plan.salaryAmount).toBe(270000);
  });

  it("does not inflate display when duplicate salaries exist", () => {
    const plan = planMonthIncomeFromPrior({
      previousTxns: [
        {
          bucket: "income",
          subcategory: "salary",
          amount: 356452,
          description: "Salary",
        },
      ],
      currentTxns: [
        {
          bucket: "income",
          subcategory: "salary",
          amount: 282460,
          description: "Salary",
        },
        {
          bucket: "income",
          subcategory: "salary",
          amount: 270000,
          description: "Salary",
        },
        {
          bucket: "income",
          subcategory: "other_income",
          amount: 21292,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
      ],
      profileSalary: 270000,
    });
    // One salary (max) + one CF — not 282460+270000+21292.
    expect(plan.displayTotal).toBe(282460 + 21292);
    expect(plan.needsSalaryRow).toBe(false);
    expect(plan.needsSavingsRow).toBe(false);
  });

  it("August-style: salary + July left only", () => {
    const previousTxns = [
      {
        bucket: "income",
        subcategory: "salary",
        amount: 356452,
        description: "Salary",
      },
      {
        bucket: "income",
        subcategory: "other_income",
        amount: 19560,
        description: SAVINGS_CARRY_FORWARD_DESC,
      },
      {
        bucket: "needs",
        amount: 354720,
        payment_method: "upi",
      },
    ];
    const plan = planMonthIncomeFromPrior({
      previousTxns,
      currentTxns: [],
      profileSalary: 270000,
    });
    expect(plan.salaryAmount).toBe(356452);
    expect(plan.savingsAmount).toBe(21292);
    expect(plan.displayTotal).toBe(356452 + 21292);
    expect(plan.needsSalaryRow).toBe(true);
    expect(plan.needsSavingsRow).toBe(true);
  });
});

describe("computeMonthLeftover", () => {
  it("ignores credit-card purchase charges for leftover", () => {
    const leftover = computeMonthLeftover(50000, [
      {
        bucket: "wants",
        amount: 10000,
        payment_method: "credit_card::abc::HDFC",
      },
      {
        bucket: "needs",
        amount: 5000,
        payment_method: "upi",
      },
    ]);
    expect(leftover).toBe(45000);
  });
});

describe("planAutoIncomeCleanup", () => {
  it("keeps one salary closest to plan and fixes CF amount", () => {
    const cleanup = planAutoIncomeCleanup({
      salaryAmount: 356452,
      savingsAmount: 21292,
      currentTxns: [
        {
          id: "s1",
          bucket: "income",
          subcategory: "salary",
          amount: 282460,
          description: "Salary",
        },
        {
          id: "s2",
          bucket: "income",
          subcategory: "salary",
          amount: 270000,
          description: "Salary",
        },
        {
          id: "c1",
          bucket: "income",
          subcategory: "other_income",
          amount: 270000,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
      ],
    });
    expect(cleanup.dropIds).toEqual(["s2"]);
    expect(cleanup.updateCf).toEqual({ id: "c1", amount: 21292 });
    expect(cleanup.needsWork).toBe(true);
  });

  it("removes CF when planned leftover is zero", () => {
    const cleanup = planAutoIncomeCleanup({
      salaryAmount: 100000,
      savingsAmount: 0,
      currentTxns: [
        {
          id: "c1",
          bucket: "income",
          subcategory: "other_income",
          amount: 270000,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
      ],
    });
    expect(cleanup.dropIds).toEqual(["c1"]);
    expect(cleanup.updateCf).toBeNull();
  });

  it("drops duplicate CF rows and zeros the keep when target is 0", () => {
    const cleanup = planAutoIncomeCleanup({
      salaryAmount: 100000,
      savingsAmount: 0,
      currentTxns: [
        {
          id: "c1",
          bucket: "income",
          subcategory: "other_income",
          amount: 5000,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
        {
          id: "c2",
          bucket: "income",
          subcategory: "other_income",
          amount: 9000,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
      ],
    });
    expect(cleanup.dropIds.sort()).toEqual(["c1", "c2"]);
    expect(cleanup.updateCf).toBeNull();
  });

  it("updates kept CF when duplicates exist and amount is wrong", () => {
    const cleanup = planAutoIncomeCleanup({
      salaryAmount: 100000,
      savingsAmount: 8000,
      currentTxns: [
        {
          id: "c1",
          bucket: "income",
          subcategory: "other_income",
          amount: 1000,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
        {
          id: "c2",
          bucket: "income",
          subcategory: "other_income",
          amount: 9000,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
      ],
    });
    expect(cleanup.dropIds).toEqual(["c1"]);
    expect(cleanup.updateCf).toEqual({ id: "c2", amount: 8000 });
  });

  it("keeps exact CF and does nothing when already correct", () => {
    const cleanup = planAutoIncomeCleanup({
      salaryAmount: 100000,
      savingsAmount: 5000,
      currentTxns: [
        {
          id: "c1",
          bucket: "income",
          subcategory: "other_income",
          amount: 5000,
          description: SAVINGS_CARRY_FORWARD_DESC,
        },
      ],
    });
    expect(cleanup.dropIds).toEqual([]);
    expect(cleanup.updateCf).toBeNull();
    expect(cleanup.needsWork).toBe(false);
  });

  it("prefers salary equal to target when sorting duplicates", () => {
    const cleanup = planAutoIncomeCleanup({
      salaryAmount: 100000,
      savingsAmount: 0,
      currentTxns: [
        {
          id: "s1",
          bucket: "income",
          subcategory: "salary",
          amount: 100000,
        },
        {
          id: "s2",
          bucket: "income",
          category: "salary",
          amount: 100000,
        },
      ],
    });
    expect(cleanup.dropIds).toHaveLength(1);
    expect(["s1", "s2"]).toContain(cleanup.dropIds[0]);
  });
});

describe("income helpers", () => {
  const mix = [
    { bucket: "income", subcategory: "salary", amount: 100 },
    {
      bucket: "income",
      subcategory: "salary",
      amount: "bad" as unknown as number,
    },
    { bucket: "income", subcategory: "other_income", amount: 50 },
    {
      bucket: "income",
      subcategory: "other_income",
      amount: 25,
      description: SAVINGS_CARRY_FORWARD_DESC,
    },
    {
      bucket: "income",
      subcategory: "other_income",
      amount: 40,
      description: SAVINGS_CARRY_FORWARD_DESC,
    },
    { bucket: "needs", amount: 10 },
    { bucket: "income", amount: -5, subcategory: "other_income" },
  ];

  it("sums logged / salary / CF with guards", () => {
    expect(sumLoggedIncome(mix)).toBe(215);
    expect(sumSalaryIncome(mix)).toBe(100);
    expect(sumSavingsCarryForward(mix)).toBe(65);
    expect(primarySavingsCarryForward(mix)).toBe(40);
    expect(listSavingsCarryForward(mix)).toHaveLength(2);
    expect(salaryPocketTotal(mix)).toBe(140);
    expect(sumCanonicalMonthIncome(mix)).toBe(190); // 100 + 40 + 50
  });

  it("detects carry-forward by description only on income", () => {
    expect(
      isSavingsCarryForwardTxn({
        bucket: "needs",
        amount: 0,
        description: SAVINGS_CARRY_FORWARD_DESC,
      }),
    ).toBe(false);
    expect(
      isSavingsCarryForwardTxn({
        bucket: "income",
        amount: 1,
        description: `  ${SAVINGS_CARRY_FORWARD_DESC}  `,
      }),
    ).toBe(true);
  });

  it("maps loan subcategories to obligations", () => {
    expect(EXPENSE_SUBCATEGORY_TO_OBLIGATION.personal_loan).toBe("loan_emi");
    expect(EXPENSE_SUBCATEGORY_TO_OBLIGATION.home_loan_emi).toBe("loan_emi");
  });
});
