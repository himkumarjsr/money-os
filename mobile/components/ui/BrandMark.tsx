/**
 * PWA GlobalNavbar brand: the "FK" tile and the "Finkoin" wordmark.
 * Premium paints both with the shiny gold gradient, like `.fk-logo-tile` and
 * `.fk-brand-name` on the web.
 */
import { useState } from "react";
import { Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Colors, getActiveTheme, themedStyles } from "@/constants/theme";

const GOLD_STOPS = [
  ["0", "#AA771C"],
  ["0.3", "#FCF6BA"],
  ["0.5", "#D4AF37"],
  ["0.7", "#FBF5B7"],
  ["1", "#B38728"],
] as const;

export function BrandTile({ size = 32 }: { size?: number }) {
  const premium = getActiveTheme() === "premium";
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="fkGoldTile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#AA771C" />
          <Stop offset="0.45" stopColor="#FCF6BA" />
          <Stop offset="0.7" stopColor="#D4AF37" />
          <Stop offset="1" stopColor="#B38728" />
        </LinearGradient>
      </Defs>
      <Rect
        width="64"
        height="64"
        rx="18"
        fill={premium ? "url(#fkGoldTile)" : "#534AB7"}
      />
      <Circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke={premium ? "#FCF6BA" : "#EEEDFE"}
        strokeWidth="2"
        opacity="0.4"
      />
      <SvgText
        x="32"
        y="39"
        textAnchor="middle"
        fontWeight="800"
        fontSize="20"
        fill={premium ? Colors.onPrimary : "#FFFFFF"}
      >
        FK
      </SvgText>
    </Svg>
  );
}

const FONT_SIZE = 18;
const LINE_HEIGHT = 22;

export function BrandWordmark() {
  const [width, setWidth] = useState(0);
  const premium = getActiveTheme() === "premium";
  return (
    <View>
      <Text
        style={[styles.wordmark, premium && styles.hidden]}
        numberOfLines={1}
        onLayout={(e) => setWidth(Math.ceil(e.nativeEvent.layout.width))}
      >
        Finkoin
      </Text>
      {premium && width > 0 ? (
        <Svg
          width={width}
          height={LINE_HEIGHT}
          style={styles.overlay}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="fkGoldWord" x1="0" y1="0.4" x2="1" y2="0.6">
              {GOLD_STOPS.map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <SvgText
            x="0"
            y={LINE_HEIGHT * 0.78}
            fontSize={FONT_SIZE}
            fontWeight="700"
            letterSpacing={-0.5}
            fill="url(#fkGoldWord)"
          >
            Finkoin
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  wordmark: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  hidden: { opacity: 0 },
  overlay: { position: "absolute", left: 0, top: 0 },
}));
