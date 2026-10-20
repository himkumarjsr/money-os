"use client";

import {
  assetAllocation,
  cagr,
  expenseRatioDrag,
  fixedDeposit,
  goalPlan,
  goldCompare,
  inflate,
  lumpsumFV,
  realReturn,
  rebalance,
  recurringDeposit,
  sipDelayCost,
  stepUpSip,
  stpPlan,
  xirr,
  yearsToMultiply,
  type CashFlow,
  type Compounding,
  type RiskProfile,
} from "@/lib/advisorCalculators";
import { useMemo, useState } from "react";
import { CompareLink } from "../CompareLink";
import { GrowthChart } from "./GrowthChart";
import {
  Bars,
  DateField,
  Hero,
  Inputs,
  Insight,
  MoneyField,
  Note,
  ResultStat,
  Rows,
  Segmented,
  SlabField,
  SliderField,
  Stat,
  Stats,
  YesNo,
  inr,
  pct,
  todayInputValue,
  useNum,
} from "./kit";

const MAX = 99_00_00_000;

export function LumpsumCalculator() {
  const [amount, setAmount] = useNum(5_00_000);
  const [rate, setRate] = useNum(12);
  const [years, setYears] = useNum(10);
  const [infl, setInfl] = useNum(6);
  const fv = lumpsumFV(amount, rate, years);
  const real = fv / Math.pow(1 + infl / 100, years);
  const data = useMemo(
    () =>
      Array.from({ length: years }, (_, i) => ({
        year: i + 1,
        value: lumpsumFV(amount, rate, i + 1),
        invested: amount,
      })),
    [amount, rate, years],
  );
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="One-time investment"
          unitType="money"
          value={amount}
          min={1_000}
          max={MAX}
          step={1_000}
          onChange={setAmount}
        />
        <SliderField
          label="Expected annual return"
          unitType="percent"
          value={rate}
          min={1}
          max={30}
          step={0.1}
          onChange={setRate}
        />
        <SliderField
          label="Investment period"
          unitType="years"
          value={years}
          min={1}
          max={40}
          onChange={setYears}
        />
        <SliderField
          label="Inflation (for today's value)"
          unitType="percent"
          value={infl}
          min={0}
          max={12}
          step={0.1}
          onChange={setInfl}
        />
      </Inputs>
      <Hero
        label="Value at the end"
        value={fv}
        sub={
          <>
            Your money grows{" "}
            <strong>{(fv / Math.max(1, amount)).toFixed(1)}×</strong> in {years}{" "}
            years.
          </>
        }
      />
      <Stats>
        <ResultStat label="Invested" value={inr(amount)} />
        <ResultStat label="Gain" value={inr(fv - amount)} />
        <ResultStat label="Worth in today's money" value={inr(real)} />
      </Stats>
      <GrowthChart
        title="Growth over time"
        data={data}
        series={[
          { key: "value", label: "Value" },
          { key: "invested", label: "Invested", dashed: true },
        ]}
      />
      <CompareLink
        scenario={{ kind: "lumpsum", amount, rate, years, stepUp: 0 }}
      />
    </div>
  );
}

