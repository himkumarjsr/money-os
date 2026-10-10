import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { formatCurrency } from "@/lib/finance";
import {
  PO_RATES,
  PO_RATES_PERIOD,
  PO_RATES_SOURCE,
  poKvpMaturity,
  poMisMonthly,
  poNscMaturity,
  poRdMaturity,
  poSavingsYearly,
  poScssQuarterly,
  poSsyMaturity,
  poTdMaturity,
  poTdRate,
  type PoTdYears,
} from "@/lib/postOfficeSchemes";
import {
  CALCULATOR_MONEY_MAX,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  type InsightTone,
} from "../calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback(
    (nv: number) => setV(Math.max(min, Math.min(max, nv))),
    [min, max],
  );
  return [v, set] as const;
}

function RateBadge({ rate, note }: { rate: number; note?: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        <Text style={styles.badgeRate}>{rate}% p.a.</Text>
        {" · "}
        notified for {PO_RATES_PERIOD}
        {note ? ` · ${note}` : ""}
      </Text>
    </View>
  );
}

export function PoSavingsCalculator() {
  const [principal, setPrincipal] = useClamped(50_000, 500, 10_00_000);
  const yearly = poSavingsYearly(principal);
  const monthly = yearly / 12;

  return (
    <View style={calcStyles.stack}>
      <RateBadge
        rate={PO_RATES.savings}
        note="floating; taxable above §80TTA/80TTB limits"
      />
      <SliderField
        label="Average balance"
        unitType="money"
        value={principal}
        min={500}
        max={CALCULATOR_MONEY_MAX}
        step={500}
        onChange={setPrincipal}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <ResultGrid>
        <ResultStat
          label="Interest / year"
          value={formatCurrency(Math.round(yearly), "en-IN", "INR")}
        />
        <ResultStat
          label="Interest / month"
          value={formatCurrency(monthly, "en-IN", "INR")}
        />
        <ResultStat
          label="Balance"
          value={formatCurrency(principal, "en-IN", "INR")}
        />
      </ResultGrid>
      <Insight tone="warn">
        Post Office Savings Account pays {PO_RATES.savings}% p.a. Best for
        parking cash with withdrawal flexibility — not for long-term growth. (
        {PO_RATES_SOURCE})
      </Insight>
    </View>
  );
}

