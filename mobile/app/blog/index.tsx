/** Native Blog index — port of web app/blog/page.tsx. */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Colors } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";
import { BLOG_ARTICLES } from "@/lib/blogContent";
import { openContentHref } from "@/lib/contentLinks";

const FOOTER_LINKS = [
  { label: "Tax calculator", href: "/calculators/tax-regime-2026" },
  { label: "Financial health check", href: "/analyse" },
  { label: "Learn hub", href: "/learn" },
  { label: "← Home", href: "/" },
];

export default function BlogIndexScreen() {
  return (
    <ContentScreen barTitle="Blog" share={{ title: "Money guides for India | Finkoin", path: "/blog" }}>
      <Text style={styles.eyebrow}>BLOG</Text>
      <Text style={styles.h1}>Money guides for India</Text>
      <Text style={styles.lead}>
        Plain-language articles on tax, insurance, saving, and investing — with links to free
        calculators and tools.
      </Text>

      <View style={styles.list}>
        {BLOG_ARTICLES.map((a) => {
          const open = () => router.push(`/blog/${a.slug}` as Href);
          return (
            <Pressable
              key={a.slug}
              onPress={open}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              accessibilityRole="link"
              accessibilityLabel={a.title}
            >
              <Text style={styles.category}>{a.category.toUpperCase()}</Text>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.desc}>{a.description}</Text>
              <Text style={styles.date}>Published {a.publishedAt}</Text>
              <Text style={styles.read}>Read article →</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {FOOTER_LINKS.map((l) => (
          <Pressable
            key={l.href}
            onPress={() => openContentHref(l.href)}
            style={styles.footerLink}
            accessibilityRole="link"
          >
            <Text style={styles.footerLinkText}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </ContentScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    color: Colors.indigo600,
  },
  h1: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 34,
  },
  lead: { marginTop: 12, fontSize: 15, lineHeight: 23, color: "#475569" },
  list: { marginTop: 28, gap: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: { borderColor: Colors.primary },
  category: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: "#64748B" },
  title: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  desc: { marginTop: 8, fontSize: 14, lineHeight: 21, color: "#475569" },
  date: { marginTop: 12, fontSize: 12, color: "#64748B" },
  read: { marginTop: 10, fontSize: 14, fontWeight: "700", color: Colors.primary },
  footer: { marginTop: 36, flexDirection: "row", flexWrap: "wrap", columnGap: 16 },
  footerLink: { minHeight: 44, justifyContent: "center" },
  footerLinkText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
});
