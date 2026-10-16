"use client";

import {
  annuityIncome,
  corpusForPension,
  gratuity,
  leaveEncashment,
  npsPlan,
  retirementPlan,
} from "@/lib/advisorCalculators";
import { useState } from "react";
import {
  Hero,
  Inputs,
  Insight,
  Note,
  ResultStat,
  Rows,
  Segmented,
  SlabField,
  SliderField,
  Stats,
  YesNo,
  inr,
  useNum,
} from "./kit";

const MAX = 99_00_00_000;

export function RetirementCalculator() {
  const [age, setAge] = useNum(30);
  const [retire, setRetire] = useNum(60);
  const [life, setLife] = useNum(85);
  const [expense, setExpense] = useNum(50_000);
  const [infl, setInfl] = useNum(6);
  const [pre, setPre] = useNum(11);
  const [post, setPost] = useNum(7);
  const [saved, setSaved] = useNum(5_00_000);
  const r = retirementPlan({
    age,
    retireAge: Math.max(retire, age + 1),
    lifeExpectancy: Math.max(life, retire + 1),
    monthlyExpense: expense,
    inflationPct: infl,
    preReturnPct: pre,
    postReturnPct: post,
    existingSavings: saved,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Current age"
          unitType="years"
          value={age}
          min={18}
          max={70}
          onChange={setAge}
        />
        <SliderField
          label="Retire at age"
          unitType="years"
          value={retire}
          min={35}
          max={75}
          onChange={setRetire}
        />
        <SliderField
          label="Plan money till age"
          unitType="years"
          value={life}
          min={60}
          max={100}
          onChange={setLife}
        />
        <SliderField
          label="Monthly expenses today"
          unitType="money"
          value={expense}
          min={5_000}
          max={50_00_000}
          step={1_000}
          onChange={setExpense}
        />
        <SliderField
          label="Inflation"
          unitType="percent"
          value={infl}
          min={3}
          max={10}
          step={0.5}
          onChange={setInfl}
        />
        <SliderField
          label="Return before retirement"
          unitType="percent"
          value={pre}
          min={4}
          max={16}
          step={0.5}
          onChange={setPre}
        />
        <SliderField
          label="Return after retirement"
          unitType="percent"
          value={post}
          min={3}
          max={12}
          step={0.5}
          onChange={setPost}
        />
        <SliderField
          label="Retirement savings so far"
          unitType="money"
          value={saved}
          min={0}
          max={MAX}
          step={10_000}
          onChange={setSaved}
        />
      </Inputs>
      <Hero
        label="Retirement corpus needed"
        value={r.corpus}
        sub={
          <>
            Monthly expenses will be about{" "}
            <strong>{inr(r.monthlyAtRetirement)}</strong> when you retire.
          </>
        }
      />
      <Stats>
        <ResultStat label="Monthly SIP needed" value={inr(r.sip)} />
        <ResultStat
          label="Or start at (monthly, +10% a year)"
          value={inr(r.stepUpStart)}
        />
        <ResultStat
          label="Current savings will grow to"
          value={inr(r.existingFV)}
        />
      </Stats>
      {r.gap === 0 ? (
        <Insight tone="good">
          Your savings already cover the corpus at these assumptions.
        </Insight>
      ) : (
        <Insight tone="warn">
          You have {r.yearsToGo} years to build {inr(r.gap)} more. EPF, PPF and
          NPS all count towards this.
        </Insight>
      )}
    </div>
  );
}

export function NpsCalculator() {
  const [age, setAge] = useNum(30);
  const [monthly, setMonthly] = useNum(5_000);
  const [employer, setEmployer] = useNum(0);
  const [step, setStep] = useNum(5);
  const [ret, setRet] = useNum(10);
  const [annuity, setAnnuity] = useNum(40);
  const [annRate, setAnnRate] = useNum(6.5);
  const [slab, setSlab] = useNum(30);
  const n = npsPlan({
    age,
    monthly,
    employerMonthly: employer,
    stepUpPct: step,
    returnPct: ret,
    annuityPct: annuity,
    annuityRatePct: annRate,
    slabPct: slab,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Current age"
          unitType="years"
          value={age}
          min={18}
          max={59}
          onChange={setAge}
        />
        <SliderField
          label="Your monthly contribution"
          unitType="money"
          value={monthly}
          min={500}
          max={10_00_000}
          step={500}
          onChange={setMonthly}
        />
        <SliderField
          label="Employer contribution (monthly)"
          unitType="money"
          value={employer}
          min={0}
          max={10_00_000}
          step={500}
          onChange={setEmployer}
        />
        <SliderField
          label="Increase contribution yearly by"
          unitType="percent"
          value={step}
          min={0}
          max={20}
          step={1}
          onChange={setStep}
        />
        <SliderField
          label="Expected return"
          unitType="percent"
          value={ret}
          min={6}
          max={14}
          step={0.5}
          onChange={setRet}
        />
        <SliderField
          label="Share used to buy annuity (min 40%)"
          unitType="percent"
          plainPercent
          value={annuity}
          min={40}
          max={100}
          step={5}
          onChange={setAnnuity}
        />
        <SliderField
          label="Annuity rate"
          unitType="percent"
          value={annRate}
          min={4}
          max={9}
          step={0.1}
          onChange={setAnnRate}
        />
      </Inputs>
      <SlabField value={slab} onChange={setSlab} />
      <Hero
        label="Monthly pension from age 60"
        value={n.monthlyPension}
        sub={
          <>
            Total NPS corpus at 60: <strong>{inr(n.corpus)}</strong>
          </>
        }
      />
      <Stats>
        <ResultStat label="Tax-free lump sum at 60" value={inr(n.lumpSum)} />
        <ResultStat label="Used for annuity" value={inr(n.annuityCorpus)} />
        <ResultStat label="Total contributed" value={inr(n.invested)} />
        <ResultStat
          label="Tax saved yearly — 80CCD(1B)"
          value={inr(n.taxSaved80CCD1B)}
        />
      </Stats>
      <Note>
        The extra ₹50,000 deduction under 80CCD(1B) is only in the old regime.
        Employer NPS contributions (80CCD(2)) are deductible in both regimes.
        Annuity income is taxed at your slab.
      </Note>
    </div>
  );
}

export function AnnuityCalculator() {
  const [mode, setMode] = useState<"pension" | "corpus">("pension");
  const [corpus, setCorpus] = useNum(50_00_000);
  const [pension, setPension] = useNum(40_000);
  const [rop, setRop] = useState(false);
  const [slab, setSlab] = useNum(20);
  const rate = rop ? 6.2 : 7.2;
  const [customRate, setCustomRate] = useNum(rate);
  const r = customRate;
  const monthly = annuityIncome(corpus, r);
  const need = corpusForPension(pension, r);
  return (
    <div className="space-y-6">
      <Segmented
        label="Calculate"
        value={mode}
        options={[
          { value: "pension", label: "Pension from corpus" },
          { value: "corpus", label: "Corpus for a pension" },
        ]}
        onChange={setMode}
      />
      <YesNo
        label="Annuity type"
        value={rop}
        onChange={(v) => {
          setRop(v);
          setCustomRate(v ? 6.2 : 7.2);
        }}
        yes="Return of purchase price"
        no="Life annuity"
      />
      <Inputs>
        {mode === "pension" ? (
          <SliderField
            label="Corpus to invest"
            unitType="money"
            value={corpus}
            min={1_00_000}
            max={MAX}
            step={50_000}
            onChange={setCorpus}
          />
        ) : (
          <SliderField
            label="Monthly pension you want"
            unitType="money"
            value={pension}
            min={1_000}
            max={50_00_000}
            step={1_000}
            onChange={setPension}
          />
        )}
        <SliderField
          label="Annuity rate"
          unitType="percent"
          value={customRate}
          min={4}
          max={10}
          step={0.05}
          onChange={setCustomRate}
        />
      </Inputs>
      <SlabField value={slab} onChange={setSlab} />
      {mode === "pension" ? (
        <>
          <Hero
            label="Monthly pension"
            value={monthly}
            sub={
              <>
                After tax about{" "}
                <strong>{inr(monthly * (1 - (slab / 100) * 1.04))}</strong> a
                month.
              </>
            }
          />
          <Note>
            {rop
              ? "Your nominee gets the full corpus back, so the pension is lower."
              : "Highest pension, but nothing is returned to your family."}{" "}
            Rates are indicative; check insurer quotes.
          </Note>
        </>
      ) : (
        <Hero
          label="Corpus needed"
          value={need}
          sub={
            <>
              At {r}% a year this pays {inr(pension)} a month before tax.
            </>
          }
        />
      )}
    </div>
  );
}

export function GratuityCalculator() {
  const [salary, setSalary] = useNum(60_000);
  const [years, setYears] = useNum(8);
  const [months, setMonths] = useNum(7);
  const [covered, setCovered] = useState(true);
  const g = gratuity({ monthlyBasicDa: salary, years, months, covered });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Last drawn basic + DA (monthly)"
          unitType="money"
          value={salary}
          min={5_000}
          max={50_00_000}
          step={1_000}
          onChange={setSalary}
        />
        <SliderField
          label="Completed years of service"
          unitType="years"
          value={years}
          min={0}
          max={45}
          onChange={setYears}
        />
        <SliderField
          label="Extra months"
          unitType="months"
          value={months}
          min={0}
          max={11}
          onChange={setMonths}
        />
      </Inputs>
      <YesNo
        label="Employer covered under the Gratuity Act (10+ employees)?"
        value={covered}
        onChange={setCovered}
      />
      <Hero
        label="Gratuity amount"
        value={g.amount}
        sub={<>Counted for {g.serviceYears} years of service.</>}
      />
      <Stats>
        <ResultStat label="Tax-free (up to ₹20 lakh)" value={inr(g.exempt)} />
        <ResultStat label="Taxable" value={inr(g.taxable)} />
      </Stats>
      {!g.eligible ? (
        <Insight tone="warn">
          Gratuity is payable after 5 years of continuous service (except on
          death or disability).
        </Insight>
      ) : null}
      <Note>
        Formula:{" "}
        {covered
          ? "15 × salary × years ÷ 26 (6+ months rounds up)"
          : "15 × salary × completed years ÷ 30"}
        . Government employees are fully tax-exempt.
      </Note>
    </div>
  );
}

export function LeaveEncashmentCalculator() {
  const [salary, setSalary] = useNum(60_000);
  const [days, setDays] = useNum(90);
  const [years, setYears] = useNum(12);
  const [retire, setRetire] = useState(true);
  const [govt, setGovt] = useState(false);
  const l = leaveEncashment({
    monthlyBasicDa: salary,
    leaveDays: days,
    yearsOfService: years,
    atRetirement: retire,
    government: govt,
  });
  return (
    <div className="space-y-6">
      <Inputs>
        <SliderField
          label="Basic + DA (monthly)"
          unitType="money"
          value={salary}
          min={5_000}
          max={50_00_000}
          step={1_000}
          onChange={setSalary}
        />
        <SliderField
          label="Leave days to encash"
          unitType="number"
          value={days}
          min={1}
          max={600}
          onChange={setDays}
        />
        <SliderField
          label="Years of service"
          unitType="years"
          value={years}
          min={1}
          max={45}
          onChange={setYears}
        />
      </Inputs>
      <YesNo
        label="When?"
        value={retire}
        onChange={setRetire}
        yes="Retirement / leaving job"
        no="While still employed"
      />
      <YesNo
        label="Employer"
        value={govt}
        onChange={setGovt}
        yes="Government"
        no="Private"
      />
      <Hero label="Leave encashment" value={l.amount} />
      <Rows
        rows={[
          { label: "Tax-free", value: inr(l.exempt) },
          {
            label: "Taxable at your slab",
            value: inr(l.taxable),
            strong: true,
          },
        ]}
      />
      <Note>
        Private employees: exemption is the lowest of ₹25 lakh, 10 months&apos;
        salary, leave earned (max 30 days a year) and the amount received.
        Encashment while in service is fully taxable.
      </Note>
    </div>
  );
}
