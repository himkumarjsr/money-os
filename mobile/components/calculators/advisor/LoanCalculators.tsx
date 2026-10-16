import { Text, View } from "react-native";
import {
  balanceTransfer,
  creditCardPayoff,
  debtPayoff,
  educationLoan,
  flatToReducing,
  goldLoan,
  loanEligibility,
  prepayVsInvest,
  type Debt,
  GOLD_PURITY,
} from "@/lib/advisorCalculators";
import { useState } from "react";
import {
  Bars,
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
  duration,
  inr,
  pct,
  useNum,
  AddButton,
  B,
  FieldLabel,
  LinkButton,
  Stack,
  calcStyles,
  TextField,
} from "./kit";

const MAX = 99_00_00_000;

export function LoanEligibilityCalculator() {
  const [income, setIncome] = useNum(1_00_000);
  const [emis, setEmis] = useNum(0);
  const [foir, setFoir] = useNum(50);
  const [rate, setRate] = useNum(8.5);
  const [years, setYears] = useNum(20);
  const e = loanEligibility({
    monthlyIncome: income,
    existingEmis: emis,
    foirPct: foir,
    ratePct: rate,
    years,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Net monthly income (take-home)"
          unitType="money"
          value={income}
          min={10_000}
          max={1_00_00_000}
          step={1_000}
          onChange={setIncome}
        />
        <SliderField
          label="Existing EMIs (monthly)"
          unitType="money"
          value={emis}
          min={0}
          max={50_00_000}
          step={500}
          onChange={setEmis}
        />
        <SliderField
          label="Interest rate"
          unitType="percent"
          value={rate}
          min={6}
          max={18}
          step={0.05}
          onChange={setRate}
        />
        <SliderField
          label="Loan tenure"
          unitType="years"
          value={years}
          min={1}
          max={30}
          onChange={setYears}
        />
      </Inputs>
      <Segmented
        label="Share of income lenders allow for EMIs (FOIR)"
        value={String(foir)}
        options={[
          { value: "40", label: "40% · cautious" },
          { value: "50", label: "50% · typical" },
          { value: "60", label: "60% · high income" },
        ]}
        onChange={(v) => setFoir(Number(v))}
      />
      <Hero
        label="You could borrow up to"
        value={e.loan}
        sub={
          <>
            with an EMI of <B>{inr(e.maxEmi)}</B> a month.
          </>
        }
      />
      <Stats>
        <ResultStat
          label="Home you could buy (with down payment)"
          value={inr(e.propertyValue)}
        />
        <Stat
          label="Bank funds up to"
          value={pct(e.ltv * 100, 0)}
          sub="of property value (RBI limit)"
        />
      </Stats>
      {e.maxEmi <= 0 ? (
        <Insight tone="bad">
          Your existing EMIs already use up the limit. Close a loan first.
        </Insight>
      ) : null}
      <Note>
        Lenders also look at your credit score (750+ gets the best rates), age
        and job stability. Borrowing the maximum leaves no room for emergencies.
      </Note>
    </Stack>
  );
}

export function PrepayVsInvestCalculator() {
  const [outstanding, setOutstanding] = useNum(30_00_000);
  const [rate, setRate] = useNum(8.5);
  const [years, setYears] = useNum(15);
  const [lump, setLump] = useNum(5_00_000);
  const [ret, setRet] = useNum(11);
  const p = prepayVsInvest({
    outstanding,
    ratePct: rate,
    monthsLeft: years * 12,
    lumpsum: Math.min(lump, outstanding),
    investReturnPct: ret,
  });
  const prepayWins = p.prepayWealth >= p.investWealth;
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Loan outstanding"
          unitType="money"
          value={outstanding}
          min={1_00_000}
          max={MAX}
          step={50_000}
          onChange={setOutstanding}
        />
        <SliderField
          label="Loan interest rate"
          unitType="percent"
          value={rate}
          min={6}
          max={18}
          step={0.05}
          onChange={setRate}
        />
        <SliderField
          label="Years left on the loan"
          unitType="years"
          value={years}
          min={1}
          max={30}
          onChange={setYears}
        />
        <SliderField
          label="Spare money available"
          unitType="money"
          value={lump}
          min={10_000}
          max={MAX}
          step={10_000}
          onChange={setLump}
        />
        <SliderField
          label="Return if invested instead (after tax)"
          unitType="percent"
          value={ret}
          min={4}
          max={16}
          step={0.5}
          onChange={setRet}
        />
      </Inputs>
      <Hero
        label="Interest you save by prepaying"
        value={p.interestSaved}
        sub={
          <>
            Loan ends <B>{duration(p.monthsSaved)}</B> earlier (same EMI of{" "}
            {inr(p.emi)}).
          </>
        }
      />
      <Bars
        title={`Wealth at the original loan end (${years} years)`}
        items={[
          {
            label: "Prepay, then invest the freed EMIs",
            value: p.prepayWealth,
            highlight: prepayWins,
          },
          {
            label: "Invest the spare money now",
            value: p.investWealth,
            highlight: !prepayWins,
          },
        ]}
      />
      <Insight tone={prepayWins ? "good" : "warn"}>
        {prepayWins
          ? "Prepaying comes out ahead — and it is a guaranteed return."
          : `Investing comes out ahead at ${ret}% — but that return is not guaranteed, while the ${rate}% saved by prepaying is.`}
      </Insight>
      <Note>
        Home loan interest is deductible under 24(b) in the old regime, which
        lowers your real loan cost. Floating-rate loans have no prepayment
        penalty for individuals.
      </Note>
    </Stack>
  );
}

