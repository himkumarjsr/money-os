import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Radius, FontSize } from "@/constants/theme";

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
};

export default function SegmentControl({ options, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.option, value === opt.value && styles.optionActive]}
        >
          <Text style={[styles.text, value === opt.value && styles.textActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export { SegmentControl };

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  option: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
  },
  optionActive: {
    backgroundColor: Colors.primary,
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  textActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
