/**
 * Premium's 24K mirror finish for text and line icons: the same shiny gold
 * gradient the PWA paints with `background-clip: text`. Outside Premium these
 * render as plain text and flat strokes.
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
import { GOLD, getActiveTheme } from "@/constants/theme";

/** The PWA's `--fk-gold-grad` stops. */
export const GOLD_MIRROR_STOPS = [
  ["0", "#AA771C"],
  ["0.3", GOLD.shine],
  ["0.5", GOLD.base],
  ["0.7", "#FBF5B7"],
  ["1", GOLD.deep],
] as const;

const GOLD_HUES = new Set(["#d4af37", "#e8c766", "#b38728", "#fcf6ba"]);

export function isPremium(): boolean {
  return getActiveTheme() === "premium";
}

/** True when Premium should swap this flat gold for the mirror gradient. */
export function isMirrorGold(color: string | undefined): boolean {
  return !!color && isPremium() && GOLD_HUES.has(color.toLowerCase());
}

/** A diagonal mirror gradient for strokes; reference it as `url(#id)`. */
export function GoldStrokeDefs({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={GOLD.deep} />
        <Stop offset="0.35" stopColor={GOLD.shine} />
        <Stop offset="0.55" stopColor={GOLD.base} />
        <Stop offset="0.8" stopColor={GOLD.shine} />
        <Stop offset="1" stopColor={GOLD.deep} />
      </LinearGradient>
    </Defs>
  );
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
  /** Force the mirror even when the text colour is not gold. */
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
  const mirror =
    isPremium() &&
    (always || flat.color === undefined || isMirrorGold(String(flat.color)));

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
              {GOLD_MIRROR_STOPS.map(([offset, color]) => (
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
              {line.text.replace(/\n$/, "")}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
