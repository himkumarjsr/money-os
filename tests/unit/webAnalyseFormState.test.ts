import { describe, expect, it } from "vitest";
import {
  clampYearOnBlur,
  decideEmergencyAutoFill,
  deriveHasVehicle,
  emergencyFundSuggestion,
  issuesToFieldErrors,
  loansOffDraft,
  mergeResumeDraft,
  ownsCarOffPatch,
  parseKidAgeInput,
  parseYearDraft,
  resizeKidsAges,
  resumeLoanUiState,
  startFreshLoanUiState,
  vehicleFromAssets,
  vehicleOffPatch,
  vehicleToggleOn,
  type EmergencyAutoFillState,
  type UnifiedLoanRows,
} from "@/components/forms/analyse-form-state";
import {
  analyseDefaultValues,
  type AnalyseFormValues,
} from "@/lib/analyse-form-schema";
import { emergencyFundMonthsNeeded } from "@/lib/financialEngine";

const homeLoan: UnifiedLoanRows[number] = {
  id: "loan-home",
  loanType: "home_loan",
  lenderName: "HDFC",
  monthlyEMI: 25_000,
  outstandingAmount: 20_00_000,
  interestRate: 8.5,
  remainingMonths: 120,
  odLimit: 0,
  odUsed: 0,
  odInterestOnlyYears: 0,
};

const carLoan: UnifiedLoanRows[number] = {
  ...homeLoan,
  id: "loan-car",
  loanType: "car_loan",
  lenderName: "ICICI",
  monthlyEMI: 12_000,
};

const baseValues = (
  patch: Partial<AnalyseFormValues> = {},
): AnalyseFormValues =>
  ({ ...analyseDefaultValues, ...patch }) as AnalyseFormValues;

describe("loan resume", () => {
  it("uses lastSubmission loans when the draft has an empty array", () => {
    const merged = mergeResumeDraft(
      { unifiedLoans: [homeLoan] },
      { unifiedLoans: [], monthlySalary: 90_000 },
    );
    expect(merged.unifiedLoans?.map((l) => l.id)).toEqual(["loan-home"]);
    expect(merged.monthlySalary).toBe(90_000);
  });

  it("prefers the draft when the draft has rows", () => {
    const merged = mergeResumeDraft(
      { unifiedLoans: [homeLoan] },
      { unifiedLoans: [carLoan] },
    );
    expect(merged.unifiedLoans?.map((l) => l.id)).toEqual(["loan-car"]);
  });

  it("uses draft rows when lastSubmission has none", () => {
    const merged = mergeResumeDraft({}, { unifiedLoans: [carLoan] });
    expect(merged.unifiedLoans?.map((l) => l.id)).toEqual(["loan-car"]);
  });

  it("resolves to no loans when neither source has rows", () => {
    const merged = mergeResumeDraft({ unifiedLoans: [] }, { unifiedLoans: [] });
    expect(merged.unifiedLoans ?? []).toEqual([]);
  });

  it("derives the has-loans toggle and saved cards from resumed rows", () => {
    expect(resumeLoanUiState([homeLoan, carLoan])).toEqual({
      hasLoans: true,
      savedLoanIds: ["loan-home", "loan-car"],
    });
    expect(
      resumeLoanUiState([{ ...carLoan, monthlyEMI: 0 }]).savedLoanIds,
    ).toEqual([]);
    expect(resumeLoanUiState([])).toEqual({
      hasLoans: false,
      savedLoanIds: [],
    });
  });
});

describe("loans toggle off", () => {
  it("persists an empty loan array and clears legacy loan scalars", () => {
    const draft = loansOffDraft(
      baseValues({
        unifiedLoans: [homeLoan, carLoan],
        homeLoanEMI: 25_000,
        carLoanEMI: 12_000,
        monthlySalary: 1_00_000,
      }),
    );
    expect(draft.unifiedLoans).toEqual([]);
    expect(draft.homeLoanEMI).toBe(0);
    expect(draft.carLoanEMI).toBe(0);
    expect(draft.additionalObligations).toEqual([]);
    expect(draft.monthlySalary).toBe(1_00_000);
  });
});

