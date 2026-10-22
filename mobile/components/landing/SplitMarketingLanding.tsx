/**
 * Signed-out Split landing - port of web `components/landing/SplitMarketingLanding.tsx`.
 */
import { Text, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Colors,
  Radius,
  Shadow,
  Spacing,
  FontSize,
  themedStyles,
} from "@/constants/theme";
import { GoldText } from "@/components/ui/GoldMirror";

const FAQS = [
  {
    q: "What is Finkoin Settle Up?",
    a: "A free expense-splitting app for friends, roommates, and trips in India. Create a group, add spends, and see who owes whom - clearly.",
  },
  {
    q: "Is Finkoin Settle Up a Splitwise alternative?",
    a: "Yes. It is built for Indian groups who want simple bill splitting without heavy clutter. Free to start.",
  },
  {
    q: "Can I invite friends with a link?",
    a: "Yes. Create a group, share an invite link, and members can join and add expenses together.",
  },
  {
    q: "Do I need to pay to split bills?",
    a: "No. Core splitting on Finkoin Settle Up is free.",
  },
] as const;

const FEATURES = [
  {
    t: "Groups for trips & flatmates",
    d: "One space per trip, PG, or friend circle - keep balances tidy.",
  },
  {
    t: "Add expenses in seconds",
    d: "Log who paid, split equally or your way, and move on.",
  },
  {
    t: "Clear settle-up view",
    d: "See simplified debts so you know exactly who to pay.",
  },
  {
    t: "Invite with a link",
    d: "Friends join without a long setup. Works on mobile.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    t: "Create a group",
    d: "Name it for a trip, flat, or weekend outing.",
  },
  {
    n: "2",
    t: "Invite friends",
    d: "Share a link - they join and can add expenses too.",
  },
  {
    n: "3",
    t: "Add spends & settle",
    d: "See balances and settle up when the trip ends.",
  },
] as const;

const goSignup = () =>
  router.push({ pathname: "/(auth)/signup", params: { next: "/split" } });
const goLogin = () =>
  router.push({ pathname: "/(auth)/login", params: { next: "/split" } });

export function SplitMarketingLanding() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <GoldText style={styles.eyebrow}>FINKOIN SETTLE UP</GoldText>
          <Text style={styles.title}>Split expenses with friends - simply</Text>
          <Text style={styles.sub}>
            Free group expense tracker for India. Trips, flatmates, dinners -
            track who paid, who owes, and settle without awkward maths. A clean
            Splitwise-style alternative.
          </Text>
          <TouchableOpacity
            style={styles.primary}
            onPress={goSignup}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>Create free Split account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={goLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryText}>Log in</Text>
          </TouchableOpacity>
          <Text style={styles.fine}>
            Free forever for core splitting · Mobile-friendly · Made for India
          </Text>
        </View>

        <Text style={styles.h2}>Why people use Finkoin Settle Up</Text>
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.t}>
              <Text style={styles.featureTitle}>{f.t}</Text>
              <Text style={styles.desc}>{f.d}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.h2, styles.sectionGap]}>How Split works</Text>
        <View style={styles.stepList}>
          {STEPS.map((s) => (
            <View key={s.n} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.descTight}>{s.d}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.h2, styles.sectionGap]}>Common questions</Text>
        <View style={styles.faqList}>
          {FAQS.map((f) => (
            <View key={f.q}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Text style={styles.desc}>{f.a}</Text>
            </View>
          ))}
        </View>

        <View style={styles.closing}>
          <Text style={styles.closingTitle}>Split the next bill the easy way</Text>
          <Text style={styles.closingSub}>
            Sign up free and create your first Finkoin Settle Up group in under a
            minute.
          </Text>
          <TouchableOpacity
            style={styles.closingBtn}
            onPress={goSignup}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>Create free Split account</Text>
          </TouchableOpacity>
          <Text style={styles.alsoTry}>
            Also try{" "}
            <Text
              style={styles.alsoLink}
              onPress={() => router.push("/(tabs)/analyse")}
              accessibilityRole="link"
            >
              financial health check
            </Text>
            {" · "}
            <Text
              style={styles.alsoLink}
              onPress={() => router.push("/calculators/emi")}
              accessibilityRole="link"
            >
              EMI calculator
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  hero: { alignItems: "center", paddingTop: 40, paddingBottom: 40 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: Colors.primaryText,
  },
  title: {
    marginTop: Spacing.md,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  sub: {
    marginTop: Spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  primary: {
    marginTop: Spacing.xxxl,
    minHeight: 48,
    alignSelf: "stretch",
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.strong,
  },
  primaryText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "600" },
  secondary: {
    marginTop: Spacing.md,
    minHeight: 48,
    alignSelf: "stretch",
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.primaryTintBorder,
    backgroundColor: Colors.glassCard,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: Colors.primaryText, fontSize: 14, fontWeight: "600" },
  fine: {
    marginTop: Spacing.lg,
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textMuted,
    textAlign: "center",
  },
  h2: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  sectionGap: { marginTop: 40 },
  featureList: { gap: Spacing.xxl, marginTop: Spacing.xl },
  featureTitle: { fontSize: 18, fontWeight: "600", color: Colors.primaryText },
  desc: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  descTight: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  stepList: { gap: Spacing.xxl, marginTop: Spacing.xl },
  stepRow: { flexDirection: "row", gap: Spacing.lg },
  stepNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "700" },
  stepTitle: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary },
  faqList: { gap: Spacing.xl, marginTop: Spacing.xl },
  faqQ: { fontSize: 16, fontWeight: "600", color: Colors.textPrimary },
  closing: { marginTop: 40, alignItems: "center" },
  closingTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  closingSub: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  closingBtn: {
    marginTop: Spacing.xl,
    minHeight: 48,
    paddingHorizontal: 32,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.strong,
  },
  alsoTry: {
    marginTop: Spacing.lg,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
  alsoLink: { fontWeight: "600", color: Colors.primaryText },
}));
