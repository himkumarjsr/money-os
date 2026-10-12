import { Pressable, Text, type ViewStyle } from "react-native";
import {
  Colors,
  Radius,
  FontSize,
  Spacing,
  themedStyles,
} from "@/constants/theme";

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

const styles = themedStyles(() => ({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.round,
    // Web ChipSelector: rounded-full border px-3 py-2 text-sm
    borderWidth: 1,
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
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  textOn: {
    color: Colors.primaryText,
  },
}));
