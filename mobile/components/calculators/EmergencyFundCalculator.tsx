import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { AppIcon } from "@/components/ui/AppIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { LifeStage } from "@/lib/analyse-form-schema";
import { formatCurrency } from "@/lib/finance";
import {
  CALCULATOR_MONEY_MAX,
  Insight,
  ResultGrid,
  ResultStat,
  SliderField,
  calcStyles,
  type InsightTone,
} from "./calculator-ui";

const MONTHS: Record<LifeStage, number> = {
  bachelor: 3,
  married: 6,
  kids: 9,
  senior: 12,
};

const LABELS: Record<LifeStage, string> = {
  bachelor: "Single / bachelor",
  married: "Married, no kids",
  kids: "Married with kids",
  senior: "Pre-retirement (50+)",
};

function useClamped(initial: number, min: number, max: number) {
  const [v, setV] = useState(() => Math.min(max, Math.max(min, initial)));
  const set = useCallback((nv: number) => setV(Math.max(min, nv)), [min]);
  return [v, set] as const;
}

const optionLabel = (k: LifeStage) => `${LABELS[k]} (${MONTHS[k]} mo target)`;

export function EmergencyFundCalculator() {
  const [expenses, setExpenses] = useClamped(60_000, 15_000, 3_00_000);
  const [stage, setStage] = useState<LifeStage>("married");
  const [current, setCurrent] = useClamped(2_00_000, 0, 50_00_000);
  const [saveMonthly, setSaveMonthly] = useClamped(15_000, 1_000, 2_00_000);
  const [pickerOpen, setPickerOpen] = useState(false);

  const monthsNeeded = MONTHS[stage];
  const target = expenses * monthsNeeded;
  const gap = Math.max(0, target - current);
  const monthsToFill = saveMonthly > 0 ? gap / saveMonthly : Infinity;

  let tone: InsightTone = "good";
  if (gap > target * 0.5) tone = "bad";
  else if (gap > 0) tone = "warn";

  return (
    <View style={calcStyles.stack}>
      <SliderField
        label="Monthly expenses (must-cover)"
        unitType="money"
        value={expenses}
        min={15_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setExpenses}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <View style={styles.selectWrap}>
        <Text style={styles.selectLabel}>Life stage</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Life stage: ${optionLabel(stage)}`}
          style={({ pressed }) => [styles.select, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.selectText} numberOfLines={1}>
            {optionLabel(stage)}
          </Text>
          <AppIcon name="chevronDown" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      <SliderField
        label="Current emergency fund"
        unitType="money"
        value={current}
        min={0}
        max={CALCULATOR_MONEY_MAX}
        step={25_000}
        onChange={setCurrent}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />
      <SliderField
        label="Monthly amount you can add"
        unitType="money"
        value={saveMonthly}
        min={1_000}
        max={CALCULATOR_MONEY_MAX}
        step={1_000}
        onChange={setSaveMonthly}
        format={(v) => formatCurrency(v, "en-IN", "INR")}
      />

      <ResultGrid>
        <ResultStat
          label="Target fund"
          value={formatCurrency(Math.round(target), "en-IN", "INR")}
        />
        <ResultStat
          label="Gap"
          value={formatCurrency(Math.round(gap), "en-IN", "INR")}
        />
        <ResultStat
          label="Months to close gap"
          value={
            monthsToFill === Infinity
              ? "—"
              : `${Math.ceil(monthsToFill)} months`
          }
        />
      </ResultGrid>

      <Insight tone={tone}>
        {gap <= expenses * 0.5
          ? "You are close to a sensible cushion — top up toward the full target."
          : `Aim for ${monthsNeeded} months of expenses (${LABELS[stage]}) in liquid/low-risk funds.`}
      </Insight>

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)}>
        <Text style={styles.sheetTitle}>Life stage</Text>
        {(Object.keys(MONTHS) as LifeStage[]).map((k) => {
          const selected = k === stage;
          return (
            <Pressable
              key={k}
              onPress={() => {
                setStage(k);
                setPickerOpen(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {optionLabel(k)}
              </Text>
              {selected ? (
                <AppIcon name="check" size={18} color={Colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = themedStyles(() => ({
  selectWrap: { gap: 8 },
  selectLabel: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  select: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
  },
  selectText: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  optionSelected: { backgroundColor: Colors.surfaceMuted },
  optionText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  optionTextSelected: { color: Colors.primary, fontWeight: "600" },
}));
