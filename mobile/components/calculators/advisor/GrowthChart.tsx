import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import { CalcChart, type ChartSeries } from "../CalcChart";
import { ChartCard } from "../calculator-ui";

const COLORS = ["#534AB7", "#AFA9EC", "#1D9E75"];

/** Year-by-year lines for up to three series (native port of the PWA GrowthChart). */
export function GrowthChart({
  title,
  data,
  series,
}: {
  title: string;
  data: Array<Record<string, number>>;
  series: Array<{ key: string; label: string; dashed?: boolean }>;
}) {
  const tickEvery = Math.max(1, Math.ceil(data.length / 8));
  const chartSeries: ChartSeries[] = series.map((s, i) => ({
    key: s.key,
    label: s.label,
    type: "line",
    color: COLORS[i % COLORS.length],
    strokeWidth: i === 0 ? 2.5 : 2,
    dashed: s.dashed,
  }));
  return (
    <ChartCard title={title}>
      <CalcChart
        data={data}
        xKey="year"
        series={chartSeries}
        height={200}
        yTickFormat={(v) => formatIndianCompact(v)}
        xTickFormat={(v, i) =>
          (data.length - 1 - i) % tickEvery === 0 ? String(v) : ""
        }
        tooltip={(row) => ({
          title: `Year ${row.year}`,
          lines: series.map(
            (s) => `${s.label}: ₹${formatIndian(Math.round(row[s.key] ?? 0))}`,
          ),
        })}
      />
    </ChartCard>
  );
}
