import { View, type ViewStyle, type ViewProps } from "react-native";
import { Colors, Radius, Shadow, Spacing, themedStyles } from "@/constants/theme";

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

const styles = themedStyles(() => ({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  // Web cards: shadow-sm
  elevated: { ...Shadow.card },
}));

export { Card };
export default Card;
