import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import { CalcChart, type ChartSeries } from "./CalcChart";
import {
  B,
  ChartCard,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  type InsightTone,
} from "./calculator-ui";

function sipMaturity(monthly: number, annualPct: number, years: number) {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  if (r <= 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

const SIP_MONTHLY_MAX = 1_00_00_000;

const SERIES: ChartSeries[] = [
  {
    key: "invested",
    label: "Invested",
    type: "area",
    color: "#EEEDFE",
    fillOpacity: 1,
    stackId: "a",
    hideInLegend: true,
  },
  {
    key: "gain",
    label: "Gain",
    type: "area",
    color: "#EEEDFE",
    fillOpacity: 0.4,
    stackId: "a",
    hideInLegend: true,
  },
  {
    key: "investedLine",
    label: "Invested",
    type: "line",
    color: "#AFA9EC",
    dashed: true,
  },
  {
    key: "portfolio",
    label: "Portfolio value",
    type: "line",
    color: "#534AB7",
    strokeWidth: 2.5,
  },
];

export function SIPCalculator() {
  const [monthly, setMonthly] = useClamped(10_000, 500, SIP_MONTHLY_MAX);
  const [rate, setRate] = useClamped(12, 6, 20);
  const [years, setYears] = useClamped(15, 1, 30);

  const fv = sipMaturity(monthly, rate, years);
  const invested = monthly * years * 12;
  const gain = fv - invested;
  const mult = invested > 0 ? fv / invested : 0;
  const insightTone: InsightTone =
    mult >= 2.5 ? "good" : mult >= 1.8 ? "warn" : "bad";

  const yearlyData = useMemo(() => {
    const out: Array<{
      year: number;
      invested: number;
      investedLine: number;
      portfolio: number;
      gain: number;
      gainPct: number;
    }> = [];
    for (let y = 1; y <= years; y += 1) {
      const inv = monthly * 12 * y;
      const port = sipMaturity(monthly, rate, y);
      const g = port - inv;
      out.push({
        year: y,
        invested: inv,
        investedLine: inv,
        portfolio: port,
        gain: g,
        gainPct: inv > 0 ? (g / inv) * 100 : 0,
      });
    }
    return out;
  }, [monthly, rate, years]);

  const tickEvery = Math.max(1, Math.ceil(yearlyData.length / 8));

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Monthly SIP"
        unitType="money"
        value={monthly}
        min={500}
        max={SIP_MONTHLY_MAX}
        step={500}
        onChange={setMonthly}
        format={(val) => formatCurrency(val, "en-IN", "INR")}
      />
      <SliderField
        label="Expected annual return"
        unitType="percent"
        value={rate}
        min={6}
        max={20}
        step={0.1}
        onChange={setRate}
        format={(val) => `${val}% p.a.`}
      />
      <SliderField
        label="Investment period"
        unitType="years"
        value={years}
        min={1}
        max={30}
        step={1}
        onChange={setYears}
        format={(val) => `${val} years`}
      />

      <ResultGrid>
        <ResultStat
          label="Maturity value"
          value={formatCurrency(Math.round(fv), "en-IN", "INR")}
        />
        <ResultStat
          label="Invested"
          value={formatCurrency(invested, "en-IN", "INR")}
        />
        <ResultStat
          label="Total gain"
          value={formatCurrency(Math.round(gain), "en-IN", "INR")}
        />
      </ResultGrid>

      <ChartCard title="Growth over time">
        <CalcChart
          data={yearlyData}
          xKey="year"
          series={SERIES}
          height={200}
          yTickFormat={(v) => formatIndianCompact(v)}
          xTickFormat={(v, i) =>
            (yearlyData.length - 1 - i) % tickEvery === 0 ? String(v) : ""
          }
          tooltip={(row) => {
            const inv = row.invested;
            const port = row.portfolio;
            const g = port - inv;
            const pct = inv > 0 ? (g / inv) * 100 : 0;
            return {
              title: `Year ${row.year}`,
              lines: [
                `Invested: ₹${formatIndian(inv)}`,
                `Portfolio value: ₹${formatIndian(port)}`,
                `Gain: ₹${formatIndian(g)} (${pct.toFixed(0)}%)`,
              ],
            };
          }}
        />
      </ChartCard>

      <Insight tone={insightTone}>
        Your money grows <B>{mult.toFixed(1)}×</B> — roughly ₹
        {mult.toFixed(1)} for every ₹1 put in (at {rate}% p.a.).
      </Insight>
    </View>
  );
}
