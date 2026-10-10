/**
 * Shared privacy eye icons — match PWA tracker (open = amounts visible).
 */
import Svg, { Circle, Path } from "react-native-svg";
import { Pressable, type ViewStyle } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";

export function EyeIcon({
  open,
  size = 16,
  color = Colors.primary,
}: {
  open: boolean;
  size?: number;
  color?: string;
}) {
  if (open) {
    // Eye open — amounts visible
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      </Svg>
    );
  }
  // Eye off — amounts hidden
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Section privacy control — 32×32, border #E8E6F0, bg #F9F9FC */
export function SectionPrivacyEye({
  visible,
  onToggle,
  light,
  style,
}: {
  visible: boolean;
  onToggle: () => void;
  /** White glass button for purple summary card */
  light?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide amounts" : "Show amounts"}
      style={[styles.btn, light ? styles.btnLight : styles.btnSection, style]}
    >
      <EyeIcon
        open={visible}
        size={light ? 18 : 16}
        color={light ? "#FFFFFF" : Colors.primary}
      />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLight: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  btnSection: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
}));
