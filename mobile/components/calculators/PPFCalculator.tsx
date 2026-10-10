import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
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

/** Year-end deposits, annual compounding — 15 equal contributions. */
function ppfv(yearly: number, annualPct: number) {
  const r = annualPct / 100;
  if (r <= 0) return yearly * 15;
  return yearly * ((Math.pow(1 + r, 15) - 1) / r) * (1 + r);
}

function ppfvYears(yearly: number, annualPct: number, years: number) {
  const r = annualPct / 100;
  if (years <= 0) return 0;
  if (r <= 0) return yearly * years;
  return yearly * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
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
    color: Colors.primary,
    fillOpacity: 0.6,
    stackId: "a",
  },
];

export function PPFCalculator() {
  const [yearly, setYearly] = useClamped(1_50_000, 500, 1_50_000);
  const [rate, setRate] = useClamped(7.1, 6, 9);
  const [chartWidth, setChartWidth] = useState(0);

  const fv = ppfv(yearly, rate);
  const invested = yearly * 15;
  const gain = fv - invested;
  const tone: InsightTone =
    gain / Math.max(invested, 1) > 0.85 ? "good" : "warn";

  const data = useMemo(() => {
    const out: Array<{
      year: number;
      invested: number;
      interest: number;
      total: number;
    }> = [];
    for (let y = 1; y <= 15; y += 1) {
      const inv = yearly * y;
      const total = ppfvYears(yearly, rate, y);
      out.push({
        year: y,
        invested: inv,
        interest: Math.max(0, total - inv),
        total,
      });
    }
    return out;
  }, [rate, yearly]);

  const last = data[data.length - 1];
  const stackTop = last ? last.invested + last.interest : 0;
  const yHi = niceHi(stackTop);
  const plotW = Math.max(0, chartWidth - PAD.left - PAD.right);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const xAtYear = (year: number) =>
    PAD.left + (plotW * (year - 1)) / Math.max(1, data.length - 1);
  const yAt = (v: number) => PAD.top + plotH - (v / (yHi || 1)) * plotH;
  const x7 = xAtYear(7);
  const x15 = xAtYear(15);
  const y15 = yAt(last?.total ?? 0);

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Yearly deposit"
        unitType="money"
        value={yearly}
        min={500}
        max={CALCULATOR_MONEY_MAX}
        step={500}
        onChange={setYearly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Assumed rate (illustrative)"
        unitType="percent"
        value={rate}
        min={6}
        max={9}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <ResultGrid>
        <ResultStat
          label="15-year maturity (approx)"
          value={formatCurrency(Math.round(fv), "en-IN", "INR")}
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

      <ChartCard title="15-year growth">
        <View
          onLayout={(e) =>
            setChartWidth(Math.round(e.nativeEvent.layout.width))
          }
        >
          <CalcChart
            data={data}
            xKey="year"
            series={SERIES()}
            height={CHART_HEIGHT}
            legend={false}
            yTickFormat={(v) => formatIndianCompact(v)}
            tooltip={(row) => {
              const investedVal = row.invested;
              const interestVal = row.interest;
              const totalVal = investedVal + interestVal;
              return {
                title: `Year ${row.year}`,
                lines: [
                  `Invested: ₹${formatIndian(investedVal)}`,
                  `Interest earned: ₹${formatIndian(interestVal)}`,
                  `Total balance: ₹${formatIndian(totalVal)}`,
                ],
              };
            }}
          />
          {chartWidth > 0 ? (
            <Svg
              pointerEvents="none"
              width={chartWidth}
              height={CHART_HEIGHT}
              style={styles.overlay}
            >
              <Line
                x1={x7}
                x2={x7}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke={brand("#534AB7")}
                strokeDasharray="6 6"
              />
              <SvgText
                x={x7 + 5}
                y={PAD.top + 5 + 11}
                fontSize={12}
                fill={brand("#534AB7")}
                textAnchor="start"
              >
                Year 7 (partial withdrawal)
              </SvgText>
              <Circle cx={x15} cy={y15} r={4} fill={brand("#534AB7")} />
              <SvgText
                x={x15 - 9}
                y={y15 + 4}
                fontSize={12}
                fill={brand("#534AB7")}
                textAnchor="end"
              >
                Year 15 (maturity)
              </SvgText>
            </Svg>
          ) : null}
        </View>
      </ChartCard>

      <Insight tone={tone}>
        PPF is EEE for qualifying contributions — extend beyond 15y in blocks of
        5y if you still need tax-free debt-free compounding.
      </Insight>
    </View>
  );
}

const styles = themedStyles(() => ({
  overlay: { position: "absolute", top: 0, left: 0 },
}));
