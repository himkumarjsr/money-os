import { Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { CoinSpinner } from "@/components/ui/LoadingSpinner";

/** Inline loader with the web's "Updating…" label (BrandPageLoader inline). */
export function UpdatingLoader() {
  return (
    <View style={styles.wrap}>
      <CoinSpinner size={28} />
      <Text style={styles.label}>Updating…</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  label: { fontSize: 13, color: Colors.textSecondary },
}));
