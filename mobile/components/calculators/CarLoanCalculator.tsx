import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { formatCurrency } from "@/lib/finance";
import { formatINR } from "@/lib/formatINR";
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
import { Colors } from "@/constants/theme";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

export function CarLoanCalculator() {
  const [price, setPrice] = useClamped(12_00_000, 3_00_000, 50_00_000);
  const [downPct, setDownPct] = useClamped(15, 0, 40);
  const [rate, setRate] = useClamped(9.5, 7, 16);
  const [years, setYears] = useClamped(5, 3, 7);
  const [salary, setSalary] = useClamped(90_000, 25_000, 5_00_000);
  const [loanStartDate, setLoanStartDate] = useState(todayInputValue);

  const loan = price * (1 - downPct / 100);
  const months = years * 12;
  const e = emi(loan, rate, months);
  const totalPay = e * months;
  const interest = totalPay - loan;
  const pctOfIncome = salary > 0 ? (e / salary) * 100 : 0;
  const breachEmi = pctOfIncome > 40;
  const affordCap = 6 * salary;
  const breachCar = price > affordCap;

  const tone: InsightTone =
    breachEmi || breachCar
      ? "bad"
      : pctOfIncome > 30 || price > affordCap * 0.85
        ? "warn"
        : "good";

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
        label="On-road / ex-showroom price"
        unitType="money"
        value={price}
        min={3_00_000}
        max={CALCULATOR_MONEY_MAX}
        step={50_000}
        onChange={setPrice}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Down payment"
        unitType="percent"
        value={downPct}
        min={0}
        max={40}
        step={1}
        onChange={setDownPct}
        format={(v) => `${v}%`}
      />
      <SliderField
        label="Interest rate"
        unitType="percent"
        value={rate}
        min={7}
        max={16}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />
      <SliderField
        label="Tenure"
        unitType="years"
        value={years}
        min={3}
        max={7}
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
        label="Monthly salary"
        unitType="money"
        value={salary}
        min={25_000}
        max={CALCULATOR_MONEY_MAX}
        step={5_000}
        onChange={setSalary}
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
          label="EMI % of salary"
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
        name="car-loan"
      />

      <AmortisationSchedule entries={tableWithSummaries} months={months} />

      <Text style={calcStyles.body}>
        Affordability rule of thumb: car value ≤ <B>6×</B> monthly salary (≈{" "}
        {formatCurrency(Math.round(affordCap), "en-IN", "INR")} for you).
      </Text>

      <Insight tone={tone}>
        {breachCar
          ? "Car price exceeds 6× monthly salary — stretch target or add down payment."
          : breachEmi
            ? "EMI is above 40% of salary — consider a cheaper segment or longer tenure cautiously."
            : "Looks within typical affordability bands."}
      </Insight>
    </View>
  );
}
