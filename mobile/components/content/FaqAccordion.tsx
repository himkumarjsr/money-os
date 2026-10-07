import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Colors } from "@/constants/theme";

export type Faq = { q: string; a: string };

/** Native port of the PWA LearnFaqAccordion (searchable `<details>` list). */
export function FaqAccordion({
  faqs,
  title = "FAQs",
  subtitle = "Clear answers in plain language. Educational guidance only.",
  searchPlaceholder = "Search FAQs",
  searchable = true,
}: {
  faqs: Faq[];
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q));
  }, [faqs, query]);

  if (faqs.length === 0) return null;

  return (
    <View>
      <Text style={styles.h2}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {searchable ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search FAQs"
        />
      ) : null}
      <View style={{ gap: 10, marginTop: 14 }}>
        {filtered.map((f) => {
          const isOpen = Boolean(open[f.q]);
          return (
            <Pressable
              key={f.q}
              onPress={() => setOpen((s) => ({ ...s, [f.q]: !isOpen }))}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <View style={styles.qRow}>
                <Text style={styles.q}>{f.q}</Text>
                <Text style={[styles.chev, isOpen && styles.chevOpen]}>⌄</Text>
              </View>
              {isOpen ? <Text style={styles.a}>{f.a}</Text> : null}
            </Pressable>
          );
        })}
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No matches. Try a shorter keyword.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  sub: { marginTop: 4, fontSize: 13, color: "#475569", lineHeight: 19 },
  search: {
    marginTop: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  item: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  qRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  q: { flex: 1, fontSize: 14, fontWeight: "700", color: Colors.textPrimary, lineHeight: 20 },
  chev: { fontSize: 16, color: "#94A3B8", lineHeight: 20 },
  chevOpen: { transform: [{ rotate: "180deg" }] },
  a: { marginTop: 10, fontSize: 14, lineHeight: 21, color: "#334155" },
  empty: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: "#334155",
  },
});
