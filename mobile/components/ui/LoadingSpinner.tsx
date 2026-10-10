import { View, ActivityIndicator } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";

export function LoadingSpinner({ full }: { full?: boolean }) {
  return (
    <View style={[styles.wrap, full && styles.full]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { alignItems: "center", justifyContent: "center", padding: 24 },
  full: { flex: 1, backgroundColor: Colors.background },
}));
