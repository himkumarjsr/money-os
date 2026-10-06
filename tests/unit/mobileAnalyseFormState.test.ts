import { describe, expect, it, vi } from "vitest";
import {
  analyseDefaultValues,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import { emergencyFundMonthsNeeded } from "@/lib/financialEngine";
import {
  clampYearOnBlur,
  cleanLoansAndObligations,
  deriveHasVehicle,
  emergencyFundSuggestionFor,
  initialUiState,
  loanUiFromRows,
  loansOffPatch,
  mergeResumeValues,
  moneyTextOnFocus,
  moneyValueOnBlur,
  ownsCarOffPatch,
  resizeKidSlots,
  resolveVehicleToggle,
  shouldAutoFillEmergencyTarget,
  startFreshUiState,
} from "../../mobile/components/analyse/form/formState";

type Loan = NonNullable<AnalyseFormValues["unifiedLoans"]>[number];

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: "loan-1",
  loanType: "personal_loan",
  lenderName: "HDFC",
  monthlyEMI: 12000,
  outstandingAmount: 300000,
  interestRate: 12,
  remainingMonths: 24,
  odLimit: 0,
  odUsed: 0,
  odInterestOnlyYears: 0,
  ...overrides,
});

describe("loan resume", () => {
  it("uses last-submission loans when the draft array is empty", () => {
    const profileLoans = [
      loan({ id: "p1" }),
      loan({ id: "p2", monthlyEMI: 0 }),
    ];
    const merged = mergeResumeValues(
      { unifiedLoans: profileLoans },
      { ...analyseDefaultValues, unifiedLoans: [] },
    );
    expect(merged.unifiedLoans?.map((l) => l.id)).toEqual(["p1", "p2"]);
  });

  it("prefers the draft when the draft has rows", () => {
    const merged = mergeResumeValues(
      { unifiedLoans: [loan({ id: "p1" })] },
      { unifiedLoans: [loan({ id: "d1", monthlyEMI: 5000 })] },
    );
    expect(merged.unifiedLoans?.map((l) => l.id)).toEqual(["d1"]);
    expect(merged.unifiedLoans?.[0].monthlyEMI).toBe(5000);
  });

  it("stays empty when neither source has rows", () => {
    const merged = mergeResumeValues({}, { unifiedLoans: [] });
    expect(merged.unifiedLoans).toEqual([]);
  });

  it("restores the toggle and collapses filled rows", () => {
    expect(
      loanUiFromRows([loan({ id: "a" }), loan({ id: "b", monthlyEMI: 0 })]),
    ).toEqual({ hasLoans: true, savedLoanIds: ["a"] });
    expect(loanUiFromRows([])).toEqual({ hasLoans: false, savedLoanIds: [] });
  });
});

describe("loans toggled off", () => {
  it("persists an empty loan array and clears legacy loan scalars", () => {
    const persist = vi.fn();
    const values = {
      ...analyseDefaultValues,
      unifiedLoans: [loan()],
      homeLoanEMI: 20000,
      carLoanEMI: 8000,
    } as AnalyseFormValues;
    persist({ ...values, ...loansOffPatch() });
    const saved = persist.mock.calls[0][0] as AnalyseFormValues;
    expect(saved.unifiedLoans).toEqual([]);
    expect(saved.homeLoanEMI).toBe(0);
    expect(saved.carLoanEMI).toBe(0);
    expect(saved.additionalObligations).toEqual([]);
  });

  it("an emptied draft resumes as no loans when the profile has none", () => {
    const draft = { ...analyseDefaultValues, ...loansOffPatch() };
    const merged = mergeResumeValues({}, draft);
    expect(merged.unifiedLoans).toEqual([]);
    expect(loanUiFromRows(merged.unifiedLoans).hasLoans).toBe(false);
  });
});

describe("start fresh", () => {
  it("resets every loan UI flag, not just form values", () => {
    const before = {
      ...initialUiState({ unifiedLoans: [loan()] } as never),
      savedLoanIds: ["a", "b"],
      isRenting: true,
      hasCreditCardOutstanding: true,
    };
    expect(before.hasLoans).toBe(true);
    expect(startFreshUiState()).toEqual({
      isRenting: false,
      hasLoans: false,
      hasCreditCardOutstanding: false,
      savedLoanIds: [],
    });
  });
});

describe("blank loan cleanup", () => {
  it("drops zero-EMI rows and canonicalises lender + OD usage", () => {
    const cleaned = cleanLoansAndObligations({
      unifiedLoans: [
        loan({ id: "keep", lenderName: " icici ", loanType: "overdraft" }),
        loan({ id: "drop", monthlyEMI: 0 }),
      ],
    });
    expect(cleaned.unifiedLoans).toHaveLength(1);
    expect(cleaned.unifiedLoans[0].lenderName).toBe("ICICI");
    expect(cleaned.unifiedLoans[0].odUsed).toBe(300000);
  });
});

