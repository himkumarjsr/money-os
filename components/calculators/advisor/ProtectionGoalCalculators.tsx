"use client";

import {
  budgetSplit,
  buyTermInvestRest,
  downPaymentPlan,
  healthCover,
  netWorth,
  policyIrr,
  salaryHike,
  termCover,
  type CityTier,
} from "@/lib/advisorCalculators";
import { useState } from "react";
import { GoalPlannerCalculator } from "./InvestingCalculators";
import {
  Bars,
  Hero,
  Inputs,
  Insight,
  MoneyField,
  Note,
  ResultStat,
  Rows,
  Section,
  Segmented,
  SliderField,
  Stat,
  Stats,
  YesNo,
  inr,
  pct,
  useNum,
} from "./kit";

const MAX = 99_00_00_000;

// ─── Protection ──────────────────────────────────────────────────────────────

export function TermCoverCalculator() {
  const [age, setAge] = useNum(32);
  const [income, setIncome] = useNum(15_00_000);
  const [selfShare, setSelfShare] = useNum(25);
  const [expense, setExpense] = useNum(50_000);
  const [loans, setLoans] = useNum(30_00_000);
  const [goals, setGoals] = useNum(25_00_000);
  const [savings, setSavings] = useNum(8_00_000);
  const [cover, setCover] = useNum(0);
  const yearsToRetire = Math.max(1, 60 - age);
  const t = termCover({
    annualIncome: income,
    selfSharePct: selfShare,
    yearsToRetire,
    growthPct: 6,
    discountPct: 8,
    loans,
    goals,
    savings,
    existingCover: cover,
    monthlyFamilyExpense: expense,
    yearsFamilyNeeds: Math.max(10, yearsToRetire),
    inflationPct: 6,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Your age"
          unitType="years"
          value={age}
          min={18}
          max={60}
          onChange={setAge}
        />
        <SliderField
          label="Annual income"
          unitType="money"
          value={income}
          min={1_00_000}
          max={10_00_00_000}
          step={50_000}
          onChange={setIncome}
        />
        <SliderField
          label="Share of income spent on yourself"
          unitType="percent"
          plainPercent
          value={selfShare}
          min={0}
          max={60}
          step={5}
          onChange={setSelfShare}
        />
        <SliderField
          label="Family's monthly expenses"
          unitType="money"
          value={expense}
          min={5_000}
          max={50_00_000}
          step={1_000}
          onChange={setExpense}
        />
        <MoneyField
          label="Loans outstanding"
          value={loans}
          onChange={setLoans}
        />
        <MoneyField
          label="Future goals to fund (education, marriage)"
          value={goals}
          onChange={setGoals}
        />
        <MoneyField
          label="Savings & investments"
          value={savings}
          onChange={setSavings}
        />
        <MoneyField
          label="Existing life cover"
          value={cover}
          onChange={setCover}
        />
      </Inputs>
      <Hero
        label="Term cover you need"
        value={t.recommended}
        sub={
          t.gap > 0 ? (
            <>
              Buy about <strong>{inr(t.gap)}</strong> more, till age 60–65.
            </>
          ) : (
            "Your existing cover is enough."
          )
        }
      />
      <Stats>
        <ResultStat label="Income replacement (HLV)" value={inr(t.hlv)} />
        <ResultStat label="Family needs method" value={inr(t.needs)} />
        <ResultStat
          label="Quick rule (15× income)"
          value={inr(t.ruleOfThumb)}
        />
      </Stats>
      <Note>
        Buy pure term insurance - not endowment or ULIP - for protection.
        Assumes 6% income growth and inflation, 8% discount rate. Review after
        marriage, a child or a new loan.
      </Note>
    </div>
  );
}

export function HealthCoverCalculator() {
  const [city, setCity] = useState<CityTier>("metro");
  const [adults, setAdults] = useNum(2);
  const [kids, setKids] = useNum(1);
  const [eldest, setEldest] = useNum(35);
  const [parents, setParents] = useState(true);
  const [employer, setEmployer] = useNum(5_00_000);
  const [years, setYears] = useNum(10);
  const h = healthCover({
    city,
    adults,
    children: kids,
    eldestAge: eldest,
    includeParents: parents,
    employerCover: employer,
    years,
    medicalInflationPct: 12,
  });
  return (
    <div className="space-y-6">
      <Segmented
        label="Where do you live?"
        value={city}
        options={[
          { value: "metro", label: "Metro" },
          { value: "tier1", label: "Tier 1 city" },
          { value: "tier2", label: "Smaller city" },
        ]}
        onChange={setCity}
      />
      <Inputs>
        <SliderField
          label="Adults in the policy"
          unitType="number"
          value={adults}
          min={1}
          max={6}
          onChange={setAdults}
        />
        <SliderField
          label="Children"
          unitType="number"
          value={kids}
          min={0}
          max={6}
          onChange={setKids}
        />
        <SliderField
          label="Age of the eldest member"
          unitType="years"
          value={eldest}
          min={18}
          max={80}
          onChange={setEldest}
        />
        <SliderField
          label="Employer health cover"
          unitType="money"
          value={employer}
          min={0}
          max={1_00_00_000}
          step={50_000}
          onChange={setEmployer}
        />
      </Inputs>
      <YesNo
        label="Cover your parents too?"
        value={parents}
        onChange={setParents}
      />
      <Hero
        label="Family floater to aim for"
        value={h.family}
        sub={
          <>
            Buy a personal base policy of <strong>{inr(h.personalBase)}</strong>{" "}
            and a super top-up of {inr(h.superTopUp)}.
          </>
        }
      />
      <Stats>
        {parents ? (
          <ResultStat
            label="Separate cover for parents"
            value={inr(h.parents)}
          />
        ) : null}
        <ResultStat
          label={`A ${inr(h.surgeryToday)} surgery in ${years} years`}
          value={inr(h.futureSurgery)}
        />
      </Stats>
      <SliderField
        label="Years ahead for medical inflation"
        unitType="years"
        value={years}
        min={1}
        max={30}
        onChange={setYears}
      />
      <Note>
        Employer cover ends when you change or lose your job, so keep a personal
        policy. Medical inflation in India runs at 12–14% a year. A rule of
        thumb, not an underwriting quote.
      </Note>
    </div>
  );
}

export function PolicyReturnCalculator() {
  const [premium, setPremium] = useNum(1_00_000);
  const [pay, setPay] = useNum(10);
  const [term, setTerm] = useNum(20);
  const [maturity, setMaturity] = useNum(25_00_000);
  const p = policyIrr(premium, pay, Math.max(term, pay), maturity);
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Yearly premium"
          unitType="money"
          value={premium}
          min={5_000}
          max={1_00_00_000}
          step={1_000}
          onChange={setPremium}
        />
        <SliderField
          label="Years you pay"
          unitType="years"
          value={pay}
          min={1}
          max={40}
          onChange={setPay}
        />
        <SliderField
          label="Policy term (maturity after)"
          unitType="years"
          value={term}
          min={5}
          max={50}
          onChange={setTerm}
        />
        <SliderField
          label="Maturity amount promised"
          unitType="money"
          value={maturity}
          min={10_000}
          max={MAX}
          step={10_000}
          onChange={setMaturity}
        />
      </Inputs>
      <Hero
        label="Real yearly return (IRR)"
        value={pct(p.irr)}
        sub={<>You pay {inr(p.totalPaid)} in total.</>}
      />
      <Bars
        title="The same premiums elsewhere, at maturity"
        items={[
          { label: "This policy", value: maturity, highlight: true },
          { label: "PPF at 7.1% (tax-free)", value: p.ppfValue },
          { label: "Equity fund at 12%", value: p.equityValue },
        ]}
      />
      <Insight tone={(p.irr ?? 0) >= 7 ? "good" : "bad"}>
        {(p.irr ?? 0) >= 7
          ? "A decent return for a guaranteed plan."
          : "Lower than PPF. Term insurance plus investing separately usually does far better."}
      </Insight>
      <Note>
        Enter the guaranteed maturity amount. Bonuses in participating plans are
        not guaranteed.
      </Note>
    </div>
  );
}

