import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { ShareButton } from "@/components/ui/ShareButton";
import {
  COMPARE_PRESETS,
  KIND_META,
  MAX_SCENARIOS,
  SCENARIO_LETTERS,
  bestIndex,
  changeKind,
  compareRows,
  compareVerdicts,
  computeScenario,
  decodeScenarios,
  encodeScenarios,
  kindsInFamily,
  normaliseScenario,
  type CompareFamily,
  type Scenario,
  type ScenarioResult,
} from "@/lib/compareScenarios";
import { formatIndian, formatIndianCompact } from "@/lib/formatters";
import { siteBase } from "@/lib/splitApi";
import { CalcChart, type ChartSeries } from "./CalcChart";
import { ChartCard, Insight, SliderField, calcStyles } from "./calculator-ui";
import { AddButton, Note, Segmented } from "./advisor/kit";

const COLORS = ["#534AB7", "#1D9E75", "#D97706"];

function familyOf(list: Scenario[]): CompareFamily {
  return KIND_META[list[0].kind].family;
}

/**
 * Chart rows for the native chart, which draws a missing point as zero: a loan
 * that is paid off really is at zero, but an investment past its term holds
 * its final value.
 */
function nativeChartRows(results: ScenarioResult[]) {
  const years = Math.max(0, ...results.map((r) => r.byYear.length));
  return Array.from({ length: years }, (_, i) => {
    const row: Record<string, number> = { year: i + 1 };
    results.forEach((r, j) => {
      const v = r.byYear[i];
      row[`s${j}`] =
        v !== undefined
          ? v
          : r.family === "grow"
            ? (r.byYear[r.byYear.length - 1] ?? 0)
            : 0;
    });
    return row;
  });
}

