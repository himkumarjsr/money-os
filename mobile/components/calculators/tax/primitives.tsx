import { useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EyeIcon } from "@/components/ui/PrivacyEye";
import { AppIcon } from "@/components/ui/AppIcon";
import { CALCULATOR_MONEY_MAX } from "@/lib/calculatorInput";
import { parseMoneyInput } from "@/lib/analyse-form-schema";
import {
  formatIndian,
  formatInWords,
  handleMoneyInput,
} from "@/lib/formatters";
import type { TaxTeachContent } from "@/lib/taxTeachContent";
import { TaxTeachTooltip, useLazySheet } from "../TaxTeachTooltip";
import { themedStyles, Colors } from "@/constants/theme";

/** Small `i` helper chip (PWA FieldTooltip) — opens the helper text in a sheet. */
export function FieldTooltip({
  text,
  label = "More info",
}: {
  text: string;
  label?: string;
}) {
  const { mounted, open, show, hide } = useLazySheet();
  if (!text.trim()) return null;
  return (
    <>
      <Pressable
        onPress={show}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.infoChip}
      >
        <Text style={styles.infoChipText}>i</Text>
      </Pressable>
      {mounted ? (
        <BottomSheet visible={open} onClose={hide}>
          <Text style={styles.infoSheetText}>{text}</Text>
        </BottomSheet>
      ) : null}
    </>
  );
}

function formatMoneyText(n: number, min: number, max: number) {
  const c = Math.min(max, Math.max(min, n));
  return c > 0 ? formatIndian(c) : "";
}

/** ₹ input with teach `?` — native port of the PWA MoneyInput + labelAction. */
export function Mt({
  id,
  label,
  teach,
  helper,
  optional,
  value,
  onChange,
  min = 0,
  max = CALCULATOR_MONEY_MAX,
  disabled,
}: {
  id: string;
  label: string;
  teach: TaxTeachContent;
  helper?: string;
  optional?: boolean;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const maxValue = Math.min(max, CALCULATOR_MONEY_MAX);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatMoneyText(value, min, maxValue));

  useEffect(() => {
    if (focused) return;
    setText(formatMoneyText(value, min, maxValue));
  }, [value, focused, maxValue, min]);

  const parsed = handleMoneyInput(text, min, maxValue);
  const words = parsed !== null && parsed > 0 ? formatInWords(parsed) : "";

  return (
    <View style={styles.mtWrap}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <Text style={styles.label}>
            {label}
            {optional ? (
              <Text style={styles.optional}>{"  "}optional</Text>
            ) : null}
          </Text>
          {helper ? <FieldTooltip text={helper} /> : null}
        </View>
        <View style={{ paddingTop: 2 }}>
          <TaxTeachTooltip content={teach} />
        </View>
      </View>
      <View
        style={[
          styles.box,
          focused && styles.boxFocused,
          disabled && styles.boxDisabled,
        ]}
      >
        <Text style={styles.rupee}>₹</Text>
        <TextInput
          nativeID={id}
          value={text}
          editable={!disabled}
          onChangeText={(raw) => {
            setText(raw);
            onChange(parseMoneyInput(raw) ?? 0);
          }}
          onFocus={() => {
            setFocused(true);
            const p = handleMoneyInput(text, min, maxValue);
            setText(p !== null && p > 0 ? String(p) : "");
          }}
          onBlur={() => {
            setFocused(false);
            const p = handleMoneyInput(text, min, maxValue);
            const next = p !== null && p > 0 ? p : 0;
            setText(next > 0 ? formatIndian(next) : "");
            if (next !== value) onChange(next);
          }}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          autoComplete="off"
          style={styles.input}
          accessibilityLabel={label}
        />
        {text ? (
          <Pressable
            onPress={() => {
              setText("");
              onChange(0);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            disabled={disabled}
          >
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {words ? <Text style={styles.words}>₹{words}</Text> : null}
    </View>
  );
}

/** Plain numeric input — native port of the PWA NumberInput. */
export function TaxNumberInput({
  label,
  value,
  onChange,
  placeholder = "0",
  helper,
  min = 0,
  max,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  helper?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    if (focused) return;
    setDraft(value === 0 ? "" : String(value));
  }, [value, focused]);

  const parseAndClamp = (raw: string): number => {
    if (raw === "" || raw === ".") return 0;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return 0;
    let next = n;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return next;
  };

  return (
    <View style={styles.numWrap}>
      {label ? (
        <View style={styles.numLabelRow}>
          <Text style={styles.label}>{label}</Text>
          {helper ? <FieldTooltip text={helper} /> : null}
        </View>
      ) : null}
      <View style={[styles.numBox, focused && styles.boxFocused]}>
        <TextInput
          value={draft}
          onChangeText={(text) => {
            const raw = text.replace(/,/g, "");
            if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
            setDraft(raw);
            if (raw === "" || raw === "." || raw.endsWith(".")) return;
            onChange(parseAndClamp(raw));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const next = parseAndClamp(draft);
            onChange(next);
            setDraft(next === 0 ? "" : String(next));
          }}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          style={[
            styles.numInput,
            draft
              ? { fontWeight: "600", color: Colors.textPrimary }
              : { fontWeight: "400", color: Colors.textMuted },
          ]}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  style,
  boxed,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  style?: StyleProp<ViewStyle>;
  /** Bordered row (Personal CA checklist). */
  boxed?: boolean;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.checkRow, boxed && styles.checkRowBoxed, style]}
    >
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? (
          <AppIcon name="check" size={12} color={Colors.onPrimary} />
        ) : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active ? styles.chipOn : styles.chipOff]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextOn : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.chipRow, style]}>{children}</View>;
}

