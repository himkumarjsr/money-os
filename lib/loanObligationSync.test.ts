import { describe, expect, it } from "vitest";
import {
  analyseDefaultValues,
  normalizeAnalyseFormValues,
  type AnalyseFormValues,
} from "./analyse-form-schema";
import {
  TRACKER_LOAN_ID_PREFIX,
  inferLoanType,
  lenderFromTitle,
  mergeTrackerLoansIntoProfile,
  planLoanObligationSync,
  type LoanObligationLike,
} from "./loanObligationSync";
import { getUniversalBucketActuals } from "./universal-buckets";

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