export function BalanceTransferCalculator() {
  const [out, setOut] = useNum(40_00_000);
  const [cur, setCur] = useNum(9.5);
  const [next, setNext] = useNum(8.5);
  const [years, setYears] = useNum(15);
  const [fee, setFee] = useNum(0.5);
  const [other, setOther] = useNum(10_000);
  const b = balanceTransfer({
    outstanding: out,
    currentRatePct: cur,
    newRatePct: next,
    monthsLeft: years * 12,
    feePct: fee,
    otherCharges: other,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Loan outstanding"
          unitType="money"
          value={out}
          min={1_00_000}
          max={MAX}
          step={50_000}
          onChange={setOut}
        />
        <SliderField
          label="Years left"
          unitType="years"
          value={years}
          min={1}
          max={30}
          onChange={setYears}
        />
        <SliderField
          label="Current interest rate"
          unitType="percent"
          value={cur}
          min={6}
          max={20}
          step={0.05}
          onChange={setCur}
        />
        <SliderField
          label="New lender's rate"
          unitType="percent"
          value={next}
          min={6}
          max={20}
          step={0.05}
          onChange={setNext}
        />
        <SliderField
          label="Processing fee"
          unitType="percent"
          plainPercent
          value={fee}
          min={0}
          max={3}
          step={0.05}
          onChange={setFee}
        />
        <SliderField
          label="Legal, valuation, other charges"
          unitType="money"
          value={other}
          min={0}
          max={5_00_000}
          step={1_000}
          onChange={setOther}
        />
      </Inputs>
      <Hero
        label="Net saving after fees"
        value={b.netSaving}
        sub={
          <>
            EMI drops from {inr(b.oldEmi)} to <B>{inr(b.newEmi)}</B>.
          </>
        }
      />
      <Stats>
        <ResultStat
          label="Total switching cost (incl. GST)"
          value={inr(b.fees)}
        />
        <Stat label="Fees recovered in" value={duration(b.breakEvenMonths)} />
      </Stats>
      <Insight tone={b.netSaving > 0 ? "good" : "bad"}>
        {b.netSaving > 0
          ? "Switching pays off. Ask your current bank to match the rate first — many do, for a small fee."
          : "Switching costs more than it saves."}
      </Insight>
    </Stack>
  );
}

export function FlatVsReducingCalculator() {
  const [amount, setAmount] = useNum(3_00_000);
  const [flat, setFlat] = useNum(10);
  const [months, setMonths] = useNum(24);
  const r = flatToReducing(amount, flat, months);
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Loan amount"
          unitType="money"
          value={amount}
          min={10_000}
          max={MAX}
          step={5_000}
          onChange={setAmount}
        />
        <SliderField
          label="Flat interest rate quoted"
          unitType="percent"
          value={flat}
          min={1}
          max={30}
          step={0.1}
          onChange={setFlat}
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
      <Hero
        label="Real (reducing) interest rate"
        value={pct(r.effectivePct)}
        sub={
          <>
            A {flat}% flat rate is really about <B>{pct(r.effectivePct, 1)}</B>.
          </>
        }
      />
      <Stats>
        <ResultStat label="EMI" value={inr(r.emi)} />
        <ResultStat label="Total interest" value={inr(r.totalInterest)} />
      </Stats>
      <Note>
        Flat rates charge interest on the full loan for the whole tenure even as
        you repay it. Common in car dealer, consumer durable and some personal
        loans — always compare the reducing rate (APR).
      </Note>
    </Stack>
  );
}

