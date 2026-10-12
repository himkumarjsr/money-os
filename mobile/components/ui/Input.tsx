import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  Colors,
  Radius,
  FontSize,
  Spacing,
  themedStyles,
} from "@/constants/theme";

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  prefix?: string;
  style?: StyleProp<TextStyle>;
};

function Input({
  label,
  helper,
  error,
  prefix,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
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
    // Web label: text-sm font-medium text-[#5F5E5A]
    fontSize: FontSize.sm,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    // Web: h-12 rounded-xl border border-[#E8E6F0] px-4, focus:border-primary-text
    height: 48,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    paddingHorizontal: Spacing.lg,
  },
  inputFocused: {
    borderColor: Colors.primaryText,
  },
  inputError: {
    borderColor: Colors.error,
  },
  prefix: {
    fontSize: FontSize.base,
    fontWeight: "600",
    color: Colors.textMuted,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
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

export { Input };
export default Input;
