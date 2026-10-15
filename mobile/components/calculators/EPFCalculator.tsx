import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import {
  computeEpfProjection,
  EPF_DEFAULT_RATE_PCT,
  EPF_FINAL_AGE,
} from "@/lib/epfCalculator";
import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import { CalcChart, type ChartSeries } from "./CalcChart";
import {
  CALCULATOR_MONEY_MAX,
  ChartCard,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  type InsightTone,
} from "./calculator-ui";
import { themedStyles, Colors, brand } from "@/constants/theme";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

const CHART_HEIGHT = 200;
/** Must match CalcChart's plot padding and y-axis tick logic for the reference overlay. */
const PAD = { top: 8, right: 8, bottom: 24, left: 52 };

function niceHi(max: number, count = 4) {
  if (max <= 0) max = 1;
  const rough = max / count;
  const exp = Math.floor(Math.log10(rough));
  const base = 10 ** exp;
  const f = rough / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const step = nice * base;
  return Math.ceil(max / step) * step;
}

const SERIES = (): ChartSeries[] => [
  {
    key: "invested",
    label: "invested",
    type: "area",
    color: Colors.primaryLight,
    fillOpacity: 1,
    stackId: "a",
  },
  {
    key: "interest",
    label: "interest",
    type: "area",
    color: Colors.primaryText,
    fillOpacity: 0.6,
    stackId: "a",
  },
];

export function EPFCalculator() {
  const [balance, setBalance] = useClamped(5_00_000, 0, CALCULATOR_MONEY_MAX);
  const [yearly, setYearly] = useClamped(1_20_000, 0, CALCULATOR_MONEY_MAX);
  const [age, setAgeRaw] = useClamped(30, 18, EPF_FINAL_AGE - 1);
  const [till, setTill] = useClamped(58, 19, EPF_FINAL_AGE);
  const [rate, setRate] = useClamped(EPF_DEFAULT_RATE_PCT, 0, 15);
  const [chartWidth, setChartWidth] = useState(0);

  const setAge = useCallback(
    (v: number) => {
      setAgeRaw(v);
      if (till <= v) setTill(Math.min(EPF_FINAL_AGE, v + 1));
    },
    [setAgeRaw, setTill, till],
  );
  const stopAge = Math.max(age, till);

  const result = useMemo(
    () =>
      computeEpfProjection({
        currentBalance: balance,
        yearlyContribution: yearly,
        currentAge: age,
        contributeTillAge: stopAge,
        annualRatePct: rate,
      }),
    [age, balance, rate, stopAge, yearly],
  );

  const data = useMemo(
    () => [
      { age, invested: balance, interest: 0, total: balance },
      ...result.schedule,
    ],
    [age, balance, result.schedule],
  );

  const tone: InsightTone =
    result.totalInterest >= result.totalInvested ? "good" : "warn";

  const last = data[data.length - 1];
  const stackTop = last ? last.invested + last.interest : 0;
  const yHi = niceHi(stackTop);
  const plotW = Math.max(0, chartWidth - PAD.left - PAD.right);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const xAtAge = (a: number) =>
    PAD.left + (plotW * (a - age)) / Math.max(1, data.length - 1);
  const yAt = (v: number) => PAD.top + plotH - (v / (yHi || 1)) * plotH;
  const xStop = xAtAge(stopAge);
  const xEnd = xAtAge(EPF_FINAL_AGE);
  const yEnd = yAt(result.finalValue);

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Existing PF balance"
        unitType="money"
        value={balance}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={1000}
        onChange={setBalance}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Yearly contribution (employee + employer)"
        unitType="money"
        value={yearly}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={1000}
        onChange={setYearly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Current age"
        unitType="years"
        value={age}
        min={18}
        max={EPF_FINAL_AGE - 1}
        step={1}
        onChange={setAge}
      />
      <SliderField
        label="Contribute till age"
        unitType="years"
        value={stopAge}
        min={Math.min(EPF_FINAL_AGE, age + 1)}
        max={EPF_FINAL_AGE}
        step={1}
        onChange={setTill}
      />
      <SliderField
        label="EPF interest rate"
        unitType="percent"
        value={rate}
        min={0}
        max={15}
        step={0.05}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <ResultGrid>
        <ResultStat
          label={`Value at age ${EPF_FINAL_AGE}`}
          value={formatCurrency(Math.round(result.finalValue), "en-IN", "INR")}
        />
        <ResultStat
          label="Total invested"
          value={formatCurrency(
            Math.round(result.totalInvested),
            "en-IN",
            "INR",
          )}
        />
        <ResultStat
          label="Interest earned"
          value={formatCurrency(
            Math.round(result.totalInterest),
            "en-IN",
            "INR",
          )}
        />
      </ResultGrid>

      <ChartCard title={`PF growth till ${EPF_FINAL_AGE}`}>
        <View
          onLayout={(e) =>
            setChartWidth(Math.round(e.nativeEvent.layout.width))
          }
        >
          <CalcChart
            data={data}
            xKey="age"
            series={SERIES()}
            height={CHART_HEIGHT}
            legend={false}
            yTickFormat={(v) => formatIndianCompact(v)}
            tooltip={(row) => {
              const investedVal = row.invested;
              const interestVal = row.interest;
              return {
                title: `Age ${row.age}`,
                lines: [
                  `Invested: ₹${formatIndian(Math.round(investedVal))}`,
                  `Interest earned: ₹${formatIndian(Math.round(interestVal))}`,
                  `PF balance: ₹${formatIndian(Math.round(investedVal + interestVal))}`,
                ],
              };
            }}
          />
          {chartWidth > 0 && data.length > 1 ? (
            <Svg
              pointerEvents="none"
              width={chartWidth}
              height={CHART_HEIGHT}
              style={styles.overlay}
            >
              {stopAge < EPF_FINAL_AGE ? (
                <>
                  <Line
                    x1={xStop}
                    x2={xStop}
                    y1={PAD.top}
                    y2={PAD.top + plotH}
                    stroke={brand("#534AB7")}
                    strokeDasharray="6 6"
                  />
                  <SvgText
                    x={xStop - 5}
                    y={PAD.top + plotH - 5}
                    fontSize={12}
                    fill={brand("#534AB7")}
                    textAnchor="end"
                  >
                    Contributions stop
                  </SvgText>
                </>
              ) : null}
              <Circle cx={xEnd} cy={yEnd} r={4} fill={brand("#534AB7")} />
              <SvgText
                x={xEnd - 9}
                y={yEnd + 4}
                fontSize={12}
                fill={brand("#534AB7")}
                textAnchor="end"
              >
                {`Age ${EPF_FINAL_AGE}`}
              </SvgText>
            </Svg>
          ) : null}
        </View>
      </ChartCard>

      <Insight tone={tone}>
        {result.growthOnlyYears > 0 && result.contributionYears > 0
          ? `You contribute for ${result.contributionYears} years, then your PF keeps earning ${rate}% for ${result.growthOnlyYears} more years until ${EPF_FINAL_AGE}. `
          : result.contributionYears > 0
            ? `You contribute for ${result.contributionYears} years until ${EPF_FINAL_AGE}. `
            : ""}
        EPFO credits interest once a year on your monthly running balance; the
        rate is set every year, so treat this as an estimate.
      </Insight>
    </View>
  );
}

const styles = themedStyles(() => ({
  overlay: { position: "absolute", top: 0, left: 0 },
}));
