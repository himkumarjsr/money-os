import { Text, View } from "react-native";
import {
  advanceTax,
  capitalGains,
  deductionPlanner,
  gst,
  hraExemption,
  ltcgHarvest,
  presumptiveTax,
  rentalIncome,
  salaryBreakup,
  type CapitalAsset,
  type Regime,
} from "@/lib/advisorCalculators";
import { useState } from "react";
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
  Section,
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
  AddButton,
  B,
  FieldLabel,
  LinkButton,
  Stack,
  calcStyles,
  TextField,
} from "./kit";

const MAX = 99_00_00_000;

const REGIMES = [
  { value: "new" as const, label: "New regime" },
  { value: "old" as const, label: "Old regime" },
];

export function SalaryCalculator() {
  const [ctc, setCtc] = useNum(15_00_000);
  const [basicPct, setBasicPct] = useNum(40);
  const [variablePct, setVariablePct] = useNum(10);
  const [regime, setRegime] = useState<Regime>("new");
  const [pfFull, setPfFull] = useState(false);
  const [gratuity, setGratuity] = useState(true);
  const [pt, setPt] = useNum(2_400);
  const [rent, setRent] = useNum(20_000);
  const [metro, setMetro] = useState(true);
  const [extra80C, setExtra80C] = useNum(50_000);
  const s = salaryBreakup({
    ctc,
    basicPct,
    variablePct,
    employerPfOnFullBasic: pfFull,
    includeGratuity: gratuity,
    professionalTax: pt,
    regime,
    rentMonthly: rent,
    metro,
    extra80C,
  });
  const other = salaryBreakup({
    ctc,
    basicPct,
    variablePct,
    employerPfOnFullBasic: pfFull,
    includeGratuity: gratuity,
    professionalTax: pt,
    regime: regime === "new" ? "old" : "new",
    rentMonthly: rent,
    metro,
    extra80C,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Annual CTC"
          unitType="money"
          value={ctc}
          min={2_00_000}
          max={10_00_00_000}
          step={10_000}
          onChange={setCtc}
        />
        <SliderField
          label="Basic as % of CTC"
          unitType="percent"
          plainPercent
          value={basicPct}
          min={30}
          max={60}
          step={1}
          onChange={setBasicPct}
        />
        <SliderField
          label="Variable / bonus share of CTC"
          unitType="percent"
          plainPercent
          value={variablePct}
          min={0}
          max={40}
          step={1}
          onChange={setVariablePct}
        />
        <SliderField
          label="Professional tax (yearly)"
          unitType="money"
          value={pt}
          min={0}
          max={2_500}
          step={100}
          onChange={setPt}
        />
      </Inputs>
      <Segmented
        label="Tax regime"
        value={regime}
        options={REGIMES}
        onChange={setRegime}
      />
      <YesNo
        label="Employer PF on"
        value={pfFull}
        onChange={setPfFull}
        yes="Full basic"
        no="₹15,000 cap"
      />
      <YesNo
        label="Gratuity part of CTC?"
        value={gratuity}
        onChange={setGratuity}
      />
      {regime === "old" ? (
        <Inputs>
          <SliderField
            label="Rent paid (monthly)"
            unitType="money"
            value={rent}
            min={0}
            max={5_00_000}
            step={500}
            onChange={setRent}
          />
          <SliderField
            label="Other 80C investments (yearly)"
            unitType="money"
            value={extra80C}
            min={0}
            max={1_50_000}
            step={5_000}
            onChange={setExtra80C}
          />
          <YesNo label="Live in a metro?" value={metro} onChange={setMetro} />
        </Inputs>
      ) : null}
      <Hero
        label="Monthly in-hand salary"
        value={s.monthlyInHand}
        sub={
          <>
            Plus about{" "}
            <B>{inr(s.variable * (s.annualInHand / Math.max(1, s.gross)))}</B> a
            year as bonus after tax.
          </>
        }
      />
      <Rows
        title="Where your CTC goes (yearly)"
        rows={[
          { label: "CTC", value: inr(ctc), strong: true },
          {
            label: "Employer PF (in CTC, not paid to you)",
            value: `− ${inr(s.employerPf)}`,
          },
          { label: "Gratuity provision", value: `− ${inr(s.gratuityPart)}` },
          { label: "Gross salary", value: inr(s.gross), strong: true },
          { label: "Your PF contribution", value: `− ${inr(s.employeePf)}` },
          { label: "Professional tax", value: `− ${inr(pt)}` },
          { label: `Income tax (${regime} regime)`, value: `− ${inr(s.tax)}` },
          {
            label: "Take-home for the year",
            value: inr(s.annualInHand),
            strong: true,
          },
        ]}
      />
      <Insight tone={s.tax <= other.tax ? "good" : "warn"}>
        {s.tax <= other.tax
          ? `The ${regime} regime is the better pick here.`
          : `The ${regime === "new" ? "old" : "new"} regime would save you ${inr(s.tax - other.tax)} a year.`}
      </Insight>
    </Stack>
  );
}

export function HraCalculator() {
  const [basic, setBasic] = useNum(50_000);
  const [hra, setHra] = useNum(20_000);
  const [rent, setRent] = useNum(25_000);
  const [metro, setMetro] = useState(true);
  const [slab, setSlab] = useNum(30);
  const h = hraExemption({
    basicMonthly: basic,
    hraMonthly: hra,
    rentMonthly: rent,
    metro,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Basic + DA (monthly)"
          unitType="money"
          value={basic}
          min={5_000}
          max={50_00_000}
          step={500}
          onChange={setBasic}
        />
        <SliderField
          label="HRA received (monthly)"
          unitType="money"
          value={hra}
          min={0}
          max={50_00_000}
          step={500}
          onChange={setHra}
        />
        <SliderField
          label="Rent paid (monthly)"
          unitType="money"
          value={rent}
          min={0}
          max={50_00_000}
          step={500}
          onChange={setRent}
        />
      </Inputs>
      <YesNo
        label="City"
        value={metro}
        onChange={setMetro}
        yes="Delhi, Mumbai, Kolkata, Chennai"
        no="Other city"
      />
      <SlabField value={slab} onChange={setSlab} />
      <Hero
        label="HRA exemption (yearly)"
        value={h.exempt}
        sub={
          <>
            Saves about <B>{inr(h.exempt * (slab / 100) * 1.04)}</B> tax in the
            old regime.
          </>
        }
      />
      <Rows
        title="Lowest of these three is exempt"
        rows={[
          { label: "Actual HRA received", value: inr(h.tests.actualHra) },
          {
            label: "Rent paid − 10% of basic",
            value: inr(h.tests.rentMinus10),
          },
          {
            label: `${metro ? "50" : "40"}% of basic`,
            value: inr(h.tests.pctOfBasic),
          },
          { label: "Taxable HRA", value: inr(h.taxable), strong: true },
        ]}
      />
      {rent < h.rentForMax && h.taxable > 0 ? (
        <Note>
          Rent up to {inr(h.rentForMax)} a month would still raise your
          exemption.
        </Note>
      ) : null}
      <Note>
        HRA exemption is available only in the old regime. Landlord PAN is
        needed if rent exceeds ₹1 lakh a year. No HRA from your employer? Look
        at 80GG (up to ₹60,000).
      </Note>
    </Stack>
  );
}

const ASSETS: Array<{ value: CapitalAsset; label: string }> = [
  { value: "equity", label: "Shares / equity funds" },
  { value: "debt-mf", label: "Debt funds" },
  { value: "property", label: "Property / land" },
  { value: "gold", label: "Gold" },
  { value: "unlisted", label: "Unlisted shares / other" },
];

export function CapitalGainsCalculator() {
  const [asset, setAsset] = useState<CapitalAsset>("equity");
  const year = new Date().getFullYear();
  const [buyDate, setBuyDate] = useState(`${year - 3}-04-01`);
  const [sellDate, setSellDate] = useState(todayInputValue());
  const [buy, setBuy] = useNum(5_00_000);
  const [sell, setSell] = useNum(8_00_000);
  const [exp, setExp] = useNum(0);
  const [slab, setSlab] = useNum(30);
  const c = capitalGains({
    asset,
    buyDate,
    sellDate,
    buyValue: buy,
    sellValue: sell,
    expenses: exp,
    slabPct: slab,
  });
  return (
    <Stack>
      <Segmented
        label="What did you sell?"
        value={asset}
        options={ASSETS}
        onChange={setAsset}
      />
      <Inputs>
        <DateField label="Bought on" value={buyDate} onChange={setBuyDate} />
        <DateField label="Sold on" value={sellDate} onChange={setSellDate} />
        <MoneyField
          label="Buying price (total)"
          value={buy}
          onChange={setBuy}
        />
        <MoneyField
          label="Selling price (total)"
          value={sell}
          onChange={setSell}
        />
        <MoneyField
          label="Brokerage, stamp duty, improvement cost"
          value={exp}
          onChange={setExp}
        />
      </Inputs>
      <SlabField value={slab} onChange={setSlab} />
      <Hero label="Tax on this sale" value={c.tax} sub={c.rateLabel} />
      <Stats>
        <ResultStat label="Capital gain" value={inr(c.gain)} />
        <Stat
          label="Held for"
          value={`${Math.max(0, c.heldMonths)} months`}
          sub={c.longTerm ? "Long-term" : "Short-term"}
        />
        <ResultStat label="You keep" value={inr(c.net)} />
      </Stats>
      {c.indexedOption ? (
        <Rows
          title="Property bought before 23 Jul 2024 — two options"
          rows={[
            {
              label: "12.5% without indexation",
              value: inr(c.gain * 0.125 * 1.04),
            },
            {
              label: `20% with indexation (cost ${inr(c.indexedOption.indexedCost)})`,
              value: inr(c.indexedOption.tax),
            },
          ]}
        />
      ) : null}
      {asset === "property" && c.longTerm && c.gain > 0 ? (
        <Note>
          Reinvest in another house (Section 54) or 54EC bonds within the time
          limits to save this tax.
        </Note>
      ) : null}
      <Note>
        Rates as per Budget 2024 (sales after 23 Jul 2024). Includes 4% cess;
        surcharge not shown. Use the LTCG harvesting calculator to use your
        ₹1.25 lakh yearly exemption.
      </Note>
    </Stack>
  );
}

export function LtcgHarvestCalculator() {
  const [unreal, setUnreal] = useNum(2_00_000);
  const [real, setReal] = useNum(0);
  const [years, setYears] = useNum(10);
  const h = ltcgHarvest(unreal, real);
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Unrealised long-term gain on equity"
          unitType="money"
          value={unreal}
          min={0}
          max={MAX}
          step={5_000}
          onChange={setUnreal}
        />
        <SliderField
          label="LTCG already booked this year"
          unitType="money"
          value={real}
          min={0}
          max={MAX}
          step={5_000}
          onChange={setReal}
        />
        <SliderField
          label="Years you will repeat this"
          unitType="years"
          value={years}
          min={1}
          max={30}
          onChange={setYears}
        />
      </Inputs>
      <Hero
        label="Gain to book this year"
        value={h.harvest}
        sub={
          <>
            Saves <B>{inr(h.taxSaved)}</B> of future tax now, about{" "}
            {inr(h.taxSaved * years)} over {years} years.
          </>
        }
      />
      <Note>
        Sell units with long-term gains up to the ₹1.25 lakh exemption and buy
        them back the same or next day. Your cost goes up, so less gain is taxed
        later. Do it before 31 March each year.
      </Note>
    </Stack>
  );
}

export function DeductionsCalculator() {
  const [c80, setC80] = useNum(1_00_000);
  const [nps, setNps] = useNum(0);
  const [selfH, setSelfH] = useNum(15_000);
  const [selfSenior, setSelfSenior] = useState(false);
  const [parH, setParH] = useNum(0);
  const [parSenior, setParSenior] = useState(true);
  const [loan, setLoan] = useNum(0);
  const [slab, setSlab] = useNum(30);
  const d = deductionPlanner({
    items80C: c80,
    nps80CCD1B: nps,
    health80DSelf: selfH,
    selfSenior,
    health80DParents: parH,
    parentsSenior: parSenior,
    homeLoanInterest: loan,
    slabPct: slab,
  });
  return (
    <Stack>
      <Section title="What you invest or pay in a year">
        <Inputs>
          <MoneyField
            label="80C: EPF, PPF, ELSS, LIC, tuition, home loan principal"
            value={c80}
            onChange={setC80}
          />
          <MoneyField
            label="NPS — your own (80CCD(1B))"
            value={nps}
            onChange={setNps}
          />
          <MoneyField
            label="Health insurance — self & family"
            value={selfH}
            onChange={setSelfH}
          />
          <MoneyField
            label="Health insurance — parents"
            value={parH}
            onChange={setParH}
          />
          <MoneyField
            label="Home loan interest (self-occupied)"
            value={loan}
            onChange={setLoan}
          />
        </Inputs>
        <Inputs>
          <YesNo
            label="Are you 60 or older?"
            value={selfSenior}
            onChange={setSelfSenior}
          />
          <YesNo
            label="Parents 60 or older?"
            value={parSenior}
            onChange={setParSenior}
          />
        </Inputs>
      </Section>
      <SlabField value={slab} onChange={setSlab} />
      <Hero
        label="Tax saved (old regime)"
        value={d.taxSaved}
        sub={
          <>
            Room left to save <B>{inr(d.moreSaving)}</B> more.
          </>
        }
      />
      <Bars
        title="Used vs limit"
        format={(n) => `${n.toFixed(0)}%`}
        items={d.rows.map((r) => ({
          label: `${r.key} — ${inr(r.used)} of ${inr(r.cap)}`,
          value: (r.used / r.cap) * 100,
          highlight: r.used >= r.cap,
        }))}
      />
      <Note>
        These deductions apply only in the old regime. Compare both regimes in
        the Tax Regime calculator before you invest just to save tax.
      </Note>
    </Stack>
  );
}

export function AdvanceTaxCalculator() {
  const [tax, setTax] = useNum(1_50_000);
  const [tds, setTds] = useNum(50_000);
  const [presumptive, setPresumptive] = useState(false);
  const a = advanceTax(tax, tds, presumptive);
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Estimated total tax for the year"
          unitType="money"
          value={tax}
          min={0}
          max={MAX}
          step={1_000}
          onChange={setTax}
        />
        <SliderField
          label="TDS / TCS already deducted"
          unitType="money"
          value={tds}
          min={0}
          max={MAX}
          step={1_000}
          onChange={setTds}
        />
      </Inputs>
      <YesNo
        label="Presumptive income (44AD / 44ADA)?"
        value={presumptive}
        onChange={setPresumptive}
      />
      <Hero label="Advance tax to pay" value={a.net} />
      {a.applies ? (
        <>
          <Rows
            title="Due dates"
            rows={a.rows.map((r) => ({
              label: `By ${r.due} (${r.cumulativePct}% total)`,
              value: inr(r.amount),
            }))}
          />
          <Insight tone="warn">
            Miss every instalment and interest under 234C alone is about{" "}
            {inr(a.penalty234C)}, plus 1% a month under 234B after 31 March.
          </Insight>
        </>
      ) : (
        <Insight tone="good">
          Under ₹10,000 after TDS — no advance tax needed. Pay any balance as
          self-assessment tax before filing.
        </Insight>
      )}
      <Note>
        Senior citizens with no business income are exempt from advance tax.
      </Note>
    </Stack>
  );
}