export function StepUpSipCalculator() {
  const [monthly, setMonthly] = useNum(10_000);
  const [step, setStep] = useNum(10);
  const [rate, setRate] = useNum(12);
  const [years, setYears] = useNum(15);
  const r = stepUpSip(monthly, step, rate, years);
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Starting monthly SIP"
          unitType="money"
          value={monthly}
          min={500}
          max={1_00_00_000}
          step={500}
          onChange={setMonthly}
        />
        <SliderField
          label="Increase SIP every year by"
          unitType="percent"
          value={step}
          min={0}
          max={50}
          step={1}
          onChange={setStep}
        />
        <SliderField
          label="Expected annual return"
          unitType="percent"
          value={rate}
          min={1}
          max={30}
          step={0.1}
          onChange={setRate}
        />
        <SliderField
          label="Investment period"
          unitType="years"
          value={years}
          min={1}
          max={40}
          onChange={setYears}
        />
      </Inputs>
      <Hero
        label="Value with step-up"
        value={r.value}
        sub={
          <>
            That is <strong>{inr(r.value - r.flatValue)}</strong> more than a
            flat SIP of {inr(monthly)}.
          </>
        }
      />
      <Stats>
        <ResultStat label="Total invested" value={inr(r.invested)} />
        <ResultStat label="Flat SIP value" value={inr(r.flatValue)} />
        <ResultStat
          label="SIP in final year (monthly)"
          value={inr(r.rows.at(-1)?.monthly ?? monthly)}
        />
      </Stats>
      <GrowthChart
        title="Step-up vs flat SIP"
        data={r.rows.map((x) => ({
          year: x.year,
          stepUp: x.stepUp,
          flat: x.flat,
        }))}
        series={[
          { key: "stepUp", label: "Step-up SIP" },
          { key: "flat", label: "Flat SIP", dashed: true },
        ]}
      />
      <Note>
        Increase your SIP each year in line with your salary hike — it is the
        single biggest lever after starting early.
      </Note>
      <CompareLink
        scenario={{
          kind: "stepup",
          amount: monthly,
          rate,
          years,
          stepUp: step,
        }}
      />
    </div>
  );
}

export function GoalPlannerCalculator({
  goalLabel = "Goal cost in today's money",
  defaultCost = 10_00_000,
  defaultYears = 10,
  defaultInflation = 6,
  yearsLabel = "Years to goal",
  maxYears = 40,
}: {
  goalLabel?: string;
  defaultCost?: number;
  defaultYears?: number;
  defaultInflation?: number;
  yearsLabel?: string;
  maxYears?: number;
}) {
  const [cost, setCost] = useNum(defaultCost);
  const [years, setYears] = useNum(defaultYears);
  const [infl, setInfl] = useNum(defaultInflation);
  const [ret, setRet] = useNum(12);
  const [saved, setSaved] = useNum(0);
  const g = goalPlan({
    costToday: cost,
    years,
    inflationPct: infl,
    returnPct: ret,
    existingSavings: saved,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label={goalLabel}
          unitType="money"
          value={cost}
          min={10_000}
          max={MAX}
          step={10_000}
          onChange={setCost}
        />
        <SliderField
          label={yearsLabel}
          unitType="years"
          value={years}
          min={1}
          max={maxYears}
          onChange={setYears}
        />
        <SliderField
          label="Inflation for this goal"
          unitType="percent"
          value={infl}
          min={0}
          max={15}
          step={0.5}
          onChange={setInfl}
        />
        <SliderField
          label="Expected annual return"
          unitType="percent"
          value={ret}
          min={1}
          max={20}
          step={0.5}
          onChange={setRet}
        />
        <SliderField
          label="Already saved for it"
          unitType="money"
          value={saved}
          min={0}
          max={MAX}
          step={10_000}
          onChange={setSaved}
        />
      </Inputs>
      <Hero
        label="Monthly SIP needed"
        value={g.sip}
        sub={
          <>
            The goal will cost about <strong>{inr(g.futureCost)}</strong> in{" "}
            {years} years.
          </>
        }
      />
      <Stats>
        <ResultStat label="Future cost" value={inr(g.futureCost)} />
        <ResultStat label="Savings will grow to" value={inr(g.existingFV)} />
        <ResultStat label="Or invest once today" value={inr(g.lumpsum)} />
      </Stats>
      {g.delays.length ? (
        <Bars
          title="If you start later, the monthly SIP becomes"
          items={[
            { label: "Start now", value: g.sip, highlight: true },
            ...g.delays.map((d) => ({
              label: `Start in ${d.delayYears} yr${d.delayYears > 1 ? "s" : ""}`,
              value: d.sip,
            })),
          ]}
        />
      ) : null}
      {g.gap === 0 ? (
        <Insight tone="good">
          Your existing savings already cover this goal at {ret}% a year.
        </Insight>
      ) : null}
    </div>
  );
}

export function SipDelayCalculator() {
  const [monthly, setMonthly] = useNum(10_000);
  const [rate, setRate] = useNum(12);
  const [years, setYears] = useNum(25);
  const [delay, setDelay] = useNum(5);
  const d = sipDelayCost(monthly, rate, years, Math.min(delay, years - 1));
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Monthly SIP"
          unitType="money"
          value={monthly}
          min={500}
          max={1_00_00_000}
          step={500}
          onChange={setMonthly}
        />
        <SliderField
          label="Expected annual return"
          unitType="percent"
          value={rate}
          min={1}
          max={20}
          step={0.5}
          onChange={setRate}
        />
        <SliderField
          label="Years until you need the money"
          unitType="years"
          value={years}
          min={2}
          max={40}
          onChange={setYears}
        />
        <SliderField
          label="Years you delay starting"
          unitType="years"
          value={delay}
          min={1}
          max={Math.max(1, years - 1)}
          onChange={setDelay}
        />
      </Inputs>
      <Hero
        label="Cost of waiting"
        value={d.loss}
        sub={
          <>
            To catch up you would need <strong>{inr(d.sipToCatchUp)}</strong> a
            month instead of {inr(monthly)}.
          </>
        }
      />
      <Bars
        items={[
          { label: "Start today", value: d.now, highlight: true },
          {
            label: `Start after ${Math.min(delay, years - 1)} years`,
            value: d.later,
          },
        ]}
      />
    </div>
  );
}

