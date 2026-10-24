/** Native search - port of web components/search/SearchPageClient.tsx. */
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { openContentHref } from "@/lib/contentLinks";
import {
  POPULAR_SEARCHES,
  groupSearchResults,
  searchEntries,
  type SearchKind,
} from "@/lib/siteSearch";
import { buildAppSearchIndex } from "@/lib/siteSearchIndex";

const KIND_ICON: Record<SearchKind, AppIconName> = {
  feature: "sparkle",
  page: "home",
  calculator: "calculator",
  learn: "notebook",
  blog: "doc",
};

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(
    typeof params.q === "string" ? params.q : "",
  );
  const index = useMemo(() => buildAppSearchIndex(), []);
  const results = useMemo(
    () => searchEntries(index, query, 60),
    [index, query],
  );
  const groups = groupSearchResults(results);
  const trimmed = query.trim();

  return (
    <ContentScreen barTitle="Search">
      <View style={styles.box}>
        <AppIcon name="search" size={18} color={Colors.primaryText} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          placeholder="Search features, calculators, Learn and blog"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Search"
          style={styles.input}
        />
        {query ? (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <AppIcon name="close" size={16} color={Colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {!trimmed ? (
        <View style={styles.chips}>
          {POPULAR_SEARCHES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setQuery(s)}
              style={styles.chip}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : results.length === 0 ? (
        <Text style={styles.empty}>
          Nothing found for “{trimmed}”. Try a shorter word like “tax” or
          “loan”.
        </Text>
      ) : (
        groups.map((group) => (
          <View key={group.kind} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.items.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => openContentHref(item.href)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="link"
                accessibilityLabel={item.title}
              >
                <View style={styles.iconTile}>
                  <AppIcon
                    name={KIND_ICON[item.kind]}
                    size={16}
                    color={Colors.primaryText}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    paddingVertical: 12,
    color: Colors.textPrimary,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { fontSize: 13, fontWeight: "700", color: Colors.primaryText },
  empty: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  group: { marginTop: 20, gap: 4 },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textSecondary,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rowPressed: { backgroundColor: Colors.surfaceAlt },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },
  rowText: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  desc: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
}));
