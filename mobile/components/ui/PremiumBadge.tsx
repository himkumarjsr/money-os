/**
 * Small gold "Premium" pill marking a Premium (Finkoin) member, used next to
 * names. Painted with the 24K mirror gold in every theme.
 */
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { themedStyles } from "@/constants/theme";
import { GOLD_MIRROR_STOPS } from "@/components/ui/GoldMirror";

const INK = "#1A1405";

type Props = { size?: "sm" | "md" };

export function PremiumBadge({ size = "md" }: Props) {
  const sm = size === "sm";
  const crown = sm ? 9 : 11;
  return (
    <View
      style={[styles.pill, sm ? styles.pillSm : styles.pillMd]}
      accessibilityRole="text"
      accessibilityLabel="Premium member"
    >
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="fkPremiumBadge" x1="0" y1="0" x2="1" y2="1">
            {GOLD_MIRROR_STOPS.map(([offset, color]) => (
              <Stop key={offset} offset={offset} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fkPremiumBadge)" />
      </Svg>
      <Svg width={crown} height={crown} viewBox="0 0 24 24">
        <Path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" fill={INK} />
      </Svg>
      <Text style={[styles.label, sm ? styles.labelSm : styles.labelMd]}>
        Premium
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#8A6A1E",
  },
  pillSm: { paddingHorizontal: 6, paddingVertical: 1, gap: 3 },
  pillMd: { paddingHorizontal: 9, paddingVertical: 3, gap: 4 },
  label: { fontWeight: "800", color: INK, letterSpacing: 0.2 },
  labelSm: { fontSize: 10, lineHeight: 13 },
  labelMd: { fontSize: 12, lineHeight: 16 },
}));
