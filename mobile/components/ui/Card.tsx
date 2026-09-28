import { View, StyleSheet, type ViewStyle, type ViewProps } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";

type Props = ViewProps & {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
};

function Card({ children, style, padding, elevated = true, ...rest }: Props) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        padding !== undefined ? { padding } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});

export { Card };
export default Card;
