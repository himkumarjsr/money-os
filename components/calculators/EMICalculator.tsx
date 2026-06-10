"use client";

import { formatCurrency } from "@/lib/finance";
import { formatINR } from "@/lib/formatINR";
import {
  generateAmortisationTable,
  type AmortisationRow,
} from "@/lib/amortisation";
import { downloadAmortisationExcel } from "@/lib/exportExcel";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useMemo, useState } from "react";
import {
  CALCULATOR_MONEY_MAX,
  DateField,
  Insight,
  ResultStat,
  SliderField,
  todayInputValue,
  type InsightTone,
} from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

function emi(principal: number, annualPct: number, months: number) {
  if (months <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r <= 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export function EMICalculator() {
  const [loan, setLoan] = useClamped(25_00_000, 1_00_000, 2_00_00_000);
  const [rate, setRate] = useClamped(10.5, 6, 18);
  const [tenure, setTenure] = useClamped(60, 12, 360);
  const [loanStartDate, setLoanStartDate] = useState(todayInputValue);
  const [showAll, setShowAll] = useState(false);

  const e = emi(loan, rate, tenure);
  const totalPay = e * tenure;
  const interest = totalPay - loan;

  const interestRatio = loan > 0 ? interest / loan : 0;
  const tone: InsightTone =
    interestRatio < 0.35 ? "good" : interestRatio < 0.55 ? "warn" : "bad";

  const amortRows = useMemo(
    () => generateAmortisationTable(loan, rate, tenure, e, loanStartDate),
    [e, loan, loanStartDate, rate, tenure],
  );

  const yearlyBreakdown = useMemo(() => {
    const years = Math.ceil(tenure / 12);
    const buckets: Array<{
      year: string;
      principalPaid: number;
      interestPaid: number;
      outstanding: number;
    }> = [];

    for (let y = 0; y < years; y += 1) {
      const start = y * 12;
      const end = Math.min((y + 1) * 12, amortRows.length);
      const slice = amortRows.slice(start, end);
      const principalPaid = slice.reduce((s, r) => s + r.principal, 0);
      const interestPaid = slice.reduce((s, r) => s + r.interest, 0);
      const outstanding = slice.length
        ? slice[slice.length - 1].closingBalance
        : loan;
      buckets.push({
        year: `Year ${y + 1}`,
        principalPaid,
        interestPaid,
        outstanding,
      });
    }
    return buckets;
  }, [amortRows, loan, tenure]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
    [],
  );

  const tableWithSummaries = useMemo(() => {
    const out: Array<
      | { kind: "row"; row: AmortisationRow }
      | {
          kind: "year";
          year: number;
          principal: number;
          interest: number;
          emi: number;
          outstanding: number;
        }
      | { kind: "total"; principal: number; interest: number; emi: number }
    > = [];

    let totalP = 0;
    let totalI = 0;
    let totalE = 0;

    for (let i = 0; i < amortRows.length; i += 1) {
      const r = amortRows[i];
      totalP += r.principal;
      totalI += r.interest;
      totalE += r.emi;
      out.push({ kind: "row", row: r });

      const monthIndex1 = i + 1;
      if (monthIndex1 % 12 === 0) {
        const year = monthIndex1 / 12;
        const slice = amortRows.slice(i - 11, i + 1);
        out.push({
          kind: "year",
          year,
          principal: slice.reduce((s, x) => s + x.principal, 0),
          interest: slice.reduce((s, x) => s + x.interest, 0),
          emi: slice.reduce((s, x) => s + x.emi, 0),
          outstanding: slice[slice.length - 1]?.closingBalance ?? 0,
        });
      }
    }

    out.push({
      kind: "total",
      principal: totalP,
      interest: totalI,
      emi: totalE,
    });
    return out;
  }, [amortRows]);

  const defaultVisibleCount = 13; // 12 months + Year 1 total row
  const tableToRender = showAll
    ? tableWithSummaries
    : tableWithSummaries.slice(
        0,
        Math.min(defaultVisibleCount, tableWithSummaries.length),
      );

  const chartCard = "rounded-xl border border-[#F0EFF8] bg-white p-5";

  const tooltipStyle = {
    backgroundColor: "#111110",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "white",
  } as const;

  return (
    <div className="space-y-6">
      <SliderField
        label="Loan amount"
        unitType="money"
        value={loan}
        min={1_00_000}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setLoan}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Interest rate"
        unitType="percent"
        value={rate}
        min={6}
        max={18}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        unitType="months"
        value={tenure}
        min={12}
        max={360}
        step={1}
        onChange={setTenure}
        format={(v) => `${v} months (${(v / 12).toFixed(1)} yr)`}
      />
      <DateField
        label="Loan start date"
        value={loanStartDate}
        onChange={setLoanStartDate}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Monthly EMI"
          value={formatCurrency(Math.round(e), "en-IN", "INR")}
        />
        <ResultStat
          label="Total payment"
          value={formatCurrency(Math.round(totalPay), "en-IN", "INR")}
        />
        <ResultStat
          label="Total interest"
          value={formatCurrency(Math.round(interest), "en-IN", "INR")}
        />
      </div>

      <div className={chartCard}>
        <div>
          <p className="text-sm font-semibold text-slate-900">Yearly breakup</p>
          <div className="mt-4 h-[200px] md:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyBreakdown}>
                <CartesianGrid stroke="#F4F2FC" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12, fill: "#9B9A94" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9B9A94" }}
                  tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(
                    value: unknown,
                    name: unknown,
                    props: unknown,
                  ) => {
                    const v = typeof value === "number" ? value : Number(value);
                    const label =
                      String(name) === "principalPaid"
                        ? "Principal paid"
                        : String(name) === "interestPaid"
                          ? "Interest paid"
                          : String(name);
                    return [formatINR(v), label];
                  }}
                  labelFormatter={(label: unknown) => String(label)}
                />
                <Bar
                  dataKey="principalPaid"
                  stackId="a"
                  fill="#534AB7"
                  isAnimationActive
                  animationDuration={400}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="interestPaid"
                  stackId="a"
                  fill="#AFA9EC"
                  isAnimationActive
                  animationDuration={400}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Tip: early years are interest-heavy; later years skew toward
            principal.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() =>
            void downloadAmortisationExcel(
              amortRows,
              loan,
              rate,
              tenure,
              e,
              "emi",
            )
          }
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#534AB7] hover:underline"
        >
          ⬇︎ Download Excel
        </button>
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() =>
            void downloadAmortisationExcel(
              amortRows,
              loan,
              rate,
              tenure,
              e,
              "emi",
            )
          }
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#F0EFF8] bg-white px-5 py-4 text-left"
        >
          <div className="flex items-center gap-4">
            <svg width="32" height="32" aria-hidden>
              <rect width="32" height="32" rx="6" fill="#1D6F42" />
              <text
                x="16"
                y="22"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="800"
              >
                X
              </text>
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Download schedule
              </p>
              <p className="text-xs text-slate-500">
                Full amortisation in Excel
              </p>
            </div>
          </div>
          <span className="text-slate-400">→</span>
        </button>
      </div>

      <div className="hidden md:block">
        <div className="rounded-xl border border-[#F0EFF8] bg-white">
          <div className="border-b border-[#F0EFF8] px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Amortisation Schedule
            </p>
            <p className="text-xs text-slate-500">Month by month breakdown</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#534AB7] text-white">
                  {["Date", "Principal", "Interest", "EMI", "Outstanding"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-xs font-medium uppercase tracking-[0.5px]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {tableToRender.map((entry, idx) => {
                  if (entry.kind === "year") {
                    return (
                      <tr key={`year-${entry.year}`} className="bg-[#F4F2FC]">
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-900">
                          Year {entry.year} total
                        </td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-900">
                          {formatINR(entry.principal)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-900">
                          {formatINR(entry.interest)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-900">
                          {formatINR(entry.emi)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-900">
                          {formatINR(entry.outstanding)}
                        </td>
                      </tr>
                    );
                  }
                  if (entry.kind === "total") {
                    return (
                      <tr
                        key="total"
                        className="bg-[rgba(83,74,183,0.10)] font-semibold"
                      >
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          TOTAL
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          {formatINR(entry.principal)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          {formatINR(entry.interest)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          {formatINR(entry.emi)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          —
                        </td>
                      </tr>
                    );
                  }

                  const r = entry.row;
                  const isCurrent = r.date === todayLabel;
                  const zebra = idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFE]";
                  const rowClass = isCurrent
                    ? "bg-[#EEEDFE] font-semibold"
                    : zebra;

                  return (
                    <tr
                      key={r.month}
                      className={`${rowClass} border-b border-[#F0EFF8]`}
                    >
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {r.date}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {formatINR(r.principal)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {formatINR(r.interest)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {formatINR(r.emi)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {formatINR(r.closingBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-3">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-semibold text-[#534AB7] hover:underline"
          >
            {showAll ? "Show less" : `Show all ${tenure} months`}
          </button>
        </div>
      </div>

      <Insight tone={tone}>
        Interest is about <strong>{(interestRatio * 100).toFixed(0)}%</strong>{" "}
        of principal —{" "}
        {interestRatio < 0.45
          ? "consider prepayment when possible."
          : "explore shorter tenure or balance transfer if eligible."}
      </Insight>
    </div>
  );
}
