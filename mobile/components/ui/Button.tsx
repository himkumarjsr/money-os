import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Colors, Radius, FontSize } from "@/constants/theme";

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
    secondary: Colors.primaryLight,
    danger: Colors.error,
    ghost: "transparent",
  }[variant];

  const textColor = {
    primary: "#fff",
    secondary: Colors.primary,
    danger: "#fff",
    ghost: Colors.primary,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        { backgroundColor: bg },
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

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  full: { width: "100%" },
  disabled: { opacity: 0.5 },
  text: {
    fontSize: FontSize.base,
    fontWeight: "700",
  },
});

export { Button };
export default Button;
