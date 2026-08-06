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
 * Public home = PWA landing, inside tabs so bottom nav is always visible.
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
            >
              <Text style={styles.footerCtaText}>Create free account</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(auth)/login")}>
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
    backgroundColor: "#EEF2FF",
  },
  scroll: {
    // clear floating glass bottom nav
    paddingBottom: 120,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 36,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(199,210,254,0.8)",
    overflow: "hidden",
    backgroundColor: "rgba(224,231,255,0.65)",
  },
  orbA: {
    position: "absolute",
    left: "7%",
    top: 40,
    height: 120,
    width: 120,
    borderRadius: 999,
    backgroundColor: "rgba(196,181,253,0.45)",
  },
  orbB: {
    position: "absolute",
    right: "4%",
    top: 80,
    height: 140,
    width: 140,
    borderRadius: 999,
    backgroundColor: "rgba(165,180,252,0.4)",
  },
  orbC: {
    position: "absolute",
    left: "35%",
    bottom: 40,
    height: 90,
    width: 90,
    borderRadius: 999,
    backgroundColor: "rgba(191,219,254,0.35)",
  },
  h1Sub: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h1Main: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h2: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    maxWidth: 360,
  },
  carouselWrap: {
    marginTop: 20,
  },
  toolsWrap: {
    marginTop: 16,
  },
  belowFold: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
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
    alignItems: "center",
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
  },
  footerLoginStrong: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
