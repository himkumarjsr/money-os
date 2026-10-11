/**
 * The Finkoin mark: "FK" struck on a coin with a milled rim. Violet Satin in
 * the free themes, 24K mirror gold in Premium. Matches the PWA's
 * `components/ui/BrandCoin.tsx`.
 */
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { getActiveTheme, type ThemeName } from "@/constants/theme";

type CoinPaint = {
  face: readonly string[];
  rim: readonly string[];
  ring: string;
  mark: string;
};

export const COIN_PAINT: Record<ThemeName, CoinPaint> = {
  light: {
    face: ["#463DA6", "#7C73DB", "#534AB7", "#3C3489"],
    rim: ["#2E2770", "#6A61D1", "#2E2770"],
    ring: "#C9C4FF",
    mark: "#FFFFFF",
  },
  dark: {
    face: ["#5A51CC", "#958DF0", "#6C63E0", "#4B42B8"],
    rim: ["#3C3489", "#8F87F0", "#3C3489"],
    ring: "#D7D2FF",
    mark: "#FFFFFF",
  },
  premium: {
    face: ["#AA771C", "#FCF6BA", "#D4AF37", "#B38728"],
    rim: ["#8A6A1E", "#FCF6BA", "#8A6A1E"],
    ring: "#8A6A1E",
    mark: "#1A1405",
  },
};

const FACE_OFFSETS = ["0", "0.4", "0.6", "1"];
const RIM_OFFSETS = ["0", "0.5", "1"];

type Props = {
  size?: number;
  /** Paint for a theme other than the active one (e.g. the splash). */
  theme?: ThemeName;
};

export function BrandCoin({ size = 32, theme }: Props) {
  const p = COIN_PAINT[theme ?? getActiveTheme()];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessibilityLabel="Finkoin"
    >
      <Defs>
        <LinearGradient id="fkCoinFace" x1="0" y1="0" x2="1" y2="1">
          {p.face.map((c, i) => (
            <Stop key={i} offset={FACE_OFFSETS[i]} stopColor={c} />
          ))}
        </LinearGradient>
        <LinearGradient id="fkCoinRim" x1="1" y1="0" x2="0" y2="1">
          {p.rim.map((c, i) => (
            <Stop key={i} offset={RIM_OFFSETS[i]} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Circle cx="32" cy="32" r="32" fill="url(#fkCoinRim)" />
      <Circle cx="32" cy="32" r="29" fill="url(#fkCoinFace)" />
      <Circle
        cx="32"
        cy="32"
        r="25"
        fill="none"
        stroke={p.ring}
        strokeWidth="2"
        strokeDasharray="1.6 2.4"
        opacity="0.6"
      />
      <Circle
        cx="32"
        cy="32"
        r="21"
        fill="none"
        stroke={p.ring}
        strokeWidth="1.2"
        opacity="0.4"
      />
      <SvgText
        x="32"
        y="38.5"
        textAnchor="middle"
        fontWeight="800"
        fontSize="18"
        letterSpacing="-0.5"
        fill={p.mark}
      >
        FK
      </SvgText>
    </Svg>
  );
}