function ScenarioCard({
  index,
  scenario,
  family,
  canRemove,
  canDuplicate,
  onChange,
  onRemove,
  onDuplicate,
}: {
  index: number;
  scenario: Scenario;
  family: CompareFamily;
  canRemove: boolean;
  canDuplicate: boolean;
  onChange: (s: Scenario) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const meta = KIND_META[scenario.kind];
  const kinds = kindsInFamily(family);
  const letter = SCENARIO_LETTERS[index];
  const set = (patch: Partial<Scenario>) =>
    onChange(normaliseScenario({ ...scenario, ...patch }));

  return (
    <View
      style={[styles.card, { borderTopColor: COLORS[index] }]}
      accessibilityLabel={`Scenario ${letter}`}
    >
      <View style={styles.cardHead}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.badge, { backgroundColor: COLORS[index] }]}>
            <Text style={styles.badgeText}>{letter}</Text>
          </View>
          <Text style={styles.cardTitle}>Scenario {letter}</Text>
        </View>
        <View style={styles.cardActions}>
          {canDuplicate ? (
            <Pressable
              onPress={onDuplicate}
              accessibilityRole="button"
              hitSlop={6}
              style={styles.action}
            >
              <Text style={styles.actionText}>Duplicate</Text>
            </Pressable>
          ) : null}
          {canRemove ? (
            <Pressable
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={`Remove scenario ${letter}`}
              hitSlop={6}
              style={styles.action}
            >
              <Text style={styles.actionMuted}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {kinds.length > 1 ? (
        <Segmented
          label="Calculator"
          value={scenario.kind}
          options={kinds.map((k) => ({ value: k, label: KIND_META[k].label }))}
          onChange={(k) => onChange(changeKind(scenario, k))}
        />
      ) : null}

      <SliderField
        label={meta.amountLabel}
        unitType="money"
        value={scenario.amount}
        min={meta.amount.min}
        max={meta.amount.max}
        step={meta.amount.step}
        onChange={(amount) => set({ amount })}
      />
      <SliderField
        label={scenario.kind === "loan" ? "Interest rate" : "Expected return"}
        unitType="percent"
        value={scenario.rate}
        min={meta.rate.min}
        max={meta.rate.max}
        step={meta.rate.step}
        onChange={(rate) => set({ rate })}
      />
      <SliderField
        label={scenario.kind === "loan" ? "Tenure" : "Period"}
        unitType="years"
        value={scenario.years}
        min={meta.years.min}
        max={meta.years.max}
        step={meta.years.step}
        onChange={(years) => set({ years })}
      />
      {scenario.kind === "stepup" ? (
        <SliderField
          label="Yearly step-up"
          unitType="percent"
          plainPercent
          value={scenario.stepUp}
          min={0}
          max={50}
          step={1}
          onChange={(stepUp) => set({ stepUp })}
        />
      ) : null}
    </View>
  );
}

export function CompareCalculator() {
  const { s } = useLocalSearchParams<{ s?: string }>();
  const [scenarios, setScenarios] = useState<Scenario[]>(
    () =>
      decodeScenarios(typeof s === "string" ? s : null) ??
      COMPARE_PRESETS.grow[1].scenarios,
  );
  const family = familyOf(scenarios);
  const encoded = encodeScenarios(scenarios);

  const results = useMemo(() => scenarios.map(computeScenario), [scenarios]);
  const rows = useMemo(() => compareRows(results), [results]);
  const data = useMemo(() => nativeChartRows(results), [results]);
  const lines = useMemo(() => compareVerdicts(results), [results]);

  const label = (i: number) =>
    `${SCENARIO_LETTERS[i]} · ${KIND_META[scenarios[i].kind].label}`;
  const series: ChartSeries[] = scenarios.map((_, i) => ({
    key: `s${i}`,
    label: label(i),
    type: "line",
    color: COLORS[i],
    strokeWidth: 2.5,
  }));
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));

  const update = (i: number, next: Scenario) =>
    setScenarios((prev) => prev.map((p, j) => (j === i ? next : p)));
  const remove = (i: number) =>
    setScenarios((prev) => prev.filter((_, j) => j !== i));
  const duplicate = (i: number) =>
    setScenarios((prev) =>
      prev.length >= MAX_SCENARIOS ? prev : [...prev, { ...prev[i] }],
    );
  const switchFamily = (f: CompareFamily) => {
    if (f !== family) setScenarios(COMPARE_PRESETS[f][0].scenarios);
  };

  return (
    <View style={calcStyles.stack}>
      <Segmented
        label="What do you want to compare?"
        value={family}
        options={[
          { value: "grow", label: "Investments & savings" },
          { value: "loan", label: "Loans & EMI" },
        ]}
        onChange={switchFamily}
      />

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Quick start</Text>
        <View style={styles.chips}>
          {COMPARE_PRESETS[family].map((p) => {
            const on = encodeScenarios(p.scenarios) === encoded;
            return (
              <Pressable
                key={p.label}
                onPress={() => setScenarios(p.scenarios)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [
                  styles.chip,
                  on && styles.chipOn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {scenarios.map((sc, i) => (
        <ScenarioCard
          key={i}
          index={i}
          scenario={sc}
          family={family}
          canRemove={scenarios.length > 2}
          canDuplicate={scenarios.length < MAX_SCENARIOS}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
          onDuplicate={() => duplicate(i)}
        />
      ))}

      {scenarios.length < MAX_SCENARIOS ? (
        <AddButton
          label="+ Add scenario C"
          onPress={() => duplicate(scenarios.length - 1)}
        />
      ) : null}

      <View style={calcStyles.card}>
        <Text style={styles.tableTitle}>Side by side</Text>
        <View style={styles.tableHead}>
          {scenarios.map((_, i) => (
            <Text
              key={i}
              style={[styles.headCell, { color: COLORS[i] }]}
              numberOfLines={2}
            >
              {label(i)}
            </Text>
          ))}
        </View>
        {rows.map((row) => {
          const best = bestIndex(row);
          return (
            <View key={row.label} style={styles.tableRow}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <View style={styles.rowValues}>
                {row.values.map((v, i) => (
                  <Text
                    key={i}
                    style={[styles.cell, best === i && styles.cellBest]}
                    accessibilityLabel={
                      best === i ? `${row.format(v)}, best` : undefined
                    }
                  >
                    {row.format(v)}
                    {best === i ? " ✓" : ""}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <Insight tone="good">{lines.join("\n")}</Insight>

      <ChartCard
        title={family === "grow" ? "Value over time" : "Loan left over time"}
      >
        <CalcChart
          data={data}
          xKey="year"
          series={series}
          height={220}
          yTickFormat={(v) => formatIndianCompact(v)}
          xTickFormat={(v, i) =>
            (data.length - 1 - i) % tickEvery === 0 ? String(v) : ""
          }
          tooltip={(row) => ({
            title: `Year ${row.year}`,
            lines: scenarios.map(
              (_, i) =>
                `${SCENARIO_LETTERS[i]}: ₹${formatIndian(Math.round(row[`s${i}`] ?? 0))}`,
            ),
          })}
        />
      </ChartCard>

      <Note>
        {family === "grow"
          ? "Returns are pre-tax and assumed constant. FD and RD compound quarterly; PPF assumes one deposit at the start of each year. A shorter scenario's line stays flat after its term."
          : "Reducing-balance EMI at a fixed rate, no prepayments or fees."}
      </Note>
      <View style={{ alignItems: "flex-start" }}>
        <ShareButton
          title="My Finkoin comparison"
          url={`${siteBase()}/calculators/compare?s=${encoded}`}
          text="Share comparison"
        />
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
  },
  chipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  chipTextOn: { color: Colors.primaryText },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderTopWidth: 4,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
    padding: 16,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: Colors.onPrimary },
  cardTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  cardActions: { flexDirection: "row", gap: 4 },
  action: { minHeight: 36, justifyContent: "center", paddingHorizontal: 8 },
  actionText: { fontSize: 12, fontWeight: "600", color: Colors.primaryText },
  actionMuted: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  tableTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  tableHead: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headCell: { flex: 1, fontSize: 12, fontWeight: "700", textAlign: "right" },
  tableRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  rowValues: { flexDirection: "row", gap: 8 },
  cell: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  cellBest: { fontWeight: "800", color: Colors.successText },
}));
