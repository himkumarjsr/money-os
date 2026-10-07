import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

export type ChartSeries = {
  key: string;
  label: string;
  type: "area" | "line" | "bar";
  color: string;
  /** Area / bar fill opacity (default 1). */
  fillOpacity?: number;
  strokeWidth?: number;
  dashed?: boolean;
  /** Series sharing a stackId are stacked (areas and bars). */
  stackId?: string;
  hideInLegend?: boolean;
  /** Legend swatch colour when it differs from the drawn colour. */
  legendColor?: string;
};

export type ChartTooltip = { title: string; lines: string[] };

type Row = Record<string, number>;

const PAD = { top: 8, right: 8, bottom: 24, left: 52 };
const GRID = "#F4F2FC";
const TICK = "#9B9A94";

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const base = 10 ** exp;
  const f = rough / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

function niceTicks(min: number, max: number, count = 4) {
  if (max <= min) max = min + 1;
  const step = niceStep((max - min) / count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

/** Monotone cubic (Fritsch–Carlson) — same feel as recharts `type="monotone"`. */
function monotonePath(pts: { x: number; y: number }[], moveTo = true): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `${moveTo ? "M" : "L"}${pts[0].x},${pts[0].y}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push(dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) m.push(0);
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
    }
  }
  m.push(slope[n - 2]);
  let d = `${moveTo ? "M" : "L"}${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + m[i] * h} ${pts[i + 1].x - h},${
      pts[i + 1].y - m[i + 1] * h
    } ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

/** Recharts-style cartesian chart (areas, lines, stacked bars) with tap-to-inspect tooltip. */
export function CalcChart({
  data,
  xKey,
  series,
  height = 200,
  yTickFormat,
  xTickFormat,
  tooltip,
  legend = true,
}: {
  data: Row[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  yTickFormat: (v: number) => string;
  /** Return "" to hide a tick label. */
  xTickFormat?: (v: number, index: number) => string;
  tooltip: (row: Row, index: number) => ChartTooltip;
  legend?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const hasBars = series.some((s) => s.type === "bar");
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = Math.max(0, height - PAD.top - PAD.bottom);
  const n = data.length;

  const layout = useMemo(() => {
    const stacks: Record<string, number[]> = {};
    const baselines: Record<string, number[]> = {};
    const tops: Record<string, number[]> = {};
    let yMax = 0;
    let yMin = 0;
    for (const s of series) {
      const vals = data.map((r) => Number(r[s.key]) || 0);
      if (s.stackId && s.type !== "line") {
        const acc = (stacks[s.stackId] ??= new Array(n).fill(0));
        baselines[s.key] = acc.slice();
        tops[s.key] = acc.map((a, i) => a + vals[i]);
        for (let i = 0; i < n; i += 1) acc[i] += vals[i];
      } else {
        baselines[s.key] = new Array(n).fill(0);
        tops[s.key] = vals;
      }
      for (const v of tops[s.key]) {
        yMax = Math.max(yMax, v);
        yMin = Math.min(yMin, v);
      }
    }
    return { baselines, tops, ...niceTicks(yMin, yMax) };
  }, [data, series, n]);

  const xAt = (i: number) => {
    if (hasBars) {
      const band = n > 0 ? plotW / n : plotW;
      return PAD.left + band * i + band / 2;
    }
    return PAD.left + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  };
  const yAt = (v: number) =>
    PAD.top + plotH - ((v - layout.lo) / (layout.hi - layout.lo || 1)) * plotH;

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(Math.round(e.nativeEvent.layout.width));

  const pick = (e: GestureResponderEvent) => {
    if (n === 0 || plotW <= 0) return;
    const x = e.nativeEvent.locationX - PAD.left;
    const idx = hasBars
      ? Math.floor((x / plotW) * n)
      : Math.round((x / plotW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, idx)));
  };

  const band = hasBars && n > 0 ? plotW / n : 0;
  const barW = Math.max(2, band * 0.7);

  const tip = active != null && data[active] ? tooltip(data[active], active) : null;
  const tipX = active != null ? xAt(active) : 0;
  const tipLeft = Math.min(Math.max(8, tipX - 90), Math.max(8, width - 188));

  return (
    <View>
      <View
        style={{ height }}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderTerminationRequest={() => true}
        accessible
        accessibilityLabel="Chart. Tap to see values."
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {layout.ticks.map((t) => (
              <G key={`y${t}`}>
                <Line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  stroke={GRID}
                />
                <SvgText
                  x={PAD.left - 6}
                  y={yAt(t) + 4}
                  fontSize={11}
                  fill={TICK}
                  textAnchor="end"
                >
                  {yTickFormat(t)}
                </SvgText>
              </G>
            ))}

            {data.map((r, i) => {
              const label = xTickFormat
                ? xTickFormat(Number(r[xKey]), i)
                : String(r[xKey]);
              if (!label) return null;
              return (
                <SvgText
                  key={`x${i}`}
                  x={xAt(i)}
                  y={height - 6}
                  fontSize={11}
                  fill={TICK}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            })}

            {active != null ? (
              hasBars ? (
                <Rect
                  x={xAt(active) - band / 2}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="#F1F0FA"
                />
              ) : (
                <Line
                  x1={tipX}
                  x2={tipX}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke="#CCCCCC"
                />
              )
            ) : null}

            {series.map((s) => {
              const tops = layout.tops[s.key];
              const bases = layout.baselines[s.key];
              if (s.type === "bar") {
                return (
                  <G key={s.key}>
                    {tops.map((top, i) => {
                      const y1 = yAt(top);
                      const y0 = yAt(bases[i]);
                      const h = Math.max(0, y0 - y1);
                      if (h <= 0) return null;
                      return (
                        <Rect
                          key={i}
                          x={xAt(i) - barW / 2}
                          y={y1}
                          width={barW}
                          height={h}
                          fill={s.color}
                          fillOpacity={s.fillOpacity ?? 1}
                        />
                      );
                    })}
                  </G>
                );
              }
              const topPts = tops.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
              if (s.type === "area") {
                const basePts = bases
                  .map((v, i) => ({ x: xAt(i), y: yAt(v) }))
                  .reverse();
                const d = `${monotonePath(topPts)} ${monotonePath(basePts, false)} Z`;
                return (
                  <Path
                    key={s.key}
                    d={d}
                    fill={s.color}
                    fillOpacity={s.fillOpacity ?? 1}
                    stroke="none"
                  />
                );
              }
              return (
                <Path
                  key={s.key}
                  d={monotonePath(topPts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.strokeWidth ?? 1.5}
                  strokeDasharray={s.dashed ? "6 6" : undefined}
                />
              );
            })}
          </Svg>
        ) : null}

        {tip ? (
          <View pointerEvents="none" style={[styles.tip, { left: tipLeft }]}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            {tip.lines.map((l) => (
              <Text key={l} style={styles.tipLine}>
                {l}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {legend ? (
        <View style={styles.legend}>
          {series
            .filter((s) => !s.hideInLegend)
            .map((s) => (
              <View key={s.key} style={styles.legendItem}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: s.legendColor ?? s.color },
                  ]}
                />
                <Text style={styles.legendText}>{s.label}</Text>
              </View>
            ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: "absolute",
    top: 0,
    width: 180,
    backgroundColor: "#111110",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tipTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipLine: { color: "#FFFFFF", fontSize: 12, lineHeight: 17 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12, color: "#5F5E5A" },
});
