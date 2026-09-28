import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { Colors, FontSize, Spacing } from "@/constants/theme";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
};

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: Props) {
  const display = format ? format(value) : String(value);
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{display}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onValueChange={onChange}
        minimumTrackTintColor={Colors.primary}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
    flex: 1,
    paddingRight: 8,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.primary,
  },
  slider: { width: "100%", height: 36 },
});
