import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { formatCurrency } from "@/lib/finance";
import {
  B,
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

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

export function EMICalculator() {
  const [loan, setLoan] = useClamped(25_00_000, 1, CALCULATOR_MONEY_MAX);
  const [rate, setRate] = useClamped(10.5, 0.1, 100);
  const [tenure, setTenure] = useClamped(60, 1, 600);
  const [loanStartDate, setLoanStartDate] = useState(todayInputValue);

  const e = emi(loan, rate, tenure);
  const totalPay = e * tenure;
  const interest = totalPay - loan;

  const interestRatio = loan > 0 ? interest / loan : 0;
  const tone: InsightTone =
    interestRatio < 0.35 ? "good" : interestRatio < 0.55 ? "warn" : "bad";

  const { amortRows, yearlyBreakdown, tableWithSummaries } = useLoanSchedule(
    loan,
    rate,
    tenure,
    e,
    loanStartDate,
  );

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Loan amount"
        unitType="money"
        value={loan}
        min={1}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setLoan}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Interest rate"
        unitType="percent"
        value={rate}
        min={0.1}
        max={100}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        unitType="months"
        value={tenure}
        min={1}
        max={600}
        step={1}
        onChange={setTenure}
        format={(v) => `${v} months (${(v / 12).toFixed(1)} yr)`}
      />
      <DateField
        label="Loan start date"
        value={loanStartDate}
        onChange={setLoanStartDate}
      />

      <ResultGrid>
        <ResultStat
          label="Monthly EMI"
          value={formatCurrency(Math.round(e), "en-IN", "INR")}
        />
        <ResultStat
          label="Total payment"
          value={formatCurrency(Math.round(totalPay), "en-IN", "INR")}
        />
        <ResultStat
          label="Total interest"
          value={formatCurrency(Math.round(interest), "en-IN", "INR")}
        />
      </ResultGrid>

      <YearlyBreakupChart
        data={yearlyBreakdown}
        footer={
          <Text style={[calcStyles.muted, { marginTop: 12 }]}>
            Tip: early years are interest-heavy; later years skew toward
            principal.
          </Text>
        }
      />

      <LoanExcelDownloads
        rows={amortRows}
        loan={loan}
        rate={rate}
        tenure={tenure}
        e={e}
        name="emi"
      />

      <AmortisationSchedule entries={tableWithSummaries} months={tenure} />

      <Insight tone={tone}>
        Interest is about <B>{(interestRatio * 100).toFixed(0)}%</B> of
        principal —{" "}
        {interestRatio < 0.45
          ? "consider prepayment when possible."
          : "explore shorter tenure or balance transfer if eligible."}
      </Insight>
    </View>
  );
}
