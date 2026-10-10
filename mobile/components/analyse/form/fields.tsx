import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  get,
  useController,
  useFormContext,
  type FieldPath,
} from "react-hook-form";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  Colors,
  FontSize,
  Radius,
  Spacing,
  themedStyles,
  tintBg,
  tintFg,
  themed,
} from "@/constants/theme";
import { formatIndian, formatInWords } from "@/lib/formatters";
import {
  parseMoneyInput,
  type AnalyseFormValues,
  type PremiumFrequency,
} from "@/lib/analyse-form-schema";
import { useFinancialStore } from "@/store/financialStore";
import {
  clampYearOnBlur,
  moneyTextOnFocus,
  moneyValueOnBlur,
} from "./formState";
import { MONTHS, type NoteTone } from "./shared";

export type FormPath = FieldPath<AnalyseFormValues>;

/** Inline error for any form path, including field-array rows (`unifiedLoans.0.monthlyEMI`). */
export function useFieldError(name?: FormPath): string | undefined {
  const ctx = useFormContext<AnalyseFormValues>();
  const errors = ctx?.formState.errors;
  if (!name || !errors) return undefined;
  const err = get(errors, name) as
    | { message?: string; root?: { message?: string } }
    | undefined;
  return err?.message ?? err?.root?.message;
}

/** setValue + immediate draft write — same `setAnalysis` the autosave subscription uses. */
export function usePersistField() {
  const { setValue, getValues } = useFormContext<AnalyseFormValues>();
  const setAnalysis = useFinancialStore((st) => st.setAnalysis);
  return useCallback(
    (name: FormPath, value: unknown) => {
      setValue(name, value as never, { shouldDirty: true, shouldTouch: true });
      setAnalysis(getValues());
    },
    [getValues, setAnalysis, setValue],
  );
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseMoneyInput(v);
  return n !== undefined && Number.isFinite(n) ? n : 0;
}

