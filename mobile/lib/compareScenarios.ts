/**
 * Side-by-side scenario maths for the Compare calculator.
 * Each scenario is one calculator (SIP, FD, loan, …) with its own inputs;
 * scenarios in the same family share metrics so they can sit in one table.
 * Illustrative only — pre-tax, constant rates.
 */

import {
  emiFor,
  fixedDeposit,
  lumpsumFV,
  recurringDeposit,
  sipFV,
  stepUpSip,
} from "./advisorCalculators";
import { formatIndian } from "./formatters";

export type CompareFamily = "grow" | "loan";

export type ScenarioKind =
  | "sip"
  | "stepup"
  | "lumpsum"
  | "fd"
  | "rd"
  | "ppf"
  | "loan";

export type Scenario = {
  kind: ScenarioKind;
  /** Monthly (SIP, step-up, RD), yearly (PPF), one-time (lumpsum, FD) or loan principal. */
  amount: number;
  rate: number;
  years: number;
  /** Yearly SIP increase — step-up only. */
  stepUp: number;
};

type Range = { min: number; max: number; step: number };

export type KindMeta = {
  label: string;
  family: CompareFamily;
  amountLabel: string;
  amount: Range;
  rate: Range;
  years: Range;
  defaults: Omit<Scenario, "kind">;
};

export const KIND_META: Record<ScenarioKind, KindMeta> = {
  sip: {
    label: "SIP",
    family: "grow",
    amountLabel: "Monthly SIP",
    amount: { min: 500, max: 1_00_00_000, step: 500 },
    rate: { min: 1, max: 30, step: 0.1 },
    years: { min: 1, max: 40, step: 1 },
    defaults: { amount: 10_000, rate: 12, years: 15, stepUp: 0 },
  },
  stepup: {
    label: "Step-up SIP",
    family: "grow",
    amountLabel: "Starting monthly SIP",
    amount: { min: 500, max: 1_00_00_000, step: 500 },
    rate: { min: 1, max: 30, step: 0.1 },
    years: { min: 1, max: 40, step: 1 },
    defaults: { amount: 10_000, rate: 12, years: 15, stepUp: 10 },
  },
  lumpsum: {
    label: "Lumpsum",
    family: "grow",
    amountLabel: "One-time investment",
    amount: { min: 1_000, max: 50_00_00_000, step: 1_000 },
    rate: { min: 1, max: 30, step: 0.1 },
    years: { min: 1, max: 40, step: 1 },
    defaults: { amount: 5_00_000, rate: 12, years: 15, stepUp: 0 },
  },
  fd: {
    label: "Fixed deposit",
    family: "grow",
    amountLabel: "Deposit amount",
    amount: { min: 1_000, max: 50_00_00_000, step: 1_000 },
    rate: { min: 1, max: 12, step: 0.05 },
    years: { min: 1, max: 10, step: 1 },
    defaults: { amount: 5_00_000, rate: 7, years: 5, stepUp: 0 },
  },
  rd: {
    label: "Recurring deposit",
    family: "grow",
    amountLabel: "Monthly deposit",
    amount: { min: 100, max: 10_00_000, step: 100 },
    rate: { min: 1, max: 12, step: 0.05 },
    years: { min: 1, max: 10, step: 1 },
    defaults: { amount: 10_000, rate: 7, years: 5, stepUp: 0 },
  },
  ppf: {
    label: "PPF",
    family: "grow",
    amountLabel: "Yearly deposit",
    amount: { min: 500, max: 1_50_000, step: 500 },
    rate: { min: 5, max: 10, step: 0.1 },
    years: { min: 15, max: 50, step: 5 },
    defaults: { amount: 1_50_000, rate: 7.1, years: 15, stepUp: 0 },
  },
  loan: {
    label: "Loan",
    family: "loan",
    amountLabel: "Loan amount",
    amount: { min: 10_000, max: 50_00_00_000, step: 10_000 },
    rate: { min: 1, max: 36, step: 0.05 },
    years: { min: 1, max: 30, step: 1 },
    defaults: { amount: 50_00_000, rate: 8.5, years: 20, stepUp: 0 },
  },
};

export const KINDS = Object.keys(KIND_META) as ScenarioKind[];

