import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Slider from "@react-native-community/slider";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import {
  Colors,
  themed,
  themedStyles,
  tintBg,
  tintFg,
} from "@/constants/theme";
import { DateField as CalendarDateField } from "@/components/tracker/DateField";
import {
  CALCULATOR_MONEY_MAX,
  clampCalculatorValue,
  formatCalculatorFieldValue,
} from "@/lib/calculatorInput";
import {
  formatIndian,
  formatInWords,
  formatSliderLabel,
  parseIndianInput,
} from "@/lib/formatters";

export { CALCULATOR_MONEY_MAX };

type UnitType = "money" | "percent" | "years" | "months" | "number";

function formatFieldValue(value: number, type: UnitType, step: number) {
  return formatCalculatorFieldValue(value, type, step, formatIndian);
}

export function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type InsightTone = "good" | "warn" | "bad";

const INSIGHT_TONES: Record<
  InsightTone,
  { border: string; bg: string; text: string }
> = themed(() => ({
  good: {
    border: tintBg("#A7F3D0"),
    bg: tintBg("#ECFDF5"),
    text: tintFg("#064E3B"),
  },
  warn: {
    border: tintBg("#FDE68A"),
    bg: tintBg("#FFFBEB"),
    text: tintFg("#78350F"),
  },
  bad: {
    border: tintBg("#FECACA"),
    bg: tintBg("#FEF2F2"),
    text: tintFg("#7F1D1D"),
  },
}));

/** Coloured verdict box (spacing comes from the parent stack). Use `<B>` for bold spans. */
export function Insight({
  tone,
  children,
  style,
}: {
  tone: InsightTone;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = INSIGHT_TONES[tone];
  return (
    <View
      style={[
        styles.insight,
        { borderColor: t.border, backgroundColor: t.bg },
        style,
      ]}
    >
      <Text style={[styles.insightText, { color: t.text }]}>{children}</Text>
    </View>
  );
}

/** Bold span inside `Insight` / body text. */
export function B({ children }: { children: ReactNode }) {
  return <Text style={{ fontWeight: "800" }}>{children}</Text>;
}

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  format?: (v: number) => string;
  unitType?: UnitType;
};

/** Typed value box + slider + amount-in-words — native port of the PWA SliderField. */
export function SliderField({
  label,
  value,
  min,
  max,
  step: stepProp,
  onChange,
  suffix,
  unitType,
}: SliderFieldProps) {
  const detectedType: UnitType =
    unitType ??
    (/interest|rate|return|%/i.test(label)
      ? "percent"
      : /tenure|period|year|age/i.test(label)
        ? "years"
        : /month|months/i.test(label)
          ? "months"
          : "money");

  const isMoney = detectedType === "money";
  const isPercent = detectedType === "percent";
  const step = stepProp ?? (isPercent ? 0.1 : 1);
  const inputMax = isMoney ? Math.min(max, CALCULATOR_MONEY_MAX) : max;
  const sliderMax = Math.min(Math.max(max, min), inputMax);

  const leftUnit = isMoney ? "₹" : "";
  const rightUnit =
    detectedType === "percent"
      ? "%"
      : detectedType === "years"
        ? "yrs"
        : detectedType === "months"
          ? "mo"
          : detectedType === "number"
            ? ""
            : (suffix ?? "");

  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(() =>
    formatFieldValue(
      Math.min(Math.max(value, min), inputMax),
      detectedType,
      step,
    ),
  );

  useEffect(() => {
    if (focused) return;
    setDisplayValue(
      formatFieldValue(
        Math.min(Math.max(value, min), inputMax),
        detectedType,
        step,
      ),
    );
  }, [detectedType, focused, inputMax, min, step, value]);

  const commitFromSlider = (raw: number) => {
    onChange(clampCalculatorValue(raw, min, inputMax, step, { snap: true }));
  };

  const handleChangeText = (raw: string) => {
    if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw.replace(/,/g, ""))) return;
    setDisplayValue(raw);
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "-" || trimmed.endsWith(".")) return;
    const parsed = parseIndianInput(trimmed);
    if (parsed === null) return;
    const clamped = clampCalculatorValue(parsed, min, inputMax, step, {
      snap: false,
    });
    if (clamped !== value) onChange(clamped);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseIndianInput(displayValue);
    if (parsed === null) {
      setDisplayValue(formatFieldValue(value, detectedType, step));
      return;
    }
    const clamped = clampCalculatorValue(parsed, min, inputMax, step, {
      snap: false,
    });
    onChange(clamped);
    setDisplayValue(formatFieldValue(clamped, detectedType, step));
  };

  const words = useMemo(
    () => formatSliderLabel(Math.max(0, value), detectedType, step),
    [detectedType, step, value],
  );

  const sliderValue = Math.min(Math.max(value, min), sliderMax);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        {leftUnit ? <Text style={styles.leftUnit}>{leftUnit}</Text> : null}
        <TextInput
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={() => {
            setFocused(true);
            setDisplayValue(Number.isFinite(value) ? String(value) : "");
          }}
          onBlur={handleBlur}
          selectTextOnFocus
          keyboardType={
            isPercent || detectedType === "number"
              ? "decimal-pad"
              : "number-pad"
          }
          style={styles.input}
          accessibilityLabel={label}
        />
        {rightUnit ? (
          <Text
            style={[
              styles.rightUnit,
              isPercent && { color: Colors.primary, fontWeight: "600" },
            ]}
          >
            {rightUnit}
          </Text>
        ) : null}
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={sliderMax}
        step={step}
        value={sliderValue}
        onValueChange={commitFromSlider}
        minimumTrackTintColor={Colors.primary}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.primary}
        accessibilityLabel={`${label} slider`}
      />
      <Text style={styles.words}>{words}</Text>
    </View>
  );
}