/** Keeps Indian digit grouping while typing; allows one `.` and 2 decimals. */
function formatMoneyText(raw: string): string {
  const clean = raw.replace(/[^\d.]/g, "");
  if (!clean) return "";
  const dot = clean.indexOf(".");
  const intRaw = dot === -1 ? clean : clean.slice(0, dot);
  const decRaw =
    dot === -1
      ? undefined
      : clean
          .slice(dot + 1)
          .replace(/\./g, "")
          .slice(0, 2);
  const intPart = intRaw ? formatIndian(Number(intRaw)) : "0";
  return decRaw === undefined ? intPart : `${intPart}.${decRaw}`;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

const NOTE_TONES: Record<NoteTone, { border: string; bg: string; fg: string }> =
  themed(() => ({
    red: {
      border: tintBg("#FECACA"),
      bg: tintBg("#FEF2F2"),
      fg: tintFg("#991B1B"),
    },
    green: {
      border: tintBg("#A7F3D0"),
      bg: tintBg("#ECFDF5"),
      fg: tintFg("#064E3B"),
    },
    blue: {
      border: tintBg("#C9C4F2"),
      bg: tintBg("#EEEDFE"),
      fg: tintFg("#3C3489"),
    },
    yellow: {
      border: tintBg("#FDE68A"),
      bg: tintBg("#FFFBEB"),
      fg: tintFg("#78350F"),
    },
  }));

export function Note({
  tone = "yellow",
  children,
}: {
  tone?: NoteTone;
  children: ReactNode;
}) {
  const t = NOTE_TONES[tone];
  return (
    <View style={[s.note, { borderColor: t.border, backgroundColor: t.bg }]}>
      <Text style={[s.noteText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

/** Small tinted info/warning strip (web `rounded-lg px-3 py-2 text-xs`). */
export function Hint({
  tone,
  children,
}: {
  tone: "info" | "warn";
  children: ReactNode;
}) {
  const info = tone === "info";
  return (
    <View
      style={[
        s.hint,
        { backgroundColor: info ? tintBg("#EEEDFE") : tintBg("#FAEEDA") },
      ]}
    >
      <Text style={[s.hintText, { color: info ? "#3C3489" : "#633806" }]}>
        {children}
      </Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Text style={s.label}>
      {children}
      {required ? <Text style={s.required}> *</Text> : null}
    </Text>
  );
}

export function ErrorText({ message }: { message?: string }) {
  return message ? <Text style={s.error}>{message}</Text> : null;
}

/**
 * RHF-bound money input (same look as `components/ui/MoneyInput`, which can't
 * take focus/blur handlers without losing its focus border).
 * Web convention: focus blanks the text only when the value is 0/empty; blur
 * snaps to 0 only when the text is empty after stripping `,` spaces `₹`.
 * `hideLabel` is only used inside `PremiumField`, which renders the error itself.
 */
export function MoneyField({
  name,
  label,
  helper,
  required,
  optional,
  hideLabel,
  onValueChange,
}: {
  name: FormPath;
  label: string;
  helper?: string;
  required?: boolean;
  optional?: boolean;
  hideLabel?: boolean;
  onValueChange?: (n: number) => void;
}) {
  const { control } = useFormContext<AnalyseFormValues>();
  const { field, fieldState } = useController({ control, name });
  const num = toNumber(field.value);
  const [text, setText] = useState(() => (num ? formatIndian(num) : ""));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if ((parseMoneyInput(text) ?? 0) !== num) {
      setText(num ? formatIndian(num) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [num]);

  const fullLabel = hideLabel
    ? undefined
    : `${label}${required ? " *" : ""}${optional ? " (optional)" : ""}`;
  const error = hideLabel ? undefined : fieldState.error?.message;

  return (
    <View style={s.fieldWrap}>
      {fullLabel ? <Text style={s.moneyLabel}>{fullLabel}</Text> : null}
      <View
        style={[
          s.moneyRow,
          focused && s.inputFocused,
          error ? s.inputError : null,
        ]}
      >
        <Text style={s.moneyRupee}>₹</Text>
        <TextInput
          style={s.moneyInput}
          value={text}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel={label}
          onChangeText={(raw) => {
            const next = formatMoneyText(raw.replace(/[^\d.,]/g, ""));
            setText(next);
            const n = parseMoneyInput(next) ?? 0;
            field.onChange(n);
            onValueChange?.(n);
          }}
          onFocus={() => {
            setFocused(true);
            setText((current) => moneyTextOnFocus(current, field.value));
          }}
          onBlur={() => {
            setFocused(false);
            const { value, empty } = moneyValueOnBlur(text);
            setText(empty ? "" : formatIndian(value));
            if (value !== num) {
              field.onChange(value);
              onValueChange?.(value);
            }
            field.onBlur();
          }}
        />
      </View>
      {helper && !error ? <Text style={s.helper}>{helper}</Text> : null}
      <ErrorText message={error} />
    </View>
  );
}

const inputBase = () =>
  ({
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
  }) as const;

/**
 * Web `AgeNumberInput` + `bindWholeNumberField`: value is `parseMoneyInput(text)`,
 * focus clears 0 → empty (undefined), blur on empty snaps to 0.
 * `blankAsUndefined` (kid ages): blank stays undefined and a typed 0 is kept.
 */
export function AgeField({
  name,
  label,
  helper,
  required,
  placeholder = "0",
  blankAsUndefined = false,
  onCommit,
}: {
  name: FormPath;
  label: string;
  helper?: string;
  required?: boolean;
  placeholder?: string;
  blankAsUndefined?: boolean;
  onCommit?: (value: number | undefined) => void;
}) {
  const { control } = useFormContext<AnalyseFormValues>();
  const { field, fieldState } = useController({ control, name });
  const [focused, setFocused] = useState(false);
  const value = field.value as unknown;
  const display =
    value === undefined || value === null || value === "" ? "" : String(value);

  return (
    <View style={s.fieldWrap}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <TextInput
        style={[
          s.textInput,
          focused && s.inputFocused,
          fieldState.error && s.inputError,
        ]}
        value={display}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        accessibilityLabel={label}
        onChangeText={(raw) => field.onChange(parseMoneyInput(raw))}
        onFocus={() => {
          setFocused(true);
          if (blankAsUndefined) return;
          const num = typeof value === "number" ? value : Number(value);
          if (num === 0 || value === "" || value == null) {
            field.onChange(undefined);
          }
        }}
        onBlur={() => {
          setFocused(false);
          const blank = value === undefined || value === null || value === "";
          if (blank && !blankAsUndefined) field.onChange(0);
          field.onBlur();
          onCommit?.(
            blank
              ? blankAsUndefined
                ? undefined
                : 0
              : typeof value === "number"
                ? value
                : parseMoneyInput(value),
          );
        }}
      />
      {helper ? <Text style={s.helper}>{helper}</Text> : null}
      <ErrorText message={fieldState.error?.message} />
    </View>
  );
}

/**
 * Web `NumberInput`: clamps on every keystroke + blur; 0 renders as empty.
 * `clampOnBlur` (years / ages): typing is never clamped mid-entry — the raw
 * whole number is stored while typing and clamped once on blur.
 */
export function ClampNumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  suffix,
  placeholder = "0",
  helper,
  decimal = true,
  clampOnBlur = false,
  name,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
  helper?: string;
  decimal?: boolean;
  clampOnBlur?: boolean;
  /** Form path whose validation error renders under the input. */
  name?: FormPath;
}) {
  const error = useFieldError(name);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    if (focused) return;
    setDraft(value === 0 ? "" : String(value));
  }, [value, focused]);

  const parseAndClamp = (raw: string): number => {
    if (raw === "" || raw === ".") return 0;
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return 0;
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return next;
  };

  return (
    <View style={s.fieldWrap}>
      <FieldLabel>{label}</FieldLabel>
      <View
        style={[
          s.suffixRow,
          focused && s.inputFocused,
          error ? s.inputError : null,
        ]}
      >
        <TextInput
          style={s.suffixInput}
          value={draft}
          keyboardType={decimal ? "decimal-pad" : "number-pad"}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel={label}
          onChangeText={(text) => {
            const raw = text.replace(/,/g, "");
            if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
            setDraft(raw);
            if (clampOnBlur) {
              const parsed = raw === "" || raw === "." ? 0 : Number(raw);
              onChange(Number.isFinite(parsed) ? Math.round(parsed) : 0);
              return;
            }
            if (raw === "" || raw === "." || raw.endsWith(".")) return;
            onChange(parseAndClamp(raw));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const next = clampOnBlur
              ? clampYearOnBlur(draft, min, max)
              : parseAndClamp(draft);
            onChange(next);
            setDraft(next === 0 ? "" : String(next));
          }}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
      {helper && !error ? <Text style={s.helper}>{helper}</Text> : null}
      <ErrorText message={error} />
    </View>
  );
}

/** Web `TextInput`: always uppercased as typed. */
export function UpperTextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  helper,
  required,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  inputRef?: Ref<TextInput>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <TextInput
        ref={inputRef}
        style={[
          s.textInput,
          focused && s.inputFocused,
          error ? s.inputError : null,
        ]}
        value={value}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        accessibilityLabel={label}
        onChangeText={(t) => onChangeText(t.toUpperCase())}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
      />
      {helper ? <Text style={s.helper}>{helper}</Text> : null}
      <ErrorText message={error} />
    </View>
  );
}

