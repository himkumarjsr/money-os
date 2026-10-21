/**
 * Signed-out Report tab - port of web `components/landing/AnalyseMarketingLanding.tsx`
 * (copy verbatim). Primary CTA → signup, secondary → login, both returning
 * to the Report tab.
 */
import { View, Text, ScrollView } from "react-native";
import { router, type Href } from "expo-router";
import {
  Colors,
  Spacing,
  FontSize,
  themedStyles,
} from "@/constants/theme";
import Button from "@/components/ui/Button";
import { openContentHref } from "@/lib/contentLinks";

const FAQS = [
  {
    q: "What is the Finkoin financial health check?",
    a: "A free 5-minute assessment that scores your emergency fund, insurance cover, debt load, and investing habits - built for Indian salaries, EMIs, and goals.",
  },
  {
    q: "Do I need PAN or Aadhaar?",
    a: "No. Finkoin does not ask for PAN or Aadhaar for the health check.",
  },
  {
    q: "Is it really free?",
    a: "Yes. You can start the core financial health check free. Sign in only when you are ready to save your plan.",
  },
  {
    q: "What do I get after the check?",
    a: "A score out of 100, clear gaps (like emergency fund or term cover), and a practical fix plan you can act on month by month.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Answer simple money questions",
    body: "Income, EMIs, insurance, and investments - no jargon wall.",
  },
  {
    n: "2",
    title: "Get your health score",
    body: "See what is strong and what needs attention, in plain language.",
  },
  {
    n: "3",
    title: "Follow a fix plan",
    body: "Prioritised actions for India: emergency fund, cover gaps, debt, SIPs.",
  },
] as const;

const PILLARS = [
  {
    t: "Emergency fund",
    d: "Are you covered for 3–12 months of essentials if income pauses?",
  },
  {
    t: "Term insurance",
    d: "Is your cover enough for dependents - or is there a silent gap?",
  },
  {
    t: "Debt load",
    d: "EMIs and credit stress vs income - what is sustainable.",
  },
  {
    t: "Investing habits",
    d: "SIPs and long-term savings vs lifestyle leak.",
  },
] as const;

const NEXT = "/(tabs)/analyse";

function signup() {
  router.push({ pathname: "/(auth)/signup", params: { next: NEXT } } as Href);
}
function login() {
  router.push({ pathname: "/(auth)/login", params: { next: NEXT } } as Href);
}

export function AnalyseMarketingLanding({
  bottomInset = 120,
}: {
  bottomInset?: number;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Finkoin Analyse</Text>
        <Text style={styles.h1} accessibilityRole="header">
          Know your financial health score in 5 minutes
        </Text>
        <Text style={styles.lead}>
          Free check for India - emergency fund, term insurance, debt, and
          investments. No PAN. No Aadhaar. Clear next steps, not a lecture.
        </Text>
        <Button
          label="Start free health check"
          onPress={signup}
          style={styles.cta}
        />
        <Button
          label="Log in"
          variant="secondary"
          onPress={login}
          style={styles.cta}
        />
        <Text style={styles.fine}>
          Free to start · Built for Indian salaries & EMIs · Takes ~5 minutes
        </Text>
      </View>

      <Text style={styles.h2}>What Finkoin checks</Text>
      <Text style={styles.sub}>
        Four pillars that decide whether your money plan is resilient.
      </Text>
      <View style={styles.list}>
        {PILLARS.map((item) => (
          <View key={item.t}>
            <Text style={styles.pillarTitle}>{item.t}</Text>
            <Text style={styles.body}>{item.d}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.h2, styles.sectionGap]}>How it works</Text>
      <View style={styles.list}>
        {STEPS.map((s) => (
          <View key={s.n} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{s.n}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.h2, styles.sectionGap]}>Common questions</Text>
      <View style={styles.list}>
        {FAQS.map((f) => (
          <View key={f.q}>
            <Text style={styles.faqQ}>{f.q}</Text>
            <Text style={styles.body}>{f.a}</Text>
          </View>
        ))}
      </View>

      <View style={styles.final}>
        <Text style={styles.h2}>Ready for your score?</Text>
        <Text style={styles.sub}>
          Create a free Finkoin account and start the financial health check.
        </Text>
        <Button
          label="Start free health check"
          onPress={signup}
          style={styles.cta}
        />
        <Text style={styles.alsoRow}>
          Also explore{" "}
          <Text
            style={styles.alsoLink}
            accessibilityRole="link"
            onPress={() => openContentHref("/calculators/sip")}
          >
            SIP calculator
          </Text>
          {" · "}
          <Text
            style={styles.alsoLink}
            accessibilityRole="link"
            onPress={() => router.push("/(tabs)/split" as Href)}
          >
            Finkoin Split
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

export default AnalyseMarketingLanding;

const styles = themedStyles(() => ({
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
  hero: { alignItems: "center", paddingBottom: Spacing.xxl },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: Colors.primaryText,
  },
  h1: {
    marginTop: Spacing.md,
    fontSize: FontSize.xxxl,
    lineHeight: 36,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  lead: {
    marginTop: Spacing.lg,
    fontSize: FontSize.base,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  cta: { marginTop: Spacing.md, minHeight: 52, alignSelf: "stretch" },
  fine: {
    marginTop: Spacing.lg,
    fontSize: FontSize.xs,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  h2: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  sub: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionGap: { marginTop: Spacing.xxxl },
  list: { marginTop: Spacing.xl, gap: Spacing.xl },
  pillarTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  body: {
    marginTop: 4,
    fontSize: FontSize.sm,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  stepRow: { flexDirection: "row", gap: Spacing.lg },
  stepNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.onPrimary,
  },
  flex1: { flex: 1 },
  stepTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  faqQ: {
    fontSize: FontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  final: { marginTop: Spacing.xxxl, alignItems: "stretch" },
  alsoRow: {
    marginTop: Spacing.lg,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  alsoLink: { fontWeight: "700", color: Colors.primaryText },
}));
