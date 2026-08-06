import { useEffect } from "react";
import { router } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

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

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
