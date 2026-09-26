import { useEffect, useMemo, useState, type ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, FontSize, Spacing, Radius, Shadow } from "@/constants/theme";
import { AppHeader } from "@/components/AppHeader";
import { SliderField } from "@/components/ui/SliderField";
import { ResultStat } from "@/components/ui/ResultStat";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { formatIndian } from "@/lib/formatters";
import {
  sipMaturityAmount,
  swpDurationMonths,
  monthlyEmi,
  compareTaxRegimesSimple,
  fireNumber,
  yearsToFire,
  emergencyFundTarget,
  annualCompoundMature,
  monthlyCompoundMature,
  lumpSumCompound,
  rentVsBuySummary,
} from "@/lib/calcEngines";
import {
  CATEGORIES,
  findCategoryForCalc,
  type Cat,
} from "@/constants/calculator-config";

const TAB_PAD = 120;

function inr(n: number) {
  return `₹${formatIndian(Math.round(n))}`;
}

export default function CalculatorsScreen() {
  const params = useLocalSearchParams<{ tool?: string }>();
  const [category, setCategory] = useState<Cat>("investment");
  // Deep-linked from Home quick tools / hero carousel: router.push({ pathname:
  // '/(tabs)/calculators', params: { tool: 'sip' } }). Re-reads on every param
  // change so tapping a different tile while already on this tab still opens it.
  const [toolId, setToolId] = useState<string | null>(
    typeof params.tool === "string" ? params.tool : null,
  );

  useEffect(() => {
    if (typeof params.tool === "string" && params.tool !== toolId) {
      setToolId(params.tool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tool]);

  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.id === category)!,
    [category],
  );

  if (toolId) {
    return <CalcRouter id={toolId} onBack={() => setToolId(null)} />;
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Calculators</Text>
        <Text style={styles.sub}>
          Sliders update results instantly — illustrative, not advice.
        </Text>
        <Text style={styles.seoNote}>
          Includes SIP calculator India, EMI calculator, and income tax planning
          tools.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {CATEGORIES.map((c) => {
            const on = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[styles.catChip, on && styles.catChipOn]}
              >
                <Text style={[styles.catChipText, on && styles.catChipTextOn]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.catLabel}>{activeCat.label}</Text>
        {activeCat.items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setCategory(findCategoryForCalc(item.id));
              setToolId(item.id);
            }}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.cardIcon}>
              <AppIcon
                name={item.icon ?? "trending"}
                size={20}
                color={Colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.blurb}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function CalcRouter({ id, onBack }: { id: string; onBack: () => void }) {
  if (id === "sip") return <SipTool onBack={onBack} />;
  if (id === "swp") return <SwpTool onBack={onBack} />;
  if (id === "ppf") return <PpfTool onBack={onBack} />;
  if (id === "emergency") return <EmergencyTool onBack={onBack} />;
  if (id === "fire") return <FireTool onBack={onBack} />;
  if (id === "emi" || id === "home" || id === "car")
    return <EmiTool onBack={onBack} variant={id} />;
  if (id === "tax-regime") return <TaxTool onBack={onBack} />;
  if (id === "rentbuy") return <RentBuyTool onBack={onBack} />;
  if (id === "rentcar") return <RentCarTool onBack={onBack} />;
  if (id === "whencar") return <WhenCarTool onBack={onBack} />;
  if (id === "po-savings" || id === "po-scss" || id === "po-ssy")
    return <PoSavingsTool onBack={onBack} id={id} />;
  if (id === "po-td" || id === "nsc" || id === "po-kvp")
    return <PoLumpTool onBack={onBack} id={id} />;
  if (id === "po-rd") return <PoRdTool onBack={onBack} />;
  if (id === "po-mis") return <PoMisTool onBack={onBack} />;
  return (
    <ToolShell title="Calculator" blurb="" onBack={onBack}>
      <Text style={styles.note}>This tool is coming soon on mobile.</Text>
    </ToolShell>
  );
}

function ToolShell({
  title,
  blurb,
  onBack,
  children,
}: {
  title: string;
  blurb?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backRow}>
          <View style={styles.backCircle}>
            <Text style={styles.backArrow}>←</Text>
          </View>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.toolCard}>
          <Text style={styles.toolTitle}>{title}</Text>
          {blurb ? <Text style={styles.toolBlurb}>{blurb}</Text> : null}
          <View style={{ marginTop: 16 }}>{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SipTool({ onBack }: { onBack: () => void }) {
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(15);
  const fv = sipMaturityAmount(monthly, rate, years);
  const invested = monthly * years * 12;
  const gain = fv - invested;

  return (
    <ToolShell
      title="SIP"
      blurb="Monthly mutual fund SIP projections"
      onBack={onBack}
    >
      <SliderField
        label="Monthly SIP"
        value={monthly}
        min={500}
        max={100000}
        step={500}
        onChange={setMonthly}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Expected return"
        value={rate}
        min={6}
        max={20}
        step={0.5}
        onChange={setRate}
        format={(v) => `${v.toFixed(1)}% p.a.`}
      />
      <SliderField
        label="Duration"
        value={years}
        min={1}
        max={30}
        step={1}
        onChange={setYears}
        format={(v) => `${v} years`}
      />
      <View style={styles.stats}>
        <ResultStat label="Maturity" value={inr(fv)} accent />
        <ResultStat label="Invested" value={inr(invested)} />
        <ResultStat label="Gains" value={inr(gain)} />
      </View>
    </ToolShell>
  );
}

function SwpTool({ onBack }: { onBack: () => void }) {
  const [corpus, setCorpus] = useState(50_00_000);
  const [withdraw, setWithdraw] = useState(40000);
  const [rate, setRate] = useState(8);
  const months = swpDurationMonths(corpus, withdraw, rate);

  return (
    <ToolShell
      title="SWP"
      blurb="Withdrawals from a fixed corpus"
      onBack={onBack}
    >
      <SliderField
        label="Starting corpus"
        value={corpus}
        min={1_00_000}
        max={5_00_00_000}
        step={50_000}
        onChange={setCorpus}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Monthly withdrawal"
        value={withdraw}
        min={5_000}
        max={5_00_000}
        step={1_000}
        onChange={setWithdraw}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Expected return"
        value={rate}
        min={4}
        max={14}
        step={0.5}
        onChange={setRate}
        format={(v) => `${v.toFixed(1)}% p.a.`}
      />
      <View style={styles.stats}>
        <ResultStat
          label="Corpus lasts"
          value={
            months == null
              ? "50+ years"
              : months >= 12
                ? `${Math.floor(months / 12)}y ${months % 12}m`
                : `${months} months`
          }
          accent
        />
      </View>
    </ToolShell>
  );
}

function PpfTool({ onBack }: { onBack: () => void }) {
  const [annual, setAnnual] = useState(1_50_000);
  const rate = 7.1;
  const years = 15;
  const mature = annualCompoundMature(annual, rate, years);
  const invested = annual * years;

  return (
    <ToolShell
      title="PPF"
      blurb="15-year Public Provident Fund"
      onBack={onBack}
    >
      <SliderField
        label="Annual deposit"
        value={annual}
        min={500}
        max={1_50_000}
        step={500}
        onChange={setAnnual}
        format={(v) => inr(v)}
      />
      <Text style={styles.note}>
        Rate ~{rate}% p.a. (illustrative). Tenure fixed 15 years. Cap
        ₹1.5L/year.
      </Text>
      <View style={styles.stats}>
        <ResultStat label="Maturity" value={inr(mature)} accent />
        <ResultStat label="Invested" value={inr(invested)} />
        <ResultStat label="Gains" value={inr(mature - invested)} />
      </View>
    </ToolShell>
  );
}

function EmiTool({
  onBack,
  variant,
}: {
  onBack: () => void;
  variant: "emi" | "home" | "car";
}) {
  const [loan, setLoan] = useState(variant === "car" ? 8_00_000 : 25_00_000);
  const [rate, setRate] = useState(variant === "home" ? 8.5 : 10.5);
  const [tenure, setTenure] = useState(variant === "car" ? 60 : 240);
  const [salary, setSalary] = useState(80_000);
  const e = monthlyEmi(loan, rate, tenure);
  const total = e * tenure;
  const interest = total - loan;
  const title =
    variant === "home" ? "Home loan" : variant === "car" ? "Car loan" : "EMI";
  const blurb =
    variant === "home"
      ? "Property + income stress test"
      : variant === "car"
        ? "EMI + 6× salary rule"
        : "Any reducing-balance loan";
  const affordCap = salary * (variant === "car" ? 6 : 40);
  const emiRatio = salary > 0 ? (e / salary) * 100 : 0;

  return (
    <ToolShell title={title} blurb={blurb} onBack={onBack}>
      <SliderField
        label="Loan amount"
        value={loan}
        min={50_000}
        max={2_00_00_000}
        step={50_000}
        onChange={setLoan}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Interest rate"
        value={rate}
        min={6}
        max={18}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v.toFixed(1)}% p.a.`}
      />
      <SliderField
        label="Tenure"
        value={tenure}
        min={12}
        max={360}
        step={6}
        onChange={setTenure}
        format={(v) => `${v} months (${Math.round(v / 12)} yrs)`}
      />
      {variant !== "emi" ? (
        <SliderField
          label="Monthly take-home"
          value={salary}
          min={20_000}
          max={5_00_000}
          step={5_000}
          onChange={setSalary}
          format={(v) => inr(v)}
        />
      ) : null}
      <View style={styles.stats}>
        <ResultStat label="Monthly EMI" value={inr(e)} accent />
        <ResultStat label="Total interest" value={inr(interest)} />
        <ResultStat label="Total payable" value={inr(total)} />
        {variant !== "emi" ? (
          <ResultStat
            label={variant === "car" ? "vs 6× salary" : "EMI / income"}
            value={
              variant === "car"
                ? loan <= affordCap
                  ? "Within rule"
                  : "Above 6×"
                : `${emiRatio.toFixed(0)}%`
            }
            hint={
              variant === "car"
                ? `Cap ${inr(affordCap)}`
                : emiRatio > 40
                  ? "Stretched"
                  : "OK zone"
            }
          />
        ) : null}
      </View>
    </ToolShell>
  );
}

function TaxTool({ onBack }: { onBack: () => void }) {
  const [grossMonthly, setGross] = useState(100_000);
  const [d80c, set80c] = useState(1_50_000);
  const [d80d, set80d] = useState(25_000);
  const [hra, setHra] = useState(1_20_000);
  const [homeInt, setHome] = useState(0);

  const result = compareTaxRegimesSimple({
    annualGrossSalary: grossMonthly * 12,
    deductions80C: d80c,
    deductions80D: d80d,
    hraExemption: hra,
    homeLoanInterest: homeInt,
  });

  return (
    <ToolShell
      title="Tax Regime Comparison"
      blurb="Old vs New regime — which saves more tax in 2026"
      onBack={onBack}
    >
      <Text style={styles.note}>
        Illustrative salaried comparison — not tax advice. Full Personal CA on
        the web.
      </Text>
      <MoneyInput
        label="Monthly gross salary"
        value={grossMonthly}
        onChangeValue={(n) => setGross(n ?? 0)}
      />
      <View style={{ height: 12 }} />
      <MoneyInput
        label="80C deductions (annual)"
        value={d80c}
        onChangeValue={(n) => set80c(n ?? 0)}
      />
      <View style={{ height: 12 }} />
      <MoneyInput
        label="80D health (annual)"
        value={d80d}
        onChangeValue={(n) => set80d(n ?? 0)}
      />
      <View style={{ height: 12 }} />
      <MoneyInput
        label="HRA exemption (annual)"
        value={hra}
        onChangeValue={(n) => setHra(n ?? 0)}
      />
      <View style={{ height: 12 }} />
      <MoneyInput
        label="Home loan interest 24(b)"
        value={homeInt}
        onChangeValue={(n) => setHome(n ?? 0)}
      />
      <View style={[styles.stats, { marginTop: 20 }]}>
        <ResultStat label="New regime tax" value={inr(result.newTax)} />
        <ResultStat label="Old regime tax" value={inr(result.oldTax)} />
        <ResultStat
          label="Better for you"
          value={
            result.better === "same"
              ? "Similar"
              : result.better === "new"
                ? "New regime"
                : "Old regime"
          }
          hint={
            result.better !== "same"
              ? `Save ~${inr(result.savings)}`
              : undefined
          }
          accent
        />
      </View>
    </ToolShell>
  );
}

function FireTool({ onBack }: { onBack: () => void }) {
  const [monthlyExp, setExp] = useState(50_000);
  const [corpus, setCorpus] = useState(10_00_000);
  const [invest, setInvest] = useState(30_000);
  const [ret, setRet] = useState(12);
  const annual = monthlyExp * 12;
  const need = fireNumber(annual, 4);
  const years = yearsToFire({
    currentCorpus: corpus,
    monthlyInvest: invest,
    annualExpenses: annual,
    returnPct: ret,
  });

  return (
    <ToolShell
      title="FIRE number"
      blurb="Financial independence target — 25× expenses"
      onBack={onBack}
    >
      <SliderField
        label="Monthly expenses"
        value={monthlyExp}
        min={10_000}
        max={5_00_000}
        step={5_000}
        onChange={setExp}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Current investments"
        value={corpus}
        min={0}
        max={5_00_00_000}
        step={50_000}
        onChange={setCorpus}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Monthly invest / SIP"
        value={invest}
        min={0}
        max={2_00_000}
        step={1_000}
        onChange={setInvest}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Expected return"
        value={ret}
        min={6}
        max={15}
        step={0.5}
        onChange={setRet}
        format={(v) => `${v.toFixed(1)}%`}
      />
      <View style={styles.stats}>
        <ResultStat label="FIRE corpus (4% SWR)" value={inr(need)} accent />
        <ResultStat
          label="Years to FIRE"
          value={years == null ? "50+ yrs" : `${years.toFixed(1)} yrs`}
        />
      </View>
    </ToolShell>
  );
}

function EmergencyTool({ onBack }: { onBack: () => void }) {
  const [needs, setNeeds] = useState(40_000);
  const [months, setMonths] = useState(6);
  const [have, setHave] = useState(1_00_000);
  const target = emergencyFundTarget(needs, months);
  const gap = Math.max(0, target - have);

  return (
    <ToolShell
      title="Emergency fund"
      blurb="Target vs gap by life stage"
      onBack={onBack}
    >
      <SliderField
        label="Monthly needs spend"
        value={needs}
        min={5_000}
        max={3_00_000}
        step={1_000}
        onChange={setNeeds}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Target months"
        value={months}
        min={3}
        max={18}
        step={1}
        onChange={setMonths}
        format={(v) => `${v} months`}
      />
      <SliderField
        label="What you have now"
        value={have}
        min={0}
        max={1_00_00_000}
        step={10_000}
        onChange={setHave}
        format={(v) => inr(v)}
      />
      <View style={styles.stats}>
        <ResultStat label="Target corpus" value={inr(target)} accent />
        <ResultStat label="Gap" value={gap === 0 ? "Covered ✓" : inr(gap)} />
      </View>
      <Button
        label="Run full health check"
        variant="secondary"
        onPress={() => router.push("/(tabs)/analyse")}
        style={{ marginTop: 16 }}
      />
    </ToolShell>
  );
}

function RentBuyTool({ onBack }: { onBack: () => void }) {
  const [rent, setRent] = useState(35_000);
  const [price, setPrice] = useState(1_00_00_000);
  const [down, setDown] = useState(20_00_000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(10);
  const s = rentVsBuySummary({
    monthlyRent: rent,
    homePrice: price,
    downPayment: down,
    loanRate: rate,
    tenureYears: 20,
    appreciationPct: 5,
    years,
  });

  return (
    <ToolShell
      title="Rent vs buy"
      blurb="Home: cash-outflow comparison"
      onBack={onBack}
    >
      <SliderField
        label="Monthly rent"
        value={rent}
        min={5_000}
        max={2_00_000}
        step={1_000}
        onChange={setRent}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Home price"
        value={price}
        min={20_00_000}
        max={10_00_00_000}
        step={1_00_000}
        onChange={setPrice}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Down payment"
        value={down}
        min={0}
        max={price}
        step={1_00_000}
        onChange={setDown}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Loan rate"
        value={rate}
        min={6}
        max={12}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v.toFixed(1)}%`}
      />
      <SliderField
        label="Horizon"
        value={years}
        min={3}
        max={25}
        step={1}
        onChange={setYears}
        format={(v) => `${v} years`}
      />
      <View style={styles.stats}>
        <ResultStat label="Rent paid" value={inr(s.totalRentPaid)} />
        <ResultStat label="EMI paid" value={inr(s.totalEmiPaid)} />
        <ResultStat label="Est. equity" value={inr(s.equityAtEnd)} accent />
        <ResultStat label="Home value" value={inr(s.homeValue)} />
      </View>
    </ToolShell>
  );
}

function RentCarTool({ onBack }: { onBack: () => void }) {
  const [cab, setCab] = useState(12_000);
  const [emi, setEmi] = useState(18_000);
  const [fuel, setFuel] = useState(6_000);
  const [ins, setIns] = useState(1_500);
  const own = emi + fuel + ins;
  const gap = own - cab;

  return (
    <ToolShell
      title="Rent vs own car"
      blurb="Cab cost vs ownership estimate"
      onBack={onBack}
    >
      <SliderField
        label="Monthly cab / rental"
        value={cab}
        min={2_000}
        max={50_000}
        step={500}
        onChange={setCab}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Car EMI"
        value={emi}
        min={0}
        max={80_000}
        step={500}
        onChange={setEmi}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Fuel + maint."
        value={fuel}
        min={0}
        max={30_000}
        step={500}
        onChange={setFuel}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Insurance / other"
        value={ins}
        min={0}
        max={10_000}
        step={100}
        onChange={setIns}
        format={(v) => inr(v)}
      />
      <View style={styles.stats}>
        <ResultStat label="Ownership / mo" value={inr(own)} accent />
        <ResultStat label="Cab / mo" value={inr(cab)} />
        <ResultStat
          label="Difference"
          value={gap >= 0 ? `Own +${inr(gap)}` : `Cab +${inr(-gap)}`}
        />
      </View>
    </ToolShell>
  );
}

function WhenCarTool({ onBack }: { onBack: () => void }) {
  const [price, setPrice] = useState(12_00_000);
  const [downPct, setDownPct] = useState(20);
  const [save, setSave] = useState(15_000);
  const need = (price * downPct) / 100;
  const months = save > 0 ? Math.ceil(need / save) : null;

  return (
    <ToolShell
      title="When to buy car"
      blurb="Down payment timeline & afford rule"
      onBack={onBack}
    >
      <SliderField
        label="Car price"
        value={price}
        min={3_00_000}
        max={50_00_000}
        step={50_000}
        onChange={setPrice}
        format={(v) => inr(v)}
      />
      <SliderField
        label="Down payment %"
        value={downPct}
        min={10}
        max={50}
        step={5}
        onChange={setDownPct}
        format={(v) => `${v}%`}
      />
      <SliderField
        label="Monthly save"
        value={save}
        min={1_000}
        max={1_00_000}
        step={1_000}
        onChange={setSave}
        format={(v) => inr(v)}
      />
      <View style={styles.stats}>
        <ResultStat label="Down needed" value={inr(need)} accent />
        <ResultStat
          label="Months to go"
          value={months == null ? "—" : `${months} mo`}
        />
      </View>
    </ToolShell>
  );
}

function PoSavingsTool({ onBack, id }: { onBack: () => void; id: string }) {
  const cfg =
    id === "po-scss"
      ? { title: "SCSS", rate: 8.2, years: 5, blurb: "Senior Citizen scheme" }
      : id === "po-ssy"
        ? { title: "SSY", rate: 8.2, years: 21, blurb: "Sukanya Samriddhi" }
        : { title: "PO Savings", rate: 4, years: 1, blurb: "POSA at 4% p.a." };
  const [deposit, setDeposit] = useState(1_00_000);
  const mature =
    id === "po-savings"
      ? deposit * (1 + cfg.rate / 100)
      : annualCompoundMature(
          id === "po-ssy" ? Math.min(deposit, 1_50_000) : deposit,
          cfg.rate,
          cfg.years,
        );

  return (
    <ToolShell title={cfg.title} blurb={cfg.blurb} onBack={onBack}>
      <SliderField
        label={id === "po-ssy" ? "Annual deposit" : "Principal / deposit"}
        value={deposit}
        min={1000}
        max={30_00_000}
        step={1000}
        onChange={setDeposit}
        format={(v) => inr(v)}
      />
      <Text style={styles.note}>
        Rate ~{cfg.rate}% (illustrative). {cfg.years} year horizon.
      </Text>
      <View style={styles.stats}>
        <ResultStat label="Est. maturity" value={inr(mature)} accent />
      </View>
    </ToolShell>
  );
}

function PoLumpTool({ onBack, id }: { onBack: () => void; id: string }) {
  const cfg =
    id === "nsc"
      ? { title: "NSC", rate: 7.7, years: 5 }
      : id === "po-kvp"
        ? { title: "KVP", rate: 7.5, years: 9.58 }
        : { title: "PO Time Deposit", rate: 7.1, years: 5 };
  const [p, setP] = useState(1_00_000);
  const years = Math.max(1, Math.round(cfg.years));
  const mature = id === "po-kvp" ? p * 2 : lumpSumCompound(p, cfg.rate, years);

  return (
    <ToolShell
      title={cfg.title}
      blurb="Post Office lump-sum schemes"
      onBack={onBack}
    >
      <SliderField
        label="Investment"
        value={p}
        min={1000}
        max={50_00_000}
        step={1000}
        onChange={setP}
        format={(v) => inr(v)}
      />
      <Text style={styles.note}>
        ~{cfg.rate}% · {cfg.years} yrs (illustrative)
      </Text>
      <View style={styles.stats}>
        <ResultStat label="Maturity" value={inr(mature)} accent />
        <ResultStat label="Gains" value={inr(mature - p)} />
      </View>
    </ToolShell>
  );
}

function PoRdTool({ onBack }: { onBack: () => void }) {
  const [m, setM] = useState(5000);
  const rate = 6.7;
  const months = 60;
  const mature = monthlyCompoundMature(m, rate, months);

  return (
    <ToolShell title="PO RD" blurb="5-year monthly RD maturity" onBack={onBack}>
      <SliderField
        label="Monthly deposit"
        value={m}
        min={100}
        max={50_000}
        step={100}
        onChange={setM}
        format={(v) => inr(v)}
      />
      <View style={styles.stats}>
        <ResultStat label="Maturity (~5y)" value={inr(mature)} accent />
        <ResultStat label="Invested" value={inr(m * months)} />
      </View>
    </ToolShell>
  );
}

function PoMisTool({ onBack }: { onBack: () => void }) {
  const [p, setP] = useState(9_00_000);
  const rate = 7.4;
  const monthly = (p * rate) / 100 / 12;

  return (
    <ToolShell title="PO MIS" blurb="Monthly payout calculator" onBack={onBack}>
      <SliderField
        label="Deposit"
        value={p}
        min={1000}
        max={15_00_000}
        step={1000}
        onChange={setP}
        format={(v) => inr(v)}
      />
      <Text style={styles.note}>~{rate}% p.a. paid monthly (illustrative)</Text>
      <View style={styles.stats}>
        <ResultStat label="Monthly payout" value={inr(monthly)} accent />
      </View>
    </ToolShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  pad: { padding: Spacing.xl, paddingBottom: TAB_PAD },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  seoNote: {
    marginTop: 10,
    marginBottom: Spacing.lg,
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  catRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: Spacing.md,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  catChipOn: {
    backgroundColor: Colors.primary,
  },
  catChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  catChipTextOn: {
    color: "#FFFFFF",
  },
  catLabel: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardIcon: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  cardDesc: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    minHeight: 40,
  },
  backCircle: {
    height: 32,
    width: 32,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  toolCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 16,
    ...Shadow.card,
  },
  toolTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  toolBlurb: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  note: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
});
