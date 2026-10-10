/** Native Learn hub — port of web app/learn/page.tsx + components/learn/learn-hub.tsx. */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";
import { LEARN_BADGE } from "@/components/learn/categoryBadge";
import {
  learnArticles,
  learnCategories,
  type LearnCategory,
} from "@/lib/learnContent";
import { openContentHref } from "@/lib/contentLinks";

export default function LearnHubScreen() {
  const [filter, setFilter] = useState<LearnCategory | "All">("All");

  const filtered = useMemo(
    () =>
      filter === "All"
        ? learnArticles
        : learnArticles.filter((a) => a.category === filter),
    [filter],
  );

  return (
    <ContentScreen
      barTitle="Learn"
      share={{
        title: "Learn Personal Finance — India Guide | Finkoin",
        path: "/learn",
      }}
    >
      <Text style={styles.h1}>Learn finance</Text>
      <Text style={styles.lead}>
        Short, India-relevant guides — no paywall, no fluff. Pick a category or
        browse everything.
      </Text>
      <View style={styles.topLinks}>
        <Pressable
          onPress={() => openContentHref("/calculators")}
          style={styles.topLink}
          accessibilityRole="link"
        >
          <Text style={styles.topLinkText}>Try calculators →</Text>
        </Pressable>
        <Pressable
          onPress={() => openContentHref("/analyse")}
          style={styles.topLink}
          accessibilityRole="link"
        >
          <Text style={styles.topLinkText}>Financial health check →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterBar}
        accessibilityLabel="Filter by category"
      >
        {(["All", ...learnCategories] as const).map((c) => {
          const active = filter === c;
          return (
            <Pressable
              key={c}
              onPress={() => setFilter(c)}
              style={[styles.filter, active && styles.filterActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {filtered.map((a) => {
          const badge = LEARN_BADGE[a.category];
          return (
            <Pressable
              key={a.id}
              onPress={() => router.push(`/learn/${a.id}` as Href)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="link"
              accessibilityLabel={a.title}
            >
              <View
                style={[
                  styles.badge,
                  { backgroundColor: badge.bg, borderColor: badge.border },
                ]}
              >
                <Text style={[styles.badgeText, { color: badge.fg }]}>
                  {a.category}
                </Text>
              </View>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.subtitle}>{a.subtitle}</Text>
              <Text style={styles.read}>{a.readTime} min read</Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>No articles in this category yet.</Text>
      ) : null}
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  h1: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  lead: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  topLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 16,
    marginTop: 4,
  },
  topLink: { minHeight: 44, justifyContent: "center" },
  topLinkText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  filterBar: {
    marginTop: 8,
    marginHorizontal: -20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filters: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: "center",
  },
  filterActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary },
  filterTextActive: { color: Colors.onPrimary },
  list: { marginTop: 20, gap: 14 },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardPressed: { borderColor: Colors.borderIndigo },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  title: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  read: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  empty: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 14,
    color: Colors.textSecondary,
  },
}));
