import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { scoreBand } from "@/lib/financialEngine";
import { Colors, FontSize, themedStyles } from "@/constants/theme";
import { GoldStrokeDefs, GoldText, isPremium } from "@/components/ui/GoldMirror";

type Props = {
  score: number;
  size?: number;
  strokeWidth?: number;
};

const bandColor = () =>
  ({
    good: Colors.success,
    warning: Colors.warning,
    critical: Colors.error,
  }) as const;

function scoreColor(s: number) {
  return bandColor()[scoreBand(s)];
}

export function HealthScoreRing({ score, size = 72, strokeWidth = 6 }: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c - (clamped / 100) * c;
  const color = scoreColor(score);
  // Premium draws the ring and number in 24K mirror gold, like the PWA.
  const premium = isPremium();

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
        {premium ? <GoldStrokeDefs id="fkRingGold" /> : null}
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
          stroke={premium ? "url(#fkRingGold)" : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {premium ? (
        <View style={styles.center} pointerEvents="none">
          <GoldText style={styles.goldText} always>
            {String(Math.round(score))}
          </GoldText>
        </View>
      ) : (
        <Text style={[styles.text, { color }]}>{Math.round(score)}</Text>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  text: {
    position: "absolute",
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  goldText: {
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
}));
