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

function Input({ label, helper, error, prefix, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
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
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
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
