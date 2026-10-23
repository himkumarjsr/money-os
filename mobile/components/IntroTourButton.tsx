/** Opens the "Why Finkoin" intro video again - port of web IntroTourButton. */
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Glyph } from "@/components/IntroTourVideo";
import { Colors, themedStyles } from "@/constants/theme";
import { openIntroTour } from "@/lib/introTour";

export function IntroTourButton({
  location,
  label = "Watch the 30-sec tour",
  style,
}: {
  /** Where the button sits, e.g. "home_hero". */
  location: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => openIntroTour(location)}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.play}>
        <Glyph kind="play" size={10} color={Colors.onPrimary} />
      </View>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    minHeight: 40,
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primaryTintBorder,
    backgroundColor: Colors.card,
  },
  play: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  text: { fontSize: 13, fontWeight: "600", color: Colors.primaryText },
}));
