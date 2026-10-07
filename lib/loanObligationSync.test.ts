import { describe, expect, it } from "vitest";
import {
  analyseDefaultValues,
  financialProfileToFormValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
} from "./analyse-form-schema";
import {
  TRACKER_LOAN_ID_PREFIX,
  applyLoanDetails,
  inferLoanType,
  lenderFromTitle,
  loanDrift,
  loansNeedingDetails,
  mergeTrackerLoansIntoProfile,
  planLoanObligationSync,
  type LoanObligationLike,
} from "./loanObligationSync";
import { buildPriorityPlan } from "./priorityEngine";
import { getUniversalBucketActuals } from "./universal-buckets";

type UnifiedLoanRow = NonNullable<AnalyseFormValues["unifiedLoans"]>[number];

function profileWith(loans: AnalyseFormValues["unifiedLoans"]) {
  return normalizeAnalyseFormValues({
    ...analyseDefaultValues,
    monthlySalary: 200_000,
    unifiedLoans: loans,
  } as AnalyseFormValues);
}

const ob = (o: Partial<LoanObligationLike>): LoanObligationLike => ({
  id: "ob1",
  title: "ICICI LOAN EMI",
  category: "loan_emi",
  amount: 12_000,
  due_day: 5,
  is_active: true,
  source: "manual",
  ...o,
});

describe("title parsing", () => {
  it("infers type and lender from Tracker titles", () => {
    expect(inferLoanType("ICICI LOAN EMI")).toBe("other");
    expect(lenderFromTitle("ICICI LOAN EMI")).toBe("ICICI");
    expect(inferLoanType("Home Loan EMI · HDFC")).toBe("home_loan");
    expect(lenderFromTitle("Home Loan EMI · HDFC")).toBe("HDFC");
  });
});

describe("mergeTrackerLoansIntoProfile (Tracker → Analyse)", () => {
  it("adds a Tracker-only loan so the report's loan EMIs include it", () => {
    const before = profileWith([]);
    expect(getUniversalBucketActuals(before).loans).toBe(0);

    const { profile, changed } = mergeTrackerLoansIntoProfile(before, [ob({})]);
    expect(changed).toBe(true);
    expect(getUniversalBucketActuals(profile).loans).toBe(12_000);
    expect(profile.unifiedLoans?.[0]).toMatchObject({
      id: `${TRACKER_LOAN_ID_PREFIX}ob1`,
      lenderName: "ICICI",
      monthlyEMI: 12_000,
      emiDay: 5,
    });
  });

  it("is a no-op once the loan is already there", () => {
    const once = mergeTrackerLoansIntoProfile(profileWith([]), [ob({})]).profile;
    expect(mergeTrackerLoansIntoProfile(once, [ob({})]).changed).toBe(false);
  });

  it("follows EMI edits made in Tracker", () => {
    const once = mergeTrackerLoansIntoProfile(profileWith([]), [ob({})]).profile;
    const { profile } = mergeTrackerLoansIntoProfile(once, [
      ob({ amount: 15_000 }),
    ]);
    expect(getUniversalBucketActuals(profile).loans).toBe(15_000);
  });

  it("drops a loan the user closed in Tracker", () => {
    const start = profileWith([
      { id: "l1", loanType: "home_loan", lenderName: "HDFC", monthlyEMI: 30_000 },
    ]);
    const { profile } = mergeTrackerLoansIntoProfile(start, [
      ob({ title: "Home Loan EMI · HDFC", amount: 30_000, is_active: false }),
    ]);
    expect(getUniversalBucketActuals(profile).loans).toBe(0);
  });

  it("ignores loans closed before the report was saved", () => {
    const start = profileWith([
      { id: "l1", loanType: "home_loan", lenderName: "HDFC", monthlyEMI: 30_000 },
    ]);
    const closed = ob({
      title: "Home Loan EMI · HDFC",
      amount: 30_000,
      is_active: false,
      updated_at: "2026-10-01T00:00:00Z",
    });
    expect(
      mergeTrackerLoansIntoProfile(start, [closed], {
        closedAfter: "2026-10-05T00:00:00Z",
      }).changed,
    ).toBe(false);
    expect(
      mergeTrackerLoansIntoProfile(start, [closed], {
        closedAfter: "2026-09-20T00:00:00Z",
      }).changed,
    ).toBe(true);
  });

  it("never removes a loan just because a closed row has the same EMI", () => {
    const start = profileWith([
      { id: "l1", loanType: "car_loan", lenderName: "SBI", monthlyEMI: 12_000 },
    ]);
    expect(
      mergeTrackerLoansIntoProfile(start, [ob({ is_active: false })]).changed,
    ).toBe(false);
  });
});