export function SectionBlurb({ text }: { text: string }) {
  return (
    <Text style={styles.blurb} numberOfLines={3}>
      {text}
    </Text>
  );
}

/** Collapsible step card — PWA `<details>` with uppercase summary, `?` and chevron. */
export function StepCard({
  title,
  teach,
  blurb,
  defaultOpen = false,
  children,
}: {
  title: string;
  teach: TaxTeachContent;
  blurb: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.stepCard}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.stepSummary}
      >
        <Text style={styles.stepTitle}>{title}</Text>
        <TaxTeachTooltip content={teach} ariaLabel={`About ${title}`} />
        <View
          style={[
            styles.stepChevron,
            open && { transform: [{ rotate: "180deg" }] },
          ]}
        >
          <AppIcon name="chevronDown" size={16} color={Colors.textMuted} />
        </View>
      </Pressable>
      {open ? (
        <>
          <SectionBlurb text={blurb} />
          {children}
        </>
      ) : null}
    </View>
  );
}

/** Generic `<details>` disclosure. */
export function Disclosure({
  summary,
  summaryStyle,
  style,
  children,
}: {
  summary: string;
  summaryStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={style}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.disclosureSummary}
      >
        <Text style={[styles.disclosureText, summaryStyle]}>{summary}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** Privacy-aware amount: hidden by default, eye reveals (PWA PrivateAmount). */
export function PrivateAmount({
  value,
  children,
  label = "amount",
  valueStyle,
  masked = "₹••••••",
}: {
  value: number;
  children: string;
  label?: string;
  valueStyle?: StyleProp<TextStyle>;
  masked?: string;
}) {
  const [visible, setVisible] = useState(false);
  const hasData = Number.isFinite(value) && Math.abs(value) > 0;
  if (!hasData) return <Text style={valueStyle}>{children}</Text>;
  return (
    <View style={styles.privateRow}>
      <Text style={[valueStyle, !visible && { letterSpacing: 1 }]}>
        {visible ? children : masked}
      </Text>
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
        style={styles.eyeBtn}
      >
        <EyeIcon open={visible} size={16} color={Colors.primary} />
      </Pressable>
    </View>
  );
}

export function InfoBox({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.infoBox, style]}>
      <Text style={styles.infoBoxText}>{children}</Text>
    </View>
  );
}

export const tx = themedStyles(() => ({
  xsMuted: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  xs: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  sm: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  smStrong: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  smLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  smDark: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  hint: { fontSize: 12, lineHeight: 17, color: Colors.textMuted },
}));

const styles = themedStyles(() => ({
  infoChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(83,74,183,0.35)",
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    lineHeight: 13,
  },
  infoSheetText: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  mtWrap: { marginBottom: 20, minWidth: 0 },
  labelRow: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  labelLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  optional: { fontSize: 11, fontWeight: "400", color: Colors.textMuted },
  box: {
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
  boxFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  boxDisabled: { opacity: 0.5 },
  rupee: { fontSize: 15, fontWeight: "600", color: Colors.textMuted },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  clear: { fontSize: 12, fontWeight: "500", color: Colors.textMuted },
  words: {
    marginTop: 4,
    paddingLeft: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
  numWrap: { width: "100%", marginBottom: 16 },
  numLabelRow: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  numBox: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
  },
  numInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 18 },
  checkRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkRowBoxed: {
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkBox: {
    width: 18,
    height: 18,
    marginTop: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#9B9A94",
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: Colors.primary },
  chipOff: { backgroundColor: Colors.surfaceMuted },
  chipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipTextOn: { color: Colors.onPrimary },
  blurb: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textMuted,
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
    padding: 16,
  },
  stepSummary: {
    minHeight: 44,
    marginVertical: -8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepTitle: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primary,
  },
  stepChevron: { marginLeft: "auto" },
  disclosureSummary: {
    minHeight: 44,
    marginVertical: -8,
    justifyContent: "center",
  },
  disclosureText: { fontSize: 12, fontWeight: "500", color: Colors.primary },
  privateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  eyeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoBoxText: { fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
}));
