import type { ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { Colors } from "@/constants/theme";
import { openContentHref } from "@/lib/contentLinks";

type Options = {
  /** Treat single `*x*` as italic (off for blog bodies, matching the PWA). */
  italics?: boolean;
  boldColor?: string;
  linkColor?: string;
};

const TOKEN_WITH_ITALICS =
  /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)/g;
const TOKEN_NO_ITALICS = /(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g;

export function renderInline(
  text: string,
  { italics = true, boldColor, linkColor = Colors.primary }: Options = {},
): ReactNode[] {
  const re = italics ? TOKEN_WITH_ITALICS : TOKEN_NO_ITALICS;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      out.push(
        <Text
          key={key++}
          style={{ color: linkColor, fontWeight: "700" }}
          onPress={() => openContentHref(href)}
          accessibilityRole="link"
        >
          {link[1]}
        </Text>,
      );
    } else if (tok.startsWith("**")) {
      out.push(
        <Text
          key={key++}
          style={{ fontWeight: "700", ...(boldColor ? { color: boldColor } : null) }}
        >
          {tok.slice(2, -2)}
        </Text>,
      );
    } else {
      out.push(
        <Text key={key++} style={{ fontStyle: "italic" }}>
          {tok.slice(1, -1)}
        </Text>,
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function InlineText({
  text,
  style,
  italics,
  boldColor,
  linkColor,
  selectable = false,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
} & Options) {
  return (
    <Text style={style} selectable={selectable}>
      {renderInline(text, { italics, boldColor, linkColor })}
    </Text>
  );
}