describe("planLoanObligationSync (Analyse → Tracker)", () => {
  it("creates a row for every loan, not just the first of each type", () => {
    const plan = planLoanObligationSync(
      profileWith([
        { id: "a", loanType: "personal_loan", lenderName: "BANK A", monthlyEMI: 66_172 },
        { id: "b", loanType: "personal_loan", lenderName: "BANK B", monthlyEMI: 42_055 },
        { id: "c", loanType: "gold_loan", lenderName: "", monthlyEMI: 5_000 },
      ]),
      [],
    );
    expect(plan.inserts.map((i) => i.title)).toEqual([
      "Personal Loan EMI · BANK A",
      "Personal Loan EMI · BANK B",
      "Gold Loan EMI",
    ]);
  });

  it("updates the Tracker row when the EMI changes in Analyse", () => {
    const plan = planLoanObligationSync(
      profileWith([
        { id: "a", loanType: "home_loan", lenderName: "HDFC", monthlyEMI: 31_000, emiDay: 5 },
      ]),
      [ob({ id: "h", title: "Home Loan EMI · HDFC", amount: 30_000, source: "health_check" })],
    );
    expect(plan.inserts).toEqual([]);
    expect(plan.updates).toEqual([
      { id: "h", amount: 31_000, due_day: 5, is_active: true },
    ]);
  });

  it("does not duplicate a Tracker-origin loan", () => {
    const merged = mergeTrackerLoansIntoProfile(profileWith([]), [ob({})]).profile;
    const plan = planLoanObligationSync(merged, [ob({})]);
    expect(plan).toEqual({ inserts: [], updates: [], deactivate: [] });
  });

  it("closes loans removed in the form, but not unseen manual Tracker loans", () => {
    const previous = mergeTrackerLoansIntoProfile(profileWith([]), [ob({})]).profile;
    const hc = ob({ id: "h", title: "Car Loan EMI", amount: 9_000, source: "health_check" });
    const unseen = ob({ id: "new", title: "Axis loan EMI", amount: 7_000 });

    const plan = planLoanObligationSync(
      profileWith([]),
      [ob({}), hc, unseen],
      previous,
    );
    expect(plan.deactivate.sort()).toEqual(["h", "ob1"]);
  });
});

describe("permanent Tracker link", () => {
  const bf = (extra: Partial<UnifiedLoanRow> = {}) =>
    profileWith([
      { id: "l1", loanType: "other", lenderName: "BF", monthlyEMI: 2_151, ...extra },
    ]);
  const bfRow = (o: Partial<LoanObligationLike> = {}) =>
    ob({ id: "bf-row", title: "BF EMI", amount: 2_151, ...o });
  const loansOf = (p: ReturnType<typeof profileWith>) =>
    financialProfileToFormValues(p).unifiedLoans ?? [];

  it("stamps the link on an active match without moving the report date", () => {
    const r = mergeTrackerLoansIntoProfile(bf(), [bfRow()]);
    expect(r.changed).toBe(true);
    expect(r.numbersChanged).toBe(false);
    expect(loansOf(r.profile)[0]?.trackerObligationId).toBe("bf-row");
  });

  it("the link survives normalise / form round-trips", () => {
    const linked = mergeTrackerLoansIntoProfile(bf(), [bfRow()]).profile;
    const again = normalizeAnalyseFormValues(financialProfileToFormValues(linked));
    expect(loansOf(again)[0]?.trackerObligationId).toBe("bf-row");
  });

  it("drops a linked loan closed in Tracker, even with a 2-letter lender and a hand-typed title", () => {
    const linked = mergeTrackerLoansIntoProfile(bf(), [bfRow()]).profile;
    const r = mergeTrackerLoansIntoProfile(
      linked,
      [bfRow({ is_active: false, updated_at: "2026-10-05T00:00:00Z" })],
      // Report re-saved after the close: unlinked rows would be ignored here.
      { closedAfter: "2026-10-07T00:00:00Z" },
    );
    expect(r.numbersChanged).toBe(true);
    expect(getUniversalBucketActuals(r.profile).loans).toBe(0);
  });

  it("re-submitting the form doesn't reopen a linked loan closed in Tracker", () => {
    const linked = mergeTrackerLoansIntoProfile(bf(), [bfRow()]).profile;
    const plan = planLoanObligationSync(linked, [bfRow({ is_active: false })]);
    expect(plan).toEqual({ inserts: [], updates: [], deactivate: [] });
  });

  it("re-pairs instead of duplicating when the linked row was hard-deleted", () => {
    const stale = bf({ trackerObligationId: "gone" });
    const r = mergeTrackerLoansIntoProfile(stale, [bfRow({ id: "new-row" })]);
    expect(loansOf(r.profile)).toHaveLength(1);
    expect(loansOf(r.profile)[0]?.trackerObligationId).toBe("new-row");
  });
});