describe("start fresh", () => {
  it("resets every piece of loan UI state", () => {
    expect(startFreshLoanUiState()).toEqual({
      hasLoans: false,
      savedLoanIds: [],
      unifiedLoans: [],
    });
  });

  it("returns fresh arrays each time", () => {
    const a = startFreshLoanUiState();
    a.savedLoanIds.push("x");
    expect(startFreshLoanUiState().savedLoanIds).toEqual([]);
  });
});

describe("vehicle derivation", () => {
  it("derives from car loan EMI, car value, or bike EMI", () => {
    expect(vehicleFromAssets({})).toBe(false);
    expect(vehicleFromAssets({ carLoanEMI: 1 })).toBe(true);
    expect(vehicleFromAssets({ carMarketValue: 5_00_000 })).toBe(true);
    expect(vehicleFromAssets({ bikeEMI: 2_000 })).toBe(true);
    expect(vehicleFromAssets({ unifiedLoans: [carLoan] })).toBe(true);
    expect(
      vehicleFromAssets({ unifiedLoans: [{ ...carLoan, monthlyEMI: 0 }] }),
    ).toBe(false);
  });

  it("treats an entered vehicle premium as having a vehicle", () => {
    expect(deriveHasVehicle({ carInsurancePremiumInput: 15_000 })).toBe(true);
    expect(deriveHasVehicle({ bikeInsurancePremiumInput: 0 })).toBe(false);
  });

  it("opt-in shows the toggle before any number, and clears when off", () => {
    expect(vehicleToggleOn({}, true)).toBe(true);
    expect(vehicleToggleOn({}, false)).toBe(false);
    const afterOff = {
      carInsurancePremiumInput: 9_000,
      ...vehicleOffPatch(),
    };
    expect(vehicleToggleOn(afterOff, false)).toBe(false);
  });
});

describe("ownsCar off", () => {
  it("clears ownership fields but keeps the car purchase goal", () => {
    const values = baseValues({
      ownsCar: true,
      carMarketValue: 6_00_000,
      carLoanOutstanding: 3_00_000,
      carPurchaseTarget: 10_00_000,
      carPurchaseYear: 2029,
    });
    const next = { ...values, ownsCar: false, ...ownsCarOffPatch() };
    expect(next.carMarketValue).toBe(0);
    expect(next.carLoanOutstanding).toBe(0);
    expect(next.carPurchaseTarget).toBe(10_00_000);
    expect(next.carPurchaseYear).toBe(2029);
    expect(Object.keys(ownsCarOffPatch()).sort()).toEqual([
      "carLoanOutstanding",
      "carMarketValue",
    ]);
  });
});

