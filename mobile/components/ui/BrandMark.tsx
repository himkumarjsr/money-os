/**
 * PWA GlobalNavbar brand: the "FK" tile and the "Finkoin" wordmark.
 * Premium paints both with the shiny gold gradient and the free themes with
 * Violet Satin, like `.fk-logo-tile` and `.fk-brand-name` on the web.
 */
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { GoldText } from "@/components/ui/GoldMirror";
import { Colors, getActiveTheme, themedStyles } from "@/constants/theme";

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
        <LinearGradient id="fkSatinTile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#463DA6" />
          <Stop offset="0.4" stopColor="#7C73DB" />
          <Stop offset="0.6" stopColor="#534AB7" />
          <Stop offset="1" stopColor="#3C3489" />
        </LinearGradient>
      </Defs>
      <Rect
        width="64"
        height="64"
        rx="18"
        fill={premium ? "url(#fkGoldTile)" : "url(#fkSatinTile)"}
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

/** Gold mirror in Premium, Violet Satin in the free themes. */
export function BrandWordmark() {
  return (
    <GoldText style={styles.wordmark} numberOfLines={1}>
      Finkoin
    </GoldText>
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
}));
