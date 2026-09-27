import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
} from "react-native";
import { router } from "expo-router";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

const INTERVAL_MS = 3000;

type Slide =
  | {
      key: string;
      title: string;
      subtitle: string;
      cta: string;
      route: string;
      needsAuth?: boolean;
      isNew?: boolean;
    }
  | {
      key: string;
      title: string;
      subtitle: string;
      comingSoon: true;
    };

/** Same copy as web HomeHeroCarousel (mobile density). */
const SLIDES: Slide[] = [
  {
    key: "score",
    title: "Start your financial freedom journey",
    subtitle:
      "Meet your Finkoin advisor—interactive, step-by-step guidance on emergency fund, insurance, and your fix plan in minutes.",
    cta: "Meet your advisor",
    route: "/(tabs)/analyse",
    needsAuth: true,
  },
  {
    key: "tax",
    title: "New vs old tax regime",
    subtitle:
      "Compare regimes with HRA, 80C, NPS — built for FY 2025-26 planning.",
    cta: "Open calculator",
    route: "/(tabs)/calculators",
  },
  {
    key: "portfolio",
    title: "Portfolio analysis",
    subtitle:
      "Review holdings and allocation in one workspace — built for Indian investors.",
    comingSoon: true,
  },
  {
    key: "tracker",
    title: "Expense Tracker",
    subtitle:
      "Track every rupee. See where money goes. Get insights to spend better.",
    cta: "Start tracking",
    route: "/(tabs)/tracker",
    needsAuth: true,
    isNew: true,
  },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [height, setHeight] = useState(100);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(advance, INTERVAL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [advance, paused]);

  const slide = SLIDES[index];

  const onCta = () => {
    if ("comingSoon" in slide && slide.comingSoon) return;
    if (!("route" in slide)) return;
    if (slide.needsAuth && !isLoggedIn) {
      router.push("/(auth)/login");
      return;
    }
    router.push(slide.route as any);
  };

  const onLayoutInner = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > height) setHeight(h);
  };

  return (
    <View
      style={styles.region}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <View style={[styles.stage, { minHeight: height }]}>
        <View style={styles.slide} onLayout={onLayoutInner}>
          {"isNew" in slide && slide.isNew ? (
            <View style={styles.badgeNew}>
              <Text style={styles.badgeNewText}>NEW</Text>
            </View>
          ) : null}
          {"comingSoon" in slide && slide.comingSoon ? (
            <View style={styles.badgeSoon}>
              <Text style={styles.badgeSoonText}>Coming soon</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{slide.title}</Text>
          {/* PWA hides subtitle on xs (hidden sm:block) — keep carousel compact */}
          {"comingSoon" in slide && slide.comingSoon ? (
            <View style={styles.ctaDisabled}>
              <Text style={styles.ctaDisabledText}>Coming soon</Text>
            </View>
          ) : (
            <Pressable
              onPress={onCta}
              style={({ pressed }) => [
                styles.cta,
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={styles.ctaText}>
                {"cta" in slide ? slide.cta : ""}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.dots} accessibilityRole="tablist">
        {SLIDES.map((s, i) => (
          <Pressable
            key={s.key}
            onPress={() => setIndex(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === index }}
            hitSlop={8}
            style={[
              styles.dot,
              i === index ? styles.dotActive : styles.dotIdle,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  region: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stage: {
    width: "100%",
    alignItems: "center",
  },
  slide: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeNew: {
    marginBottom: 2,
    backgroundColor: "#047857",
    borderRadius: Radius.round,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeNewText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  badgeSoon: {
    marginBottom: 2,
    backgroundColor: "#E2E8F0",
    borderRadius: Radius.round,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeSoonText: {
    color: "#1E293B",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 15,
    color: "#475569",
    paddingHorizontal: 8,
  },
  cta: {
    marginTop: 8,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    // PWA: indigo → violet → blue gradient approx
    backgroundColor: "#4F46E5",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  ctaDisabled: {
    marginTop: 8,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabledText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  dots: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotActive: {
    minWidth: 18,
    backgroundColor: Colors.primary,
    paddingHorizontal: 4,
  },
  dotIdle: {
    width: 6,
    backgroundColor: "#CBD5E1",
  },
});
