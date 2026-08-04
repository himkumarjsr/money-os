import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from "react-native";
import { Colors, Radius, FontSize, Shadow, Spacing } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
  textStyle,
}: Props) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        variant === "ghost" && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? Colors.textWhite : Colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.textPrimary,
            isSecondary && styles.textSecondary,
            variant === "ghost" && styles.textGhost,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  primary: {
    backgroundColor: Colors.primary,
    ...Shadow.strong,
  },
  secondary: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontSize: FontSize.base,
    fontWeight: "700",
  },
  textPrimary: { color: Colors.textWhite },
  textSecondary: { color: Colors.primary },
  textGhost: { color: Colors.textSecondary },
});
