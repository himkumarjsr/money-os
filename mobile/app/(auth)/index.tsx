import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";

/** Auth group root → public landing (PWA `/`). Forms live at login/signup. */
export default function AuthIndexRedirect() {
  useEffect(() => {
    router.replace("/(tabs)");
  }, []);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
}));
