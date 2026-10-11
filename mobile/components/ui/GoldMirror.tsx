/**
 * Premium's 24K mirror finish for text and line icons: the same shiny gold
 * gradient the PWA paints with `background-clip: text`. The free themes get
 * the softer Violet Satin sheen on brand-purple text and icons instead.
 */
import { useState, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextLayoutLine,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { GOLD, Palettes, getActiveTheme } from "@/constants/theme";

/** The PWA's `--fk-gold-grad` stops. */
export const GOLD_MIRROR_STOPS = [
  ["0", "#AA771C"],
  ["0.3", GOLD.shine],
  ["0.5", GOLD.base],
  ["0.7", "#FBF5B7"],
  ["1", GOLD.deep],
] as const;

/** Violet Satin text stops, the same as the PWA's `--fk-satin-text`. */
const SATIN_TEXT_STOPS = {
  light: [
    ["0", "#3C3489"],
    ["0.5", "#6A61D1"],
    ["1", "#3C3489"],
  ],
  dark: [
    ["0", "#A49DF5"],
    ["0.5", "#D7D2FF"],
    ["1", "#A49DF5"],
  ],
} as const;

const SATIN_STROKE_STOPS = {
  light: [
    ["0", "#3C3489"],
    ["0.5", "#7C73DB"],
    ["1", "#3C3489"],
  ],
  dark: [
    ["0", "#6C63E0"],
    ["0.5", "#C9C4FF"],
    ["1", "#6C63E0"],
  ],
} as const;

const GOLD_STROKE_STOPS = [
  ["0", GOLD.deep],
  ["0.35", GOLD.shine],
  ["0.55", GOLD.base],
  ["0.8", GOLD.shine],
  ["1", GOLD.deep],
] as const;

const GOLD_HUES = new Set(["#d4af37", "#e8c766", "#b38728", "#fcf6ba"]);

export function isPremium(): boolean {
  return getActiveTheme() === "premium";
}

/**
 * True when this flat colour should become the theme's mirror gradient: gold
 * hues in Premium, the brand purple in the free themes.
 */
export function isMirrorGold(color: string | undefined): boolean {
  if (!color) return false;
  const theme = getActiveTheme();
  const c = color.toLowerCase();
  if (theme === "premium") return GOLD_HUES.has(c);
  return c === Palettes[theme].primary.toLowerCase();
}

/** A diagonal mirror gradient for strokes; reference it as `url(#id)`. */
export function GoldStrokeDefs({ id }: { id: string }) {
  const theme = getActiveTheme();
  const stops =
    theme === "premium" ? GOLD_STROKE_STOPS : SATIN_STROKE_STOPS[theme];
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        {stops.map(([offset, color]) => (
          <Stop key={offset} offset={offset} stopColor={color} />
        ))}
      </LinearGradient>
    </Defs>
  );
}

/** SVG text ignores `textTransform`, so apply it to each line ourselves. */
function caseOf(text: string, transform: TextStyle["textTransform"]): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize")
    return text.replace(
      /(^|\s)(\S)/g,
      (_m, a: string, b: string) => a + b.toUpperCase(),
    );
  return text;
}

// Keys that place the text in its parent; they move to the wrapper View.
const OUTER_KEYS = [
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "width",
  "maxWidth",
  "minWidth",
] as const;

type Props = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** In Premium, use the mirror even when the text colour is not gold. */
  always?: boolean;
};

/**
 * Text that Premium paints with the 24K mirror gradient. The real Text stays
 * in place (transparent) for layout and screen readers; an SVG copy of each
 * laid-out line sits on top with the gradient fill.
 */
export function GoldText({ children, style, numberOfLines, always }: Props) {
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const theme = getActiveTheme();
  const mirror =
    theme === "premium"
      ? always || flat.color === undefined || isMirrorGold(String(flat.color))
      : flat.color !== undefined && isMirrorGold(String(flat.color));
  const stops =
    theme === "premium" ? GOLD_MIRROR_STOPS : SATIN_TEXT_STOPS[theme];

  if (!mirror) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {children}
      </Text>
    );
  }

  const outer: ViewStyle = {};
  const inner: TextStyle = { ...flat, color: "transparent" };
  for (const key of OUTER_KEYS) {
    if (flat[key] !== undefined) {
      (outer as Record<string, unknown>)[key] = flat[key];
      delete (inner as Record<string, unknown>)[key];
    }
  }

  return (
    <View style={outer}>
      <Text
        style={inner}
        numberOfLines={numberOfLines}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox({ w: Math.ceil(width), h: Math.ceil(height) });
        }}
        onTextLayout={(e) => setLines(e.nativeEvent.lines)}
      >
        {children}
      </Text>
      {box.w > 0 && lines.length > 0 ? (
        <Svg
          width={box.w}
          height={box.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient
              id="fkGoldText"
              x1="0"
              y1="0"
              x2={box.w}
              y2={box.h}
              gradientUnits="userSpaceOnUse"
            >
              {stops.map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          {lines.map((line, i) => (
            <SvgText
              key={i}
              x={line.x}
              y={line.y + line.ascender}
              fontSize={flat.fontSize ?? 14}
              fontWeight={flat.fontWeight ?? "400"}
              fontFamily={flat.fontFamily}
              letterSpacing={flat.letterSpacing}
              fill="url(#fkGoldText)"
            >
              {caseOf(line.text.replace(/\n$/, ""), flat.textTransform)}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
