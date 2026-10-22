/**
 * Native port of web components/landing/Footer.tsx. Rendered at the end of the
 * home screen and other content scroll views (replaces the old hamburger
 * NavDrawer). Copy and links are verbatim from the web footer; the dark
 * indigo gradient is the same in every theme, like on the web.
 */
import { Linking, Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { AppIcon } from "@/components/ui/AppIcon";
import { BrandCoin } from "@/components/ui/BrandCoin";
import { themedStyles } from "@/constants/theme";

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeenhOEAOJdHPu_pkz2tc4imGI_x9zKgrlvFNnCa1f5AEKXkg/viewform?usp=header";

type FooterLink = { label: string; href: string };

const COLUMNS: ReadonlyArray<{ heading: string; links: FooterLink[] }> = [
  {
    heading: "Product",
    links: [
      { label: "All Features", href: "/features" },
      { label: "Financial Health Check", href: "/(tabs)/analyse" },
      { label: "Settle Up", href: "/(tabs)/split" },
      { label: "Tax Calculator", href: "/calculators/tax-regime" },
      { label: "SIP Calculator", href: "/calculators/sip" },
      { label: "SWP Calculator", href: "/calculators/swp" },
      { label: "EMI Calculator", href: "/calculators/emi" },
      { label: "Portfolio Analysis", href: "/portfolio" },
      { label: "Learn", href: "/learn" },
      { label: "Calculators", href: "/(tabs)/calculators" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "mailto:hello@finkoin.com" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Refund Policy", href: "/legal/refund" },
      { label: "Disclaimer", href: "/legal/disclaimer" },
    ],
  },
];

const SOCIALS = [
  {
    label: "Twitter",
    href: "https://twitter.com/finkoin",
    path: "M18.9 2H22l-6.78 7.75L23.2 22h-6.26l-4.9-6.4L6.46 22H3.34l7.25-8.28L1 2h6.42l4.43 5.85L18.9 2Zm-1.1 18.1h1.74L6.47 3.8H4.6L17.8 20.1Z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/finkoin",
    path: "M6.94 8.5H3.56V20h3.38V8.5Zm.22-3.56C7.15 3.87 6.29 3 5.25 3S3.34 3.87 3.34 4.94s.84 1.94 1.9 1.94h.02c1.05 0 1.9-.87 1.9-1.94ZM20.66 13.4c0-3.34-1.78-4.9-4.15-4.9-1.91 0-2.76 1.05-3.24 1.78V8.5H9.9c.04 1.18 0 11.5 0 11.5h3.37v-6.42c0-.34.02-.68.13-.92.28-.68.9-1.38 1.95-1.38 1.37 0 1.92 1.04 1.92 2.56V20H20.66v-6.6Z",
  },
] as const;

function open(href: string) {
  if (href.startsWith("http") || href.startsWith("mailto:")) {
    void Linking.openURL(href);
    return;
  }
  router.push(href as Href);
}

/** `bottomPad`: extra space so the floating dock never covers the copyright (tab screens). */
export function Footer({ bottomPad = 0 }: { bottomPad?: number }) {
  return (
    <View style={styles.root} accessibilityRole="summary" accessibilityLabel="Site footer">
      <Svg
        style={styles.bg}
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="fkFooterBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#161430" />
            <Stop offset="0.5" stopColor="#221944" />
            <Stop offset="1" stopColor="#0d0d17" />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#fkFooterBg)" />
      </Svg>
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />

      <View style={[styles.inner, bottomPad ? { paddingBottom: 32 + bottomPad } : null]}>
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Start your financial journey today</Text>
          <Text style={styles.ctaSub}>Takes less than 2 minutes</Text>
          <Pressable
            onPress={() => open("/(tabs)/analyse")}
            accessibilityRole="link"
            accessibilityLabel="Get free financial plan"
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>Get Free Financial Plan</Text>
          </Pressable>
        </View>

        <View style={styles.brandBlock}>
          <Pressable
            onPress={() => router.push("/(tabs)")}
            accessibilityRole="link"
            accessibilityLabel="Finkoin home"
            style={styles.logoRow}
          >
            <BrandCoin size={40} />
            <Text style={styles.logoText}>Finkoin</Text>
          </Pressable>
          <Text style={styles.tagline}>
            Built for India 🇮🇳 • Smart financial decisions powered by AI
          </Text>
          <Text style={styles.about}>
            Finkoin helps you analyze, plan, and improve your finances with
            AI-powered insights.
          </Text>
          <View style={styles.socials}>
            {SOCIALS.map((s) => (
              <Pressable
                key={s.label}
                onPress={() => open(s.href)}
                accessibilityRole="link"
                accessibilityLabel={s.label}
                style={styles.socialBtn}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d={s.path} fill="rgba(255,255,255,0.8)" />
                </Svg>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.columns}>
          {COLUMNS.map((col) => (
            <View key={col.heading} style={styles.column}>
              <Text style={styles.colHeading}>{col.heading}</Text>
              {col.links.map((l) => (
                <Pressable
                  key={l.label}
                  onPress={() => open(l.href)}
                  accessibilityRole="link"
                  accessibilityLabel={l.label}
                  style={styles.linkBtn}
                >
                  <Text style={styles.link}>{l.label}</Text>
                </Pressable>
              ))}
              {col.heading === "Legal" ? (
                <Text style={styles.sebi}>
                  We are not SEBI-registered advisors.
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.trust}>
          <Text style={styles.trustText}>10,000+ users</Text>
          <Text style={styles.trustText}>Made in India 🇮🇳</Text>
          <View style={styles.trustRow}>
            <AppIcon name="lock" size={14} color="#C4C2E8" />
            <Text style={styles.trustText}>Bank-level security</Text>
          </View>
          <Text style={styles.trustText}>No spam • No credit card required</Text>
        </View>

        <View style={styles.feedbackWrap}>
          <Pressable
            onPress={() => void Linking.openURL(GOOGLE_FORM_URL)}
            accessibilityRole="link"
            style={styles.feedbackBtn}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="#534AB7"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.feedbackText}>Share feedback</Text>
          </Pressable>
        </View>

        <View style={styles.copyRow}>
          <Text style={styles.copy}>
            © 2026 Finkoin. All rights reserved. Made with{" "}
          </Text>
          <AppIcon name="heart" size={14} color="#C4C2E8" />
          <Text style={styles.copy}> in India 🇮🇳</Text>
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: {
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#161430",
  },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  glowA: {
    position: "absolute",
    left: -60,
    top: 32,
    height: 160,
    width: 160,
    borderRadius: 80,
    backgroundColor: "rgba(99,102,241,0.18)",
  },
  glowB: {
    position: "absolute",
    right: -70,
    top: 140,
    height: 176,
    width: 176,
    borderRadius: 88,
    backgroundColor: "rgba(139,92,246,0.14)",
  },
  inner: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 32 },
  ctaCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 24,
  },
  ctaTitle: { fontSize: 20, fontWeight: "600", color: "#FFFFFF", letterSpacing: -0.3 },
  ctaSub: { marginTop: 4, fontSize: 14, color: "rgba(255,255,255,0.75)" },
  ctaBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    backgroundColor: "#6366F1",
  },
  ctaBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  brandBlock: { marginTop: 40 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    minHeight: 44,
  },
  logoText: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.4 },
  tagline: { marginTop: 12, fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.8)" },
  about: { marginTop: 12, maxWidth: 384, fontSize: 14, lineHeight: 22, color: "rgba(255,255,255,0.65)" },
  socials: { marginTop: 20, flexDirection: "row", gap: 10 },
  socialBtn: {
    height: 44,
    width: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  columns: { marginTop: 40, flexDirection: "row", flexWrap: "wrap", rowGap: 32 },
  column: { width: "50%", paddingRight: 12 },
  colHeading: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
    marginBottom: 6,
  },
  linkBtn: { minHeight: 36, justifyContent: "center" },
  link: { fontSize: 14, color: "rgba(255,255,255,0.75)" },
  sebi: { paddingTop: 4, fontSize: 12, lineHeight: 18, color: "rgba(255,255,255,0.55)" },
  trust: {
    marginTop: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.75)" },
  feedbackWrap: { marginTop: 24, alignItems: "center" },
  feedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#AFA9EC",
    backgroundColor: "#EEEDFE",
  },
  feedbackText: { fontSize: 13, fontWeight: "600", color: "#534AB7" },
  copyRow: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  copy: { fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "center" },
}));