export function kindsInFamily(family: CompareFamily): ScenarioKind[] {
  return KINDS.filter((k) => KIND_META[k].family === family);
}

export const MAX_SCENARIOS = 3;

function clamp(n: number, { min, max }: Range) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Keeps every field inside the kind's slider range. */
export function normaliseScenario(s: Scenario): Scenario {
  const m = KIND_META[s.kind];
  return {
    kind: s.kind,
    amount: clamp(s.amount, m.amount),
    rate: clamp(s.rate, m.rate),
    years: Math.round(clamp(s.years, m.years)),
    stepUp:
      s.kind === "stepup" ? clamp(s.stepUp, { min: 0, max: 50, step: 1 }) : 0,
  };
}

export function defaultScenario(kind: ScenarioKind): Scenario {
  return { kind, ...KIND_META[kind].defaults };
}

/** Switches calculator but keeps the amount, rate and tenure where they still fit. */
export function changeKind(s: Scenario, kind: ScenarioKind): Scenario {
  if (KIND_META[s.kind].family !== KIND_META[kind].family) {
    return defaultScenario(kind);
  }
  const d = KIND_META[kind].defaults;
  const sameAmountMeaning =
    (["sip", "stepup", "rd"].includes(s.kind) &&
      ["sip", "stepup", "rd"].includes(kind)) ||
    (["lumpsum", "fd"].includes(s.kind) && ["lumpsum", "fd"].includes(kind));
  return normaliseScenario({
    kind,
    amount: sameAmountMeaning ? s.amount : d.amount,
    rate: d.rate,
    years: kind === "ppf" ? d.years : s.years,
    stepUp: kind === "stepup" ? s.stepUp || d.stepUp : 0,
  });
}

function ppfValue(yearly: number, ratePct: number, years: number) {
  const r = ratePct / 100;
  if (years <= 0) return 0;
  if (r <= 0) return yearly * years;
  return yearly * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
}

export type GrowResult = {
  family: "grow";
  invested: number;
  value: number;
  gain: number;
  multiple: number;
  /** Value at the end of each year, index 0 = year 1. */
  byYear: number[];
};

export type LoanResult = {
  family: "loan";
  emi: number;
  totalInterest: number;
  totalPaid: number;
  principal: number;
  /** Outstanding balance at the end of each year, index 0 = year 1. */
  byYear: number[];
};

export type ScenarioResult = GrowResult | LoanResult;

function growValueAt(
  s: Scenario,
  years: number,
): { value: number; invested: number } {
  const months = years * 12;
  switch (s.kind) {
    case "sip":
      return {
        value: sipFV(s.amount, s.rate, months),
        invested: s.amount * months,
      };
    case "stepup": {
      const r = stepUpSip(s.amount, s.stepUp, s.rate, years);
      return { value: r.value, invested: r.invested };
    }
    case "lumpsum":
      return { value: lumpsumFV(s.amount, s.rate, years), invested: s.amount };
    case "fd":
      return {
        value: fixedDeposit({
          principal: s.amount,
          ratePct: s.rate,
          months,
          compounding: "quarterly",
          senior: false,
          slabPct: 0,
        }).maturity,
        invested: s.amount,
      };
    case "rd": {
      const r = recurringDeposit(s.amount, s.rate, months);
      return { value: r.maturity, invested: r.deposited };
    }
    case "ppf":
      return {
        value: ppfValue(s.amount, s.rate, years),
        invested: s.amount * years,
      };
    default:
      return { value: 0, invested: 0 };
  }
}

export function computeScenario(input: Scenario): ScenarioResult {
  const s = normaliseScenario(input);
  if (s.kind === "loan") {
    const months = s.years * 12;
    const emi = emiFor(s.amount, s.rate, months);
    const r = s.rate / 100 / 12;
    const byYear: number[] = [];
    let bal = s.amount;
    for (let m = 1; m <= months; m += 1) {
      bal = Math.max(0, bal * (1 + r) - emi);
      if (m % 12 === 0) byYear.push(bal < 0.5 ? 0 : bal);
    }
    const totalPaid = emi * months;
    return {
      family: "loan",
      emi,
      totalPaid,
      totalInterest: totalPaid - s.amount,
      principal: s.amount,
      byYear,
    };
  }
  const byYear: number[] = [];
  for (let y = 1; y <= s.years; y += 1) byYear.push(growValueAt(s, y).value);
  const end = growValueAt(s, s.years);
  return {
    family: "grow",
    invested: end.invested,
    value: end.value,
    gain: end.value - end.invested,
    multiple: end.invested > 0 ? end.value / end.invested : 0,
    byYear,
  };
}

