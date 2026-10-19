"use client";

import { ShareButton } from "@/components/ui/ShareButton";
import { cn } from "@/lib/cn";
import {
  KIND_META,
  MAX_SCENARIOS,
  changeKind,
  chartRows,
  computeScenario,
  decodeScenarios,
  encodeScenarios,
  kindsInFamily,
  normaliseScenario,
  type CompareFamily,
  type GrowResult,
  type LoanResult,
  type Scenario,
  type ScenarioKind,
  type ScenarioResult,
} from "@/lib/compareScenarios";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Insight, SliderField } from "./calculator-ui";
import { Note, Segmented, inr } from "./advisor/kit";

const LETTERS = ["A", "B", "C"];
const COLORS = ["#534AB7", "#1D9E75", "#D97706"];

type Preset = { label: string; scenarios: Scenario[] };

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

const PRESETS: Record<CompareFamily, Preset[]> = {
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

function familyOf(list: Scenario[]): CompareFamily {
  return KIND_META[list[0].kind].family;
}

function readInitial(): Scenario[] {
  if (typeof window !== "undefined") {
    const fromUrl = decodeScenarios(
      new URLSearchParams(window.location.search).get("s"),
    );
    if (fromUrl) return fromUrl;
  }
  return PRESETS.grow[1].scenarios;
}

function pctDiff(a: number, b: number) {
  if (a === 0) return "";
  const p = ((b - a) / Math.abs(a)) * 100;
  return ` (${p > 0 ? "+" : ""}${p.toFixed(p > -10 && p < 10 ? 1 : 0)}%)`;
}

/** Plain-English verdict of each scenario against A. */
function verdicts(results: ScenarioResult[]): string[] {
  const base = results[0];
  return results.slice(1).map((r, i) => {
    const who = LETTERS[i + 1];
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

type Row = {
  label: string;
  values: number[];
  format: (n: number) => string;
  better: "high" | "low" | null;
};

function tableRows(results: ScenarioResult[]): Row[] {
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

function bestIndex(row: Row): number | null {
  if (!row.better) return null;
  const vals = row.values;
  const target = row.better === "high" ? Math.max(...vals) : Math.min(...vals);
  // No "best" when every scenario ties.
  if (vals.every((v) => Math.abs(v - target) < 0.005)) return null;
  return vals.findIndex((v) => Math.abs(v - target) < 0.005);
}

function ScenarioCard({
  index,
  scenario,
  family,
  canRemove,
  canDuplicate,
  onChange,
  onRemove,
  onDuplicate,
}: {
  index: number;
  scenario: Scenario;
  family: CompareFamily;
  canRemove: boolean;
  canDuplicate: boolean;
  onChange: (s: Scenario) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const meta = KIND_META[scenario.kind];
  const kinds = kindsInFamily(family);
  const set = (patch: Partial<Scenario>) =>
    onChange(normaliseScenario({ ...scenario, ...patch }));

  return (
    <section
      aria-label={`Scenario ${LETTERS[index]}`}
      className="min-w-0 rounded-2xl border border-[#F0EFF8] bg-white p-4"
      style={{ borderTop: `4px solid ${COLORS[index]}` }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-white"
            style={{ backgroundColor: COLORS[index] }}
            aria-hidden
          >
            {LETTERS[index]}
          </span>
          Scenario {LETTERS[index]}
        </p>
        <div className="flex gap-1">
          {canDuplicate ? (
            <button
              type="button"
              onClick={onDuplicate}
              className="min-h-[36px] rounded-lg px-2.5 text-xs font-semibold text-[#534AB7] hover:bg-[#EEEDFE]"
            >
              Duplicate
            </button>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove scenario ${LETTERS[index]}`}
              className="min-h-[36px] rounded-lg px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {kinds.length > 1 ? (
        <label className="mb-4 flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[#5F5E5A]">
            Calculator
          </span>
          <select
            value={scenario.kind}
            onChange={(e) =>
              onChange(changeKind(scenario, e.target.value as ScenarioKind))
            }
            className="min-h-[48px] w-full rounded-xl border border-[#E8E6F0] bg-white px-3.5 text-base font-semibold text-[#111110] outline-none focus:border-[#534AB7]"
            style={{ borderWidth: 1.5 }}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <SliderField
        label={meta.amountLabel}
        unitType="money"
        value={scenario.amount}
        min={meta.amount.min}
        max={meta.amount.max}
        step={meta.amount.step}
        onChange={(amount) => set({ amount })}
      />
      <SliderField
        label={scenario.kind === "loan" ? "Interest rate" : "Expected return"}
        unitType="percent"
        value={scenario.rate}
        min={meta.rate.min}
        max={meta.rate.max}
        step={meta.rate.step}
        onChange={(rate) => set({ rate })}
      />
      <SliderField
        label={scenario.kind === "loan" ? "Tenure" : "Period"}
        unitType="years"
        value={scenario.years}
        min={meta.years.min}
        max={meta.years.max}
        step={meta.years.step}
        onChange={(years) => set({ years })}
      />
      {scenario.kind === "stepup" ? (
        <SliderField
          label="Yearly step-up"
          unitType="percent"
          plainPercent
          value={scenario.stepUp}
          min={0}
          max={50}
          step={1}
          onChange={(stepUp) => set({ stepUp })}
        />
      ) : null}
    </section>
  );
}

export function CompareCalculator() {
  const [scenarios, setScenarios] = useState<Scenario[]>(
    () => PRESETS.grow[1].scenarios,
  );
  const family = familyOf(scenarios);

  // Read a shared or prefilled link after mount (keeps SSR markup stable).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setScenarios(readInitial());
    setReady(true);
  }, []);

  // Keep the address bar in step so the page link is always shareable.
  const encoded = encodeScenarios(scenarios);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("s") === encoded) return;
    url.searchParams.set("s", encoded);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [encoded, ready]);

  const results = useMemo(() => scenarios.map(computeScenario), [scenarios]);
  const rows = useMemo(() => tableRows(results), [results]);
  const data = useMemo(() => chartRows(results), [results]);
  const lines = useMemo(() => verdicts(results), [results]);

  const update = (i: number, s: Scenario) =>
    setScenarios((prev) => prev.map((p, j) => (j === i ? s : p)));
  const remove = (i: number) =>
    setScenarios((prev) => prev.filter((_, j) => j !== i));
  const duplicate = (i: number) =>
    setScenarios((prev) =>
      prev.length >= MAX_SCENARIOS ? prev : [...prev, { ...prev[i] }],
    );
  const addScenario = () =>
    setScenarios((prev) =>
      prev.length >= MAX_SCENARIOS
        ? prev
        : [...prev, { ...prev[prev.length - 1] }],
    );
  const switchFamily = (f: CompareFamily) => {
    if (f === family) return;
    setScenarios(PRESETS[f][0].scenarios);
  };

  const label = (i: number) =>
    `${LETTERS[i]} · ${KIND_META[scenarios[i].kind].label}`;

  return (
    <div className="space-y-6">
      <Segmented
        label="What do you want to compare?"
        value={family}
        options={[
          { value: "grow", label: "Investments & savings" },
          { value: "loan", label: "Loans & EMI" },
        ]}
        onChange={switchFamily}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-[#5F5E5A]">
          Quick start
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESETS[family].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setScenarios(p.scenarios)}
              className={cn(
                "min-h-[40px] rounded-full border px-3.5 text-sm font-semibold transition",
                encodeScenarios(p.scenarios) === encoded
                  ? "border-[#534AB7] bg-[#EEEDFE] text-[#534AB7]"
                  : "border-[#E8E6F0] bg-white text-slate-700 hover:border-[#534AB7]/40",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          scenarios.length === 3
            ? "md:grid-cols-2 xl:grid-cols-3"
            : "md:grid-cols-2",
        )}
      >
        {scenarios.map((s, i) => (
          <ScenarioCard
            key={i}
            index={i}
            scenario={s}
            family={family}
            canRemove={scenarios.length > 2}
            canDuplicate={scenarios.length < MAX_SCENARIOS}
            onChange={(next) => update(i, next)}
            onRemove={() => remove(i)}
            onDuplicate={() => duplicate(i)}
          />
        ))}
      </div>

      {scenarios.length < MAX_SCENARIOS ? (
        <button
          type="button"
          onClick={addScenario}
          className="min-h-[44px] w-full rounded-xl border border-dashed border-[#534AB7]/40 text-sm font-semibold text-[#534AB7] hover:bg-[#EEEDFE]"
        >
          + Add scenario C
        </button>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#F0EFF8] bg-white">
        <table
          className={cn(
            "w-full text-sm",
            scenarios.length === 3 && "min-w-[460px]",
          )}
        >
          <thead>
            <tr className="border-b border-[#F0EFF8]">
              <th className="px-3 py-3 text-left text-xs sm:px-4 font-semibold uppercase tracking-wide text-slate-500">
                Side by side
              </th>
              {scenarios.map((_, i) => (
                <th
                  key={i}
                  className="px-3 py-3 text-right text-xs font-bold sm:px-4"
                  style={{ color: COLORS[i] }}
                >
                  {label(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFF8]">
            {rows.map((row) => {
              const best = bestIndex(row);
              return (
                <tr key={row.label}>
                  <td className="px-3 py-2.5 text-slate-600 sm:px-4">
                    {row.label}
                  </td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={cn(
                        "px-3 py-2.5 text-right tabular-nums sm:px-4",
                        best === i
                          ? "font-bold text-emerald-700"
                          : "font-medium text-slate-800",
                      )}
                    >
                      {row.format(v)}
                      {best === i ? (
                        <span className="ml-1 text-xs" aria-label="best">
                          ✓
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Insight tone="good">
        <ul className="space-y-1">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Insight>

      <div className="rounded-xl border border-[#F0EFF8] bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-900">
          {family === "grow" ? "Value over time" : "Loan left over time"}
        </p>
        <div className="mt-3 h-[220px] md:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid stroke="#F4F2FC" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#9B9A94" }} />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: "#9B9A94" }}
                tickFormatter={(v) => formatIndianCompact(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111110",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "white",
                }}
                labelStyle={{ color: "white", fontWeight: 700 }}
                itemStyle={{ color: "white" }}
                labelFormatter={(l) => `Year ${l}`}
                formatter={(v, name) => [
                  `₹${formatIndian(Math.round(Number(v)))}`,
                  String(name),
                ]}
              />
              {scenarios.map((_, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={`s${i}`}
                  name={label(i)}
                  stroke={COLORS[i]}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Note>
          {family === "grow"
            ? "Returns are pre-tax and assumed constant. FD and RD compound quarterly; PPF assumes one deposit at the start of each year."
            : "Reducing-balance EMI at a fixed rate, no prepayments or fees."}
        </Note>
        <ShareButton
          title="My Finkoin comparison"
          path={`/calculators/compare?s=${encoded}`}
          contentType="calculator"
          contentId="compare"
          text="Share comparison"
        />
      </div>
    </div>
  );
}
