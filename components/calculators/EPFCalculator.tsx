"use client";

import {
  computeEpfProjection,
  EPF_DEFAULT_RATE_PCT,
  EPF_FINAL_AGE,
} from "@/lib/epfCalculator";
import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useMemo, useState } from "react";
import {
  CALCULATOR_MONEY_MAX,
  Insight,
  ResultStat,
  SliderField,
  type InsightTone,
} from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

export function EPFCalculator() {
  const [balance, setBalance] = useClamped(5_00_000, 0, CALCULATOR_MONEY_MAX);
  const [yearly, setYearly] = useClamped(1_20_000, 0, CALCULATOR_MONEY_MAX);
  const [vpfMonthly, setVpfMonthly] = useClamped(0, 0, CALCULATOR_MONEY_MAX);
  const [age, setAgeRaw] = useClamped(30, 18, EPF_FINAL_AGE - 1);
  const [till, setTill] = useClamped(58, 19, EPF_FINAL_AGE);
  const [rate, setRate] = useClamped(EPF_DEFAULT_RATE_PCT, 0, 15);

  const setAge = useCallback(
    (v: number) => {
      setAgeRaw(v);
      if (till <= v) setTill(Math.min(EPF_FINAL_AGE, v + 1));
    },
    [setAgeRaw, setTill, till],
  );
  const stopAge = Math.max(age, till);

  const result = useMemo(
    () =>
      computeEpfProjection({
        currentBalance: balance,
        yearlyContribution: yearly + vpfMonthly * 12,
        currentAge: age,
        contributeTillAge: stopAge,
        annualRatePct: rate,
      }),
    [age, balance, rate, stopAge, vpfMonthly, yearly],
  );

  const data = useMemo(
    () => [
      { age, invested: balance, interest: 0, total: balance },
      ...result.schedule,
    ],
    [age, balance, result.schedule],
  );

  const tone: InsightTone =
    result.totalInterest >= result.totalInvested ? "good" : "warn";

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
        label="Existing PF balance"
        unitType="money"
        value={balance}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={1000}
        onChange={setBalance}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Yearly contribution (employee + employer)"
        unitType="money"
        value={yearly}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={1000}
        onChange={setYearly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Extra VPF (Voluntary PF) per month"
        unitType="money"
        value={vpfMonthly}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={500}
        onChange={setVpfMonthly}
      />
      {vpfMonthly > 0 ? (
        <p className="-mt-2 text-xs text-slate-500">
          VPF earns the EPF rate. Interest on your own PF + VPF above ₹2.5 lakh
          a year is taxable.
        </p>
      ) : null}
      <SliderField
        label="Current age"
        unitType="years"
        value={age}
        min={18}
        max={EPF_FINAL_AGE - 1}
        step={1}
        onChange={setAge}
      />
      <SliderField
        label="Contribute till age"
        unitType="years"
        value={stopAge}
        min={Math.min(EPF_FINAL_AGE, age + 1)}
        max={EPF_FINAL_AGE}
        step={1}
        onChange={setTill}
      />
      <SliderField
        label="EPF interest rate"
        unitType="percent"
        value={rate}
        min={0}
        max={15}
        step={0.05}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat
          label={`Value at age ${EPF_FINAL_AGE}`}
          value={formatCurrency(Math.round(result.finalValue), "en-IN", "INR")}
        />
        <ResultStat
          label="Total invested"
          value={formatCurrency(
            Math.round(result.totalInvested),
            "en-IN",
            "INR",
          )}
        />
        <ResultStat
          label="Interest earned"
          value={formatCurrency(
            Math.round(result.totalInterest),
            "en-IN",
            "INR",
          )}
        />
      </div>

      <div className={chartCard}>
        <p className="text-sm font-semibold text-slate-900">
          PF growth till {EPF_FINAL_AGE}
        </p>
        <div className="mt-4 h-[200px] md:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid stroke="#F4F2FC" />
              <XAxis dataKey="age" tick={{ fontSize: 12, fill: "#9B9A94" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "#9B9A94" }}
                tickFormatter={(v) => formatIndianCompact(Number(v))}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const investedVal = Number(
                    payload.find((x) => x.dataKey === "invested")?.value ?? 0,
                  );
                  const interestVal = Number(
                    payload.find((x) => x.dataKey === "interest")?.value ?? 0,
                  );
                  return (
                    <div style={tooltipStyle}>
                      <div
                        style={{ fontWeight: 700, marginBottom: 6 }}
                      >{`Age ${label}`}</div>
                      <div>
                        Invested: ₹{formatIndian(Math.round(investedVal))}
                      </div>
                      <div>
                        Interest earned: ₹
                        {formatIndian(Math.round(interestVal))}
                      </div>
                      <div>
                        PF balance: ₹
                        {formatIndian(Math.round(investedVal + interestVal))}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="invested"
                stackId="a"
                stroke="transparent"
                fill="#EEEDFE"
                fillOpacity={1}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="interest"
                stackId="a"
                stroke="transparent"
                fill="#534AB7"
                fillOpacity={0.6}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
              {stopAge < EPF_FINAL_AGE ? (
                <ReferenceLine
                  x={stopAge}
                  stroke="#534AB7"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{
                    value: "Contributions stop",
                    position: "insideBottomRight",
                    fill: "#534AB7",
                    fontSize: 12,
                  }}
                />
              ) : null}
              <ReferenceDot
                x={EPF_FINAL_AGE}
                y={result.finalValue}
                r={4}
                fill="#534AB7"
                stroke="none"
                label={{
                  value: `Age ${EPF_FINAL_AGE}`,
                  position: "left",
                  fill: "#534AB7",
                  fontSize: 12,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Insight tone={tone}>
        {result.growthOnlyYears > 0 && result.contributionYears > 0
          ? `You contribute for ${result.contributionYears} years, then your PF keeps earning ${rate}% for ${result.growthOnlyYears} more years until ${EPF_FINAL_AGE}. `
          : result.contributionYears > 0
            ? `You contribute for ${result.contributionYears} years until ${EPF_FINAL_AGE}. `
            : ""}
        EPFO credits interest once a year on your monthly running balance; the
        rate is set every year, so treat this as an estimate.
      </Insight>
    </div>
  );
}