export function StpCalculator() {
  const [amount, setAmount] = useNum(12_00_000);
  const [months, setMonths] = useNum(12);
  const [debt, setDebt] = useNum(7);
  const [eq, setEq] = useNum(12);
  const [years, setYears] = useNum(5);
  const s = stpPlan({
    amount,
    transferMonths: months,
    debtPct: debt,
    equityPct: eq,
    horizonYears: years,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Lumpsum parked in a debt / liquid fund"
          unitType="money"
          value={amount}
          min={50_000}
          max={MAX}
          step={10_000}
          onChange={setAmount}
        />
        <SliderField
          label="Transfer to equity over"
          unitType="months"
          value={months}
          min={1}
          max={36}
          onChange={setMonths}
        />
        <SliderField
          label="Debt fund return"
          unitType="percent"
          value={debt}
          min={3}
          max={10}
          step={0.1}
          onChange={setDebt}
        />
        <SliderField
          label="Equity fund return"
          unitType="percent"
          value={eq}
          min={4}
          max={20}
          step={0.1}
          onChange={setEq}
        />
        <SliderField
          label="Total holding period"
          unitType="years"
          value={years}
          min={1}
          max={30}
          onChange={setYears}
        />
      </Inputs>
      <Hero
        label="Value at the end with STP"
        value={s.finalValue}
        sub={
          <>
            About <strong>{inr(s.transfer)}</strong> moves into equity every
            month at first.
          </>
        }
      />
      <Bars
        title="STP vs alternatives"
        items={[
          { label: "All in equity on day one", value: s.lumpEquity },
          { label: "STP (staggered)", value: s.finalValue, highlight: true },
          { label: "Kept in debt fund", value: s.allDebt },
        ]}
      />
      <Note>
        An STP gives up a little return (if markets rise steadily) to avoid
        putting everything in at a market peak. Each transfer is a redemption
        from the debt fund and may be taxed.
      </Note>
    </div>
  );
}

export function CagrCalculator() {
  const [start, setStart] = useNum(1_00_000);
  const [end, setEnd] = useNum(2_50_000);
  const [years, setYears] = useNum(7);
  const c = cagr(start, end, years);
  const abs = start > 0 ? ((end - start) / start) * 100 : 0;
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Starting value"
          unitType="money"
          value={start}
          min={1_000}
          max={MAX}
          step={1_000}
          onChange={setStart}
        />
        <SliderField
          label="Ending value"
          unitType="money"
          value={end}
          min={1_000}
          max={MAX}
          step={1_000}
          onChange={setEnd}
        />
        <SliderField
          label="Holding period"
          unitType="years"
          value={years}
          min={1}
          max={50}
          step={0.5}
          onChange={setYears}
        />
      </Inputs>
      <Hero label="CAGR (yearly growth rate)" value={pct(c)} />
      <Stats>
        <Stat label="Absolute return" value={pct(abs, 1)} />
        <Stat label="Real CAGR (6% inflation)" value={pct(realReturn(c, 6))} />
        <Stat
          label="FD at 7% would be"
          value={inr(lumpsumFV(start, 7, years))}
        />
      </Stats>
      <Insight tone={c >= 12 ? "good" : c >= 7 ? "warn" : "bad"}>
        {c >= 12
          ? "Equity-like growth."
          : c >= 7
            ? "Roughly FD-like growth."
            : "Below a fixed deposit — check whether the risk was worth it."}
      </Insight>
      <Note>
        CAGR fits one start and one end value. For SIPs, top-ups or withdrawals
        use the XIRR calculator.
      </Note>
    </div>
  );
}

