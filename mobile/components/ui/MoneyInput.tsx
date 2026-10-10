import { useMemo, useState } from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";
import {
  Colors,
  Radius,
  FontSize,
  Spacing,
  themedStyles,
} from "@/constants/theme";
import { formatIndian, parseIndianInput } from "@/lib/formatters";

type Props = {
  label?: string;
  /** String mode (Phase 1 form) */
  value?: string | number | null;
  onChange?: (v: string) => void;
  /** Number mode (legacy call sites) */
  onChangeValue?: (n: number | null) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
} & Omit<TextInputProps, "value" | "onChangeText" | "onChange">;

function MoneyInput({
  label,
  value,
  onChange,
  onChangeValue,
  placeholder = "0",
  helper,
  error,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  const display = useMemo(() => {
    if (typeof value === "string") return value;
    if (value == null || !Number.isFinite(value) || value === 0) return "";
    return formatIndian(value);
  }, [value]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.row,
          focused && styles.rowFocused,
          error && styles.rowError,
        ]}
      >
        <Text style={styles.rupee}>₹</Text>
        <TextInput
          style={styles.input}
          value={display}
          onChangeText={(raw) => {
            if (onChange) {
              onChange(raw.replace(/[^\d.,]/g, ""));
              return;
            }
            if (onChangeValue) {
              if (!raw.trim()) {
                onChangeValue(null);
                return;
              }
              onChangeValue(parseIndianInput(raw));
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      </View>
      {helper && !error ? <Text style={styles.helper}>{helper}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wrapper: { gap: 6 },
  label: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  row: {
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
  rowFocused: {
    borderColor: Colors.primary,
  },
  rowError: {
    borderColor: Colors.error,
  },
  rupee: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    height: "100%",
  },
  helper: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: "600",
  },
}));

export { MoneyInput };
export default MoneyInput;
