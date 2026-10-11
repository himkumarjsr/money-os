/**
 * Thin gold ring around a circular avatar for Premium (Finkoin) members.
 * Renders the avatar unchanged when `premium` is false.
 */
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { GOLD_MIRROR_STOPS } from "@/components/ui/GoldMirror";

const RING = 2;

type Props = {
  premium: boolean;
  /** Diameter of the avatar inside the ring. */
  size: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PremiumAvatarRing({ premium, size, children, style }: Props) {
  if (!premium) return <>{children}</>;
  const outer = size + RING * 2;
  return (
    <View style={[{ width: outer, height: outer, padding: RING }, style]}>
      <Svg
        width={outer}
        height={outer}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="fkPremiumRing" x1="0" y1="0" x2="1" y2="1">
            {GOLD_MIRROR_STOPS.map(([offset, color]) => (
              <Stop key={offset} offset={offset} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle
          cx={outer / 2}
          cy={outer / 2}
          r={outer / 2 - RING / 2}
          fill="none"
          stroke="url(#fkPremiumRing)"
          strokeWidth={RING}
        />
      </Svg>
      {children}
    </View>
  );
}