type FlowRow = CashFlow & { id: number; kind: "in" | "out" };

export function XirrCalculator() {
  const year = new Date().getFullYear();
  const [rows, setRows] = useState<FlowRow[]>([
    { id: 1, date: `${year - 3}-04-10`, amount: 1_00_000, kind: "in" },
    { id: 2, date: `${year - 2}-04-10`, amount: 1_00_000, kind: "in" },
    { id: 3, date: `${year - 1}-04-10`, amount: 1_00_000, kind: "in" },
  ]);
  const [current, setCurrent] = useNum(3_90_000);
  const [asOf, setAsOf] = useState(todayInputValue());
  const flows: CashFlow[] = [
    ...rows.map((r) => ({
      date: r.date,
      amount: r.kind === "in" ? -r.amount : r.amount,
    })),
    { date: asOf, amount: current },
  ];
  const result = xirr(flows);
  const invested = rows.reduce(
    (s, r) => s + (r.kind === "in" ? r.amount : -r.amount),
    0,
  );
  const update = (id: number, patch: Partial<FlowRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[13px] font-semibold text-[#5F5E5A]">
          Your investments and withdrawals
        </p>
        {rows.map((r, idx) => (
          <div
            key={r.id}
            className="rounded-xl border border-[#F0EFF8] bg-white p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Entry {idx + 1}
              </span>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setRows((rs) => rs.filter((x) => x.id !== r.id))
                  }
                  className="min-h-[36px] px-2 text-xs font-semibold text-[#534AB7]"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-x-3 sm:grid-cols-3">
              <Segmented
                label="Type"
                value={r.kind}
                options={[
                  { value: "in", label: "Invested" },
                  { value: "out", label: "Withdrew" },
                ]}
                onChange={(v) => update(r.id, { kind: v })}
              />
              <DateField
                label="Date"
                value={r.date}
                onChange={(v) => update(r.id, { date: v })}
              />
              <MoneyField
                label="Amount"
                value={r.amount}
                onChange={(v) => update(r.id, { amount: v })}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows((rs) => [
              ...rs,
              {
                id: Date.now(),
                date: todayInputValue(),
                amount: 10_000,
                kind: "in",
              },
            ])
          }
          className="min-h-[44px] w-full rounded-xl border border-dashed border-[#534AB7]/40 text-sm font-semibold text-[#534AB7] hover:bg-[#EEEDFE]/40"
        >
          + Add entry
        </button>
      </div>
      <Inputs>
        <SliderField
          label="Value today"
          unitType="money"
          value={current}
          min={0}
          max={MAX}
          step={1_000}
          onChange={setCurrent}
        />
        <DateField label="Value as on" value={asOf} onChange={setAsOf} />
      </Inputs>
      <Hero
        label="XIRR (annualised return)"
        value={result === null ? "Add an investment and a value" : pct(result)}
      />
      <Stats>
        <ResultStat label="Net invested" value={inr(invested)} />
        <ResultStat label="Gain" value={inr(current - invested)} />
      </Stats>
      <Note>
        XIRR accounts for when each rupee went in, so it is the right return
        figure for SIPs and irregular investments.
      </Note>
    </div>
  );
}

export function InflationCalculator() {
  const [mode, setMode] = useState<"future" | "real">("future");
  const [amount, setAmount] = useNum(1_00_000);
  const [infl, setInfl] = useNum(6);
  const [years, setYears] = useNum(10);
  const [nominal, setNominal] = useNum(7);
  const [slab, setSlab] = useNum(30);
  const future = inflate(amount, infl, years);
  const power = amount / Math.pow(1 + infl / 100, years);
  const postTax = nominal * (1 - slab / 100);
  return (
    <div className="space-y-6">
      <Segmented
        label="What do you want to know?"
        value={mode}
        options={[
          { value: "future", label: "Future cost" },
          { value: "real", label: "Real return" },
        ]}
        onChange={setMode}
      />
      {mode === "future" ? (
        <>
          <Inputs>
            <SliderField
              label="Cost today"
              unitType="money"
              value={amount}
              min={100}
              max={MAX}
              step={100}
              onChange={setAmount}
            />
            <SliderField
              label="Inflation"
              unitType="percent"
              value={infl}
              min={0}
              max={20}
              step={0.1}
              onChange={setInfl}
            />
            <SliderField
              label="Years from now"
              unitType="years"
              value={years}
              min={1}
              max={50}
              onChange={setYears}
            />
          </Inputs>
          <Hero label={`Cost after ${years} years`} value={future} />
          <Stats>
            <ResultStat
              label={`What ${inr(amount)} will buy then (today's money)`}
              value={inr(power)}
            />
            <Stat
              label="Money loses"
              value={pct((1 - power / amount) * 100, 0)}
              sub="of its buying power"
            />
          </Stats>
        </>
      ) : (
        <>
          <Inputs>
            <SliderField
              label="Return on investment"
              unitType="percent"
              value={nominal}
              min={0}
              max={30}
              step={0.1}
              onChange={setNominal}
            />
            <SliderField
              label="Inflation"
              unitType="percent"
              value={infl}
              min={0}
              max={20}
              step={0.1}
              onChange={setInfl}
            />
          </Inputs>
          <SlabField
            label="Tax on this return (your slab, 0% if tax-free)"
            value={slab}
            onChange={setSlab}
          />
          <Hero
            label="Real return after tax and inflation"
            value={pct(realReturn(postTax, infl))}
          />
          <Stats>
            <Stat
              label="Real return before tax"
              value={pct(realReturn(nominal, infl))}
            />
            <Stat label="Post-tax return" value={pct(postTax)} />
          </Stats>
          {realReturn(postTax, infl) < 0 ? (
            <Insight tone="bad">
              This investment is losing buying power after tax.
            </Insight>
          ) : null}
        </>
      )}
    </div>
  );
}

export function MoneyDoubleCalculator() {
  const [rate, setRate] = useNum(8);
  const [amount, setAmount] = useNum(1_00_000);
  const d = yearsToMultiply(rate, 2);
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Annual return"
          unitType="percent"
          value={rate}
          min={0.5}
          max={30}
          step={0.1}
          onChange={setRate}
        />
        <SliderField
          label="Amount"
          unitType="money"
          value={amount}
          min={1_000}
          max={MAX}
          step={1_000}
          onChange={setAmount}
        />
      </Inputs>
      <Hero
        label="Years to double"
        value={`${d.toFixed(1)} years`}
        sub={<>Rule of 72 says about {(72 / rate).toFixed(1)} years.</>}
      />
      <Stats>
        <Stat
          label={`Triple (${inr(amount * 3)})`}
          value={`${yearsToMultiply(rate, 3).toFixed(1)} yrs`}
        />
        <Stat
          label={`4× (${inr(amount * 4)})`}
          value={`${yearsToMultiply(rate, 4).toFixed(1)} yrs`}
        />
        <Stat
          label={`10× (${inr(amount * 10)})`}
          value={`${yearsToMultiply(rate, 10).toFixed(1)} yrs`}
        />
      </Stats>
    </div>
  );
}

export function FdCalculator() {
  const [principal, setPrincipal] = useNum(5_00_000);
  const [rate, setRate] = useNum(7);
  const [months, setMonths] = useNum(36);
  const [comp, setComp] = useState<Compounding>("quarterly");
  const [senior, setSenior] = useState(false);
  const [slab, setSlab] = useNum(30);
  const effRate = rate + (senior ? 0.5 : 0);
  const fd = fixedDeposit({
    principal,
    ratePct: effRate,
    months,
    compounding: comp,
    senior,
    slabPct: slab,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Deposit amount"
          unitType="money"
          value={principal}
          min={1_000}
          max={MAX}
          step={1_000}
          onChange={setPrincipal}
        />
        <SliderField
          label="Interest rate"
          unitType="percent"
          value={rate}
          min={2}
          max={10}
          step={0.05}
          onChange={setRate}
        />
        <SliderField
          label="Tenure"
          unitType="months"
          value={months}
          min={3}
          max={120}
          onChange={setMonths}
        />
      </Inputs>
      <Segmented
        label="Compounding"
        value={comp}
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "half-yearly", label: "Half-yearly" },
          { value: "yearly", label: "Yearly" },
        ]}
        onChange={setComp}
      />
      <YesNo
        label="Senior citizen (+0.5% rate)"
        value={senior}
        onChange={setSenior}
      />
      <SlabField value={slab} onChange={setSlab} />
      <Hero
        label="Maturity amount"
        value={fd.maturity}
        sub={
          <>
            After tax you keep about <strong>{inr(fd.postTaxMaturity)}</strong>{" "}
            ({pct(fd.postTaxYield)} a year).
          </>
        }
      />
      <Stats>
        <ResultStat label="Interest earned" value={inr(fd.interest)} />
        <ResultStat label="Tax at your slab" value={inr(fd.tax)} />
        <ResultStat label="TDS the bank may deduct" value={inr(fd.tds)} />
      </Stats>
      <Note>
        Banks deduct 10% TDS when FD interest crosses {inr(fd.tdsThreshold)} in
        a financial year (20% without PAN). Submit Form 15G/15H if your total
        income is below the taxable limit. Effective yield{" "}
        {pct(fd.effectiveYield)}.
      </Note>
      <CompareLink
        scenario={{
          kind: "fd",
          amount: principal,
          rate,
          years: Math.max(1, Math.round(months / 12)),
          stepUp: 0,
        }}
      />
    </div>
  );
}