/** Year-by-year rows for one chart; a scenario's line stops when its term ends. */
export function chartRows(results: ScenarioResult[]) {
  const years = Math.max(0, ...results.map((r) => r.byYear.length));
  return Array.from({ length: years }, (_, i) => {
    const row: Record<string, number> = { year: i + 1 };
    results.forEach((r, j) => {
      const v = r.byYear[i];
      if (v !== undefined) row[`s${j}`] = v;
    });
    return row;
  });
}

// ─── Shareable link: ?s=sip-10000-12-15_fd-500000-7-5 ───────────────────────

export function encodeScenarios(list: Scenario[]): string {
  return list
    .map((raw) => {
      const s = normaliseScenario(raw);
      const parts = [s.kind, s.amount, s.rate, s.years];
      if (s.kind === "stepup") parts.push(s.stepUp);
      return parts.join("-");
    })
    .join("_");
}

/** Returns null unless the string holds 2–3 valid scenarios from one family. */
export function decodeScenarios(
  raw: string | null | undefined,
): Scenario[] | null {
  if (!raw) return null;
  const list: Scenario[] = [];
  for (const chunk of raw.split("_").slice(0, MAX_SCENARIOS)) {
    const [kind, amount, rate, years, stepUp] = chunk.split("-");
    if (!kind || !(kind in KIND_META)) return null;
    const nums = [amount, rate, years].map(Number);
    if (nums.some((n) => !Number.isFinite(n))) return null;
    list.push(
      normaliseScenario({
        kind: kind as ScenarioKind,
        amount: nums[0],
        rate: nums[1],
        years: nums[2],
        stepUp: Number(stepUp) || 0,
      }),
    );
  }
  if (list.length < 2) return null;
  const family = KIND_META[list[0].kind].family;
  if (list.some((s) => KIND_META[s.kind].family !== family)) return null;
  return list;
}

/** Link to the Compare calculator with this scenario as A and a copy as B. */
export function compareHref(s: Scenario): string {
  return `/calculators/compare?s=${encodeScenarios([s, s])}`;
}

// ─── Side-by-side table and verdicts (shared by web and mobile) ─────────────

function inr(n: number) {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n);
  return `${r < 0 ? "−" : ""}₹${formatIndian(Math.abs(r))}`;
}

export const SCENARIO_LETTERS = ["A", "B", "C"];

export type ComparePreset = { label: string; scenarios: Scenario[] };

const sip = (amount: number, rate: number, years: number): Scenario => ({
  kind: "sip",
  amount,
  rate,
  years,
  stepUp: 0,
});
const loan = (amount: number, rate: number, years: number): Scenario => ({
  kind: "loan",
  amount,
  rate,
  years,
  stepUp: 0,
});

export const COMPARE_PRESETS: Record<CompareFamily, ComparePreset[]> = {
  grow: [
    {
      label: "10% vs 12% return",
      scenarios: [sip(10_000, 10, 15), sip(10_000, 12, 15)],
    },
    {
      label: "15 vs 20 years",
      scenarios: [sip(10_000, 12, 15), sip(10_000, 12, 20)],
    },
    {
      label: "SIP vs PPF vs RD",
      scenarios: [
        sip(12_500, 12, 15),
        { kind: "ppf", amount: 1_50_000, rate: 7.1, years: 15, stepUp: 0 },
        { kind: "rd", amount: 12_500, rate: 7, years: 10, stepUp: 0 },
      ],
    },
    {
      label: "Flat vs step-up SIP",
      scenarios: [
        sip(10_000, 12, 15),
        { kind: "stepup", amount: 10_000, rate: 12, years: 15, stepUp: 10 },
      ],
    },
  ],
  loan: [
    {
      label: "15 vs 20 vs 25 years",
      scenarios: [
        loan(50_00_000, 8.5, 15),
        loan(50_00_000, 8.5, 20),
        loan(50_00_000, 8.5, 25),
      ],
    },
    {
      label: "8.5% vs 9.5% rate",
      scenarios: [loan(50_00_000, 8.5, 20), loan(50_00_000, 9.5, 20)],
    },
    {
      label: "Bigger down payment",
      scenarios: [loan(50_00_000, 8.5, 20), loan(40_00_000, 8.5, 20)],
    },
  ],
};

