import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { formatCurrency } from "@/lib/finance";
import { formatINR } from "@/lib/formatINR";
import {
  CALCULATOR_MONEY_MAX,
  DateField,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  todayInputValue,
  type InsightTone,
} from "./calculator-ui";
import {
  AmortisationSchedule,
  LoanExcelDownloads,
  YearlyBreakupChart,
  emi,
  useLoanSchedule,
} from "./loanShared";
import { Colors } from "@/constants/theme";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

export function HomeLoanCalculator() {
  const [value, setValue] = useClamped(80_00_000, 10_00_000, 5_00_00_000);
  const [downPct, setDownPct] = useClamped(20, 10, 50);
  const [rate, setRate] = useClamped(8.5, 7, 12);
  const [years, setYears] = useClamped(20, 5, 30);
  const [income, setIncome] = useClamped(1_50_000, 25_000, 10_00_000);
  const [loanStartDate, setLoanStartDate] = useState(todayInputValue);

  const loan = value * (1 - downPct / 100);
  const months = years * 12;
  const e = emi(loan, rate, months);
  const totalPay = e * months;
  const interest = totalPay - loan;
  const pctOfIncome = income > 0 ? (e / income) * 100 : 0;
  const breach = pctOfIncome > 40;

  const tone: InsightTone = breach ? "bad" : pctOfIncome > 32 ? "warn" : "good";

  const { amortRows, yearlyBreakdown, tableWithSummaries } = useLoanSchedule(
    loan,
    rate,
    months,
    e,
    loanStartDate,
  );

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Property value"
        unitType="money"
        value={value}
        min={10_00_000}
        max={CALCULATOR_MONEY_MAX}
        step={5_00_000}
        onChange={setValue}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Down payment"
        unitType="percent"
        value={downPct}
        min={10}
        max={50}
        step={1}
        onChange={setDownPct}
        format={(v) => `${v}%`}
      />
      <SliderField
        label="Interest rate"
        unitType="percent"
        value={rate}
        min={7}
        max={12}
        step={0.05}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        unitType="years"
        value={years}
        min={5}
        max={30}
        step={1}
        onChange={setYears}
        format={(v) => `${v} years`}
      />
      <DateField
        label="Loan start date"
        value={loanStartDate}
        onChange={setLoanStartDate}
      />
      <SliderField
        label="Monthly take-home (household)"
        unitType="money"
        value={income}
        min={25_000}
        max={CALCULATOR_MONEY_MAX}
        step={5_000}
        onChange={setIncome}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <ResultGrid>
        <ResultStat
          label="Loan amount"
          value={formatCurrency(Math.round(loan), "en-IN", "INR")}
        />
        <ResultStat
          label="Monthly EMI"
          value={formatCurrency(Math.round(e), "en-IN", "INR")}
        />
        <ResultStat
          label="EMI % of income"
          value={`${pctOfIncome.toFixed(1)}%`}
        />
      </ResultGrid>

      <YearlyBreakupChart
        data={yearlyBreakdown}
        showOutstanding
        footer={
          <Text
            style={[
              calcStyles.muted,
              { marginTop: 12, color: Colors.textSecondary },
            ]}
          >
            You pay {formatINR((interest / Math.max(loan, 1)) * 100)} in
            interest for every ₹100 you borrow at this rate.
          </Text>
        }
      />

      <LoanExcelDownloads
        rows={amortRows}
        loan={loan}
        rate={rate}
        tenure={months}
        e={e}
        name="home-loan"
      />

      <AmortisationSchedule entries={tableWithSummaries} months={months} />

      <Insight tone={tone}>
        {breach
          ? "EMI is above 40% of stated income — high strain. Increase down payment, stretch tenure, or revisit budget."
          : pctOfIncome > 32
            ? "EMI is workable but leaves limited buffer — keep 6-month EMI in liquid savings."
            : "EMI is within a healthy slice of income."}
      </Insight>
    </View>
  );
}
