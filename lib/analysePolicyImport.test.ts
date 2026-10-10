import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  analysePolicyCandidates,
  missingPolicyFields,
  nextRenewalDate,
  planAnalysePolicyImport,
  type ExistingPolicyLike,
} from "@/lib/analysePolicyImport";

const TODAY = new Date(2026, 9, 10); // 10 Oct 2026

function profile(extra: Partial<FinancialProfile>): FinancialProfile {
  return {
    hasHealthInsurance: false,
    hasTermInsurance: false,
    ...extra,
  } as FinancialProfile;
}

function existing(p: Partial<ExistingPolicyLike>): ExistingPolicyLike {
  return {
    id: "p1",
    policyType: "term_life",
    planName: null,
    coverAmount: 0,
    premiumAmount: 0,
    premiumFrequency: "monthly",
    analyseSourceKey: null,
    ...p,
  };
}

describe("nextRenewalDate", () => {
  it("returns this year's date when still ahead", () => {
    expect(nextRenewalDate(12, 5, TODAY)).toBe("2026-12-05");
  });
  it("rolls to next year once passed, and keeps today", () => {
    expect(nextRenewalDate(3, 1, TODAY)).toBe("2027-03-01");
    expect(nextRenewalDate(10, 10, TODAY)).toBe("2026-10-10");
  });
  it("clamps the day to the month and needs both parts", () => {
    expect(nextRenewalDate(2, 31, TODAY)).toBe("2027-02-28");
    expect(nextRenewalDate(5, undefined, TODAY)).toBeNull();
    expect(nextRenewalDate(13, 1, TODAY)).toBeNull();
  });
});

describe("analysePolicyCandidates", () => {
  it("maps every policy entered in Analyse", () => {
    const out = analysePolicyCandidates(
      profile({
        hasTermInsurance: true,
        termInsuranceSumAssured: 1_00_00_000,
        termInsurancePremiumInput: 15_000,
        termInsurancePremiumFrequency: "yearly",
        termInsuranceRenewalMonth: 1,
        termInsuranceRenewalDay: 15,
        hasHealthInsurance: true,
        healthInsuranceSumInsured: 5_00_000,
        healthInsurancePremiumInput: 1_200,
        parentsHealthInsuranceSumInsured: 3_00_000,
        carInsurancePremiumInput: 9_000,
        carInsurancePremiumFrequency: "yearly",
        hasOtherInsurance: true,
        otherInsurancePremiums: [
          { id: "r1", policyName: "LIC Jeevan Anand", premiumAmount: 2_000 },
        ],
      }),
      TODAY,
    );
    expect(out).toEqual([
      {
        sourceKey: "term",
        policyType: "term_life",
        planName: null,
        coverAmount: 1_00_00_000,
        premiumAmount: 15_000,
        premiumFrequency: "yearly",
        renewalDate: "2027-01-15",
      },
      {
        sourceKey: "health",
        policyType: "health",
        planName: null,
        coverAmount: 5_00_000,
        premiumAmount: 1_200,
        premiumFrequency: "monthly",
        renewalDate: null,
      },
      {
        sourceKey: "parents_health",
        policyType: "health",
        planName: "Parents' health cover",
        coverAmount: 3_00_000,
        premiumAmount: 0,
        premiumFrequency: "yearly",
        renewalDate: null,
      },
      {
        sourceKey: "car",
        policyType: "car",
        planName: null,
        coverAmount: 0,
        premiumAmount: 9_000,
        premiumFrequency: "yearly",
        renewalDate: null,
      },
      {
        sourceKey: "other:r1",
        policyType: "other",
        planName: "LIC Jeevan Anand",
        coverAmount: 0,
        premiumAmount: 2_000,
        premiumFrequency: "monthly",
        renewalDate: null,
      },
    ]);
  });

  it("skips policies the user said they don't have, and empty rows", () => {
    expect(
      analysePolicyCandidates(
        profile({
          hasTermInsurance: false,
          termInsuranceSumAssured: 1_00_00_000,
          bikeInsurancePremiumInput: 0,
        }),
        TODAY,
      ),
    ).toEqual([]);
  });
});

describe("planAnalysePolicyImport", () => {
  const term = analysePolicyCandidates(
    profile({
      hasTermInsurance: true,
      termInsuranceSumAssured: 1_00_00_000,
      termInsurancePremiumInput: 1_250,
    }),
    TODAY,
  );

  it("inserts entries that are not in My Policies yet", () => {
    expect(planAnalysePolicyImport(term, [])).toEqual({
      inserts: term,
      links: [],
    });
  });

  it("skips entries already imported or deleted after import", () => {
    expect(
      planAnalysePolicyImport(term, [existing({ analyseSourceKey: "term" })]),
    ).toEqual({ inserts: [], links: [] });
    expect(planAnalysePolicyImport(term, [], ["term"])).toEqual({
      inserts: [],
      links: [],
    });
  });

  it("links a policy the user already added by hand instead of duplicating", () => {
    // Same premium, entered yearly in the vault.
    expect(
      planAnalysePolicyImport(term, [
        existing({
          id: "manual",
          premiumAmount: 15_000,
          premiumFrequency: "yearly",
        }),
      ]),
    ).toEqual({
      inserts: [],
      links: [{ policyId: "manual", sourceKey: "term" }],
    });
    // Same cover.
    expect(
      planAnalysePolicyImport(term, [
        existing({
          id: "manual",
          coverAmount: 1_00_00_000,
          premiumAmount: 999,
        }),
      ]).links,
    ).toEqual([{ policyId: "manual", sourceKey: "term" }]);
  });

  it("does not link a different type or reuse one policy twice", () => {
    expect(
      planAnalysePolicyImport(term, [
        existing({ policyType: "health", premiumAmount: 1_250 }),
      ]).inserts,
    ).toHaveLength(1);
    const two = analysePolicyCandidates(
      profile({
        hasOtherInsurance: true,
        otherInsurancePremiums: [
          { id: "a", policyName: "LIC A", premiumAmount: 500 },
          { id: "b", policyName: "LIC B", premiumAmount: 500 },
        ],
      }),
      TODAY,
    );
    const plan = planAnalysePolicyImport(two, [
      existing({ id: "m", policyType: "other", premiumAmount: 500 }),
    ]);
    expect(plan.links).toEqual([{ policyId: "m", sourceKey: "other:a" }]);
    expect(plan.inserts.map((c) => c.sourceKey)).toEqual(["other:b"]);
  });
});

describe("missingPolicyFields", () => {
  it("lists what the user still has to fill in", () => {
    expect(
      missingPolicyFields({
        insurerName: " ",
        renewalDate: null,
        coverAmount: 0,
        premiumAmount: 100,
      }),
    ).toEqual(["insurer", "renewal date", "cover"]);
    expect(
      missingPolicyFields({
        insurerName: "LIC",
        renewalDate: "2027-01-01",
        coverAmount: 1,
        premiumAmount: 1,
      }),
    ).toEqual([]);
  });
});
