import { describe, expect, it } from "vitest";
import {
  buildCashItems,
  buildInvestmentItems,
  buildLiabilityItems,
  buildPhysicalItems,
} from "@/components/profile/ProfileAssets";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { analyseFinances } from "@/lib/financialEngine";
import { buildNetWorthBreakup } from "@/lib/netWorthBreakup";
import {
  CASH_CATALOG,
  INVESTMENT_CATALOG,
  LIABILITY_CATALOG,
  PHYSICAL_CATALOG,
  getScalarAssetValue,
  patchScalarAsset,
  upsertCustomInvestment,
  upsertUnifiedLoan,
} from "@/lib/profileAssetsPatch";
import { ensureEditableProfile } from "@/lib/syncProfileAssets";
import { useFinancialStore } from "@/store/financialStore";

const ADD = 1_00_000;

const blank = () => ensureEditableProfile(null);
/** The reported case: a blended equity total plus EPF, nothing else. */
const blended = (): FinancialProfile => ({
  ...blank(),
  totalEquityValue: 20_00_000,
  epfBalance: 12_50_000,
});

const builders = {
  cash: buildCashItems,
  investments: buildInvestmentItems,
  physical: buildPhysicalItems,
};

/** Save the way the Profile page does, then read back what it renders. */
function save(next: FinancialProfile) {
  useFinancialStore.getState().setFullAnalysis(next);
  const s = useFinancialStore.getState();
  return { saved: s.lastSubmission!, result: s.result! };
}

describe.each([
  ["empty profile", blank],
  ["blended equity profile", blended],
])("Profile Add on an %s", (_name, start) => {
  const scalarItems = [
    ...CASH_CATALOG,
    ...INVESTMENT_CATALOG,
    ...PHYSICAL_CATALOG,
  ].filter((c) => c.field);

  it.each(scalarItems.map((c) => [c.label, c] as const))(
    "%s shows in its list and counts in the totals",
    (_label, catalog) => {
      const before = start();
      const beforeTotal = analyseFinances(before).totalAssets;
      // Saving replaces whatever the field held before.
      const old = getScalarAssetValue(before, catalog.field!);
      const { saved, result } = save(
        patchScalarAsset(before, catalog.field!, ADD),
      );
      const rows = builders[catalog.section as keyof typeof builders](saved);
      const row = rows.find((r) => r.field === catalog.field);
      expect(row?.amount).toBe(ADD);
      // The edit sheet opens on the same amount the row shows.
      expect(getScalarAssetValue(saved, catalog.field!)).toBe(ADD);
      expect(result.totalAssets).toBe(beforeTotal - old + ADD);
      // The section list adds up to what the engine counts for that section.
      const sectionSum = rows.reduce((s, r) => s + r.amount, 0);
      const before0 = builders[catalog.section as keyof typeof builders](
        before,
      ).reduce((s, r) => s + r.amount, 0);
      expect(sectionSum).toBe(before0 - old + ADD);
      const b = buildNetWorthBreakup(saved);
      expect(b.totalAssets).toBe(result.totalAssets);
    },
  );

  it("Other investment shows in the list and counts", () => {
    const before = start();
    const { saved, result } = save(
      upsertCustomInvestment(before, { label: "P2P", currentValue: ADD }),
    );
    expect(
      buildInvestmentItems(saved).find((r) => r.label === "P2P")?.amount,
    ).toBe(ADD);
    expect(result.totalAssets).toBe(
      analyseFinances(before).totalAssets + ADD,
    );
  });

  it.each(LIABILITY_CATALOG.map((c) => [c.label, c] as const))(
    "%s loan shows in the list and counts",
    (_label, catalog) => {
      const before = start();
      const { saved, result } = save(
        upsertUnifiedLoan(before, {
          loanType: catalog.loanType!,
          monthlyEMI: 5_000,
          outstandingAmount: ADD,
        }),
      );
      expect(buildLiabilityItems(saved)[0]?.amount).toBe(ADD);
      expect(result.totalLiabilities).toBe(
        analyseFinances(before).totalLiabilities + ADD,
      );
    },
  );
});

describe("blended equity row", () => {
  it("editing the Equity row keeps added stocks counted", () => {
    const withStocks = patchScalarAsset(blended(), "indianStocksValue", ADD);
    expect(getScalarAssetValue(withStocks, "totalEquityValue")).toBe(
      20_00_000,
    );
    const edited = patchScalarAsset(withStocks, "totalEquityValue", 15_00_000);
    expect(analyseFinances(edited).totalAssets).toBe(
      analyseFinances(blank()).totalAssets + 15_00_000 + ADD + 12_50_000,
    );
  });
});