describe("loanDrift", () => {
  it("flags a report loan whose Tracker row was closed but never matched", () => {
    const profile = profileWith([
      { id: "l1", loanType: "other", lenderName: "BF", monthlyEMI: 2_151 },
    ]);
    expect(
      loanDrift(profile, [ob({ title: "BF EMI", amount: 2_151, is_active: false })]),
    ).toEqual([{ label: "Loan · BF", kind: "not_active_in_tracker" }]);
  });

  it("flags Tracker loans missing from the report and EMI changes", () => {
    const profile = profileWith([
      { id: "l1", loanType: "home_loan", lenderName: "HDFC", monthlyEMI: 30_000 },
    ]);
    const kinds = loanDrift(profile, [
      ob({ id: "h", title: "Home Loan EMI · HDFC", amount: 31_000 }),
      ob({ id: "x", title: "Axis loan EMI", amount: 7_000 }),
    ]).map((d) => d.kind);
    expect(kinds.sort()).toEqual(["emi_changed", "not_in_report"]);
  });

  it("is quiet when loans match or the user never tracked a loan", () => {
    const profile = profileWith([
      { id: "l1", loanType: "home_loan", lenderName: "HDFC", monthlyEMI: 30_000 },
    ]);
    expect(
      loanDrift(profile, [ob({ title: "Home Loan EMI · HDFC", amount: 30_000 })]),
    ).toEqual([]);
    expect(loanDrift(profile, [])).toEqual([]);
  });
});

describe("one-time details for imported loans", () => {
  const imported = () =>
    mergeTrackerLoansIntoProfile(profileWith([]), [ob({})]).profile;

  it("asks only for loans imported from Tracker without a balance", () => {
    expect(loansNeedingDetails(imported()).map((l) => l.lenderName)).toEqual([
      "ICICI",
    ]);
    expect(
      loansNeedingDetails(
        profileWith([{ id: "a", loanType: "home_loan", monthlyEMI: 30_000 }]),
      ),
    ).toEqual([]);
  });

  it("saving clears the ask and feeds the engine real numbers", () => {
    const p = imported();
    const id = String(loansNeedingDetails(p)[0]?.id);
    const saved = applyLoanDetails(p, id, {
      outstandingAmount: 250_000,
      interestRate: 13,
    });
    expect(loansNeedingDetails(saved)).toEqual([]);
    const debt = buildPriorityPlan(saved, { needsActual: 40_000 }).debts.find(
      (d) => d.lenderName === "ICICI",
    );
    expect(debt).toMatchObject({
      outstanding: 250_000,
      rate: 13,
      outstandingEstimated: false,
      rateEstimated: false,
    });
  });

  it("skipping stops the ask but the debt stays labelled estimated", () => {
    const p = imported();
    const id = String(loansNeedingDetails(p)[0]?.id);
    const skipped = applyLoanDetails(p, id, "skip");
    expect(loansNeedingDetails(skipped)).toEqual([]);
    const debt = buildPriorityPlan(skipped, { needsActual: 40_000 }).debts.find(
      (d) => d.lenderName === "ICICI",
    );
    expect(debt).toMatchObject({
      outstanding: 12_000 * 18,
      outstandingEstimated: true,
      rateEstimated: true,
    });
  });
});
