/** Native Blog article — port of web app/blog/[slug]/page.tsx. */
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";
import { BlogBody } from "@/components/content/BlogBody";
import { BLOG_ARTICLES, getBlogArticle } from "@/lib/blogContent";
import { openContentHref } from "@/lib/contentLinks";

const NEXT_STEPS = [
  { label: "Run the free financial health check", href: "/analyse" },
  { label: "Open tax regime calculator", href: "/calculators/tax-regime-2026" },
  { label: "Track monthly expenses", href: "/tracker" },
];

export default function BlogArticleScreen() {
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = typeof rawSlug === "string" ? rawSlug : "";
  const article = getBlogArticle(slug);

  if (!article) {
    return (
      <ContentScreen barTitle="Blog" backFallback="/blog">
        <Text style={styles.h1}>Article not found</Text>
        <Pressable
          onPress={() => router.replace("/blog" as Href)}
          style={styles.inlineLink}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>← All articles</Text>
        </Pressable>
      </ContentScreen>
    );
  }

  const others = BLOG_ARTICLES.filter((a) => a.slug !== article.slug).slice(
    0,
    2,
  );

  return (
    <ContentScreen
      barTitle="Blog"
      backFallback="/blog"
      share={{ title: article.title, path: `/blog/${article.slug}` }}
    >
      <Pressable
        onPress={() => router.push("/blog" as Href)}
        style={styles.inlineLink}
        accessibilityRole="link"
      >
        <Text style={styles.linkText}>← All articles</Text>
      </Pressable>
      <Text style={styles.category}>{article.category.toUpperCase()}</Text>
      <Text style={styles.h1}>{article.title}</Text>
      <Text style={styles.byline}>
        By Himanshu Kumar Gupta · {article.publishedAt}
        {article.readTimeMinutes
          ? ` · ${article.readTimeMinutes} min read`
          : ""}
      </Text>

      <View style={styles.body}>
        <BlogBody body={article.body} />
      </View>

      {article.faq && article.faq.length > 0 ? (
        <View style={styles.faq}>
          <Text style={styles.faqTitle}>Frequently asked questions</Text>
          <View style={{ gap: 20, marginTop: 20 }}>
            {article.faq.map((f) => (
              <View key={f.q}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Text style={styles.faqA}>{f.a}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.nextSteps}>
        <Text style={styles.nextTitle}>Next steps</Text>
        {NEXT_STEPS.map((s) => (
          <Pressable
            key={s.href}
            onPress={() => openContentHref(s.href)}
            style={styles.nextLink}
            accessibilityRole="link"
          >
            <Text style={styles.linkText}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {others.length > 0 ? (
        <View style={styles.related}>
          <Text style={styles.relatedTitle}>RELATED</Text>
          {others.map((a) => (
            <Pressable
              key={a.slug}
              onPress={() => router.push(`/blog/${a.slug}` as Href)}
              style={styles.nextLink}
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>{a.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  inlineLink: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
    lineHeight: 20,
  },
  category: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Colors.textMuted,
  },
  h1: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 34,
  },
  byline: { marginTop: 8, fontSize: 14, color: Colors.textMuted },
  body: { marginTop: 16 },
  faq: {
    marginTop: 48,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 32,
  },
  faqTitle: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  faqQ: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  faqA: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 25,
    color: Colors.textSecondary,
  },
  nextSteps: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 18,
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  nextLink: { minHeight: 44, justifyContent: "center" },
  related: { marginTop: 32 },
  relatedTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: Colors.textMuted,
    marginBottom: 4,
  },
}));