function pctDiff(a: number, b: number) {
  if (a === 0) return "";
  const p = ((b - a) / Math.abs(a)) * 100;
  return ` (${p > 0 ? "+" : ""}${p.toFixed(p > -10 && p < 10 ? 1 : 0)}%)`;
}

/** Plain-English verdict of each scenario against A. */
export function compareVerdicts(results: ScenarioResult[]): string[] {
  const base = results[0];
  return results.slice(1).map((r, i) => {
    const who = SCENARIO_LETTERS[i + 1];
    if (base.family === "grow" && r.family === "grow") {
      const d = r.value - base.value;
      const inv = r.invested - base.invested;
      if (Math.abs(d) < 1 && Math.abs(inv) < 1) {
        return `${who} matches A. Change ${who}'s return, amount or tenure to see the difference.`;
      }
      const head =
        d >= 0
          ? `${who} ends with ${inr(d)} more than A${pctDiff(base.value, r.value)}`
          : `${who} ends with ${inr(-d)} less than A${pctDiff(base.value, r.value)}`;
      const tail =
        Math.abs(inv) < 1
          ? " for the same money put in."
          : inv > 0
            ? `, but you put in ${inr(inv)} more.`
            : `, and you put in ${inr(-inv)} less.`;
      return head + tail;
    }
    const a = base as LoanResult;
    const b = r as LoanResult;
    const di = b.totalInterest - a.totalInterest;
    const de = b.emi - a.emi;
    if (Math.abs(di) < 1 && Math.abs(de) < 1) {
      return `${who} matches A. Change ${who}'s rate, amount or tenure to see the difference.`;
    }
    const head =
      di <= 0
        ? `${who} saves ${inr(-di)} in interest`
        : `${who} costs ${inr(di)} more in interest`;
    const tail =
      Math.abs(de) < 1
        ? " at the same EMI."
        : de > 0
          ? `, but its EMI is ${inr(de)} higher a month.`
          : `, and its EMI is ${inr(-de)} lower a month.`;
    return head + tail;
  });
}

export type CompareRow = {
  label: string;
  values: number[];
  format: (n: number) => string;
  better: "high" | "low" | null;
};

export function compareRows(results: ScenarioResult[]): CompareRow[] {
  if (results[0].family === "grow") {
    const g = results as GrowResult[];
    return [
      {
        label: "Final value",
        values: g.map((r) => r.value),
        format: inr,
        better: "high",
      },
      {
        label: "You put in",
        values: g.map((r) => r.invested),
        format: inr,
        better: null,
      },
      {
        label: "Wealth gained",
        values: g.map((r) => r.gain),
        format: inr,
        better: "high",
      },
      {
        label: "Money multiplied",
        values: g.map((r) => r.multiple),
        format: (n) => `${n.toFixed(2)}×`,
        better: "high",
      },
    ];
  }
  const l = results as LoanResult[];
  return [
    {
      label: "Monthly EMI",
      values: l.map((r) => r.emi),
      format: inr,
      better: "low",
    },
    {
      label: "Total interest",
      values: l.map((r) => r.totalInterest),
      format: inr,
      better: "low",
    },
    {
      label: "Total paid",
      values: l.map((r) => r.totalPaid),
      format: inr,
      better: "low",
    },
    {
      label: "Interest per ₹1 borrowed",
      values: l.map((r) =>
        r.principal > 0 ? r.totalInterest / r.principal : 0,
      ),
      format: (n) => `₹${n.toFixed(2)}`,
      better: "low",
    },
  ];
}

export function bestIndex(row: CompareRow): number | null {
  if (!row.better) return null;
  const vals = row.values;
  const target = row.better === "high" ? Math.max(...vals) : Math.min(...vals);
  // No "best" when every scenario ties.
  if (vals.every((v) => Math.abs(v - target) < 0.005)) return null;
  return vals.findIndex((v) => Math.abs(v - target) < 0.005);
}