export function RdCalculator() {
  const [monthly, setMonthly] = useNum(5_000);
  const [rate, setRate] = useNum(6.8);
  const [months, setMonths] = useNum(24);
  const rd = recurringDeposit(monthly, rate, months);
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Monthly deposit"
          unitType="money"
          value={monthly}
          min={100}
          max={10_00_000}
          step={100}
          onChange={setMonthly}
        />
        <SliderField
          label="Interest rate"
          unitType="percent"
          value={rate}
          min={2}
          max={10}
          step={0.05}
          onChange={setRate}
        />
        <SliderField
          label="Tenure"
          unitType="months"
          value={months}
          min={6}
          max={120}
          step={3}
          onChange={setMonths}
        />
      </Inputs>
      <Hero label="Maturity amount" value={rd.maturity} />
      <Stats>
        <ResultStat label="Total deposited" value={inr(rd.deposited)} />
        <ResultStat label="Interest earned" value={inr(rd.interest)} />
      </Stats>
      <Note>
        Bank RDs compound quarterly. RD interest is taxed at your slab and TDS
        rules are the same as FDs.
      </Note>
      <CompareLink
        scenario={{
          kind: "rd",
          amount: monthly,
          rate,
          years: Math.max(1, Math.round(months / 12)),
          stepUp: 0,
        }}
      />
    </div>
  );
}

