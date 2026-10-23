/** Native Features - port of web app/features/page.tsx + FeaturesShowcase. */
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { AppIcon } from "@/components/ui/AppIcon";
import { ContentScreen } from "@/components/content/ContentScreen";
import {
  FEATURE_TAGS,
  FEATURE_USPS,
  FINKOIN_FEATURES,
  type FeatureTag,
} from "@/components/content/featuresContent";
import { openContentHref } from "@/lib/contentLinks";
import { IntroTourButton } from "@/components/IntroTourButton";

/** Only offer filters for tags at least one feature uses. */
const USED_TAGS = FEATURE_TAGS.filter((tag) =>
  FINKOIN_FEATURES.some((f) => f.tags.includes(tag)),
);

export default function FeaturesScreen() {
  const [activeTag, setActiveTag] = useState<FeatureTag | null>(null);
  const visible = useMemo(
    () =>
      activeTag
        ? FINKOIN_FEATURES.filter((f) => f.tags.includes(activeTag))
        : FINKOIN_FEATURES,
    [activeTag],
  );

  return (
    <ContentScreen barTitle="Features">
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>WHY FINKOIN</Text>
        <Text style={styles.h1}>One app for your whole money life</Text>
        <Text style={styles.heroBody}>
          Check your financial health, plan with India-ready calculators, track
          every month and split bills with friends. Free to start, built for
          India.
        </Text>
        <Pressable
          onPress={() => openContentHref("/analyse")}
          style={styles.pill}
          accessibilityRole="button"
        >
          <Text style={styles.pillText}>Start free health check</Text>
        </Pressable>
        <Pressable
          onPress={() => openContentHref("/plans")}
          style={styles.pillOutline}
          accessibilityRole="button"
        >
          <Text style={styles.pillOutlineText}>Compare plans</Text>
        </Pressable>
        <IntroTourButton location="features_hero" style={{ marginTop: 14 }} />
      </View>

      <View
        style={{ gap: 16 }}
        accessibilityLabel="What makes Finkoin different"
      >
        {FEATURE_USPS.map((usp) => (
          <View key={usp.title} style={styles.card}>
            <View style={styles.iconBox}>
              <AppIcon name={usp.icon} size={20} color={Colors.primaryText} />
            </View>
            <Text style={styles.uspTitle}>{usp.title}</Text>
            <Text style={styles.cardBody}>{usp.body}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.h2}>Every feature, explained</Text>
      <Text style={styles.h2Sub}>
        Tap a tag to see the features that match.
      </Text>

      <View style={styles.chips} accessibilityLabel="Filter features by tag">
        <TagChip
          label={`All (${FINKOIN_FEATURES.length})`}
          active={activeTag === null}
          onPress={() => setActiveTag(null)}
        />
        {USED_TAGS.map((tag) => (
          <TagChip
            key={tag}
            label={tag}
            active={activeTag === tag}
            onPress={() => setActiveTag(activeTag === tag ? null : tag)}
          />
        ))}
      </View>

      <View style={{ marginTop: 24, gap: 20 }}>
        {visible.map((f) => (
          <View key={f.id} style={styles.card}>
            <View style={styles.featHead}>
              <View style={[styles.iconBox, { width: 44, height: 44 }]}>
                <AppIcon name={f.icon} size={22} color={Colors.primaryText} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.category}>{f.category.toUpperCase()}</Text>
                <Text style={styles.featName}>{f.name}</Text>
              </View>
            </View>
            <Text style={styles.headline}>{f.headline}</Text>
            <Text style={styles.cardBody}>{f.body}</Text>
            <View style={{ marginTop: 16, gap: 8 }}>
              {f.highlights.map((h) => (
                <View key={h} style={styles.hl}>
                  <AppIcon name="check" size={16} color={Colors.primaryText} />
                  <Text style={styles.hlText}>{h}</Text>
                </View>
              ))}
            </View>
            <View style={styles.tags}>
              {f.tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setActiveTag(tag)}
                  style={tag === "Pro" ? styles.tagPro : styles.tag}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${tag} features`}
                >
                  <Text
                    style={tag === "Pro" ? styles.tagProText : styles.tagText}
                  >
                    #{tag}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => openContentHref(f.href)}
              style={styles.cta}
              accessibilityRole="link"
            >
              <Text style={styles.ctaText}>{f.cta}</Text>
              <AppIcon
                name="chevronRight"
                size={16}
                color={Colors.primaryText}
              />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.closing}>
        <Text style={styles.h2}>Start with a free health check</Text>
        <Text style={[styles.h2Sub, { textAlign: "center" }]}>
          It takes about 5 minutes and needs no PAN or Aadhaar.
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(auth)/signup",
              params: { next: "/analyse" },
            })
          }
          style={[styles.pill, { marginTop: 24 }]}
          accessibilityRole="button"
        >
          <Text style={styles.pillText}>Create free account</Text>
        </Pressable>
        <Text style={styles.disclaimer}>
          Finkoin is an educational tool. It is not a SEBI-registered investment
          adviser and does not sell or recommend insurance or investment
          products. FK are in-app rewards with no cash value. Read the{" "}
          <Text
            style={styles.disclaimerLink}
            onPress={() => openContentHref("/legal/disclaimer")}
            accessibilityRole="link"
          >
            disclaimer
          </Text>
          .
        </Text>
      </View>
    </ContentScreen>
  );
}

function TagChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  hero: { alignItems: "center", paddingTop: 16, paddingBottom: 32 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.primaryText,
  },
  h1: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    textAlign: "center",
    color: Colors.textPrimary,
  },
  heroBody: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: Colors.textSecondary,
  },
  pill: {
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  pillText: { fontSize: 14, fontWeight: "600", color: Colors.onPrimary },
  pillOutline: {
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderIndigo,
    backgroundColor: Colors.card,
  },
  pillOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 20,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },
  uspTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  cardBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  h2: {
    marginTop: 48,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    color: Colors.textPrimary,
  },
  h2Sub: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    color: Colors.textSecondary,
  },
  chips: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderIndigo,
    backgroundColor: Colors.card,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
  chipTextActive: { color: Colors.onPrimary },
  featHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  category: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    color: Colors.textMuted,
  },
  featName: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  headline: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primaryText,
  },
  hl: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hlText: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  tags: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primaryLight,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: Colors.primaryDark },
  tagPro: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primary,
  },
  tagProText: { fontSize: 11, fontWeight: "600", color: Colors.onPrimary },
  cta: {
    marginTop: 20,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
  },
  ctaText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
  closing: { alignItems: "center", paddingBottom: 32 },
  disclaimer: {
    marginTop: 32,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: Colors.textMuted,
  },
  disclaimerLink: { fontWeight: "600", color: Colors.primaryText },
}));
