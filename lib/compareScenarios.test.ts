import { describe, expect, it } from "vitest";
import { emiFor, sipFV } from "./advisorCalculators";
import {
  changeKind,
  chartRows,
  compareHref,
  computeScenario,
  decodeScenarios,
  defaultScenario,
  encodeScenarios,
  kindsInFamily,
  type Scenario,
} from "./compareScenarios";

const sip = (rate: number, years: number): Scenario => ({
  kind: "sip",
  amount: 10_000,
  rate,
  years,
  stepUp: 0,
});

describe("computeScenario", () => {
  it("matches the SIP calculator maths", () => {
    const r = computeScenario(sip(12, 15));
    expect(r.family).toBe("grow");
    if (r.family !== "grow") return;
    expect(r.value).toBeCloseTo(sipFV(10_000, 12, 180), 6);
    expect(r.invested).toBe(18_00_000);
    expect(r.byYear).toHaveLength(15);
    expect(r.byYear[14]).toBeCloseTo(r.value, 6);
  });

  it("a higher return or longer tenure ends higher", () => {
    const base = computeScenario(sip(12, 15));
    const higher = computeScenario(sip(14, 15));
    const longer = computeScenario(sip(12, 20));
    if (
      base.family !== "grow" ||
      higher.family !== "grow" ||
      longer.family !== "grow"
    ) {
      throw new Error("expected grow results");
    }
    expect(higher.value).toBeGreaterThan(base.value);
    expect(longer.value).toBeGreaterThan(base.value);
  });

  it("loan EMI and balance run to zero", () => {
    const r = computeScenario({
      kind: "loan",
      amount: 50_00_000,
      rate: 8.5,
      years: 20,
      stepUp: 0,
    });
    if (r.family !== "loan") throw new Error("expected loan");
    expect(r.emi).toBeCloseTo(emiFor(50_00_000, 8.5, 240), 6);
    expect(r.totalInterest).toBeCloseTo(r.emi * 240 - 50_00_000, 4);
    expect(r.byYear).toHaveLength(20);
    expect(r.byYear[19]).toBe(0);
    expect(r.byYear[0]).toBeLessThan(50_00_000);
  });

  it("PPF assumes a deposit at the start of each year", () => {
    const r = computeScenario({
      kind: "ppf",
      amount: 1_50_000,
      rate: 7.1,
      years: 15,
      stepUp: 0,
    });
    if (r.family !== "grow") throw new Error("expected grow");
    const rr = 0.071;
    expect(r.value).toBeCloseTo(
      1_50_000 * ((Math.pow(1 + rr, 15) - 1) / rr) * (1 + rr),
      4,
    );
    expect(r.invested).toBe(22_50_000);
  });
});

describe("share link", () => {
  it("round-trips decimals and step-up", () => {
    const list: Scenario[] = [
      { kind: "fd", amount: 5_00_000, rate: 7.25, years: 5, stepUp: 0 },
      { kind: "stepup", amount: 10_000, rate: 12, years: 15, stepUp: 10 },
    ];
    const encoded = encodeScenarios(list);
    expect(encoded).toBe("fd-500000-7.25-5_stepup-10000-12-15-10");
    expect(decodeScenarios(encoded)).toEqual(list);
  });

  it("rejects junk, single scenarios and mixed families", () => {
    expect(decodeScenarios(null)).toBeNull();
    expect(decodeScenarios("sip-10000-12-15")).toBeNull();
    expect(decodeScenarios("nope-1-2-3_sip-1-2-3")).toBeNull();
    expect(decodeScenarios("sip-10000-12-15_loan-500000-9-5")).toBeNull();
  });

  it("clamps out-of-range values", () => {
    const [a] = decodeScenarios("sip-1-999-100_sip-10000-12-15")!;
    expect(a).toEqual({
      kind: "sip",
      amount: 500,
      rate: 30,
      years: 40,
      stepUp: 0,
    });
  });
});

describe("helpers", () => {
  it("chart rows stop a line when its term ends", () => {
    const rows = chartRows([
      computeScenario(sip(12, 2)),
      computeScenario(sip(12, 3)),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[2]).not.toHaveProperty("s0");
    expect(rows[2]).toHaveProperty("s1");
  });

  it("switching SIP to RD keeps the monthly amount", () => {
    const next = changeKind({ ...sip(12, 5), amount: 7_000 }, "rd");
    expect(next.kind).toBe("rd");
    expect(next.amount).toBe(7_000);
    expect(next.years).toBe(5);
  });
});

describe("every calculator kind", () => {
  it("computes a final value above what was put in", () => {
    for (const kind of kindsInFamily("grow")) {
      const r = computeScenario(defaultScenario(kind));
      if (r.family !== "grow") throw new Error(kind);
      expect(r.value, kind).toBeGreaterThan(r.invested);
      expect(r.multiple, kind).toBeGreaterThan(1);
      expect(r.byYear.length, kind).toBe(defaultScenario(kind).years);
    }
  });

  it("lumpsum and FD put in the amount once", () => {
    for (const kind of ["lumpsum", "fd"] as const) {
      const r = computeScenario(defaultScenario(kind));
      if (r.family !== "grow") throw new Error(kind);
      expect(r.invested).toBe(defaultScenario(kind).amount);
    }
  });

  it("step-up beats a flat SIP of the same start", () => {
    const flat = computeScenario(sip(12, 15));
    const step = computeScenario(defaultScenario("stepup"));
    if (flat.family !== "grow" || step.family !== "grow") throw new Error();
    expect(step.value).toBeGreaterThan(flat.value);
    expect(step.invested).toBeGreaterThan(flat.invested);
  });

  it("only the loan sits in the loan family", () => {
    expect(kindsInFamily("loan")).toEqual(["loan"]);
    expect(kindsInFamily("grow")).not.toContain("loan");
  });
});

describe("changeKind", () => {
  it("resets to defaults across families", () => {
    expect(changeKind(sip(12, 5), "loan")).toEqual(defaultScenario("loan"));
  });

  it("PPF keeps its own amount and 15-year term", () => {
    const next = changeKind(sip(12, 5), "ppf");
    expect(next).toEqual(defaultScenario("ppf"));
  });

  it("lumpsum to FD keeps the amount, step-up gets a default step", () => {
    const fd = changeKind(
      { ...defaultScenario("lumpsum"), amount: 2_00_000 },
      "fd",
    );
    expect(fd.amount).toBe(2_00_000);
    expect(changeKind(sip(12, 10), "stepup").stepUp).toBe(10);
  });
});

describe("compareHref", () => {
  it("prefills A and a copy as B", () => {
    expect(compareHref(sip(12, 15))).toBe(
      "/calculators/compare?s=sip-10000-12-15_sip-10000-12-15",
    );
    expect(decodeScenarios("sip-10000-x-15_sip-10000-12-15")).toBeNull();
  });
});