export function GoldCalculator() {
  const [amount, setAmount] = useNum(2_00_000);
  const [growth, setGrowth] = useNum(9);
  const [years, setYears] = useNum(8);
  const [making, setMaking] = useNum(10);
  const [slab, setSlab] = useNum(30);
  const g = goldCompare({
    amount,
    growthPct: growth,
    years,
    makingPct: making,
    etfExpensePct: 0.5,
    slabPct: slab,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Amount to invest in gold"
          unitType="money"
          value={amount}
          min={5_000}
          max={MAX}
          step={5_000}
          onChange={setAmount}
        />
        <SliderField
          label="Expected gold price growth"
          unitType="percent"
          value={growth}
          min={0}
          max={20}
          step={0.5}
          onChange={setGrowth}
        />
        <SliderField
          label="Holding period"
          unitType="years"
          value={years}
          min={1}
          max={30}
          onChange={setYears}
        />
        <SliderField
          label="Jewellery making charges"
          unitType="percent"
          plainPercent
          value={making}
          min={0}
          max={30}
          step={0.5}
          onChange={setMaking}
        />
      </Inputs>
      <SlabField value={slab} onChange={setSlab} />
      <Bars
        title="What you take home after tax"
        items={[
          {
            label: "Sovereign Gold Bond (held to maturity)",
            value: g.sgb.net,
            highlight: g.sgb.net >= g.etf.net,
          },
          {
            label: "Gold ETF / gold fund",
            value: g.etf.net,
            highlight: g.etf.net > g.sgb.net,
          },
          { label: "Jewellery / physical gold", value: g.physical.net },
        ]}
      />
      <Rows
        rows={[
          {
            label: "Physical: 3% GST + making charges are lost on resale",
            value: inr(g.physical.value),
          },
          {
            label: "ETF: tracks gold less ~0.5% expense ratio",
            value: inr(g.etf.value),
          },
          {
            label: "SGB: 2.5% yearly interest, tax-free at maturity",
            value: inr(g.sgb.value),
          },
        ]}
      />
      <Note>
        New SGB issues have stopped; existing bonds can be bought on the stock
        exchange. Gold held over 24 months (12 for ETFs) is taxed at 12.5%.
      </Note>
    </div>
  );
}

export function ExpenseRatioCalculator() {
  const [lump, setLump] = useNum(0);
  const [monthly, setMonthly] = useNum(15_000);
  const [gross, setGross] = useNum(12);
  const [direct, setDirect] = useNum(0.5);
  const [regular, setRegular] = useNum(1.5);
  const [years, setYears] = useNum(20);
  const r = expenseRatioDrag({
    lumpsum: lump,
    monthly,
    grossPct: gross,
    directTerPct: direct,
    regularTerPct: regular,
    years,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Monthly SIP"
          unitType="money"
          value={monthly}
          min={0}
          max={1_00_00_000}
          step={500}
          onChange={setMonthly}
        />
        <SliderField
          label="One-time investment"
          unitType="money"
          value={lump}
          min={0}
          max={MAX}
          step={10_000}
          onChange={setLump}
        />
        <SliderField
          label="Fund return before costs"
          unitType="percent"
          value={gross}
          min={4}
          max={20}
          step={0.1}
          onChange={setGross}
        />
        <SliderField
          label="Investment period"
          unitType="years"
          value={years}
          min={1}
          max={40}
          onChange={setYears}
        />
        <SliderField
          label="Direct plan expense ratio"
          unitType="percent"
          value={direct}
          min={0}
          max={2.5}
          step={0.05}
          onChange={setDirect}
        />
        <SliderField
          label="Regular plan expense ratio"
          unitType="percent"
          value={regular}
          min={0}
          max={3}
          step={0.05}
          onChange={setRegular}
        />
      </Inputs>
      <Hero label="Extra wealth in the direct plan" value={r.difference} />
      <Bars
        items={[
          { label: "Direct plan", value: r.direct, highlight: true },
          { label: "Regular plan", value: r.regular },
        ]}
      />
      <Note>
        The regular plan pays a distributor commission out of your returns every
        year. Same fund, same manager — only the cost differs.
      </Note>
    </div>
  );
}

export function AssetAllocationCalculator() {
  const [age, setAge] = useNum(32);
  const [risk, setRisk] = useState<RiskProfile>("moderate");
  const [horizon, setHorizon] = useNum(15);
  const [eq, setEq] = useNum(3_00_000);
  const [debt, setDebt] = useNum(5_00_000);
  const [gold, setGold] = useNum(50_000);
  const target = assetAllocation(age, risk, horizon);
  const moves = rebalance({ equity: eq, debt, gold }, target);
  const names = { equity: "Equity", debt: "Debt", gold: "Gold" } as const;
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Your age"
          unitType="years"
          value={age}
          min={18}
          max={80}
          onChange={setAge}
        />
        <SliderField
          label="When you need most of the money"
          unitType="years"
          value={horizon}
          min={1}
          max={40}
          onChange={setHorizon}
        />
      </Inputs>
      <Segmented
        label="How do you handle a 20% fall?"
        value={risk}
        options={[
          { value: "conservative", label: "I'd sell" },
          { value: "moderate", label: "I'd wait" },
          { value: "aggressive", label: "I'd buy more" },
        ]}
        onChange={setRisk}
      />
      <Hero
        label="Suggested mix"
        value={`${target.equity}% equity · ${target.debt}% debt · ${target.gold}% gold`}
      />
      <p className="text-[13px] font-semibold text-[#5F5E5A]">
        What you hold now (optional, to rebalance)
      </p>
      <Inputs>
        <MoneyField
          label="Equity (stocks, equity funds)"
          value={eq}
          onChange={setEq}
        />
        <MoneyField
          label="Debt (FD, PPF, EPF, debt funds)"
          value={debt}
          onChange={setDebt}
        />
        <MoneyField label="Gold" value={gold} onChange={setGold} />
      </Inputs>
      <Rows
        title="To rebalance"
        rows={moves.map((m) => ({
          label: `${names[m.key]}: ${m.currentPct.toFixed(0)}% now → ${m.targetPct}%`,
          value:
            Math.abs(m.move) < 500
              ? "On target"
              : m.move > 0
                ? `Add ${inr(m.move)}`
                : `Reduce ${inr(-m.move)}`,
        }))}
      />
      <Note>
        A starting point based on age, time horizon and comfort with risk.
        Rebalance once a year or when a part drifts more than 5%.
      </Note>
    </div>
  );
}

export function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useNum(1_00_000);
  const [rate, setRate] = useNum(8);
  const [years, setYears] = useNum(10);
  const [freq, setFreq] = useState<Compounding>("quarterly");
  const k = { monthly: 12, quarterly: 4, "half-yearly": 2, yearly: 1 }[freq];
  const value = (y: number) => principal * Math.pow(1 + rate / 100 / k, k * y);
  const fv = value(years);
  const data = Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    value: value(i + 1),
    simple: principal * (1 + (rate / 100) * (i + 1)),
  }));
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Principal"
          unitType="money"
          value={principal}
          min={1_000}
          max={MAX}
          step={1_000}
          onChange={setPrincipal}
        />
        <SliderField
          label="Annual interest rate"
          unitType="percent"
          value={rate}
          min={0.5}
          max={30}
          step={0.1}
          onChange={setRate}
        />
        <SliderField
          label="Period"
          unitType="years"
          value={years}
          min={1}
          max={50}
          onChange={setYears}
        />
      </Inputs>
      <Segmented
        label="Compounding"
        value={freq}
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "half-yearly", label: "Half-yearly" },
          { value: "yearly", label: "Yearly" },
        ]}
        onChange={setFreq}
      />
      <Hero
        label="Future value"
        value={fv}
        sub={
          <>
            Interest earned: <strong>{inr(fv - principal)}</strong>
          </>
        }
      />
      <Stats>
        <ResultStat
          label="With simple interest instead"
          value={inr(principal * (1 + (rate / 100) * years))}
        />
        <Stat
          label="Effective yearly rate"
          value={pct((Math.pow(1 + rate / 100 / k, k) - 1) * 100)}
        />
      </Stats>
      <GrowthChart
        title="Compound vs simple interest"
        data={data}
        series={[
          { key: "value", label: "Compound" },
          { key: "simple", label: "Simple", dashed: true },
        ]}
      />
    </div>
  );
}