export function PresumptiveTaxCalculator() {
  const [mode, setMode] = useState<"44ADA" | "44AD">("44ADA");
  const [receipts, setReceipts] = useNum(30_00_000);
  const [digital, setDigital] = useNum(100);
  const [expenses, setExpenses] = useNum(6_00_000);
  const p = presumptiveTax({
    mode,
    receipts,
    digitalPct: digital,
    actualExpenses: expenses,
  });
  return (
    <Stack>
      <Segmented
        label="You are"
        value={mode}
        options={[
          { value: "44ADA", label: "Freelancer / professional (44ADA)" },
          { value: "44AD", label: "Small business (44AD)" },
        ]}
        onChange={setMode}
      />
      <Inputs>
        <SliderField
          label={
            mode === "44ADA" ? "Gross receipts (yearly)" : "Turnover (yearly)"
          }
          unitType="money"
          value={receipts}
          min={1_00_000}
          max={5_00_00_000}
          step={50_000}
          onChange={setReceipts}
        />
        <SliderField
          label="Received digitally / by bank"
          unitType="percent"
          plainPercent
          value={digital}
          min={0}
          max={100}
          step={5}
          onChange={setDigital}
        />
        <SliderField
          label="Actual business expenses (yearly)"
          unitType="money"
          value={expenses}
          min={0}
          max={5_00_00_000}
          step={10_000}
          onChange={setExpenses}
        />
      </Inputs>
      <Hero
        label="Tax under presumptive scheme (new regime)"
        value={p.tax}
        sub={
          <>
            Taxable income is fixed at <B>{inr(p.income)}</B>.
          </>
        }
      />
      <Bars
        items={[
          {
            label: "Presumptive scheme",
            value: p.tax,
            highlight: p.tax <= p.booksTax,
          },
          {
            label: "Regular books (receipts − expenses)",
            value: p.booksTax,
            highlight: p.booksTax < p.tax,
          },
        ]}
      />
      {!p.eligible ? (
        <Insight tone="bad">
          Above the {inr(p.limit)} limit for this scheme — you need regular
          books and possibly an audit.
        </Insight>
      ) : null}
      <Note>
        {mode === "44ADA"
          ? "50% of receipts is treated as income; limit ₹75 lakh if cash is under 5%."
          : "6% of digital and 8% of cash turnover is treated as income; limit ₹3 crore if cash is under 5%."}{" "}
        No books or audit needed. Pay advance tax in one go by 15 March.
      </Note>
    </Stack>
  );
}