export function PoTimeDepositCalculator() {
  const [principal, setPrincipal] = useClamped(1_00_000, 1_000, 50_00_000);
  const [years, setYears] = useState<PoTdYears>(5);
  const rate = poTdRate(years);
  const maturity = poTdMaturity(principal, years, rate);
  const interest = maturity - principal;

  return (
    <View style={calcStyles.stack}>
      <RateBadge rate={rate} note="compounded quarterly" />
      <SliderField
        label="Deposit amount"
        unitType="money"
        value={principal}
        min={1_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setPrincipal}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <View>
        <Text style={styles.groupLabel}>Tenure</Text>
        <View style={styles.chipRow}>
          {([1, 2, 3, 5] as PoTdYears[]).map((y) => {
            const selected = years === y;
            return (
              <Pressable
                key={y}
                onPress={() => setYears(y)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipIdle,
                  pressed && !selected && styles.chipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected ? styles.chipTextSelected : styles.chipTextIdle,
                  ]}
                >
                  {y} yr · {poTdRate(y)}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ResultGrid>
        <ResultStat
          label="Maturity value"
          value={formatCurrency(Math.round(maturity), "en-IN", "INR")}
        />
        <ResultStat
          label="Interest earned"
          value={formatCurrency(Math.round(interest), "en-IN", "INR")}
        />
        <ResultStat
          label="Principal"
          value={formatCurrency(principal, "en-IN", "INR")}
        />
      </ResultGrid>
      <Insight tone="good">
        {years}-year Time Deposit at {rate}% p.a. (quarterly compounding).
        Interest is taxable. 5-year TD can also count toward §80C when eligible.
        ({PO_RATES_PERIOD})
      </Insight>
    </View>
  );
}

export function PoRecurringDepositCalculator() {
  const [monthly, setMonthly] = useClamped(5_000, 100, 50_000);
  const maturity = poRdMaturity(monthly);
  const invested = monthly * 60;
  const interest = maturity - invested;

  return (
    <View style={calcStyles.stack}>
      <RateBadge rate={PO_RATES.rd} note="5-year RD" />
      <SliderField
        label="Monthly deposit"
        unitType="money"
        value={monthly}
        min={100}
        max={CALCULATOR_MONEY_MAX}
        step={100}
        onChange={setMonthly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <ResultGrid>
        <ResultStat
          label="5-year maturity"
          value={formatCurrency(Math.round(maturity), "en-IN", "INR")}
        />
        <ResultStat
          label="Total invested"
          value={formatCurrency(invested, "en-IN", "INR")}
        />
        <ResultStat
          label="Interest earned"
          value={formatCurrency(Math.round(interest), "en-IN", "INR")}
        />
      </ResultGrid>
      <Insight tone="good">
        National Savings Recurring Deposit forces monthly discipline for 5 years
        at {PO_RATES.rd}% p.a. Interest is taxable as per your slab.
      </Insight>
    </View>
  );
}

export function PoNscSchemeCalculator() {
  const [principal, setPrincipal] = useClamped(1_00_000, 1_000, 50_00_000);
  const maturity = poNscMaturity(principal);
  const interest = maturity - principal;

  return (
    <View style={calcStyles.stack}>
      <RateBadge rate={PO_RATES.nsc} note="compounded annually · 5 years" />
      <SliderField
        label="One-time investment"
        unitType="money"
        value={principal}
        min={1_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setPrincipal}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <ResultGrid>
        <ResultStat
          label="5-year maturity"
          value={formatCurrency(Math.round(maturity), "en-IN", "INR")}
        />
        <ResultStat
          label="Principal"
          value={formatCurrency(principal, "en-IN", "INR")}
        />
        <ResultStat
          label="Interest earned"
          value={formatCurrency(Math.round(interest), "en-IN", "INR")}
        />
      </ResultGrid>
      <Insight tone="good">
        At {PO_RATES.nsc}%, ₹10,000 grows to about ₹14,490 in 5 years. Interest
        is taxable (deemed reinvested each year). Eligible for §80C within the
        ₹1.5L cap.
      </Insight>
    </View>
  );
}

export function PoKvpCalculator() {
  const [principal, setPrincipal] = useClamped(1_00_000, 1_000, 50_00_000);
  const maturity = poKvpMaturity(principal);
  const years = PO_RATES.kvpMonths / 12;

  return (
    <View style={calcStyles.stack}>
      <RateBadge
        rate={PO_RATES.kvp}
        note={`doubles in ${PO_RATES.kvpMonths} months (~${years.toFixed(1)} yrs)`}
      />
      <SliderField
        label="Investment amount"
        unitType="money"
        value={principal}
        min={1_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setPrincipal}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <ResultGrid>
        <ResultStat
          label="Maturity value"
          value={formatCurrency(maturity, "en-IN", "INR")}
        />
        <ResultStat
          label="Gain (doubles)"
          value={formatCurrency(principal, "en-IN", "INR")}
        />
        <ResultStat label="Lock-in" value={`${PO_RATES.kvpMonths} months`} />
      </ResultGrid>
      <Insight tone="good">
        Kisan Vikas Patra at {PO_RATES.kvp}% currently doubles your money in{" "}
        {PO_RATES.kvpMonths} months. Interest is taxable; certificate is
        transferable.
      </Insight>
    </View>
  );
}

export function PoMisCalculator() {
  const [principal, setPrincipal] = useClamped(4_50_000, 1_000, 15_00_000);
  const monthly = poMisMonthly(principal);
  const yearly = monthly * 12;
  const tone: InsightTone = principal > 9_00_000 ? "warn" : "good";

  return (
    <View style={calcStyles.stack}>
      <RateBadge rate={PO_RATES.mis} note="monthly payout · 5-year tenure" />
      <SliderField
        label="Deposit (max ₹9L single / ₹15L joint)"
        unitType="money"
        value={principal}
        min={1_000}
        max={15_00_000}
        step={1_000}
        onChange={setPrincipal}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <ResultGrid>
        <ResultStat
          label="Monthly income"
          value={formatCurrency(monthly, "en-IN", "INR")}
        />
        <ResultStat
          label="Yearly income"
          value={formatCurrency(Math.round(yearly), "en-IN", "INR")}
        />
        <ResultStat
          label="Principal at maturity"
          value={formatCurrency(principal, "en-IN", "INR")}
        />
      </ResultGrid>
      <Insight tone={tone}>
        MIS pays {PO_RATES.mis}% as monthly interest (₹62 / month per ₹10,000).
        Principal returns after 5 years. Cap: ₹9 lakh (single) / ₹15 lakh
        (joint). Interest is taxable.
      </Insight>
    </View>
  );
}

export function PoScssCalculator() {
  const [principal, setPrincipal] = useClamped(10_00_000, 1_000, 30_00_000);
  const [age, setAge] = useClamped(62, 55, 90);
  const quarterly = poScssQuarterly(principal);
  const yearly = quarterly * 4;
  const eligible = age >= 60;
  const tone: InsightTone = !eligible ? "bad" : "good";

  return (
    <View style={calcStyles.stack}>
      <RateBadge rate={PO_RATES.scss} note="quarterly payout · max ₹30L" />
      <SliderField
        label="Your age"
        unitType="years"
        value={age}
        min={55}
        max={90}
        step={1}
        onChange={setAge}
        format={(v) => `${v} years`}
      />
      <SliderField
        label="Deposit (max ₹30 lakh)"
        unitType="money"
        value={principal}
        min={1_000}
        max={30_00_000}
        step={10_000}
        onChange={setPrincipal}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <ResultGrid>
        <ResultStat
          label="Quarterly interest"
          value={formatCurrency(quarterly, "en-IN", "INR")}
        />
        <ResultStat
          label="Yearly interest"
          value={formatCurrency(Math.round(yearly), "en-IN", "INR")}
        />
        <ResultStat
          label="Principal at maturity"
          value={formatCurrency(principal, "en-IN", "INR")}
        />
      </ResultGrid>
      <Insight tone={tone}>
        {eligible
          ? `SCSS at ${PO_RATES.scss}% — among the highest small-savings rates. 5-year tenure (extendable). Interest taxable; §80TTB may help seniors.`
          : "SCSS generally needs age ≥ 60 (or special early-retirement rules). Shown for planning only."}
      </Insight>
    </View>
  );
}

export function PoSsyCalculator() {
  const [yearly, setYearly] = useClamped(1_00_000, 250, 1_50_000);
  const [girlAge, setGirlAge] = useClamped(2, 0, 10);
  const depositYears = 15;
  const totalYears = 21;
  const afterDeposits = poSsyMaturity(yearly, depositYears, PO_RATES.ssy);
  const maturity = useMemo(() => {
    let bal = afterDeposits;
    for (let y = depositYears; y < totalYears; y += 1) {
      bal *= 1 + PO_RATES.ssy / 100;
    }
    return bal;
  }, [afterDeposits]);
  const invested = yearly * depositYears;
  const gain = maturity - invested;
  const maturityGirlAge = girlAge + totalYears;

  return (
    <View style={calcStyles.stack}>
      <RateBadge
        rate={PO_RATES.ssy}
        note="EEE · deposits 15 yrs · matures at 21 yrs from opening"
      />
      <SliderField
        label="Girl's age at opening"
        unitType="years"
        value={girlAge}
        min={0}
        max={10}
        step={1}
        onChange={setGirlAge}
        format={(v) => `${v} years`}
      />
      <SliderField
        label="Yearly deposit (max ₹1.5L)"
        unitType="money"
        value={yearly}
        min={250}
        max={1_50_000}
        step={500}
        onChange={setYearly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <ResultGrid>
        <ResultStat
          label="Maturity (21 yrs)"
          value={formatCurrency(Math.round(maturity), "en-IN", "INR")}
        />
        <ResultStat
          label="Total invested"
          value={formatCurrency(invested, "en-IN", "INR")}
        />
        <ResultStat
          label="Tax-free gain (EEE)"
          value={formatCurrency(Math.round(gain), "en-IN", "INR")}
        />
      </ResultGrid>
      <Insight tone="good">
        Sukanya Samriddhi at {PO_RATES.ssy}% — open before she turns 10. Model
        assumes 15 years of deposits then compounding to year 21 (girl ~
        {maturityGirlAge}). Confirm eligibility and withdrawal rules at India
        Post.
      </Insight>
    </View>
  );
}

export type PoSchemeId =
  | "posa"
  | "td"
  | "rd"
  | "nsc"
  | "kvp"
  | "mis"
  | "scss"
  | "ssy";

export const PO_SCHEME_META: Array<{
  id: PoSchemeId;
  name: string;
  short: string;
  rate: number;
  rateLabel: string;
  calcId: string;
}> = [
  {
    id: "posa",
    name: "Savings Account",
    short: "POSA",
    rate: PO_RATES.savings,
    rateLabel: `${PO_RATES.savings}% p.a.`,
    calcId: "po-savings",
  },
  {
    id: "td",
    name: "Time Deposit",
    short: "TD / FD",
    rate: PO_RATES.td5,
    rateLabel: `${PO_RATES.td1}–${PO_RATES.td5}%`,
    calcId: "po-td",
  },
  {
    id: "rd",
    name: "Recurring Deposit",
    short: "RD",
    rate: PO_RATES.rd,
    rateLabel: `${PO_RATES.rd}% p.a.`,
    calcId: "po-rd",
  },
  {
    id: "nsc",
    name: "National Savings Certificate",
    short: "NSC",
    rate: PO_RATES.nsc,
    rateLabel: `${PO_RATES.nsc}% p.a.`,
    calcId: "nsc",
  },
  {
    id: "kvp",
    name: "Kisan Vikas Patra",
    short: "KVP",
    rate: PO_RATES.kvp,
    rateLabel: `${PO_RATES.kvp}% · ${PO_RATES.kvpMonths} mo`,
    calcId: "po-kvp",
  },
  {
    id: "mis",
    name: "Monthly Income Scheme",
    short: "MIS",
    rate: PO_RATES.mis,
    rateLabel: `${PO_RATES.mis}% p.a.`,
    calcId: "po-mis",
  },
  {
    id: "scss",
    name: "Senior Citizen Savings",
    short: "SCSS",
    rate: PO_RATES.scss,
    rateLabel: `${PO_RATES.scss}% p.a.`,
    calcId: "po-scss",
  },
  {
    id: "ssy",
    name: "Sukanya Samriddhi",
    short: "SSY",
    rate: PO_RATES.ssy,
    rateLabel: `${PO_RATES.ssy}% p.a.`,
    calcId: "po-ssy",
  },
];

export function PoSchemeCalculator({ scheme }: { scheme: PoSchemeId }) {
  switch (scheme) {
    case "posa":
      return <PoSavingsCalculator />;
    case "td":
      return <PoTimeDepositCalculator />;
    case "rd":
      return <PoRecurringDepositCalculator />;
    case "nsc":
      return <PoNscSchemeCalculator />;
    case "kvp":
      return <PoKvpCalculator />;
    case "mis":
      return <PoMisCalculator />;
    case "scss":
      return <PoScssCalculator />;
    case "ssy":
      return <PoSsyCalculator />;
    default:
      return null;
  }
}

const styles = themedStyles(() => ({
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: { fontSize: 12, lineHeight: 16, color: Colors.textSecondary },
  badgeRate: { fontWeight: "600", color: Colors.primary },
  groupLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipIdle: { borderColor: Colors.border, backgroundColor: Colors.card },
  chipPressed: { borderColor: "rgba(83,74,183,0.4)" },
  chipText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  chipTextSelected: { color: Colors.onPrimary },
  chipTextIdle: { color: Colors.textSecondary },
}));
