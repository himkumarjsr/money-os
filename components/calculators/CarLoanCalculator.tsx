"use client";

import { formatCurrency } from "@/lib/finance";
import { formatINR } from "@/lib/formatINR";
import { generateAmortisationTable, type AmortisationRow } from "@/lib/amortisation";
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
import { Insight, ResultStat, SliderField, type InsightTone } from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() =>
    Math.min(max, Math.max(min, initial)),
  );
  const set = useCallback(
    (nv: number) => setV(Math.min(max, Math.max(min, nv))),
    [min, max],
  );
  return [v, set] as const;
}

function emi(principal: number, annualPct: number, months: number) {
  if (months <= 0) return 0;
  const r = annualPct / 100 / 12;
  if (r <= 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export function CarLoanCalculator() {
  const [price, setPrice] = useClamped(12_00_000, 3_00_000, 50_00_000);
  const [downPct, setDownPct] = useClamped(15, 0, 40);
  const [rate, setRate] = useClamped(9.5, 7, 16);
  const [years, setYears] = useClamped(5, 3, 7);
  const [salary, setSalary] = useClamped(90_000, 25_000, 5_00_000);
  const [showAll, setShowAll] = useState(false);

  const loan = price * (1 - downPct / 100);
  const months = years * 12;
  const e = emi(loan, rate, months);
  const totalPay = e * months;
  const interest = totalPay - loan;
  const pctOfIncome = salary > 0 ? (e / salary) * 100 : 0;
  const breachEmi = pctOfIncome > 40;
  const affordCap = 6 * salary;
  const breachCar = price > affordCap;

  const tone: InsightTone =
    breachEmi || breachCar ? "bad" : pctOfIncome > 30 || price > affordCap * 0.85
      ? "warn"
      : "good";

  const amortRows = useMemo(
    () => generateAmortisationTable(loan, rate, months, e),
    [e, loan, months, rate],
  );

  const yearlyBreakdown = useMemo(() => {
    const yearsCount = Math.ceil(months / 12);
    const buckets: Array<{ year: string; principalPaid: number; interestPaid: number; outstanding: number }> = [];
    for (let y = 0; y < yearsCount; y += 1) {
      const start = y * 12;
      const end = Math.min((y + 1) * 12, amortRows.length);
      const slice = amortRows.slice(start, end);
      buckets.push({
        year: `Year ${y + 1}`,
        principalPaid: slice.reduce((s, r) => s + r.principal, 0),
        interestPaid: slice.reduce((s, r) => s + r.interest, 0),
        outstanding: slice.length ? slice[slice.length - 1].closingBalance : loan,
      });
    }
    return buckets;
  }, [amortRows, loan, months]);

  const todayLabel = useMemo(
    () => new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
    [],
  );

  const tableWithSummaries = useMemo(() => {
    const out: Array<
      | { kind: "row"; row: AmortisationRow }
      | { kind: "year"; year: number; principal: number; interest: number; emi: number }
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
        const yearNum = monthIndex1 / 12;
        const slice = amortRows.slice(i - 11, i + 1);
        out.push({
          kind: "year",
          year: yearNum,
          principal: slice.reduce((s, x) => s + x.principal, 0),
          interest: slice.reduce((s, x) => s + x.interest, 0),
          emi: slice.reduce((s, x) => s + x.emi, 0),
        });
      }
    }
    out.push({ kind: "total", principal: totalP, interest: totalI, emi: totalE });
    return out;
  }, [amortRows]);

  const defaultVisibleCount = 13;
  const tableToRender = showAll ? tableWithSummaries : tableWithSummaries.slice(0, defaultVisibleCount);

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
        label="On-road / ex-showroom price"
        unitType="money"
        value={price}
        min={3_00_000}
        max={50_00_000}
        step={50_000}
        onChange={setPrice}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Down payment"
        unitType="percent"
        value={downPct}
        min={0}
        max={40}
        step={1}
        onChange={setDownPct}
        format={(v) => `${v}%`}
      />
      <SliderField
        label="Interest rate"
        unitType="percent"
        value={rate}
        min={7}
        max={16}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        unitType="years"
        value={years}
        min={3}
        max={7}
        step={1}
        onChange={setYears}
        format={(v) => `${v} years`}
      />
      <SliderField
        label="Monthly salary"
        unitType="money"
        value={salary}
        min={25_000}
        max={5_00_000}
        step={5_000}
        onChange={setSalary}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label="Loan amount"
          value={formatCurrency(Math.round(loan), "en-IN", "INR")}
        />
        <ResultStat
          label="Monthly EMI"
          value={formatCurrency(Math.round(e), "en-IN", "INR")}
        />
        <ResultStat
          label="EMI % of salary"
          value={`${pctOfIncome.toFixed(1)}%`}
        />
      </div>

      <div className={chartCard}>
        <div>
          <p className="text-sm font-semibold text-slate-900">Yearly breakup</p>
            <div className="mt-4 h-[200px] md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyBreakdown}>
                  <CartesianGrid stroke="#F4F2FC" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#9B9A94" }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9B9A94" }}
                    tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const principalPaid = Number(payload.find((x) => x.dataKey === "principalPaid")?.value ?? 0);
                      const interestPaid = Number(payload.find((x) => x.dataKey === "interestPaid")?.value ?? 0);
                      const outstanding = Number((payload[0]?.payload as { outstanding: number })?.outstanding ?? 0);
                      return (
                        <div style={tooltipStyle}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>{String(label)}</div>
                          <div>Principal paid: {formatINR(principalPaid)}</div>
                          <div>Interest paid: {formatINR(interestPaid)}</div>
                          <div>Outstanding balance: {formatINR(outstanding)}</div>
                        </div>
                      );
                    }}
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
            <p className="mt-3 text-xs text-slate-600">
              You pay {formatINR((interest / Math.max(loan, 1)) * 100)} in interest for every ₹100 you borrow at this rate.
            </p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() =>
            downloadAmortisationExcel(amortRows, loan, rate, months, e, "car-loan")
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
            downloadAmortisationExcel(amortRows, loan, rate, months, e, "car-loan")
          }
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#F0EFF8] bg-white px-5 py-4 text-left"
        >
          <div className="flex items-center gap-4">
            <svg width="32" height="32" aria-hidden>
              <rect width="32" height="32" rx="6" fill="#1D6F42" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">
                X
              </text>
            </svg>
            <div>
              <p className="text-sm font-semibold text-slate-900">Download schedule</p>
              <p className="text-xs text-slate-500">Full amortisation in Excel</p>
            </div>
          </div>
          <span className="text-slate-400">→</span>
        </button>
      </div>

      <div className="hidden md:block">
        <div className="rounded-xl border border-[#F0EFF8] bg-white">
          <div className="border-b border-[#F0EFF8] px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">Amortisation Schedule</p>
            <p className="text-xs text-slate-500">Month by month breakdown</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#534AB7] text-white">
                  {["Date", "Principal", "Interest", "EMI"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-xs font-medium uppercase tracking-[0.5px]"
                    >
                      {h}
                    </th>
                  ))}
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
                      </tr>
                    );
                  }
                  if (entry.kind === "total") {
                    return (
                      <tr key="total" className="bg-[rgba(83,74,183,0.10)] font-semibold">
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">TOTAL</td>
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          {formatINR(entry.principal)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          {formatINR(entry.interest)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-slate-900">
                          {formatINR(entry.emi)}
                        </td>
                      </tr>
                    );
                  }

                  const r = entry.row;
                  const isCurrent = r.date === todayLabel;
                  const zebra = idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFE]";
                  const rowClass = isCurrent ? "bg-[#EEEDFE] font-semibold" : zebra;

                  return (
                    <tr key={r.month} className={`${rowClass} border-b border-[#F0EFF8]`}>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">{r.date}</td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {formatINR(r.principal)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {formatINR(r.interest)}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-slate-900">
                        {formatINR(r.emi)}
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
            {showAll ? "Show less" : `Show all ${months} months`}
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Affordability rule of thumb: car value ≤{" "}
        <strong>6×</strong> monthly salary (≈{" "}
        {formatCurrency(Math.round(affordCap), "en-IN", "INR")} for you).
      </p>

      <Insight tone={tone}>
        {breachCar
          ? "Car price exceeds 6× monthly salary — stretch target or add down payment."
          : breachEmi
            ? "EMI is above 40% of salary — consider a cheaper segment or longer tenure cautiously."
            : "Looks within typical affordability bands."}
      </Insight>
    </div>
  );
}
