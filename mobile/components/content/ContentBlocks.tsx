import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Colors, themedStyles, tintBg, tintFg } from "@/constants/theme";
import { openContentHref } from "@/lib/contentLinks";
import { InlineText } from "./InlineText";
import type { ContentBlock, ContentSection, ContentTone } from "./types";

type ToneStyle = { bg: string; border: string; fg: string; title: string };

/** Tone colours, read per render so they follow the active theme. */
export function tones(): Record<ContentTone, ToneStyle> {
  const ok = { bg: Colors.successLight, fg: Colors.successText };
  const warn = { bg: Colors.warningLight, fg: Colors.warningText };
  const bad = { bg: Colors.errorLight, fg: Colors.errorText };
  return {
    violet: {
      bg: Colors.primaryLight,
      border: Colors.primaryLight,
      fg: Colors.primaryDark,
      title: Colors.primaryDark,
    },
    emerald: { ...ok, border: Colors.successLight, title: ok.fg },
    amber: { ...warn, border: Colors.warningLight, title: warn.fg },
    warn: { ...warn, border: Colors.warningLight, title: warn.fg },
    green: { ...ok, border: Colors.successLight, title: ok.fg },
    red: { ...bad, border: Colors.errorLight, title: bad.fg },
    rose: { ...bad, border: Colors.errorLight, title: bad.fg },
    sky: {
      bg: Colors.surfaceMuted,
      border: Colors.border,
      fg: Colors.textSecondary,
      title: Colors.textPrimary,
    },
    grey: {
      bg: Colors.background,
      border: Colors.background,
      fg: Colors.textSecondary,
      title: Colors.textPrimary,
    },
    brand: {
      bg: Colors.surfaceMuted,
      border: Colors.borderIndigo,
      fg: Colors.primaryDark,
      title: Colors.primary,
    },
  };
}

function tagTones(): Partial<
  Record<ContentTone, { bg: string; fg: string; border: string }>
> {
  return {
    emerald: {
      bg: Colors.successLight,
      fg: Colors.successText,
      border: Colors.successLight,
    },
    violet: {
      bg: Colors.primaryLight,
      fg: Colors.primaryDark,
      border: Colors.borderIndigo,
    },
    amber: {
      bg: Colors.warningLight,
      fg: Colors.warningText,
      border: Colors.warningLight,
    },
  };
}

export type BlockTextStyle = {
  /** Body text colour. */
  color?: string;
  fontSize?: number;
  lineHeight?: number;
};

type RenderWidget = (name: string) => ReactNode;

function Paragraph({
  block,
  base,
}: {
  block: Extract<ContentBlock, { kind: "p" }>;
  base: BlockTextStyle;
}) {
  const fontSize = block.small ? 13 : (base.fontSize ?? 15);
  return (
    <InlineText
      text={block.text}
      style={{
        fontSize,
        lineHeight: block.small ? 19 : (base.lineHeight ?? 25),
        color: block.muted
          ? Colors.textMuted
          : (base.color ?? Colors.textSecondary),
      }}
      boldColor={base.color ? undefined : Colors.textPrimary}
    />
  );
}

