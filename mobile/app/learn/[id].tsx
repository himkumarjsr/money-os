/**
 * Native Learn article — port of web app/learn/[id]/page.tsx: bespoke guides,
 * the data-driven rich renderer (lib/learnRichArticles), and the plain fallback.
 */
import { useCallback, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Colors } from "@/constants/theme";
import { ContentScreen, shareFinkoinPage } from "@/components/content/ContentScreen";
import { ContentSectionView } from "@/components/content/ContentBlocks";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { InlineText } from "@/components/content/InlineText";
import { buildLearnPage } from "@/components/learn/buildLearnPage";
import { LEARN_BADGE } from "@/components/learn/categoryBadge";
import { SipCroreTool } from "@/components/learn/SipCroreTool";
import { TaxRegimeToggle } from "@/components/learn/TaxRegimeToggle";
import { LEARN_WIDGETS } from "@/components/learn/types";
import { learnArticleById, learnArticles } from "@/lib/learnContent";

function renderWidget(name: string) {
  if (name === LEARN_WIDGETS.sipCrore) return <SipCroreTool />;
  if (name === LEARN_WIDGETS.taxRegimeToggle) return <TaxRegimeToggle />;
  return null;
}

export default function LearnArticleScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = typeof rawId === "string" ? rawId : "";
  const article = learnArticleById[id];
  const page = useMemo(() => (article ? buildLearnPage(article) : null), [article]);

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const bodyTop = useRef(0);

  const jumpTo = useCallback((sectionId: string) => {
    const y = offsets.current[sectionId];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, bodyTop.current + y - 12), animated: true });
  }, []);

  const track = (sectionId: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    offsets.current[sectionId] = e.nativeEvent.layout.y;
  };

  if (!article || !page) {
    return (
      <ContentScreen barTitle="Learn" backFallback="/learn">
        <Text style={styles.h1}>Article not found</Text>
        <Pressable
          onPress={() => router.replace("/learn" as Href)}
          style={styles.inlineLink}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>← All articles</Text>
        </Pressable>
      </ContentScreen>
    );
  }

  const badge = LEARN_BADGE[article.category];
  const related = learnArticles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3);
  const sharePath = `/learn/${article.id}`;

  return (
    <ContentScreen
      ref={scrollRef}
      barTitle="Learn"
      backFallback="/learn"
      share={{ title: article.title, path: sharePath }}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/learn" as Href)}
          style={styles.inlineLink}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>← All articles</Text>
        </Pressable>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{article.category}</Text>
          </View>
          <Text style={styles.readTime}>{article.readTime} min read</Text>
        </View>
        <Text style={styles.h1}>{article.title}</Text>
        <Text style={styles.subtitle}>{article.subtitle}</Text>
        <Pressable
          onPress={() => void shareFinkoinPage(article.title, sharePath)}
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.shareBtnText}>Share article</Text>
        </Pressable>
      </View>

      <View style={styles.toc}>
        <Text style={styles.tocTitle}>On this page</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tocRow}
        >
          {page.toc.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => jumpTo(t.id)}
              style={styles.tocChip}
              accessibilityRole="button"
            >
              <Text style={styles.tocChipText}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {page.asideNote ? (
          <View style={styles.aside}>
            <InlineText text={page.asideNote} style={styles.asideText} />
          </View>
        ) : null}
      </View>

      <View
        style={styles.body}
        onLayout={(e) => {
          bodyTop.current = e.nativeEvent.layout.y;
        }}
      >
        {page.sections.map((s) => (
          <View key={s.id} onLayout={track(s.id)}>
            <ContentSectionView section={s} renderWidget={renderWidget} />
          </View>
        ))}

        {page.faqs.length > 0 ? (
          <View onLayout={track("faq")}>
            <FaqAccordion
              faqs={page.faqs}
              subtitle={page.faqSubtitle}
              searchPlaceholder={page.faqPlaceholder}
            />
          </View>
        ) : null}

        {page.afterFaq.map((s) => (
          <View key={s.id} onLayout={track(s.id)}>
            <ContentSectionView section={s} renderWidget={renderWidget} />
          </View>
        ))}

        {page.showCategoryRelated && related.length > 0 ? (
          <View style={styles.related}>
            <Text style={styles.relatedTitle}>Related articles</Text>
            <Text style={styles.relatedSub}>
              More in <Text style={{ fontWeight: "700" }}>{article.category}</Text>
            </Text>
            <View style={{ gap: 12, marginTop: 16 }}>
              {related.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/learn/${r.id}` as Href)}
                  style={({ pressed }) => [styles.relCard, pressed && styles.relCardPressed]}
                  accessibilityRole="link"
                >
                  <Text style={styles.relRead}>{r.readTime} min read</Text>
                  <Text style={styles.relTitle}>{r.title}</Text>
                  <Text style={styles.relSub}>{r.subtitle}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ContentScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 20,
    gap: 10,
  },
  inlineLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  readTime: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  h1: { fontSize: 26, fontWeight: "700", color: Colors.textPrimary, lineHeight: 32 },
  subtitle: { fontSize: 17, lineHeight: 25, color: "#475569" },
  shareBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  shareBtnText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  toc: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
  },
  tocTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  tocRow: { gap: 8, paddingTop: 10 },
  tocChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  tocChipText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  aside: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
  },
  asideText: { fontSize: 12, color: "#475569", lineHeight: 18 },
  body: { marginTop: 28, gap: 32 },
  related: { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 28 },
  relatedTitle: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  relatedSub: { marginTop: 4, fontSize: 14, color: "#475569" },
  relCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
  },
  relCardPressed: { borderColor: "#B3ADE3" },
  relRead: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  relTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  relSub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: "#475569" },
});
