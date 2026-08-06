import { Pressable, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors, Radius, FontSize, Spacing } from "@/constants/theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function Chip({ label, selected, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn, style]}
    >
      <Text style={[styles.text, selected && styles.textOn]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chipOn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  textOn: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
