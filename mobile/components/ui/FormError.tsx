import { View, Text, StyleSheet } from "react-native";
import { FontSize, Radius, Spacing } from "@/constants/theme";

/** Inline form error box (#FCEBEB / #791F1F, as in the PWA). */
function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#FCEBEB",
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  text: { color: "#791F1F", fontSize: FontSize.md, fontWeight: "600" },
});

export { FormError };
export default FormError;
