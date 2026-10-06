/**
 * Hamburger drawer — every PWA footer item (components/landing/Footer.tsx):
 * CTA, Product / Company / Legal links, socials, trust strip, copyright.
 * In-app screens open natively; web-only pages open in the in-app browser.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { AppIcon } from "@/components/ui/AppIcon";
import { BrandLogo } from "@/components/ui/BrandLogo";

const SITE = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://www.finkoin.com"
).replace(/\/$/, "");

type NavLink =
  | { label: string; route: Href }
  | { label: string; web: string }
  | { label: string; mail: string };

const COLUMNS: Array<{ heading: string; links: NavLink[] }> = [
  {
    heading: "Product",
    links: [
      { label: "Financial Health Check", route: "/(tabs)/analyse" },
      { label: "FK Split", route: "/(tabs)/split" },
      {
        label: "Tax Calculator",
        route: {
          pathname: "/(tabs)/calculators",
          params: { tool: "tax-regime" },
        },
      },
      {
        label: "SIP Calculator",
        route: { pathname: "/(tabs)/calculators", params: { tool: "sip" } },
      },
      {
        label: "SWP Calculator",
        route: { pathname: "/(tabs)/calculators", params: { tool: "swp" } },
      },
      {
        label: "EMI Calculator",
        route: { pathname: "/(tabs)/calculators", params: { tool: "emi" } },
      },
      { label: "Portfolio Analysis", web: "/portfolio" },
      { label: "Learn", web: "/learn" },
      {
        label: "Calculators",
        route: { pathname: "/(tabs)/calculators", params: { tool: "" } },
      },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", web: "/about" },
      { label: "Blog", web: "/blog" },
      { label: "Careers", web: "/careers" },
      { label: "Press", web: "/press" },
      { label: "Contact", mail: "hello@finkoin.com" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", web: "/legal/privacy" },
      { label: "Terms of Service", web: "/legal/terms" },
      { label: "Refund Policy", web: "/legal/refund" },
      { label: "Disclaimer", web: "/legal/disclaimer" },
    ],
  },
];

const SOCIALS = [
  {
    label: "Twitter",
    href: "https://twitter.com/finkoin",
    d: "M18.9 2H22l-6.78 7.75L23.2 22h-6.26l-4.9-6.4L6.46 22H3.34l7.25-8.28L1 2h6.42l4.43 5.85L18.9 2Zm-1.1 18.1h1.74L6.47 3.8H4.6L17.8 20.1Z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/finkoin",
    d: "M6.94 8.5H3.56V20h3.38V8.5Zm.22-3.56C7.15 3.87 6.29 3 5.25 3S3.34 3.87 3.34 4.94s.84 1.94 1.9 1.94h.02c1.05 0 1.9-.87 1.9-1.94ZM20.66 13.4c0-3.34-1.78-4.9-4.15-4.9-1.91 0-2.76 1.05-3.24 1.78V8.5H9.9c.04 1.18 0 11.5 0 11.5h3.37v-6.42c0-.34.02-.68.13-.92.28-.68.9-1.38 1.95-1.38 1.37 0 1.92 1.04 1.92 2.56V20H20.66v-6.6Z",
  },
];

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.86, 360);

export function NavDrawer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(slide, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const open = (link: NavLink) => {
    onClose();
    if ("route" in link) router.push(link.route);
    else if ("web" in link)
      void WebBrowser.openBrowserAsync(`${SITE}${link.web}`);
    else void Linking.openURL(`mailto:${link.mail}`);
  };

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }] }]}
        accessibilityViewIsModal
      >
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="fkFooter" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#161430" />
              <Stop offset="0.5" stopColor="#221944" />
              <Stop offset="1" stopColor="#0D0D17" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fkFooter)" />
        </Svg>
        <View style={[styles.glow, styles.glowIndigo]} pointerEvents="none" />
        <View style={[styles.glow, styles.glowViolet]} pointerEvents="none" />

        <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => {
                onClose();
                router.push("/(tabs)");
              }}
              accessibilityRole="link"
              accessibilityLabel="Finkoin home"
              style={styles.brandRow}
            >
              <BrandLogo size={36} />
              <Text style={styles.brandText}>Finkoin</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              style={styles.closeBtn}
            >
              <AppIcon name="close" size={22} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>
                Start your financial journey today
              </Text>
              <Text style={styles.ctaSub}>Takes less than 2 minutes</Text>
              <Pressable
                onPress={() => open({ label: "", route: "/(tabs)/analyse" })}
                accessibilityRole="button"
                accessibilityLabel="Get free financial plan"
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaBtnText}>Get Free Financial Plan</Text>
              </Pressable>
            </View>

            <Text style={styles.tagline}>
              Built for India 🇮🇳 • Smart financial decisions powered by AI
            </Text>
            <Text style={styles.about}>
              Finkoin helps you analyze, plan, and improve your finances with
              AI-powered insights.
            </Text>
            <View style={styles.socialRow}>
              {SOCIALS.map((s) => (
                <Pressable
                  key={s.label}
                  onPress={() => void Linking.openURL(s.href)}
                  accessibilityRole="link"
                  accessibilityLabel={s.label}
                  style={styles.socialBtn}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24">
                    <Path d={s.d} fill="rgba(255,255,255,0.8)" />
                  </Svg>
                </Pressable>
              ))}
            </View>

            {COLUMNS.map((col) => (
              <View key={col.heading} style={styles.column}>
                <Text style={styles.colHeading}>{col.heading}</Text>
                {col.links.map((link) => (
                  <Pressable
                    key={link.label}
                    onPress={() => open(link)}
                    accessibilityRole="link"
                    style={({ pressed }) => [
                      styles.linkRow,
                      pressed && styles.linkRowPressed,
                    ]}
                  >
                    <Text style={styles.linkText}>{link.label}</Text>
                  </Pressable>
                ))}
                {col.heading === "Legal" ? (
                  <Text style={styles.sebi}>
                    We are not SEBI-registered advisors.
                  </Text>
                ) : null}
              </View>
            ))}

            <View style={styles.trust}>
              <Text style={styles.trustText}>10,000+ users</Text>
              <Text style={styles.trustText}>Made in India 🇮🇳</Text>
              <View style={styles.trustInline}>
                <AppIcon name="lock" size={14} color="#C4C2E8" />
                <Text style={styles.trustText}>Bank-level security</Text>
              </View>
              <Text style={styles.trustText}>
                No spam • No credit card required
              </Text>
            </View>

            <View style={styles.copyright}>
              <Text style={styles.copyText}>
                © 2026 Finkoin. All rights reserved. Made with{" "}
              </Text>
              <AppIcon name="heart" size={14} color="#C4C2E8" />
              <Text style={styles.copyText}> in India 🇮🇳</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    overflow: "hidden",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  glow: { position: "absolute", width: 180, height: 180, borderRadius: 90 },
  glowIndigo: {
    left: -80,
    top: 60,
    backgroundColor: "rgba(99,102,241,0.18)",
  },
  glowViolet: {
    right: -90,
    top: 260,
    backgroundColor: "rgba(139,92,246,0.14)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  ctaCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 18,
  },
  ctaTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  ctaSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  ctaBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#6D5CF0",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  tagline: {
    marginTop: 22,
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "500",
  },
  about: {
    marginTop: 8,
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    lineHeight: 19,
  },
  socialRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  column: { marginTop: 24 },
  colHeading: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  linkRow: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 8,
  },
  linkRowPressed: { backgroundColor: "rgba(255,255,255,0.06)" },
  linkText: { color: "rgba(255,255,255,0.8)", fontSize: 15 },
  sebi: {
    marginTop: 4,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    lineHeight: 17,
  },
  trust: {
    marginTop: 26,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  trustInline: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "500",
  },
  copyright: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
  },
  copyText: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
});