export function RentalIncomeCalculator() {
  const [rent, setRent] = useNum(30_000);
  const [vacant, setVacant] = useNum(1);
  const [muni, setMuni] = useNum(12_000);
  const [interest, setInterest] = useNum(0);
  const [value, setValue] = useNum(1_00_00_000);
  const [maint, setMaint] = useNum(36_000);
  const [slab, setSlab] = useNum(30);
  const r = rentalIncome({
    monthlyRent: rent,
    vacantMonths: vacant,
    municipalTax: muni,
    loanInterest: interest,
    propertyValue: value,
    maintenance: maint,
    slabPct: slab,
  });
  return (
    <Stack>
      <Inputs>
        <SliderField
          label="Monthly rent"
          unitType="money"
          value={rent}
          min={1_000}
          max={50_00_000}
          step={500}
          onChange={setRent}
        />
        <SliderField
          label="Months vacant in a year"
          unitType="months"
          value={vacant}
          min={0}
          max={12}
          onChange={setVacant}
        />
        <SliderField
          label="Property value"
          unitType="money"
          value={value}
          min={5_00_000}
          max={MAX}
          step={1_00_000}
          onChange={setValue}
        />
        <MoneyField
          label="Municipal / property tax paid (yearly)"
          value={muni}
          onChange={setMuni}
        />
        <MoneyField
          label="Home loan interest on this house (yearly)"
          value={interest}
          onChange={setInterest}
        />
        <MoneyField
          label="Society maintenance & repairs (yearly)"
          value={maint}
          onChange={setMaint}
        />
      </Inputs>
      <SlabField value={slab} onChange={setSlab} />
      <Hero
        label="Tax on rent"
        value={r.tax}
        sub={
          <>
            Net rental yield after costs and tax: <B>{pct(r.netYield)}</B>
          </>
        }
      />
      <Rows
        rows={[
          { label: "Rent received", value: inr(r.gross) },
          { label: "Less municipal tax", value: `− ${inr(muni)}` },
          { label: "Less 30% standard deduction", value: `− ${inr(r.std30)}` },
          { label: "Less home loan interest", value: `− ${inr(interest)}` },
          {
            label: "Taxable house property income",
            value: inr(r.taxable),
            strong: true,
          },
        ]}
      />
      {r.setOffLoss > 0 ? (
        <Insight tone="good">
          A loss of {inr(r.setOffLoss)} can reduce your other income this year
          (₹2 lakh cap), saving {inr(r.taxSavedByLoss)} — old regime only. The
          rest carries forward 8 years.
        </Insight>
      ) : null}
      <Note>
        Society maintenance is not deductible — the 30% standard deduction
        covers repairs.
      </Note>
    </Stack>
  );
}

