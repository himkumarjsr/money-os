/** Global toast — port of web components/ui/Toast.tsx (gamification toastMessage). */
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, themedStyles } from "@/constants/theme";
import { useChromeStore } from "@/store/chromeStore";

export function Toast() {
  const insets = useSafeAreaInsets();
  const message = useChromeStore((s) => s.toastMessage);
  const clear = useChromeStore((s) => s.clearToast);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clear, 3000);
    return () => clearTimeout(t);
  }, [message, clear]);

  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { bottom: 100 + insets.bottom }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "flex-end", zIndex: 100 },
  pill: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  text: { color: Colors.onPrimary, fontSize: 14, fontWeight: "600" },
}));
