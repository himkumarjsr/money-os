import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  plannedDraftKey,
  redistributeUnticked,
  type PlannedInvestmentDraft,
} from "@/lib/plannedInvestments";
import {
  applyTrackerCover,
  mergeTrackerInvestmentsIntoProfile,
  trackerPlanFit,
} from "@/lib/trackerPlanFit";

const profile = {
  monthlySIP: 0,
  monthlyRD: 0,
  healthInsurancePremiumMonthly: 1800,
  healthInsurancePremiumFrequency: "yearly",
  termInsurancePremiumMonthly: 1658,
  termInsurancePremiumFrequency: "yearly",
  carInsurancePremiumMonthly: 1250,
  carInsurancePremiumFrequency: "yearly",
  bikeInsurancePremiumMonthly: 83,
  bikeInsurancePremiumFrequency: "yearly",
  otherInsurancePremiums: [
    {
      policyName: "LIC HIMANSHU",
      frequency: "monthly",
      premiumAmount: 2895,
      monthlyAmount: 2895,
      countAsInvestment: true,
    },
    {
      policyName: "LIC SHIVANI",
      frequency: "yearly",
      premiumAmount: 67387,
      countAsInvestment: true,
    },
  ],
} as unknown as FinancialProfile;

const rows = [
  {
    title: "LIC-Himamshu",
    category: "investment_sip",
    amount: 2895,
    frequency: "monthly",
  },
  {
    title: "Nippon large cap",
    category: "investment_sip",
    amount: 5000,
    frequency: "monthly",
  },
  {
    title: "HDFC LOAN EMI",
    category: "loan_emi",
    amount: 66172,
    frequency: "monthly",
  },
  {
    title: "Shivani LIC premium",
    category: "insurance_rd",
    amount: 11100,
    frequency: "monthly",
    end_month: "2027-03-01",
  },
  {
    title: "RD for health premium",
    category: "insurance_rd",
    amount: 1801,
    frequency: "monthly",
    end_month: "2027-09-01",
  },
  {
    title: "Savings for term premium",
    category: "insurance_rd",
    amount: 19899,
    frequency: "monthly",
    end_month: "2026-10-01",
  },
  {
    title: "Savings for bike premium",
    category: "insurance_rd",
    amount: 250,
    frequency: "monthly",
    end_month: "2027-01-01",
  },
  {
    title: "RD for car premium",
    category: "insurance_rd",
    amount: 2500,
    frequency: "monthly",
    end_month: "2027-03-01",
  },
];

const draft = (
  source_id: string,
  instrument_key: string,
  monthly_amount: number,
): PlannedInvestmentDraft => ({
  source_kind: "goal",
  source_id,
  source_label: source_id,
  instrument_key,
  instrument_label: instrument_key,
  monthly_amount,
  start_month: "2026-11-01",
});

describe("trackerPlanFit", () => {
  it("counts only Tracker investments the profile doesn't know about", () => {
    const fit = trackerPlanFit(rows, profile, "2026-11-01");
    expect(fit.investmentCover).toBe(5000);
    const lic = fit.items.find((i) => i.title === "LIC-Himamshu");
    expect(lic?.counted).toBe(0);
    expect(fit.items.some((i) => i.title === "HDFC LOAN EMI")).toBe(false);
  });

  it("reports premium savings above the yearly premiums, skipping ended RDs", () => {
    const fit = trackerPlanFit(rows, profile, "2026-11-01");
    expect(fit.items.some((i) => i.title === "Savings for term premium")).toBe(
      false,
    );
    // 15,651 running vs 10,407 set aside
    expect(fit.premiumExtra).toBe(5244);
    expect(fit.premiumExtraUntil).toBe("2027-03-01");
  });

  it("lets the form's monthly SIP absorb a Tracker SIP", () => {
    const fit = trackerPlanFit(
      rows,
      { ...profile, monthlySIP: 5000 },
      "2026-11-01",
    );
    expect(fit.investmentCover).toBe(0);
  });
});

describe("applyTrackerCover", () => {
  it("takes equity first, largest slice first", () => {
    const { drafts, taken } = applyTrackerCover(
      [
        draft("ret", "equity_index", 14553),
        draft("ret", "flexicap", 9702),
        draft("home", "hybrid", 17941),
      ],
      5000,
    );
    expect(drafts.map((d) => d.monthly_amount)).toEqual([9553, 9702, 17941]);
    expect(taken["ret|equity_index"]).toBe(5000);
  });

  it("spreads what equity can't cover", () => {
    const { drafts } = applyTrackerCover(
      [draft("a", "equity_index", 1000), draft("b", "hybrid", 4000)],
      3000,
    );
    expect(drafts.map((d) => d.monthly_amount)).toEqual([2000]);
  });
});

describe("redistributeUnticked", () => {
  const all = [
    draft("ret", "equity_index", 14553),
    draft("ret", "ppf_nps", 10395),
    draft("ret", "flexicap", 9702),
    draft("home", "hybrid", 17941),
  ];
  const total = (ds: PlannedInvestmentDraft[]) =>
    ds.reduce((s, d) => s + d.monthly_amount, 0);

  it("keeps the total by moving the money within the same goal", () => {
    const out = redistributeUnticked(all, new Set([plannedDraftKey(all[1])]));
    expect(total(out)).toBe(total(all));
    expect(out.find((d) => d.source_id === "home")?.monthly_amount).toBe(17941);
    expect(
      out.find((d) => d.instrument_key === "equity_index")!.monthly_amount,
    ).toBeGreaterThan(14553);
  });

  it("spreads a fully unticked goal across everything else", () => {
    const out = redistributeUnticked(all, new Set([plannedDraftKey(all[3])]));
    expect(total(out)).toBe(total(all));
    expect(out).toHaveLength(3);
  });

  it("returns nothing when everything is unticked", () => {
    expect(
      redistributeUnticked(all, new Set(all.map(plannedDraftKey))),
    ).toEqual([]);
  });
});

describe("mergeTrackerInvestmentsIntoProfile", () => {
  it("adds a running Tracker SIP to monthlySIP once", () => {
    const first = mergeTrackerInvestmentsIntoProfile(
      profile,
      rows,
      "2026-11-01",
    );
    expect(first.changed).toBe(true);
    expect(first.profile.monthlySIP).toBe(5000);
    expect(first.profile.trackerSipMonthly).toBe(5000);
    const again = mergeTrackerInvestmentsIntoProfile(
      first.profile,
      rows,
      "2026-11-01",
    );
    expect(again.changed).toBe(false);
    expect(
      trackerPlanFit(rows, first.profile, "2026-11-01").investmentCover,
    ).toBe(0);
  });

  it("keeps the user's own extra SIP and drops the Tracker part when it ends", () => {
    const merged = { ...profile, monthlySIP: 8000, trackerSipMonthly: 5000 };
    expect(
      mergeTrackerInvestmentsIntoProfile(merged, rows, "2026-11-01").changed,
    ).toBe(false);
    const ended = mergeTrackerInvestmentsIntoProfile(
      merged,
      rows.filter((r) => r.title !== "Nippon large cap"),
      "2026-11-01",
    );
    expect(ended.profile.monthlySIP).toBe(3000);
    expect(ended.profile.trackerSipMonthly).toBe(0);
  });

  it("doesn't add a SIP the user already typed in the form", () => {
    const out = mergeTrackerInvestmentsIntoProfile(
      { ...profile, monthlySIP: 5000 },
      rows,
      "2026-11-01",
    );
    expect(out.changed).toBe(false);
  });
});