const GST_RATES = ["3", "5", "12", "18", "28", "40"];

export function GstCalculator() {
  const [amount, setAmount] = useNum(10_000);
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [inter, setInter] = useState(false);
  const g = gst(amount, Number(rate), mode);
  return (
    <Stack>
      <Segmented
        label="Amount entered is"
        value={mode}
        options={[
          { value: "add", label: "Before GST (add GST)" },
          { value: "remove", label: "Including GST (remove GST)" },
        ]}
        onChange={setMode}
      />
      <SliderField
        label="Amount"
        unitType="money"
        value={amount}
        min={1}
        max={MAX}
        step={1}
        onChange={setAmount}
      />
      <Segmented
        label="GST rate"
        value={rate}
        options={GST_RATES.map((r) => ({ value: r, label: `${r}%` }))}
        onChange={setRate}
      />
      <YesNo
        label="Supply"
        value={inter}
        onChange={setInter}
        yes="Inter-state (IGST)"
        no="Within state (CGST + SGST)"
      />
      <Hero
        label={mode === "add" ? "Price with GST" : "Price before GST"}
        value={mode === "add" ? g.total : g.base}
      />
      <Rows
        rows={[
          { label: "Base price", value: inr(g.base) },
          ...(inter
            ? [{ label: `IGST ${rate}%`, value: inr(g.tax) }]
            : [
                { label: `CGST ${Number(rate) / 2}%`, value: inr(g.tax / 2) },
                { label: `SGST ${Number(rate) / 2}%`, value: inr(g.tax / 2) },
              ]),
          { label: "Total", value: inr(g.total), strong: true },
        ]}
      />
      <Note>
        Since September 2025 most goods fall in the 5% and 18% slabs, with 40%
        for luxury and sin goods. 12% and 28% are kept for older invoices.
      </Note>
    </Stack>
  );
}
