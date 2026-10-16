import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import {
  formatIndian,
  formatInWords,
  parseIndianInput,
} from "@/lib/formatters";
import { calcStyles } from "../calculator-ui";

export {
  B,
  DateField,
  Insight,
  ResultStat,
  SliderField,
  calcStyles,
  todayInputValue,
} from "../calculator-ui";
export type { InsightTone } from "../calculator-ui";

/** Number state for a calculator field. */
export function useNum(initial: number) {
  const [v, setV] = useState(initial);
  const set = useCallback((n: number) => setV(Number.isFinite(n) ? n : 0), []);
  return [v, set] as const;
}

/** ₹ with Indian grouping, no paise. */
export function inr(n: number) {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n);
  return `${r < 0 ? "−" : ""}₹${formatIndian(Math.abs(r))}`;
}

export function pct(n: number | null, digits = 2) {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function duration(months: number) {
  if (!Number.isFinite(months)) return "Never";
  const m = Math.max(0, Math.round(months));
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return `${rem} mo`;
  return rem === 0
    ? `${y} yr${y === 1 ? "" : "s"}`
    : `${y} yr${y === 1 ? "" : "s"} ${rem} mo`;
}

/** Calculator body: vertical stack with the standard gap. */
export function Stack({ children }: { children: ReactNode }) {
  return <View style={calcStyles.stack}>{children}</View>;
}

/** Inputs group — one column on phones (mirrors the PWA's two-column grid). */
export function Inputs({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export type Option<T extends string> = { value: T; label: string };

/** Pill toggle for 2–5 choices with large tap targets; wraps on narrow screens. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.field} accessibilityRole="radiogroup">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pills}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${label}: ${o.label}`}
              style={({ pressed }) => [
                styles.pill,
                active && styles.pillOn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.pillText, active && styles.pillTextOn]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function YesNo({
  label,
  value,
  onChange,
  yes = "Yes",
  no = "No",
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  yes?: string;
  no?: string;
}) {
  return (
    <Segmented
      label={label}
      value={value ? "y" : "n"}
      options={[
        { value: "y", label: yes },
        { value: "n", label: no },
      ]}
      onChange={(v) => onChange(v === "y")}
    />
  );
}

export function SlabField({
  value,
  onChange,
  label = "Your income tax slab",
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <Segmented
      label={label}
      value={String(value)}
      options={["0", "5", "10", "20", "30"].map((v) => ({
        value: v,
        label: `${v}%`,
      }))}
      onChange={(v) => onChange(Number(v))}
    />
  );
}

/** Compact ₹ field without a slider. Accepts shorthand like 5L, 2.5cr, 40k. */
export function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value ? formatIndian(value) : "");
  useEffect(() => {
    if (!focused) setText(value ? formatIndian(value) : "");
  }, [focused, value]);

  const commit = (raw: string) => {
    const parsed = parseIndianInput(raw);
    onChange(Math.round(parsed === null ? 0 : Math.abs(parsed)));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        <Text style={styles.unit}>₹</Text>
        <TextInput
          value={text}
          placeholder={hint ?? "0"}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => {
            setFocused(true);
            setText(value ? String(value) : "");
          }}
          onChangeText={(t) => {
            setText(t);
            commit(t);
          }}
          onBlur={() => {
            setFocused(false);
            commit(text);
          }}
          selectTextOnFocus
          keyboardType="decimal-pad"
          style={styles.input}
          accessibilityLabel={label}
        />
      </View>
      {value ? <Text style={styles.words}>₹{formatInWords(value)}</Text> : null}
    </View>
  );
}

/** Plain text field (e.g. a debt's name). */
export function TextField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      accessibilityLabel={label}
      style={[styles.inputBox, styles.input, { paddingHorizontal: 12 }]}
    />
  );
}

/** The one number the calculator exists to answer. */
export function Hero({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: ReactNode;
}) {
  const isNum = typeof value === "number";
  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroValue}>{isNum ? inr(value) : value}</Text>
      {isNum && Math.abs(value) >= 1 ? (
        <Text style={styles.heroWords}>
          ₹{formatInWords(Math.round(Math.abs(value)))}
        </Text>
      ) : null}
      {sub ? <Text style={styles.heroSub}>{sub}</Text> : null}
    </View>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <View style={{ gap: 12 }}>{children}</View>;
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.words}>{sub}</Text> : null}
    </View>
  );
}

export function Rows({
  title,
  rows,
}: {
  title?: string;
  rows: Array<{ label: string; value: string; strong?: boolean }>;
}) {
  return (
    <View style={calcStyles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {rows.map((r, i) => (
        <View key={i} style={[styles.row, i > 0 && styles.rowDivider]}>
          <Text style={[styles.rowLabel, r.strong && styles.strong]}>
            {r.label}
          </Text>
          <Text style={[styles.rowValue, r.strong && styles.strong]}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Horizontal bars comparing a few amounts. */
export function Bars({
  title,
  items,
  format = inr,
}: {
  title?: string;
  items: Array<{ label: string; value: number; highlight?: boolean }>;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <View style={calcStyles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      <View style={{ gap: 12 }}>
        {items.map((i) => (
          <View key={i.label}>
            <View style={styles.barHead}>
              <Text style={[styles.rowLabel, i.highlight && styles.strong]}>
                {i.label}
              </Text>
              <Text style={[styles.rowValue, styles.strong]}>
                {format(i.value)}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  !i.highlight && { opacity: 0.4 },
                  {
                    width: `${Math.max(2, (Math.abs(i.value) / max) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={calcStyles.muted}>{children}</Text>;
}

/** Dashed full-width "+ Add" button for list editors. */
export function AddButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={{ paddingHorizontal: 8, paddingVertical: 8 }}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  section: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  field: { marginBottom: 16, gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
  },
  pillOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  pillTextOn: { color: Colors.onPrimary },
  inputBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
  },
  inputBoxFocused: { borderColor: Colors.primary },
  unit: { fontSize: 15, fontWeight: "600", color: Colors.textMuted },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  words: { fontSize: 12, color: Colors.textMuted },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primaryTintBorder,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.primaryText,
  },
  heroValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  heroWords: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
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
  cardTitle: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 16,
    paddingVertical: 8,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  rowLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  strong: { fontWeight: "700", color: Colors.textPrimary },
  barHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: Colors.surfaceMuted,
  },
  fill: { height: "100%", borderRadius: 5, backgroundColor: Colors.primary },
  add: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.primaryTintBorder,
  },
  addText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
  link: { fontSize: 12, fontWeight: "600", color: Colors.primaryText },
}));