export function CreditCardCalculator() {
  const [bal, setBal] = useNum(1_00_000);
  const [rate, setRate] = useNum(3.75);
  const [minPct, setMinPct] = useNum(5);
  const [fixed, setFixed] = useNum(10_000);
  const c = creditCardPayoff({
    balance: bal,
    monthlyRatePct: rate,
    minDuePct: minPct,
    fixedPayment: fixed,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Card outstanding"
          unitType="money"
          value={bal}
          min={1_000}
          max={1_00_00_000}
          step={1_000}
          onChange={setBal}
        />
        <SliderField
          label="Monthly interest rate"
          unitType="percent"
          plainPercent
          value={rate}
          min={1}
          max={4.5}
          step={0.05}
          onChange={setRate}
        />
        <SliderField
          label="Minimum due"
          unitType="percent"
          plainPercent
          value={minPct}
          min={1}
          max={10}
          step={0.5}
          onChange={setMinPct}
        />
        <SliderField
          label="Fixed amount you can pay monthly"
          unitType="money"
          value={fixed}
          min={500}
          max={50_00_000}
          step={500}
          onChange={setFixed}
        />
      </Inputs>
      <Hero
        label="Interest if you pay only the minimum"
        value={c.minimum.interest}
        sub={
          <>
            It takes <B>{duration(c.minimum.months)}</B> to clear.
          </>
        }
      />
      <Stats>
        <Stat
          label={`Paying ${inr(fixed)} a month clears it in`}
          value={duration(c.fixed.months)}
        />
        <ResultStat
          label="Interest at that pace"
          value={inr(c.fixed.interest)}
        />
        <Stat
          label="Yearly rate"
          value={pct(rate * 12, 0)}
          sub="plus 18% GST on interest"
        />
      </Stats>
      <Insight tone="bad">
        Card debt is the costliest loan in India. A personal loan at 12–16% to
        clear it usually saves a lot.
      </Insight>
    </Stack>
  );
}

type DebtRow = Debt & { id: number };

export function DebtPayoffCalculator() {
  const [debts, setDebts] = useState<DebtRow[]>([
    { id: 1, name: "Credit card", balance: 80_000, ratePct: 42, minEmi: 4_000 },
    {
      id: 2,
      name: "Personal loan",
      balance: 3_00_000,
      ratePct: 14,
      minEmi: 10_000,
    },
    {
      id: 3,
      name: "Consumer loan",
      balance: 40_000,
      ratePct: 16,
      minEmi: 3_500,
    },
  ]);
  const [extra, setExtra] = useNum(5_000);
  const [method, setMethod] = useState<"avalanche" | "snowball">("avalanche");
  const a = debtPayoff(debts, extra, "avalanche");
  const s = debtPayoff(debts, extra, "snowball");
  const chosen = method === "avalanche" ? a : s;
  const update = (id: number, patch: Partial<DebtRow>) =>
    setDebts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  return (
    <Stack>
      <View style={{ gap: 12 }}>
        <FieldLabel>Your debts</FieldLabel>
        {debts.map((d) => (
          <View key={d.id} style={calcStyles.card}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <TextField
                  label="Debt name"
                  value={d.name}
                  onChange={(v) => update(d.id, { name: v })}
                />
              </View>
              {debts.length > 1 ? (
                <LinkButton
                  label="Remove"
                  onPress={() =>
                    setDebts((ds) => ds.filter((x) => x.id !== d.id))
                  }
                />
              ) : null}
            </View>
            <View>
              <MoneyField
                label="Balance"
                value={d.balance}
                onChange={(v) => update(d.id, { balance: v })}
              />
              <SliderField
                label="Interest rate"
                unitType="percent"
                value={d.ratePct}
                min={0}
                max={48}
                step={0.5}
                onChange={(v) => update(d.id, { ratePct: v })}
              />
              <MoneyField
                label="Minimum EMI"
                value={d.minEmi}
                onChange={(v) => update(d.id, { minEmi: v })}
              />
            </View>
          </View>
        ))}
        {debts.length < 8 ? (
          <AddButton
            label="+ Add debt"
            onPress={() =>
              setDebts((ds) => [
                ...ds,
                {
                  id: Date.now(),
                  name: `Debt ${ds.length + 1}`,
                  balance: 50_000,
                  ratePct: 15,
                  minEmi: 2_000,
                },
              ])
            }
          />
        ) : null}
      </View>
      <SliderField
        label="Extra you can pay each month"
        unitType="money"
        value={extra}
        min={0}
        max={10_00_000}
        step={500}
        onChange={setExtra}
      />
      <Segmented
        label="Strategy"
        value={method}
        options={[
          { value: "avalanche", label: "Avalanche · highest rate first" },
          { value: "snowball", label: "Snowball · smallest first" },
        ]}
        onChange={setMethod}
      />
      <Hero
        label="Debt-free in"
        value={duration(chosen.months)}
        sub={
          <>
            Total interest: <B>{inr(chosen.interest)}</B>
          </>
        }
      />
      <Rows
        title="Order of payoff"
        rows={chosen.order.map((o) => ({
          label: o.name,
          value: o.month ? `Month ${o.month}` : "—",
        }))}
      />
      {Number.isFinite(a.months) && Number.isFinite(s.months) ? (
        <Note>
          Avalanche saves {inr(Math.max(0, s.interest - a.interest))} in
          interest versus snowball. Snowball clears small debts first, which
          keeps many people motivated.
        </Note>
      ) : (
        <Insight tone="bad">
          Your payments don&apos;t cover the interest. Increase the extra
          amount.
        </Insight>
      )}
    </Stack>
  );
}

export function EducationLoanCalculator() {
  const [amount, setAmount] = useNum(15_00_000);
  const [rate, setRate] = useNum(10.5);
  const [course, setCourse] = useNum(2);
  const [pay, setPay] = useState(false);
  const [years, setYears] = useNum(10);
  const [slab, setSlab] = useNum(30);
  const e = educationLoan({
    amount,
    ratePct: rate,
    moratoriumMonths: course * 12 + 12,
    payInterestDuringStudy: pay,
    repayYears: years,
    slabPct: slab,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Loan amount"
          unitType="money"
          value={amount}
          min={50_000}
          max={2_00_00_000}
          step={50_000}
          onChange={setAmount}
        />
        <SliderField
          label="Interest rate"
          unitType="percent"
          value={rate}
          min={7}
          max={16}
          step={0.05}
          onChange={setRate}
        />
        <SliderField
          label="Course length"
          unitType="years"
          value={course}
          min={1}
          max={6}
          onChange={setCourse}
        />
        <SliderField
          label="Repay over"
          unitType="years"
          value={years}
          min={1}
          max={15}
          onChange={setYears}
        />
      </Inputs>
      <YesNo
        label="Pay the interest while studying?"
        value={pay}
        onChange={setPay}
      />
      <SlabField
        label="Earning member's tax slab (for 80E)"
        value={slab}
        onChange={setSlab}
      />
      <Hero
        label="EMI after the moratorium"
        value={e.emi}
        sub={
          <>Repayment starts {course + 1} years from now (course + 1 year).</>
        }
      />
      <Stats>
        <ResultStat
          label={
            pay ? "Interest paid while studying" : "Interest added to loan"
          }
          value={inr(e.moratoriumInterest)}
        />
        <ResultStat label="Total interest" value={inr(e.totalInterest)} />
        <ResultStat
          label="Tax saved under 80E (8 years)"
          value={inr(e.tax80E)}
        />
      </Stats>
      {!pay ? (
        <Insight tone="warn">
          Paying even the simple interest during the course keeps the loan from
          growing — {inr(e.principalAtRepay - amount)} gets added otherwise.
        </Insight>
      ) : null}
    </Stack>
  );
}

export function GoldLoanCalculator() {
  const [grams, setGrams] = useNum(50);
  const [purity, setPurity] = useState<keyof typeof GOLD_PURITY>("22K");
  const [price, setPrice] = useNum(1_25_000);
  const [rate, setRate] = useNum(10);
  const [months, setMonths] = useNum(12);
  const g = goldLoan({
    grams,
    purity,
    rate24kPer10g: price,
    ratePct: rate,
    months,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Gold weight (grams)"
          unitType="number"
          value={grams}
          min={1}
          max={2_000}
          onChange={setGrams}
        />
        <SliderField
          label="Today's 24K price per 10 g"
          unitType="money"
          value={price}
          min={20_000}
          max={5_00_000}
          step={500}
          onChange={setPrice}
        />
        <SliderField
          label="Interest rate"
          unitType="percent"
          value={rate}
          min={7}
          max={26}
          step={0.25}
          onChange={setRate}
        />
        <SliderField
          label="Tenure"
          unitType="months"
          value={months}
          min={1}
          max={36}
          onChange={setMonths}
        />
      </Inputs>
      <Segmented
        label="Purity"
        value={purity}
        options={(
          Object.keys(GOLD_PURITY) as Array<keyof typeof GOLD_PURITY>
        ).map((k) => ({ value: k, label: k }))}
        onChange={setPurity}
      />
      <Hero
        label="Maximum loan"
        value={g.maxLoan}
        sub={
          <>
            {pct(g.ltvPct, 0)} of your gold&apos;s value of {inr(g.value)}.
          </>
        }
      />
      <Stats>
        <ResultStat
          label="Interest for the tenure (bullet)"
          value={inr(g.interest)}
        />
        <ResultStat label="Or monthly EMI" value={inr(g.emi)} />
      </Stats>
      <Note>
        RBI caps gold loans at 85% of value for loans up to ₹2.5 lakh, 80% up to
        ₹5 lakh and 75% above. Enter today&apos;s gold rate for an accurate
        figure.
      </Note>
    </Stack>
  );
}
