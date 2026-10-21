import { useRef } from "react";
import {
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  Colors,
  FINKOIN_TAGLINE,
  FINKOIN_TAGLINE_SUB,
  brand,
  getActiveTheme,
  themedStyles,
} from "@/constants/theme";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { QuickTools } from "@/components/landing/QuickTools";
import { TopPicks } from "@/components/landing/TopPicks";
import { Footer } from "@/components/landing/Footer";
import { WhatYouGet } from "@/components/home/WhatYouGet";
import { Pricing } from "@/components/home/Pricing";
import { GoldText } from "@/components/ui/GoldMirror";
import { reportScrollY } from "@/store/chromeStore";

/**
 * Public home = PWA landing (`app/page.tsx` + HomePageClient + HomePageBelowFold).
 * Order, signed in or out: H1/H2, hero carousel, quick tools, top picks,
 * "What you get", "Pricing", then the global Footer. The header and dock come
 * from GlobalChrome.
 */
export default function HomeScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    const max = Math.max(1, contentSize.height - layoutMeasurement.height);
    progress.setValue(Math.min(1, Math.max(0, y / max)));
    reportScrollY(y);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroWash} pointerEvents="none" />
          <View style={styles.orbA} pointerEvents="none" />
          <View style={styles.orbB} pointerEvents="none" />
          <View style={styles.orbC} pointerEvents="none" />

          <GoldText style={styles.h1Sub}>{FINKOIN_TAGLINE_SUB}</GoldText>
          <Text style={styles.h1Main}>{FINKOIN_TAGLINE}</Text>
          <Text style={styles.h2}>
            Check your financial health score, calculate tax savings, plan
            investments - everything in one place. No PAN needed.
          </Text>

          <View style={styles.carouselWrap}>
            <HeroCarousel />
          </View>

          <View style={styles.toolsWrap}>
            <QuickTools />
          </View>
        </View>

        <View style={styles.belowFold}>
          <TopPicks />
        </View>

        <WhatYouGet />
        <Pricing />
        <Footer bottomPad={96} />
      </ScrollView>

      {/* Web HomePageClient: indigo -> violet -> fuchsia scroll progress bar. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.progress, { transform: [{ scaleX: progress }] }]}
      >
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 4">
          <Defs>
            <LinearGradient id="fkHomeProgress" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={brand("#4F46E5")} />
              <Stop offset="0.5" stopColor={brand("#7C3AED")} />
              <Stop offset="1" stopColor={brand("#D946EF")} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="4" fill="url(#fkHomeProgress)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Premium: soft gold glow over the dark gold hero instead of violet orbs. */
const premiumHero = () => getActiveTheme() === "premium";

const styles = themedStyles(() => ({
  root: {
    flex: 1,
    // PWA: from-indigo-50 via-[#F4F2FC] to-violet-50
    backgroundColor: Colors.surfaceMuted,
  },
  scroll: {
    paddingBottom: 0,
  },
  progress: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    width: "100%",
    transformOrigin: "left center",
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: Colors.heroBorder,
    overflow: "hidden",
    alignItems: "center",
  },
  heroWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.heroWash,
  },
  orbA: {
    position: "absolute",
    left: "7%",
    top: 40,
    height: 160,
    width: 160,
    borderRadius: 999,
    backgroundColor: premiumHero()
      ? "rgba(212,175,55,0.07)"
      : "rgba(167,139,250,0.28)",
  },
  orbB: {
    position: "absolute",
    right: "4%",
    top: 56,
    height: 192,
    width: 192,
    borderRadius: 999,
    backgroundColor: premiumHero()
      ? "rgba(252,246,186,0.05)"
      : "rgba(129,140,248,0.22)",
  },
  orbC: {
    position: "absolute",
    left: "32%",
    bottom: 48,
    height: 100,
    width: 100,
    borderRadius: 999,
    backgroundColor: Colors.primaryTint,
  },
  // PWA mobile: text-3xl / text-center / #534AB7 then slate-900
  h1Sub: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "600",
    color: Colors.primaryText,
    letterSpacing: -0.75,
    lineHeight: 32,
    paddingHorizontal: 8,
  },
  h1Main: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.75,
    lineHeight: 32,
    paddingHorizontal: 8,
  },
  h2: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "400",
    color: Colors.textSecondary,
    maxWidth: 340,
    paddingHorizontal: 8,
  },
  carouselWrap: {
    marginTop: 12,
    width: "100%",
  },
  toolsWrap: {
    marginTop: 12,
    width: "100%",
  },
  belowFold: {
    backgroundColor: Colors.card,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
}));
