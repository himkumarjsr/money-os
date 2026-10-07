import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { computeFireNumbers } from "@/lib/fireCalculator";
import { formatCurrency } from "@/lib/finance";
import {
  B,
  CALCULATOR_MONEY_MAX,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  type InsightTone,
} from "./calculator-ui";
import { openContentHref } from "@/lib/contentLinks";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

function formatYearsMonths(
  years: number | null,
  months: number | null,
): string {
  if (years === null || months === null) return "50+ years";
  if (years <= 0) return "Already there";
  const y = Math.floor(years);
  const m = months !== null ? months % 12 : Math.round((years - y) * 12);
  if (y === 0) return `${m} months`;
  if (m === 0) return `${y} years`;
  return `${y}y ${m}mo`;
}

const FIRE_GUIDE_PATH =
  "/blog/your-fire-number-when-can-you-actually-retire-in-india";

export function FIRECalculator() {
  const [expensesExEmi, setExpensesExEmi] = useClamped(
    70_000,
    15_000,
    5_00_000,
  );
  const [monthlyEmi, setMonthlyEmi] = useClamped(0, 0, 2_00_000);
  const [debtOutstanding, setDebtOutstanding] = useClamped(0, 0, 2_00_00_000);
  const [corpus, setCorpus] = useClamped(80_00_000, 0, 5_00_00_000);
  const [monthlySip, setMonthlySip] = useClamped(20_000, 0, 5_00_000);
  const [returnPct, setReturnPct] = useClamped(12, 4, 18);

  const result = useMemo(
    () =>
      computeFireNumbers({
        monthlyExpensesExEmi: expensesExEmi,
        monthlyEmi,
        totalDebtOutstanding: debtOutstanding,
        currentCorpus: corpus,
        monthlySip,
        expectedReturnPct: returnPct,
      }),
    [corpus, debtOutstanding, expensesExEmi, monthlyEmi, monthlySip, returnPct],
  );

  let tone: InsightTone = "good";
  let insight = "";

  if (result.isTargetMet) {
    insight =
      "Your corpus meets the total FIRE target (lifestyle corpus + outstanding loans). Focus on staying debt-free and keeping expenses stable.";
  } else if (result.yearsToTarget === null) {
    tone = "bad";
    insight =
      "At this SIP and return assumption, closing the gap may take decades. Increase monthly investing, reduce lifestyle expenses, or clear loans to lower the target.";
  } else if (result.yearsToTarget <= 7) {
    tone = "good";
    insight = `You may reach your total FIRE target in about ${formatYearsMonths(result.yearsToTarget, result.monthsToTarget)} — closer than the “₹10 crore” fear many people carry.`;
  } else if (result.yearsToTarget <= 15) {
    tone = "warn";
    insight = `Estimated ${formatYearsMonths(result.yearsToTarget, result.monthsToTarget)} to your target at ${returnPct}% growth. Clearing EMIs or raising SIP materially shortens this.`;
  } else {
    tone = "bad";
    insight = `Roughly ${formatYearsMonths(result.yearsToTarget, result.monthsToTarget)} away at current inputs. EMIs inflate the number you think you need — use expenses without EMIs.`;
  }

  if (result.debtPayoffFireSavings > 0 && monthlyEmi > 0) {
    insight += ` Clearing loans could lower your lifestyle FIRE number by about ${formatCurrency(Math.round(result.debtPayoffFireSavings), "en-IN", "INR")} (same life, no EMI).`;
  }

  const fmt = (n: number) => formatCurrency(Math.round(n), "en-IN", "INR");

  return (
    <View style={calcStyles.stack}>
      <Text style={styles.intro}>
        Uses the <Text style={styles.introStrong}>4% rule</Text> (25× annual
        lifestyle expenses) plus outstanding loan balances. Enter expenses{" "}
        <Text style={styles.em}>without</Text> EMIs — add loans separately.
      </Text>

      <SliderField
        label="Monthly expenses (excluding all EMIs)"
        unitType="money"
        value={expensesExEmi}
        min={15_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setExpensesExEmi}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Total monthly EMIs (for comparison)"
        unitType="money"
        value={monthlyEmi}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setMonthlyEmi}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Outstanding loans (home + car + personal)"
        unitType="money"
        value={debtOutstanding}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setDebtOutstanding}
        format={(v) => fmt(v)}
      />

      <SliderField
        label="Current investments (corpus)"
        unitType="money"
        value={corpus}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setCorpus}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Monthly SIP (to close the gap)"
        unitType="money"
        value={monthlySip}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setMonthlySip}
        format={(v) => fmt(v)}
      />
      <SliderField
        label="Expected return (SIP + corpus)"
        unitType="percent"
        value={returnPct}
        min={4}
        max={18}
        step={0.1}
        onChange={setReturnPct}
      />

      <ResultGrid>
        <ResultStat
          label="Lifestyle FIRE corpus (25×)"
          value={fmt(result.lifestyleFireCorpus)}
        />
        <ResultStat
          label="Total FIRE target (+ debt)"
          value={fmt(result.totalFireTarget)}
        />
        <ResultStat label="Gap to target" value={fmt(result.gap)} />
        <ResultStat
          label="Progress to target"
          value={`${result.progressPct.toFixed(0)}%`}
        />
        <ResultStat
          label="Time to target (est.)"
          value={formatYearsMonths(result.yearsToTarget, result.monthsToTarget)}
        />
        <ResultStat
          label="Safe monthly spend (4% rule)"
          value={fmt(result.safeMonthlyWithdrawal)}
        />
      </ResultGrid>

      {monthlyEmi > 0 ? (
        <View style={styles.emiBox}>
          <Text style={[styles.emiText, styles.semibold]}>
            If you counted EMIs in expenses
          </Text>
          <Text style={[styles.emiText, styles.emiBody]}>
            Naive FIRE (expenses + EMI): {fmt(result.naiveFireCorpus)}.
            Loan-free lifestyle FIRE: {fmt(result.lifestyleFireCorpus)}.
            Difference: <B>{fmt(result.debtPayoffFireSavings)}</B> — same
            lifestyle once loans end.
          </Text>
        </View>
      ) : null}

      <Insight tone={tone}>{insight}</Insight>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Finkoin tip</Text>
        <Text style={styles.tipBody}>
          Map income, real spends, and loans in one pass with the{" "}
          <Text
            style={styles.link}
            onPress={() => router.push("/(tabs)/analyse")}
            accessibilityRole="link"
          >
            financial health check
          </Text>
          . Read the full framework in our{" "}
          <Text
            style={styles.link}
            onPress={() => openContentHref(FIRE_GUIDE_PATH)}
            accessibilityRole="link"
          >
            FIRE number guide
          </Text>
          .
        </Text>
      </View>

      <Text style={styles.disclaimer}>
        Educational illustration only. The 4% withdrawal rule is based on
        historical US portfolio studies; Indian inflation, healthcare, and
        sequence-of-returns risk may require a larger corpus or lower
        withdrawals.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 23, color: "#475569" },
  introStrong: { fontWeight: "600", color: "#1E293B" },
  em: { fontStyle: "italic" },
  emiBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: "rgba(245,243,255,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emiText: { fontSize: 14, lineHeight: 20, color: "#2E1065" },
  semibold: { fontWeight: "600" },
  emiBody: { marginTop: 4, lineHeight: 23 },
  tipBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.25)",
    backgroundColor: "#F7F6FE",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#534AB7",
  },
  tipBody: { marginTop: 8, fontSize: 14, lineHeight: 23, color: "#3C3489" },
  link: { fontWeight: "600", textDecorationLine: "underline" },
  disclaimer: { fontSize: 12, lineHeight: 19.5, color: "#64748B" },
});
