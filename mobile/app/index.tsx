import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/theme";

export default function Index() {
  const { hasInitialized, isLoggedIn, isLoading } = useAuthStore();

  useEffect(() => {
    if (!hasInitialized) return;
    if (isLoggedIn) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/(auth)/login");
    }
  }, [hasInitialized, isLoggedIn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
