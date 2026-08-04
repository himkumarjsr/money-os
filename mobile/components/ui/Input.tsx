import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { Colors, Radius, FontSize, Spacing } from "@/constants/theme";

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.group}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  label: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  input: {
    height: 52,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  error: {
    fontSize: FontSize.sm,
    color: Colors.error,
  },
});
