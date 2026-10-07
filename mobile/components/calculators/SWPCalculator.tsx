import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { formatCurrency } from "@/lib/finance";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import { CalcChart } from "./CalcChart";
import {
  ChartCard,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  type InsightTone,
} from "./calculator-ui";

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

function monthsCorpusLasts(
  corpus: number,
  withdraw: number,
  annualPct: number,
  maxMonths = 600,
): number {
  if (corpus <= 0 || withdraw <= 0) return 0;
  const r = annualPct / 100 / 12;
  let bal = corpus;
  for (let m = 0; m < maxMonths; m += 1) {
    bal = bal * (1 + r) - withdraw;
    if (bal <= 0) return m + 1;
  }
  return maxMonths;
}

function sustainableMonthly(corpus: number, annualPct: number) {
  const r = annualPct / 100 / 12;
  if (r <= 0) return 0;
  return corpus * r;
}

const SWP_CORPUS_MAX = 10_00_00_000;

export function SWPCalculator() {
  const [corpus, setCorpus] = useClamped(50_00_000, 5_00_000, SWP_CORPUS_MAX);
  const [withdraw, setWithdraw] = useClamped(40_000, 5_000, 5_00_000);
  const [rate, setRate] = useClamped(8, 3, 15);

  const lasts = monthsCorpusLasts(corpus, withdraw, rate);
  const sustain = sustainableMonthly(corpus, rate);
  const yearsLeft = lasts / 12;

  let tone: InsightTone = "good";
  if (lasts < 120 || withdraw > sustain * 1.1) tone = "bad";
  else if (lasts < 180 || withdraw > sustain) tone = "warn";

  const isSustainable = withdraw <= sustain;
  const lineColor = isSustainable ? "#1D9E75" : "#E24B4A";

  const series = useMemo(() => {
    const r = rate / 100 / 12;
    const maxMonths = Math.min(600, Math.max(1, lasts));
    let bal = corpus;
    let withdrawnSoFar = 0;
    const out: Array<{ month: number; balance: number; withdrawn: number }> =
      [];
    for (let m = 1; m <= maxMonths; m += 1) {
      bal = bal * (1 + r) - withdraw;
      withdrawnSoFar += withdraw;
      out.push({
        month: m,
        balance: Math.max(0, bal),
        withdrawn: withdrawnSoFar,
      });
      if (bal <= 0) break;
    }
    return out;
  }, [corpus, lasts, rate, withdraw]);

  const totalYears = Math.floor(series.length / 12);
  const yearTickEvery = Math.max(1, Math.ceil(totalYears / 6));

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Corpus"
        unitType="money"
        value={corpus}
        min={5_00_000}
        max={SWP_CORPUS_MAX}
        step={50_000}
        onChange={setCorpus}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Monthly withdrawal"
        unitType="money"
        value={withdraw}
        min={5_000}
        max={5_00_000}
        step={1_000}
        onChange={setWithdraw}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Expected return (pre-tax)"
        unitType="percent"
        value={rate}
        min={3}
        max={15}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v}% p.a.`}
      />

      <ResultGrid>
        <ResultStat
          label="Corpus lasts"
          value={
            lasts >= 600
              ? "50+ years (at this rate)"
              : `${yearsLeft.toFixed(1)} years (${lasts} months)`
          }
        />
        <ResultStat
          label="Sustainable monthly (interest-only)"
          value={formatCurrency(Math.round(sustain), "en-IN", "INR")}
        />
      </ResultGrid>

      <ChartCard title="Corpus over time">
        <CalcChart
          data={series}
          xKey="month"
          height={200}
          legend={false}
          series={[
            {
              key: "balance",
              label: "balance",
              type: "line",
              color: lineColor,
              strokeWidth: 2.5,
            },
          ]}
          yTickFormat={(v) => formatIndianCompact(v)}
          xTickFormat={(m) =>
            m % 12 === 0 && (m / 12) % yearTickEvery === 0 ? `Y${m / 12}` : ""
          }
          tooltip={(row) => ({
            title:
              row.month % 12 === 0
                ? `Year ${row.month / 12}`
                : `Month ${row.month}`,
            lines: [
              `Corpus remaining: ₹${formatIndian(row.balance)}`,
              `Total withdrawn: ₹${formatIndian(row.withdrawn)}`,
            ],
          })}
        />
      </ChartCard>

      <Insight tone={tone}>
        {withdraw <= sustain
          ? "Withdrawals are within the corpus’ natural yield — principal can stay intact."
          : lasts >= 600
            ? "Withdrawal pace is very conservative — corpus may outlive the plan."
            : `At this pace the corpus may run out in ~${yearsLeft.toFixed(1)} years. Consider lowering SWP toward ₹${Math.round(sustain).toLocaleString("en-IN")}/mo or growing equity share.`}
      </Insight>
    </View>
  );
}