describe("vehicle", () => {
  it("derives from the numbers only", () => {
    expect(deriveHasVehicle({})).toBe(false);
    expect(deriveHasVehicle({ carLoanEMI: 1 })).toBe(true);
    expect(deriveHasVehicle({ carMarketValue: 1 })).toBe(true);
    expect(deriveHasVehicle({ bikeEMI: 1 })).toBe(true);
    expect(
      deriveHasVehicle({ unifiedLoans: [loan({ loanType: "car_loan" })] }),
    ).toBe(true);
  });

  it("an explicit answer wins and no answer falls back to derived", () => {
    expect(resolveVehicleToggle(null, false)).toBe(false);
    expect(resolveVehicleToggle(true, false)).toBe(true);
    expect(resolveVehicleToggle(false, true)).toBe(false);
    expect(resolveVehicleToggle(null, true)).toBe(true);
  });

  it("ownsCar off keeps the buy-car goal", () => {
    const values = {
      carMarketValue: 500000,
      carLoanOutstanding: 200000,
      carPurchaseTarget: 900000,
      carPurchaseYear: 2029,
    };
    const next = { ...values, ...ownsCarOffPatch() };
    expect(next.carMarketValue).toBe(0);
    expect(next.carLoanOutstanding).toBe(0);
    expect(next.carPurchaseTarget).toBe(900000);
    expect(next.carPurchaseYear).toBe(2029);
  });
});

describe("emergency fund suggestion", () => {
  it("uses emergencyFundMonthsNeeded instead of a fixed 6 months", () => {
    const kids = { lifeStage: "kids" as const, kidsAges: [4] };
    const s = emergencyFundSuggestionFor(kids, 50000);
    expect(s.months).toBe(emergencyFundMonthsNeeded(kids));
    expect(s.months).toBe(12);
    expect(s.amount).toBe(600000);

    const single = { lifeStage: "bachelor" as const, parentsSupport: 0 };
    expect(emergencyFundSuggestionFor(single, 50000).amount).toBe(
      50000 * emergencyFundMonthsNeeded(single),
    );
    expect(emergencyFundSuggestionFor(single, 0).amount).toBeUndefined();
  });

  const base = {
    alreadyFired: false,
    primaryGoal: "build_emergency_fund",
    suggestion: 300000,
    currentValue: 0,
    userEdited: false,
  };

  it("fires once per session", () => {
    expect(shouldAutoFillEmergencyTarget(base)).toBe(true);
    expect(shouldAutoFillEmergencyTarget({ ...base, alreadyFired: true })).toBe(
      false,
    );
  });

  it("never overwrites a user-changed value, even 0 or blank", () => {
    expect(
      shouldAutoFillEmergencyTarget({
        ...base,
        currentValue: 0,
        userEdited: true,
      }),
    ).toBe(false);
    expect(
      shouldAutoFillEmergencyTarget({
        ...base,
        currentValue: undefined,
        userEdited: true,
      }),
    ).toBe(false);
    expect(
      shouldAutoFillEmergencyTarget({ ...base, currentValue: 150000 }),
    ).toBe(false);
  });

  it("only for the emergency goal with a positive suggestion", () => {
    expect(
      shouldAutoFillEmergencyTarget({ ...base, primaryGoal: "grow_wealth" }),
    ).toBe(false);
    expect(
      shouldAutoFillEmergencyTarget({ ...base, suggestion: undefined }),
    ).toBe(false);
  });
});

describe("money input focus/blur", () => {
  it("focus clears text only when the value is 0 / empty", () => {
    expect(moneyTextOnFocus("", 0)).toBe("");
    expect(moneyTextOnFocus("0", 0)).toBe("");
    expect(moneyTextOnFocus("", undefined)).toBe("");
    expect(moneyTextOnFocus("1,50,000", 150000)).toBe("1,50,000");
  });

  it("blur snaps to 0 only when empty after stripping separators", () => {
    expect(moneyValueOnBlur("")).toEqual({ value: 0, empty: true });
    expect(moneyValueOnBlur(" , ₹ ")).toEqual({ value: 0, empty: true });
    expect(moneyValueOnBlur("₹1,50,000")).toEqual({
      value: 150000,
      empty: false,
    });
    expect(moneyValueOnBlur("12.5")).toEqual({ value: 12.5, empty: false });
    expect(moneyValueOnBlur("0")).toEqual({ value: 0, empty: false });
  });
});

describe("year on blur", () => {
  it("clamps once on blur; blank means not set", () => {
    expect(clampYearOnBlur("", 2024, 2060)).toBe(0);
    expect(clampYearOnBlur("2030", 2024, 2060)).toBe(2030);
    expect(clampYearOnBlur("20", 2024, 2060)).toBe(2024);
    expect(clampYearOnBlur("2099", 2024, 2060)).toBe(2060);
  });
});

describe("kid slots", () => {
  it("new slots are undefined and a typed 0 is kept", () => {
    expect(resizeKidSlots([0, 5], 3)).toEqual([0, 5, undefined]);
    expect(resizeKidSlots([3, 5, 7], 2)).toEqual([3, 5]);
    expect(resizeKidSlots(undefined, 2)).toEqual([undefined, undefined]);
  });
});

describe("loans cleared by the user stay cleared on resume", () => {
  it("ignores last submission loans when the No marker is set", async () => {
    const { mergeResumeValues, readLoansCleared, writeLoansCleared } =
      await import("../../mobile/components/analyse/form/formState");
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const profileForm = {
      unifiedLoans: [{ id: "a", loanType: "personal_loan", monthlyEMI: 9000 }],
    } as never;
    const draft = { unifiedLoans: [] } as never;

    expect(mergeResumeValues(profileForm, draft).unifiedLoans).toHaveLength(1);

    writeLoansCleared(storage, true);
    expect(
      mergeResumeValues(profileForm, draft, readLoansCleared(storage))
        .unifiedLoans,
    ).toEqual([]);

    writeLoansCleared(storage, false);
    expect(readLoansCleared(storage)).toBe(false);
  });
});
