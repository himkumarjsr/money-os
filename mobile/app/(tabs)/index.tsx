import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import {
  Colors,
  FINKOIN_TAGLINE,
  FINKOIN_TAGLINE_SUB,
} from "@/constants/theme";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { QuickTools } from "@/components/landing/QuickTools";
import { TopPicks } from "@/components/landing/TopPicks";
import { useAuthStore } from "@/store/authStore";

/**
 * Public home = PWA landing (`app/page.tsx` + HomePageClient mobile).
 * Centered hero, indigo/violet wash, carousel, quick tools, top picks.
 */
export default function HomeScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <View style={styles.root}>
      <LandingHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroWash} pointerEvents="none" />
          <View style={styles.orbA} pointerEvents="none" />
          <View style={styles.orbB} pointerEvents="none" />
          <View style={styles.orbC} pointerEvents="none" />

          <Text style={styles.h1Sub}>{FINKOIN_TAGLINE_SUB}</Text>
          <Text style={styles.h1Main}>{FINKOIN_TAGLINE}</Text>
          <Text style={styles.h2}>
            Check your financial health score, calculate tax savings, plan
            investments — everything in one place. No PAN needed.
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

        {!isLoggedIn ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Free forever · No PAN · No Aadhaar
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              style={({ pressed }) => [
                styles.footerCta,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.footerCtaText}>Create free account</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              hitSlop={8}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={styles.footerLogin}>
                Already have an account?{" "}
                <Text style={styles.footerLoginStrong}>Log in</Text>
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.footerLoggedIn} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // PWA: from-indigo-50 via-[#F4F2FC] to-violet-50
    backgroundColor: "#F4F2FC",
  },
  scroll: {
    paddingBottom: 120,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(199,210,254,0.8)",
    overflow: "hidden",
    alignItems: "center",
  },
  heroWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(224,231,255,0.72)",
  },
  orbA: {
    position: "absolute",
    left: "7%",
    top: 40,
    height: 160,
    width: 160,
    borderRadius: 999,
    backgroundColor: "rgba(167,139,250,0.28)",
  },
  orbB: {
    position: "absolute",
    right: "4%",
    top: 56,
    height: 192,
    width: 192,
    borderRadius: 999,
    backgroundColor: "rgba(129,140,248,0.22)",
  },
  orbC: {
    position: "absolute",
    left: "32%",
    bottom: 48,
    height: 100,
    width: 100,
    borderRadius: 999,
    backgroundColor: "rgba(191,219,254,0.35)",
  },
  // PWA mobile: text-3xl / text-center / #534AB7 then slate-900
  h1Sub: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "600",
    color: Colors.primary,
    letterSpacing: -0.5,
    lineHeight: 32,
    paddingHorizontal: 8,
  },
  h1Main: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    lineHeight: 34,
    paddingHorizontal: 8,
  },
  h2: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "400",
    color: "#475569",
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
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: "center",
  },
  footerLoggedIn: {
    backgroundColor: "#FFFFFF",
    height: 16,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  footerCta: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 220,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  footerLogin: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  footerLoginStrong: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