/** RHF-bound uppercase text input. */
export function UpperTextFormField({
  name,
  label,
  placeholder,
  inputRef,
}: {
  name: FormPath;
  label: string;
  placeholder?: string;
  inputRef?: Ref<TextInput>;
}) {
  const { control } = useFormContext<AnalyseFormValues>();
  const { field, fieldState } = useController({ control, name });
  return (
    <UpperTextField
      label={label}
      placeholder={placeholder}
      value={typeof field.value === "string" ? field.value : ""}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
      inputRef={inputRef}
    />
  );
}

/** Yes/No chip pair (web `ToggleButtons` yes/no variant). */
export function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={s.yesNoRow}>
      {[
        { label: "Yes", v: true },
        { label: "No", v: false },
      ].map((o) => {
        const selected = o.v === value;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.v)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[s.yesNoChip, selected && s.yesNoChipOn]}
          >
            <Text style={[s.yesNoText, selected && s.yesNoTextOn]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Question + Yes/No toggle stacked (mobile layout of web's flex row). */
export function YesNoQuestion({
  question,
  sub,
  value,
  onChange,
}: {
  question: string;
  sub?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View>
        <Text style={s.question}>{question}</Text>
        {sub ? <Text style={s.questionSub}>{sub}</Text> : null}
      </View>
      <YesNoToggle value={value} onChange={onChange} />
    </View>
  );
}

export function FrequencyToggle({
  value,
  onChange,
}: {
  value: PremiumFrequency;
  onChange: (v: PremiumFrequency) => void;
}) {
  return (
    <View style={s.segment}>
      {(
        [
          { label: "Monthly", v: "monthly" },
          { label: "Yearly", v: "yearly" },
        ] as const
      ).map((o) => {
        const selected = o.v === value;
        return (
          <Pressable
            key={o.v}
            onPress={() => onChange(o.v)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[s.segmentBtn, selected && s.segmentBtnOn]}
          >
            <Text style={[s.segmentText, selected && s.segmentTextOn]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PremiumField({
  label,
  amountError,
  frequency,
  onFrequencyChange,
  children,
}: {
  label: string;
  amountError?: string;
  frequency: PremiumFrequency;
  onFrequencyChange: (v: PremiumFrequency) => void;
  children: ReactNode;
}) {
  return (
    <View style={s.premiumBox}>
      <Text style={s.question}>{label}</Text>
      <FrequencyToggle value={frequency} onChange={onFrequencyChange} />
      {children}
      {amountError ? <ErrorText message={amountError} /> : null}
    </View>
  );
}

/** Two-column selectable cards (web `RadioCards`). */
export function RadioCards({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.radioGrid}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[s.radioCard, selected && s.radioCardOn]}
          >
            <Text style={[s.radioText, selected && s.radioTextOn]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Full-width choice cards (web life-stage / goal / city buttons). */
export function ChoiceCards({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[s.choiceCard, selected && s.choiceCardOn]}
          >
            <View style={[s.choiceDot, selected && s.choiceDotOn]} />
            <Text style={s.choiceText}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

/** Native-feeling replacement for web `<select>`: opens a bottom sheet list. */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  allowEmpty = false,
  helper,
  style,
  name,
}: {
  label?: string;
  value: T | undefined;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (v: T | undefined) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  helper?: string;
  style?: StyleProp<ViewStyle>;
  /** Form path whose validation error renders under the select. */
  name?: FormPath;
}) {
  const error = useFieldError(name);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={[s.fieldWrap, style]}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={[s.selectBtn, error ? s.inputError : null]}
      >
        <Text
          style={[s.selectText, !current && { color: Colors.textMuted }]}
          numberOfLines={1}
        >
          {current?.label ?? placeholder}
        </Text>
        <Text style={s.selectChevron}>▾</Text>
      </Pressable>
      {helper ? <Text style={s.helper}>{helper}</Text> : null}
      <ErrorText message={error} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} scroll>
        {label ? <Text style={s.sheetTitle}>{label}</Text> : null}
        {allowEmpty ? (
          <Pressable
            onPress={() => {
              onChange(undefined);
              setOpen(false);
            }}
            style={[s.option, current == null && s.optionOn]}
          >
            <Text style={[s.optionText, { color: Colors.textMuted }]}>
              {placeholder}
            </Text>
          </Pressable>
        ) : null}
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[s.option, selected && s.optionOn]}
            >
              <Text style={[s.optionText, selected && s.optionTextOn]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: i + 1, label: m }));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));

/** Month + day selects; without `onMonth` only the day renders (no field to store a month). */
export function MonthDaySelects({
  month,
  day,
  onMonth,
  onDay,
  hint,
  label,
  monthName,
  dayName,
}: {
  month?: number;
  day?: number;
  onMonth?: (m: number | undefined) => void;
  onDay: (d: number | undefined) => void;
  hint?: string;
  label: string;
  monthName?: FormPath;
  dayName?: FormPath;
}) {
  return (
    <View style={s.fieldWrap}>
      <FieldLabel>{label}</FieldLabel>
      {hint ? <Text style={s.helper}>{hint}</Text> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {onMonth ? (
          <SelectField
            value={month || undefined}
            options={MONTH_OPTIONS}
            onChange={onMonth}
            placeholder="Month"
            allowEmpty
            style={{ flex: 1 }}
            name={monthName}
          />
        ) : null}
        <SelectField
          value={day || undefined}
          options={DAY_OPTIONS}
          onChange={onDay}
          placeholder="Day"
          allowEmpty
          style={onMonth ? { width: 110 } : { width: 140 }}
          name={dayName}
        />
      </View>
    </View>
  );
}

/** Recurring debit date: month + day (no year), or day only when there's no month field. */
export function DayOfMonthPicker({
  value,
  onChange,
  month,
  onMonth,
  label,
  hint,
  monthName,
  dayName,
}: {
  value?: number;
  onChange: (day: number | undefined) => void;
  month?: number;
  onMonth?: (m: number | undefined) => void;
  label: string;
  hint?: string;
  monthName?: FormPath;
  dayName?: FormPath;
}) {
  return (
    <MonthDaySelects
      label={label}
      hint={hint}
      month={month}
      day={value}
      onMonth={onMonth}
      onDay={onChange}
      monthName={monthName}
      dayName={dayName}
    />
  );
}

/** Premium due date: same month/day selects; label depends on frequency. */
export function PremiumDueFields({
  frequency,
  month,
  day,
  onMonth,
  onDay,
  monthlyLabel = "Which date is the premium debited? (optional)",
  yearlyLabel = "When is your premium due each year? (optional)",
  hint = "We'll remind you before the due date so you can keep the amount ready",
  monthName,
  dayName,
}: {
  frequency?: PremiumFrequency;
  month?: number;
  day?: number;
  onMonth: (m: number | undefined) => void;
  onDay: (d: number | undefined) => void;
  monthlyLabel?: string;
  yearlyLabel?: string;
  hint?: string;
  monthName?: FormPath;
  dayName?: FormPath;
}) {
  return (
    <MonthDaySelects
      label={frequency === "yearly" ? yearlyLabel : monthlyLabel}
      hint={hint}
      month={month}
      day={day}
      onMonth={onMonth}
      onDay={onDay}
      monthName={monthName}
      dayName={dayName}
    />
  );
}

export function YearSelect({
  label,
  value,
  onChange,
  helper,
  minYear,
  maxYear,
  placeholder = "Select year",
  name,
}: {
  label: string;
  value?: number;
  onChange: (year: number) => void;
  helper?: string;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
  name?: FormPath;
}) {
  const now = new Date().getFullYear();
  const min = minYear ?? now;
  const max = maxYear ?? now + 40;
  const years: SelectOption<number>[] = [];
  for (let y = min; y <= max; y += 1)
    years.push({ value: y, label: String(y) });
  return (
    <SelectField
      label={label}
      helper={helper}
      value={value && value >= min && value <= max ? value : undefined}
      options={years}
      onChange={(y) => onChange(y ?? 0)}
      placeholder={placeholder}
      allowEmpty
      name={name}
    />
  );
}

export function TotalPanel({
  label,
  amount,
  wordsAmount,
  tone = "purple",
  bg,
}: {
  label: string;
  amount: number;
  wordsAmount?: number;
  tone?: "purple" | "neutral";
  bg?: string;
}) {
  const purple = tone === "purple";
  return (
    <View
      style={[
        s.totalPanel,
        {
          backgroundColor:
            bg ?? (purple ? tintBg("#EEEDFE") : tintBg("#ECFDF5")),
        },
      ]}
    >
      <Text style={[s.totalLabel, { color: purple ? "#3C3489" : "#334155" }]}>
        {label}
      </Text>
      <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
        <Text
          style={[s.totalAmount, { color: purple ? "#534AB7" : "#0F172A" }]}
        >
          ₹{formatIndian(amount)}
        </Text>
        <Text style={[s.totalWords, { color: purple ? "#7F77DD" : "#64748B" }]}>
          {formatInWords(wordsAmount ?? amount)}
        </Text>
      </View>
    </View>
  );
}

export function DashedButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[s.dashedBtn, disabled && { opacity: 0.5 }]}
    >
      <Text style={s.dashedText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[s.secondaryBtn, disabled && { opacity: 0.5 }]}
    >
      <Text style={s.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function RemoveX({
  onPress,
  label = "Remove",
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={s.removeX}
    >
      <Text style={s.removeXText}>×</Text>
    </Pressable>
  );
}

export const formStyles = themedStyles(() => ({
  stepWrap: { gap: 24 },
  group: { gap: 16 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  body: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  small: { fontSize: 12, lineHeight: 17, color: Colors.textMuted },
  muted13: { fontSize: 13, lineHeight: 18, color: Colors.textMuted },
}));

const s = themedStyles(() => ({
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.primary,
  },
  note: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noteText: { fontSize: 14, lineHeight: 20 },
  hint: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  hintText: { fontSize: 12, lineHeight: 17 },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    backgroundColor: Colors.card,
  },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  required: { color: Colors.error },
  error: { fontSize: 12, color: Colors.error, fontWeight: "600" },
  helper: { fontSize: 12, lineHeight: 17, color: Colors.textMuted },
  textInput: {
    ...inputBase(),
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputFocused: { borderColor: Colors.primary },
  inputError: { borderColor: Colors.error },
  moneyLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    gap: 6,
  },
  moneyRupee: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  moneyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    height: "100%",
  },
  suffixRow: {
    ...inputBase(),
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suffixInput: {
    flex: 1,
    height: "100%",
    fontSize: 17,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  suffix: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  question: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  questionSub: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  yesNoRow: { flexDirection: "row", gap: 8 },
  yesNoChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  yesNoChipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  yesNoText: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  yesNoTextOn: { color: Colors.primaryDark },
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnOn: {
    backgroundColor: Colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 14, fontWeight: "500", color: Colors.textMuted },
  segmentTextOn: { fontWeight: "700", color: Colors.primary },
  premiumBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  radioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radioCard: {
    width: "48%",
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  radioCardOn: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(83,74,183,0.1)",
  },
  radioText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  radioTextOn: { color: Colors.textPrimary },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  choiceCardOn: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(83,74,183,0.1)",
  },
  choiceDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  choiceDotOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  choiceText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  selectBtn: {
    ...inputBase(),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  selectChevron: { marginLeft: 8, fontSize: 14, color: Colors.textMuted },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  optionOn: { backgroundColor: Colors.primaryLight },
  optionText: { fontSize: 16, color: Colors.textPrimary },
  optionTextOn: { fontWeight: "700", color: Colors.primaryDark },
  totalPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: "500", flexShrink: 1 },
  totalAmount: { fontSize: 18, fontWeight: "700" },
  totalWords: { fontSize: 11, textAlign: "right" },
  dashedBtn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dashedText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  removeX: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  removeXText: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 26,
    color: Colors.textPrimary,
  },
}));
