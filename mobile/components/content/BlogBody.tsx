/**
 * Native port of web lib/renderBlogBody.tsx — same block rules
 * (tables, multi-line bullet lists, ##/### headings, paragraphs) and the
 * same inline subset (bold + links only).
 */
import { Text, View } from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentBlocks } from "./ContentBlocks";
import { InlineText } from "./InlineText";

function isMarkdownTable(block: string): boolean {
  const lines = block
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  if (!lines[0].includes("|")) return false;
  const sep = lines[1].replace(/\s/g, "");
  return /^\|?[\-:|]+/.test(sep) && sep.includes("-");
}

function parseTableRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isBulletList(block: string): boolean {
  const lines = block
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((l) => /^[-*]\s+/.test(l));
}

const bodyStyles = themedStyles(() => ({
  body: { fontSize: 16, lineHeight: 26, color: Colors.textSecondary },
}));

export function BlogBody({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\n+/);
  return (
    <View>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        const firstLine = trimmed.split("\n")[0] ?? "";

        if (isMarkdownTable(trimmed)) {
          const lines = trimmed
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return (
            <View key={i} style={styles.mt24}>
              <ContentBlocks
                blocks={[
                  {
                    kind: "table",
                    headers: parseTableRow(lines[0]),
                    rows: lines.slice(2).map(parseTableRow),
                  },
                ]}
              />
            </View>
          );
        }

        if (isBulletList(trimmed)) {
          const items = trimmed
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => l.replace(/^[-*]\s+/, ""));
          return (
            <View key={i} style={[styles.mt16, { gap: 8 }]}>
              {items.map((item, li) => (
                <View key={li} style={styles.li}>
                  <Text style={[bodyStyles.body, styles.bullet]}>•</Text>
                  <InlineText
                    text={item}
                    italics={false}
                    style={[bodyStyles.body, { flex: 1 }]}
                    boldColor={Colors.textPrimary}
                  />
                </View>
              ))}
            </View>
          );
        }

        if (firstLine.startsWith("### ")) {
          const rest = trimmed.split("\n").slice(1).join("\n").trim();
          return (
            <View key={i}>
              <Text style={styles.h3}>{firstLine.replace(/^###\s+/, "")}</Text>
              {rest ? (
                <InlineText
                  text={rest}
                  italics={false}
                  style={[bodyStyles.body, styles.mt8]}
                  boldColor={Colors.textPrimary}
                />
              ) : null}
            </View>
          );
        }

        if (firstLine.startsWith("## ")) {
          return (
            <Text key={i} style={styles.h2}>
              {firstLine.replace(/^##\s+/, "")}
            </Text>
          );
        }

        return (
          <InlineText
            key={i}
            text={trimmed}
            italics={false}
            style={[bodyStyles.body, styles.mt16]}
            boldColor={Colors.textPrimary}
          />
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  li: { flexDirection: "row", gap: 8 },
  bullet: { minWidth: 12, fontWeight: "700" },
  h2: {
    marginTop: 36,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 27,
  },
  h3: {
    marginTop: 28,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 24,
  },
}));