describe("emergency fund auto-suggest", () => {
  const fresh: EmergencyAutoFillState = { fired: false, userEdited: false };

  it("multiplies the monthly base by emergencyFundMonthsNeeded", () => {
    const kids = { lifeStage: "kids", kidsAges: [4] };
    const bachelor = { lifeStage: "bachelor", parentsSupport: 0 };
    expect(emergencyFundSuggestion(kids, 50_000)).toBe(
      50_000 * emergencyFundMonthsNeeded(kids),
    );
    expect(emergencyFundSuggestion(kids, 50_000)).toBe(6_00_000);
    expect(emergencyFundSuggestion(bachelor, 50_000)).toBe(3_00_000);
    expect(emergencyFundSuggestion(bachelor, 0)).toBeUndefined();
  });

  it("fills an empty target once, then never again", () => {
    const first = decideEmergencyAutoFill({
      state: fresh,
      eligible: true,
      suggestion: 6_00_000,
      currentValue: 0,
    });
    expect(first.fill).toBe(6_00_000);
    expect(first.next.fired).toBe(true);

    const second = decideEmergencyAutoFill({
      state: first.next,
      eligible: true,
      suggestion: 9_00_000,
      currentValue: 0,
    });
    expect(second.fill).toBeNull();
  });

  it("never overwrites a user-edited value, even 0 or blank", () => {
    for (const currentValue of [0, undefined, 4_00_000]) {
      const result = decideEmergencyAutoFill({
        state: { fired: false, userEdited: true },
        eligible: true,
        suggestion: 6_00_000,
        currentValue,
      });
      expect(result.fill).toBeNull();
    }
  });

  it("keeps an existing saved value and spends the one auto-fill", () => {
    const result = decideEmergencyAutoFill({
      state: fresh,
      eligible: true,
      suggestion: 6_00_000,
      currentValue: 2_50_000,
    });
    expect(result.fill).toBeNull();
    expect(result.next.fired).toBe(true);
  });

  it("waits while not eligible or without a suggestion", () => {
    expect(
      decideEmergencyAutoFill({
        state: fresh,
        eligible: false,
        suggestion: 6_00_000,
        currentValue: 0,
      }),
    ).toEqual({ fill: null, next: fresh });
    expect(
      decideEmergencyAutoFill({
        state: fresh,
        eligible: true,
        suggestion: undefined,
        currentValue: 0,
      }),
    ).toEqual({ fill: null, next: fresh });
  });
});

describe("year input", () => {
  it("does not clamp partial input while typing", () => {
    expect(parseYearDraft("2")).toBe(2);
    expect(parseYearDraft("20")).toBe(20);
    expect(parseYearDraft("")).toBeUndefined();
  });

  it("clamps on blur", () => {
    expect(clampYearOnBlur("2028", 2026, 2060)).toBe(2028);
    expect(clampYearOnBlur("20", 2026, 2060)).toBe(2026);
    expect(clampYearOnBlur("2099", 2026, 2060)).toBe(2060);
    expect(clampYearOnBlur("", 2026, 2060)).toBeUndefined();
  });
});

describe("kid ages", () => {
  it("stores blank as undefined and keeps a typed 0", () => {
    expect(parseKidAgeInput("")).toBeUndefined();
    expect(parseKidAgeInput("  ")).toBeUndefined();
    expect(parseKidAgeInput("0")).toBe(0);
    expect(parseKidAgeInput("7")).toBe(7);
  });

  it("fills new slots with undefined, not 0", () => {
    expect(resizeKidsAges([5], 3)).toEqual([5, undefined, undefined]);
    expect(resizeKidsAges([5, null, 0], 3)).toEqual([5, undefined, 0]);
    expect(resizeKidsAges([5, 8, 2], 1)).toEqual([5]);
    expect(resizeKidsAges(undefined, 2)).toEqual([undefined, undefined]);
  });
});

describe("issuesToFieldErrors", () => {
  it("joins nested paths and keeps the first message per path", () => {
    expect(
      issuesToFieldErrors([
        { path: ["otherInsurancePremiums", 0, "premiumAmount"], message: "A" },
        { path: ["otherInsurancePremiums", 0, "premiumAmount"], message: "B" },
        { path: ["kidsAges", 1], message: "C" },
        { path: [], message: "form-level" },
      ]),
    ).toEqual([
      { name: "otherInsurancePremiums.0.premiumAmount", message: "A" },
      { name: "kidsAges.1", message: "C" },
    ]);
  });
});

describe("loans cleared by the user stay cleared on resume", () => {
  it("ignores last submission loans when the No marker is set", async () => {
    const { mergeResumeDraft, readLoansCleared, writeLoansCleared } =
      await import("@/components/forms/analyse-form-state");
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

    expect(mergeResumeDraft(profileForm, draft).unifiedLoans).toHaveLength(1);

    writeLoansCleared(storage, true);
    expect(readLoansCleared(storage)).toBe(true);
    expect(
      mergeResumeDraft(profileForm, draft, readLoansCleared(storage))
        .unifiedLoans,
    ).toEqual([]);

    writeLoansCleared(storage, false);
    expect(readLoansCleared(storage)).toBe(false);
  });
});
