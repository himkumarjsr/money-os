import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import Button from "@/components/ui/Button";

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.center}>
        <Text style={styles.text}>Group detail coming in V2</Text>
        <Text style={styles.id}>{groupId}</Text>
        <Button
          label="Back to groups"
          onPress={() => router.back()}
          variant="secondary"
          style={{ marginTop: 24, maxWidth: 240 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  text: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  id: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
