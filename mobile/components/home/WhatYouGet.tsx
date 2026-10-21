/** "What you get" home section - web HomePageBelowFold + FeatureCardsCarousel. */
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Colors, themedStyles } from "@/constants/theme";
import { GoldText } from "@/components/ui/GoldMirror";

const FEATURES = [
  {
    title: "Financial Health Check",
    body: "See exactly where your money goes and what to improve in minutes.",
  },
  {
    title: "Smart Calculators",
    body: "Plan SIP, EMI, tax, and retirement with fast, India-ready tools.",
  },
  {
    title: "AI Action Plan",
    body: "Get exact next steps to fix leaks and grow your wealth faster.",
  },
  {
    title: "Mutual Fund Analysis",
    body: "Break down returns, risk, and allocation before you invest.",
  },
  {
    title: "Monthly Finance Tracker",
    body: "Stay in control with one monthly view of income, spends, and goals.",
  },
  {
    title: "Earn Finkoin Keys",
    body: "Earn FK as you hit money milestones, then use it as a discount on Finkoin products.",
  },
] as const;

export function WhatYouGet() {
  const { width } = useWindowDimensions();
  const pageW = Math.min(width, 512) - 32;
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
    if (i !== active && i >= 0 && i < FEATURES.length) setActive(i);
  };
  const goTo = (i: number) => {
    setActive(i);
    scrollRef.current?.scrollTo({ x: i * pageW, animated: true });
  };

  return (
    <View style={styles.section}>
      <GoldText style={styles.kicker}>What you get</GoldText>
      <Text style={styles.heading}>
        Understand your money. Take control. Grow it faster.
      </Text>

      <View style={[styles.carousel, { width: pageW, alignSelf: "center" }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {FEATURES.map((f) => (
            <View key={f.title} style={{ width: pageW }}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View
          style={styles.dots}
          accessibilityRole="tablist"
          accessibilityLabel="Feature slides"
        >
          {FEATURES.map((f, i) => (
            <Pressable
              key={f.title}
              onPress={() => goTo(i)}
              hitSlop={10}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === active }}
              accessibilityLabel={`${f.title}${i === active ? ", current slide" : ""}`}
              style={i === active ? styles.dotActive : styles.dot}
            />
          ))}
        </View>
      </View>

      <Text style={styles.hint}>
        Swipe on mobile, or use arrows and dots on larger screens
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    backgroundColor: Colors.backgroundDeep,
    borderBottomWidth: 1,
    borderBottomColor: Colors.heroBorder,
  },
  kicker: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: Colors.accent,
  },
  heading: {
    marginTop: 12,
    alignSelf: "center",
    maxWidth: 420,
    textAlign: "center",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  carousel: { marginTop: 32 },
  card: {
    marginHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 24,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.13,
    shadowRadius: 38,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  cardBody: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 23,
    color: Colors.textSecondary,
  },
  dots: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: { height: 10, width: 10, borderRadius: 5, backgroundColor: Colors.slate300 },
  dotActive: { height: 10, width: 28, borderRadius: 5, backgroundColor: Colors.primary },
  hint: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
}));
