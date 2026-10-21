import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { compareHref, type Scenario } from "@/lib/compareScenarios";

/** "Compare side by side" - opens the Compare calculator prefilled with these inputs. */
export function CompareLink({ scenario }: { scenario: Scenario }) {
  return (
    <Pressable
      onPress={() => router.push(compareHref(scenario) as Href)}
      accessibilityRole="link"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Compare side by side</Text>
        <Text style={styles.sub}>
          Try a different return, tenure or calculator next to this one
        </Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryTintBorder,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
  sub: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  arrow: { fontSize: 16, color: Colors.primaryText },
}));
