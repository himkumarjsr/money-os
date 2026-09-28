import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors, FontSize } from "@/constants/theme";

type Props = {
  score: number;
  size?: number;
  strokeWidth?: number;
};

function scoreColor(s: number) {
  if (s >= 75) return Colors.success;
  if (s >= 50) return Colors.warning;
  return Colors.error;
}

export function HealthScoreRing({ score, size = 72, strokeWidth = 6 }: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c - (clamped / 100) * c;
  const color = scoreColor(score);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.text, { color }]}>{Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    position: "absolute",
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
});