export function BuyTermInvestRestCalculator() {
  const [trad, setTrad] = useNum(1_00_000);
  const [termP, setTermP] = useNum(15_000);
  const [pay, setPay] = useNum(15);
  const [term, setTerm] = useNum(20);
  const [maturity, setMaturity] = useNum(28_00_000);
  const [ret, setRet] = useNum(11);
  const b = buyTermInvestRest({
    traditionalPremium: trad,
    termPremium: termP,
    payYears: pay,
    policyYears: Math.max(term, pay),
    traditionalMaturity: maturity,
    returnPct: ret,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Endowment / money-back premium (yearly)"
          unitType="money"
          value={trad}
          min={5_000}
          max={1_00_00_000}
          step={1_000}
          onChange={setTrad}
        />
        <SliderField
          label="Term plan premium for the same cover"
          unitType="money"
          value={termP}
          min={1_000}
          max={10_00_000}
          step={500}
          onChange={setTermP}
        />
        <SliderField
          label="Years you pay"
          unitType="years"
          value={pay}
          min={1}
          max={40}
          onChange={setPay}
        />
        <SliderField
          label="Policy term"
          unitType="years"
          value={term}
          min={5}
          max={50}
          onChange={setTerm}
        />
        <SliderField
          label="Maturity from the traditional plan"
          unitType="money"
          value={maturity}
          min={10_000}
          max={MAX}
          step={10_000}
          onChange={setMaturity}
        />
        <SliderField
          label="Return on the invested difference"
          unitType="percent"
          value={ret}
          min={5}
          max={16}
          step={0.5}
          onChange={setRet}
        />
      </Inputs>
      <Hero
        label="Term + invest the rest grows to"
        value={b.corpus}
        sub={
          <>
            Investing {inr(b.yearlyInvested)} a year - the premium difference.
          </>
        }
      />
      <Bars
        items={[
          {
            label: "Term + invest",
            value: b.corpus,
            highlight: b.advantage > 0,
          },
          {
            label: "Traditional plan",
            value: maturity,
            highlight: b.advantage <= 0,
          },
        ]}
      />
      <Insight tone={b.advantage > 0 ? "good" : "warn"}>
        {b.advantage > 0
          ? `Term + investing leaves you ${inr(b.advantage)} richer with the same life cover.`
          : "The traditional plan wins at these numbers."}
      </Insight>
    </div>
  );
}

// ─── Goals & life ────────────────────────────────────────────────────────────

export function ChildEducationCalculator() {
  return (
    <div className="space-y-4">
      <GoalPlannerCalculator
        goalLabel="Course cost today (UG/PG, fees + living)"
        defaultCost={25_00_000}
        defaultYears={13}
        defaultInflation={10}
        yearsLabel="Years until college"
        maxYears={25}
      />
      <Note>
        Education costs in India rise about 10% a year - faster than general
        inflation. Sukanya Samriddhi suits a daughter&apos;s education; equity
        funds suit 7+ year horizons.
      </Note>
    </div>
  );
}

export function MarriageCalculator() {
  return (
    <div className="space-y-4">
      <GoalPlannerCalculator
        goalLabel="Wedding budget in today's money"
        defaultCost={20_00_000}
        defaultYears={8}
        defaultInflation={7}
        yearsLabel="Years until the wedding"
        maxYears={30}
      />
      <Note>
        Shift the money to debt funds or FDs in the last 2–3 years so a market
        fall doesn&apos;t hit the budget.
      </Note>
    </div>
  );
}

export function DownPaymentCalculator() {
  const [price, setPrice] = useNum(80_00_000);
  const [down, setDown] = useNum(20);
  const [costs, setCosts] = useNum(7);
  const [years, setYears] = useNum(5);
  const [appr, setAppr] = useNum(6);
  const [saved, setSaved] = useNum(5_00_000);
  const [ret, setRet] = useNum(9);
  const d = downPaymentPlan({
    priceToday: price,
    downPct: down,
    costsPct: costs,
    years,
    appreciationPct: appr,
    savings: saved,
    returnPct: ret,
    loanRatePct: 8.5,
    loanYears: 20,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Home price today"
          unitType="money"
          value={price}
          min={10_00_000}
          max={MAX}
          step={1_00_000}
          onChange={setPrice}
        />
        <SliderField
          label="Years until you buy"
          unitType="years"
          value={years}
          min={1}
          max={20}
          onChange={setYears}
        />
        <SliderField
          label="Down payment"
          unitType="percent"
          plainPercent
          value={down}
          min={10}
          max={50}
          step={1}
          onChange={setDown}
        />
        <SliderField
          label="Stamp duty, registration, interiors"
          unitType="percent"
          plainPercent
          value={costs}
          min={0}
          max={20}
          step={0.5}
          onChange={setCosts}
        />
        <SliderField
          label="Property price growth"
          unitType="percent"
          value={appr}
          min={0}
          max={15}
          step={0.5}
          onChange={setAppr}
        />
        <SliderField
          label="Return on your savings"
          unitType="percent"
          value={ret}
          min={4}
          max={14}
          step={0.5}
          onChange={setRet}
        />
        <SliderField
          label="Saved for it so far"
          unitType="money"
          value={saved}
          min={0}
          max={MAX}
          step={50_000}
          onChange={setSaved}
        />
      </Inputs>
      <Hero
        label="Monthly saving needed"
        value={d.sip}
        sub={
          <>
            You will need <strong>{inr(d.needed)}</strong> upfront for a{" "}
            {inr(d.futurePrice)} home.
          </>
        }
      />
      <Stats>
        <ResultStat label="Home loan then" value={inr(d.loan)} />
        <ResultStat label="EMI (8.5%, 20 years)" value={inr(d.emi)} />
        <ResultStat label="Savings will grow to" value={inr(d.savingsFV)} />
      </Stats>
      <Note>
        Banks fund at most 75–90% of the price (RBI limits), and never stamp
        duty or registration - those come from your pocket.
      </Note>
    </div>
  );
}

export function SalaryHikeCalculator() {
  const [mode, setMode] = useState<"pct" | "offer">("pct");
  const [current, setCurrent] = useNum(12_00_000);
  const [hike, setHike] = useNum(10);
  const [offer, setOffer] = useNum(16_00_000);
  const [infl, setInfl] = useNum(6);
  const newCtc = mode === "pct" ? current * (1 + hike / 100) : offer;
  const s = salaryHike(current, newCtc, infl);
  return (
    <div className="space-y-6">
      <Segmented
        label="Compare"
        value={mode}
        options={[
          { value: "pct", label: "Hike %" },
          { value: "offer", label: "New offer" },
        ]}
        onChange={setMode}
      />
      <Inputs>
        <SliderField
          label="Current CTC"
          unitType="money"
          value={current}
          min={1_00_000}
          max={10_00_00_000}
          step={10_000}
          onChange={setCurrent}
        />
        {mode === "pct" ? (
          <SliderField
            label="Hike"
            unitType="percent"
            value={hike}
            min={0}
            max={200}
            step={0.5}
            onChange={setHike}
          />
        ) : (
          <SliderField
            label="Offered CTC"
            unitType="money"
            value={offer}
            min={1_00_000}
            max={10_00_00_000}
            step={10_000}
            onChange={setOffer}
          />
        )}
        <SliderField
          label="Inflation"
          unitType="percent"
          value={infl}
          min={0}
          max={12}
          step={0.5}
          onChange={setInfl}
        />
      </Inputs>
      <Hero
        label="Extra in-hand every month"
        value={s.monthlyGain}
        sub={
          <>
            New CTC {inr(newCtc)} - a {pct(s.hikePct, 1)} hike.
          </>
        }
      />
      <Stats>
        <Stat label="Real hike after inflation" value={pct(s.realPct, 1)} />
        <ResultStat label="Monthly in-hand now" value={inr(s.currentMonthly)} />
        <ResultStat label="Monthly in-hand after" value={inr(s.newMonthly)} />
      </Stats>
      {s.realPct < 0 ? (
        <Insight tone="bad">
          This hike is below inflation - your buying power falls.
        </Insight>
      ) : null}
      <Note>
        In-hand is estimated under the new regime with ~5% of CTC going to PF
        and other deductions. Use the Salary calculator for an exact break-up.
      </Note>
    </div>
  );
}

const ASSET_FIELDS = [
  { key: "bank", label: "Cash & bank balance" },
  { key: "fd", label: "FDs, RDs, debt funds" },
  { key: "retire", label: "EPF, PPF, NPS" },
  { key: "equity", label: "Stocks & equity funds" },
  { key: "gold", label: "Gold" },
  { key: "home", label: "Home & property" },
  { key: "vehicle", label: "Vehicles" },
  { key: "other", label: "Other assets" },
] as const;

const LIAB_FIELDS = [
  { key: "home", label: "Home loan" },
  { key: "car", label: "Car / bike loan" },
  { key: "personal", label: "Personal loan" },
  { key: "card", label: "Credit card dues" },
  { key: "other", label: "Other loans" },
] as const;

export function NetWorthCalculator() {
  const [assets, setAssets] = useState<Record<string, number>>({
    bank: 2_00_000,
    fd: 3_00_000,
    retire: 6_00_000,
    equity: 5_00_000,
    gold: 2_00_000,
    home: 0,
    vehicle: 4_00_000,
    other: 0,
  });
  const [liab, setLiab] = useState<Record<string, number>>({
    home: 0,
    car: 2_50_000,
    personal: 0,
    card: 30_000,
    other: 0,
  });
  const n = netWorth(assets, liab, ["bank", "fd", "equity", "gold"]);
  return (
    <div className="space-y-6">
      <Section title="What you own">
        <Inputs>
          {ASSET_FIELDS.map((f) => (
            <MoneyField
              key={f.key}
              label={f.label}
              value={assets[f.key]}
              onChange={(v) => setAssets((a) => ({ ...a, [f.key]: v }))}
            />
          ))}
        </Inputs>
      </Section>
      <Section title="What you owe">
        <Inputs>
          {LIAB_FIELDS.map((f) => (
            <MoneyField
              key={f.key}
              label={f.label}
              value={liab[f.key]}
              onChange={(v) => setLiab((l) => ({ ...l, [f.key]: v }))}
            />
          ))}
        </Inputs>
      </Section>
      <Hero label="Your net worth" value={n.netWorth} />
      <Stats>
        <ResultStat label="Total assets" value={inr(n.totalAssets)} />
        <ResultStat label="Total loans" value={inr(n.totalLiabilities)} />
        <ResultStat label="Liquid (usable in a month)" value={inr(n.liquid)} />
      </Stats>
      <Insight
        tone={n.debtRatio < 30 ? "good" : n.debtRatio < 50 ? "warn" : "bad"}
      >
        Loans are {pct(n.debtRatio, 0)} of what you own.{" "}
        {n.debtRatio < 30
          ? "Healthy."
          : n.debtRatio < 50
            ? "Manageable - avoid new loans."
            : "High - focus on paying down debt."}
      </Insight>
      <Note>Track this every month automatically in Finkoin Tracker.</Note>
    </div>
  );
}

export function BudgetCalculator() {
  const [income, setIncome] = useNum(80_000);
  const [needs, setNeeds] = useNum(50);
  const [wants, setWants] = useNum(30);
  const [actualNeeds, setActualNeeds] = useNum(45_000);
  const [actualWants, setActualWants] = useNum(20_000);
  const b = budgetSplit(income, needs, Math.min(wants, 100 - needs));
  const actualSave = Math.max(0, income - actualNeeds - actualWants);
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Monthly take-home"
          unitType="money"
          value={income}
          min={5_000}
          max={1_00_00_000}
          step={1_000}
          onChange={setIncome}
        />
        <SliderField
          label="Needs (rent, EMI, groceries, bills)"
          unitType="percent"
          plainPercent
          value={needs}
          min={20}
          max={80}
          step={5}
          onChange={setNeeds}
        />
        <SliderField
          label="Wants (dining, shopping, trips)"
          unitType="percent"
          plainPercent
          value={wants}
          min={0}
          max={100 - needs}
          step={5}
          onChange={setWants}
        />
      </Inputs>
      <Hero
        label="Save & invest every month"
        value={b.savings}
        sub={`${b.savingsPct}% of your take-home`}
      />
      <Rows
        rows={[
          { label: `Needs (${needs}%)`, value: inr(b.needs) },
          {
            label: `Wants (${Math.min(wants, 100 - needs)}%)`,
            value: inr(b.wants),
          },
          {
            label: `Savings (${b.savingsPct}%)`,
            value: inr(b.savings),
            strong: true,
          },
        ]}
      />
      <p className="text-[13px] font-semibold text-[#5F5E5A]">
        What you actually spend (optional)
      </p>
      <Inputs>
        <MoneyField
          label="Needs"
          value={actualNeeds}
          onChange={setActualNeeds}
        />
        <MoneyField
          label="Wants"
          value={actualWants}
          onChange={setActualWants}
        />
      </Inputs>
      <Bars
        items={[
          {
            label: `Needs - plan ${inr(b.needs)}`,
            value: actualNeeds,
            highlight: actualNeeds > b.needs,
          },
          {
            label: `Wants - plan ${inr(b.wants)}`,
            value: actualWants,
            highlight: actualWants > b.wants,
          },
          { label: `Left to save - plan ${inr(b.savings)}`, value: actualSave },
        ]}
      />
      <Insight tone={actualSave >= b.savings ? "good" : "warn"}>
        {actualSave >= b.savings
          ? "You are saving at or above plan."
          : `You are ${inr(b.savings - actualSave)} short of your savings target this month.`}
      </Insight>
    </div>
  );
}
