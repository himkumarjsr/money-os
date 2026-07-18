import { describe, expect, it } from "vitest";
import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
} from "./analyse-form-schema";
import {
  catalogForSection,
  getScalarAssetValue,
  patchScalarAsset,
  removeCustomInvestment,
  removeUnifiedLoan,
  upsertCustomInvestment,
  upsertUnifiedLoan,
} from "./profileAssetsPatch";

function baseProfile() {
  return normalizeAnalyseFormValues({
    ...analyseDefaultValues,
  } as Parameters<typeof normalizeAnalyseFormValues>[0]);
}

describe("profileAssetsPatch", () => {
  it("patches scalar cash and physical fields", () => {
    let p = baseProfile();
    p = patchScalarAsset(p, "savingsAccountBalance", 50_000);
    p = patchScalarAsset(p, "homeMarketValue", 80_00_000);
    expect(getScalarAssetValue(p, "savingsAccountBalance")).toBe(50_000);
    expect(p.ownsHome).toBe(true);
    expect(p.homeMarketValue).toBe(80_00_000);
  });

  it("clamps negative amounts to zero", () => {
    const p = patchScalarAsset(baseProfile(), "mfValue", -100);
    expect(p.mfValue).toBe(0);
  });

  it("upserts and removes unified loans", () => {
    let p = baseProfile();
    p = upsertUnifiedLoan(p, {
      id: "l1",
      loanType: "home_loan",
      lenderName: "HDFC",
      monthlyEMI: 25_000,
      outstandingAmount: 40_00_000,
      interestRate: 8.5,
      remainingMonths: 180,
    });
    expect(p.unifiedLoans).toHaveLength(1);
    expect(p.unifiedLoans?.[0]?.lenderName).toBe("HDFC");

    p = upsertUnifiedLoan(p, {
      id: "l1",
      loanType: "home_loan",
      monthlyEMI: 26_000,
      outstandingAmount: 39_00_000,
    });
    expect(p.unifiedLoans).toHaveLength(1);
    expect(p.unifiedLoans?.[0]?.monthlyEMI).toBe(26_000);

    p = removeUnifiedLoan(p, "l1");
    expect(p.unifiedLoans).toHaveLength(0);
  });

  it("upserts and removes custom investments", () => {
    let p = baseProfile();
    p = upsertCustomInvestment(p, {
      label: "SGB",
      currentValue: 1_00_000,
      monthlyContribution: 0,
      type: "other",
    });
    expect(p.customInvestments).toHaveLength(1);

    p = upsertCustomInvestment(p, {
      index: 0,
      label: "SGB updated",
      currentValue: 1_20_000,
    });
    expect(p.customInvestments?.[0]?.label).toBe("SGB updated");
    expect(p.customInvestments?.[0]?.currentValue).toBe(1_20_000);

    p = removeCustomInvestment(p, 0);
    expect(p.customInvestments).toHaveLength(0);
  });

  it("section catalogs include expected options", () => {
    expect(
      catalogForSection("cash").some(
        (c) => c.field === "savingsAccountBalance",
      ),
    ).toBe(true);
    expect(catalogForSection("investments").some((c) => c.custom)).toBe(true);
    expect(catalogForSection("liabilities").length).toBeGreaterThan(5);
    expect(
      catalogForSection("liabilities").some(
        (c) => c.loanType === "credit_card",
      ),
    ).toBe(true);
  });
});
