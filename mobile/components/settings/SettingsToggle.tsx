import { Pressable, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";

/** Pill switch matching the PWA Settings toggle (48×28 track, 22px knob). */
export function SettingsToggle({
  value,
  onToggle,
  disabled = false,
  accessibilityLabel,
}: {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      hitSlop={8}
      style={styles.hit}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: value ? Colors.primary : Colors.border },
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.knob, { left: value ? 23 : 3 }]} />
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  hit: { minHeight: 44, minWidth: 48, justifyContent: "center" },
  track: { width: 48, height: 28, borderRadius: 14 },
  knob: {
    position: "absolute",
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: { opacity: 0.5 },
}));
