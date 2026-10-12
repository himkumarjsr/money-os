import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Colors, Radius, FontSize, themedStyles } from "@/constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
};

function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  textStyle,
  fullWidth = true,
}: Props) {
  const bg = {
    primary: Colors.primary,
    // Web secondary: bg-surface with a border and the body text colour.
    secondary: Colors.card,
    danger: Colors.dangerSolid,
    ghost: "transparent",
  }[variant];

  const textColor = {
    primary: Colors.onPrimary,
    secondary: Colors.textPrimary,
    danger: Colors.textWhite,
    ghost: Colors.primaryText,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        { backgroundColor: bg },
        variant === "secondary" && styles.secondaryBorder,
        fullWidth && styles.full,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = themedStyles(() => ({
  base: {
    // Web Button lg: min-h-12, rounded-xl.
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  full: { width: "100%" },
  secondaryBorder: { borderWidth: 1, borderColor: Colors.border },
  disabled: { opacity: 0.5 },
  text: {
    fontSize: FontSize.base,
    fontWeight: "700",
  },
}));

export { Button };
export default Button;
