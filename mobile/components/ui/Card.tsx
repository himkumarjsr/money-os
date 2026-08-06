import { View, StyleSheet, type ViewProps, type ViewStyle } from "react-native";
import { Colors, Radius, Spacing, Shadow } from "@/constants/theme";

type Props = ViewProps & {
  style?: ViewStyle;
  elevated?: boolean;
};

export function Card({ children, style, elevated = true, ...rest }: Props) {
  return (
    <View style={[styles.card, elevated && Shadow.card, style]} {...rest}>
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
});
