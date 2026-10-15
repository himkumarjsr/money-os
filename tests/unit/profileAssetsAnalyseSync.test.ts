import { describe, expect, it } from "vitest";
import { analyseFinances } from "@/lib/financialEngine";
import {
  patchScalarAsset,
  upsertUnifiedLoan,
  type AssetFieldKey,
} from "@/lib/profileAssetsPatch";
import { ensureEditableProfile } from "@/lib/syncProfileAssets";
import { normalizeAnalyseFormValues } from "@/lib/analyse-form-schema";
import { useFinancialStore } from "@/store/financialStore";

const FIELDS: AssetFieldKey[] = [
  "savingsAccountBalance",
  "liquidMFValue",
  "otherLiquidSavings",
  "mfValue",
  "fdValue",
  "ppfBalance",
  "epfBalance",
  "npsBalance",
  "indianStocksValue",
  "usStocksValueINR",
  "usMFValueINR",
  "rsuValueINR",
  "totalEquityValue",
  "goldValue",
  "homeMarketValue",
  "carMarketValue",
  "otherAssets",
];

describe("profile asset edits reach the Analyse form and result", () => {
  it.each(FIELDS)("%s", (field) => {
    const base = ensureEditableProfile(null);
    const next = patchScalarAsset(base, field, 123_456);
    useFinancialStore.getState().setFullAnalysis(next);
    const s = useFinancialStore.getState();
    expect((s.analysis as unknown as Record<string, unknown>)[field]).toBe(
      123_456,
    );
    // Re-submitting the Analyse form keeps the edited value.
    const resubmitted = normalizeAnalyseFormValues(s.analysis as never);
    expect((resubmitted as unknown as Record<string, unknown>)[field]).toBe(
      123_456,
    );
    expect(s.result?.totalAssets).toBe(analyseFinances(next).totalAssets);
  });

  it("loans", () => {
    const base = ensureEditableProfile(null);
    const next = upsertUnifiedLoan(base, {
      loanType: "personal_loan",
      lenderName: "X",
      monthlyEMI: 5000,
      outstandingAmount: 200_000,
    });
    useFinancialStore.getState().setFullAnalysis(next);
    const s = useFinancialStore.getState();
    const resubmitted = normalizeAnalyseFormValues(s.analysis as never);
    expect(resubmitted.unifiedLoans?.[0]?.outstandingAmount).toBe(200_000);
    expect(s.result?.totalLiabilities).toBe(
      analyseFinances(next).totalLiabilities,
    );
  });
});