function List({
  block,
  base,
}: {
  block: Extract<ContentBlock, { kind: "ul" }>;
  base: BlockTextStyle;
}) {
  const color = base.color ?? Colors.textSecondary;
  const fontSize = base.fontSize ?? 15;
  const lineHeight = base.lineHeight ?? 25;
  return (
    <View style={{ gap: block.spaced ? 12 : 6 }}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.li}>
          {block.plain ? null : (
            <Text style={[styles.bullet, { color, fontSize, lineHeight }]}>
              {block.ordered ? `${i + 1}.` : "•"}
            </Text>
          )}
          <View style={{ flex: 1 }}>
            {item.split("\n").map((line, li) => (
              <InlineText
                key={li}
                text={line}
                style={{
                  color,
                  fontSize,
                  lineHeight,
                  marginTop: li > 0 ? 4 : 0,
                }}
                boldColor={base.color ? undefined : Colors.textPrimary}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Callout({
  block,
  renderWidget,
}: {
  block: Extract<ContentBlock, { kind: "callout" }>;
  renderWidget?: RenderWidget;
}) {
  const t = tones()[block.tone];
  const base: BlockTextStyle = { color: t.fg, fontSize: 14, lineHeight: 22 };
  return (
    <View
      style={[styles.callout, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      {block.title ? (
        <Text style={[styles.calloutTitle, { color: t.title }]}>
          {block.title}
        </Text>
      ) : null}
      {block.text ? (
        <InlineText
          text={block.text}
          style={{ color: t.fg, fontSize: 14, lineHeight: 22 }}
        />
      ) : null}
      {block.blocks ? (
        <ContentBlocks
          blocks={block.blocks}
          base={base}
          renderWidget={renderWidget}
          gap={8}
        />
      ) : null}
    </View>
  );
}

function Table({ block }: { block: Extract<ContentBlock, { kind: "table" }> }) {
  const cols = block.headers.length;
  const scroll = Boolean(block.scrollColWidth) || cols > 3;
  const colStyle = (i: number) =>
    scroll
      ? { width: block.scrollColWidth ?? (cols > 4 ? 190 : 170) }
      : { flex: block.colFlex?.[i] ?? 1 };
  const table = (
    <View>
      <View style={[styles.tr, styles.thead]}>
        {block.headers.map((h, i) => (
          <View key={i} style={[styles.cell, colStyle(i)]}>
            <InlineText text={h} italics={false} style={styles.th} />
          </View>
        ))}
      </View>
      {block.rows.map((row, ri) => {
        const isTotal = block.totalRow && ri === block.rows.length - 1;
        return (
          <View
            key={ri}
            style={[styles.tr, styles.trBorder, isTotal && styles.totalRow]}
          >
            {row.map((cell, ci) => (
              <View key={ci} style={[styles.cell, colStyle(ci)]}>
                <InlineText
                  text={cell}
                  italics={false}
                  style={[
                    styles.td,
                    (isTotal || (block.boldFirstCol && ci === 0)) &&
                      styles.tdBold,
                    block.accentLastCol &&
                      ci === row.length - 1 &&
                      styles.tdAccent,
                  ]}
                  boldColor={Colors.textPrimary}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
  return (
    <View style={styles.tableWrap}>
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          {table}
        </ScrollView>
      ) : (
        table
      )}
    </View>
  );
}

function ActionButton({
  label,
  href,
  primary,
}: {
  label: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={() => openContentHref(href)}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnSecondary,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
    >
      <Text style={primary ? styles.btnPrimaryText : styles.btnSecondaryText}>
        {label}
      </Text>
    </Pressable>
  );
}

function Block({
  block,
  base,
  renderWidget,
}: {
  block: ContentBlock;
  base: BlockTextStyle;
  renderWidget?: RenderWidget;
}) {
  switch (block.kind) {
    case "p":
      return <Paragraph block={block} base={base} />;
    case "ul":
      return <List block={block} base={base} />;
    case "h3":
      return <Text style={styles.h3}>{block.text}</Text>;
    case "callout":
      return <Callout block={block} renderWidget={renderWidget} />;
    case "table":
      return <Table block={block} />;
    case "formula":
      return (
        <View style={styles.formula}>
          <Text style={styles.formulaText}>{block.text}</Text>
        </View>
      );
    case "cards":
      return (
        <View style={{ gap: 10 }}>
          {block.items.map((c, i) => {
            const inner = (
              <>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <InlineText
                  text={c.text}
                  style={styles.cardText}
                  boldColor={Colors.textPrimary}
                />
              </>
            );
            const boxStyle = [
              styles.miniCard,
              block.tone === "grey" && styles.miniCardGrey,
            ];
            return c.href ? (
              <Pressable
                key={i}
                onPress={() => openContentHref(c.href!)}
                style={({ pressed }) => [
                  ...boxStyle,
                  pressed && { borderColor: Colors.primary },
                ]}
                accessibilityRole="link"
              >
                {inner}
              </Pressable>
            ) : (
              <View key={i} style={boxStyle}>
                {inner}
              </View>
            );
          })}
        </View>
      );
    case "actions":
      return (
        <View
          style={[
            styles.actionsBox,
            block.tone === "grey" && styles.actionsGrey,
          ]}
        >
          {block.title ? (
            <Text style={styles.actionsTitle}>{block.title}</Text>
          ) : null}
          {block.text ? (
            <InlineText text={block.text} style={styles.actionsText} />
          ) : null}
          <View style={styles.actionsRow}>
            {block.actions.map((a) => (
              <ActionButton key={a.href + a.label} {...a} />
            ))}
          </View>
        </View>
      );
    case "tool":
      return (
        <View style={styles.tool}>
          <View style={styles.toolHead}>
            <Text style={styles.toolTitle}>{block.title}</Text>
            {block.subtitle ? (
              <Text style={styles.toolSub}>{block.subtitle}</Text>
            ) : null}
          </View>
          <View style={styles.toolBody}>
            {block.text ? (
              <InlineText text={block.text} style={styles.toolText} />
            ) : null}
            <ActionButton label={block.label} href={block.href} primary />
          </View>
          <View style={styles.toolFoot}>
            <Text style={styles.toolFootText}>
              Educational estimate — not investment advice. Know it. Fix it.
              Grow it.
            </Text>
            <ActionButton label="Full health check →" href="/analyse" />
          </View>
        </View>
      );
    case "links":
      return (
        <View style={{ gap: 10 }}>
          {block.title ? (
            <Text style={styles.linksTitle}>{block.title}</Text>
          ) : null}
          {block.items.map((l) => (
            <Pressable
              key={l.href}
              onPress={() => openContentHref(l.href)}
              style={({ pressed }) => [
                styles.linkCard,
                pressed && { borderColor: Colors.primary },
              ]}
              accessibilityRole="link"
            >
              <Text style={styles.linkCardText}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      );
    case "tags":
      return (
        <View style={styles.tags}>
          {block.items.map((t) => {
            const tone = (t.tone && tagTones()[t.tone]) || {
              bg: tintBg("#F1F5F9"),
              fg: tintFg("#334155"),
              border: tintBg("#E2E8F0"),
            };
            return (
              <View
                key={t.label}
                style={[
                  styles.tag,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <Text style={[styles.tagText, { color: tone.fg }]}>
                  {t.label}
                </Text>
              </View>
            );
          })}
        </View>
      );
    case "widget":
      return <>{renderWidget?.(block.widget) ?? null}</>;
    default:
      return null;
  }
}

export function ContentBlocks({
  blocks,
  base = {},
  renderWidget,
  gap = 14,
}: {
  blocks: ContentBlock[];
  base?: BlockTextStyle;
  renderWidget?: RenderWidget;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      {blocks.map((b, i) => (
        <Block key={i} block={b} base={base} renderWidget={renderWidget} />
      ))}
    </View>
  );
}

/** A titled section; `card` renders the Learn-guide white card chrome. */
export function ContentSectionView({
  section,
  renderWidget,
  base,
}: {
  section: ContentSection;
  renderWidget?: RenderWidget;
  base?: BlockTextStyle;
}) {
  const body = (
    <>
      {section.title ? (
        <Text
          style={section.card ? styles.cardSectionTitle : styles.sectionTitle}
        >
          {section.title}
        </Text>
      ) : null}
      {section.subtitle ? (
        <Text style={styles.sectionSub}>{section.subtitle}</Text>
      ) : null}
      <ContentBlocks
        blocks={section.blocks}
        base={section.card ? { fontSize: 14, lineHeight: 22, ...base } : base}
        renderWidget={renderWidget}
      />
    </>
  );
  return section.card ? (
    <View style={styles.sectionCard}>{body}</View>
  ) : (
    <View>{body}</View>
  );
}

const styles = themedStyles(() => ({
  li: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet: { minWidth: 14, fontWeight: "700" },
  callout: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  calloutTitle: { fontSize: 14, fontWeight: "800" },
  tableWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.card,
  },
  tr: { flexDirection: "row" },
  thead: { backgroundColor: Colors.background },
  trBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  totalRow: { backgroundColor: Colors.background },
  cell: { paddingHorizontal: 10, paddingVertical: 9 },
  th: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  td: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  tdBold: { fontWeight: "700", color: Colors.textPrimary },
  tdAccent: { fontWeight: "700", color: Colors.primary },
  h3: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 6,
  },
  formula: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formulaText: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 16,
    color: Colors.textPrimary,
  },
  miniCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  miniCardGrey: { backgroundColor: Colors.background },
  cardTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  cardText: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  actionsBox: {
    borderWidth: 1,
    borderColor: Colors.borderIndigo,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  actionsGrey: {
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  actionsTitle: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
  actionsText: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  btn: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnPrimaryText: { color: Colors.onPrimary, fontWeight: "700", fontSize: 14 },
  btnSecondaryText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  tool: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.card,
    overflow: "hidden",
  },
  toolHead: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toolTitle: { fontSize: 14, fontWeight: "800", color: Colors.textPrimary },
  toolSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  toolBody: { padding: 16, gap: 12 },
  toolText: { fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  toolFoot: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  toolFootText: { fontSize: 11, color: Colors.textMuted },
  linksTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  linkCard: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
  },
  linkCardText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { fontSize: 12, fontWeight: "600" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    lineHeight: 26,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  sectionSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -6,
    marginBottom: 12,
    lineHeight: 19,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
}));