const FAR_FUTURE = "2100-12-31";

/** Calendar date picker (future dates allowed, e.g. loan start). */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <CalendarDateField
        label={label}
        value={value}
        onChange={onChange}
        max={FAR_FUTURE}
      />
    </View>
  );
}

/** Label + value card; ₹ values get Indian grouping and amount in words. */
export function ResultStat({ label, value }: { label: string; value: string }) {
  let display = value;
  let words = "";
  if (value.startsWith("₹")) {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(numeric)) {
      const isMonthly = /monthly|\/month|emi/i.test(label);
      const rounded = isMonthly ? numeric : Math.round(numeric);
      const formatted = isMonthly
        ? rounded.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : formatIndian(rounded);
      display = `₹${formatted}`;
      words = formatInWords(Math.floor(rounded));
    }
  }

  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{display}</Text>
      {words ? <Text style={styles.statWords}>{words}</Text> : null}
    </View>
  );
}

/** Vertical stack of ResultStat cards (PWA grid collapses to one column on phones). */
export function ResultGrid({ children }: { children: ReactNode }) {
  return <View style={styles.resultGrid}>{children}</View>;
}

export function ChartCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={{ marginTop: 16 }}>{children}</View>
      {footer}
    </View>
  );
}

/** Full-width Excel download row — matches the PWA phone layout. */
export function ExcelDownloadButton({
  onPress,
  subtitle = "Full amortisation in Excel",
}: {
  onPress: () => Promise<{ error?: string }>;
  subtitle?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <View>
      <Pressable
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          setError("");
          const res = await onPress();
          setBusy(false);
          if (res.error) setError(res.error);
        }}
        accessibilityRole="button"
        accessibilityLabel="Download Excel"
        style={({ pressed }) => [styles.excelRow, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.excelLeft}>
          <Svg width={32} height={32}>
            <Rect width={32} height={32} rx={6} fill="#1D6F42" />
            <SvgText
              x={16}
              y={22}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize={14}
              fontWeight="800"
            >
              X
            </SvgText>
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={styles.excelTitle}>Download schedule</Text>
            <Text style={styles.excelSub}>{subtitle}</Text>
          </View>
        </View>
        {busy ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.excelArrow}>→</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.excelError}>{error}</Text> : null}
    </View>
  );
}

/** Small uppercase section label used between calculator blocks. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export const calcStyles = themedStyles(() => ({
  stack: { gap: 24 },
  body: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  muted: { fontSize: 12, lineHeight: 17, color: Colors.textMuted },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
    padding: 16,
  },
}));

const styles = themedStyles(() => ({
  insight: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  insightText: { fontSize: 14, fontWeight: "500", lineHeight: 21 },
  field: { marginBottom: 16, gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  inputBox: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
  },
  inputBoxFocused: { borderColor: Colors.primary },
  leftUnit: { fontSize: 15, fontWeight: "600", color: Colors.textMuted },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  rightUnit: { fontSize: 13, fontWeight: "500", color: Colors.textMuted },
  slider: { width: "100%", height: 36 },
  words: { textAlign: "right", fontSize: 12, color: Colors.textMuted },
  stat: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.glassCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  statValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  statWords: { marginTop: 4, fontSize: 12, color: Colors.textMuted },
  resultGrid: { gap: 12 },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
    padding: 20,
  },
  chartTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  excelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  excelLeft: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  excelTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  excelSub: { marginTop: 2, fontSize: 12, color: Colors.textMuted },
  excelArrow: { fontSize: 16, color: Colors.textMuted },
  excelError: { marginTop: 8, fontSize: 12, color: Colors.error },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
}));
