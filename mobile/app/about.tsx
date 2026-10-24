/** Native About - port of web app/about/page.tsx. */
import { Pressable, Text, View } from "react-native";
import {
  readable,
  Colors,
  themedStyles,
  onPrimaryAlpha,
} from "@/constants/theme";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { ContentScreen } from "@/components/content/ContentScreen";
import { openContentHref } from "@/lib/contentLinks";
import { GoldText } from "@/components/ui/GoldMirror";

/** Why Finkoin exists, in the team's words. Same text as app/about/page.tsx. */
const FOUNDER_NOTE = [
  "Most people we know earn well and pay their EMIs on time, yet can't answer simple questions about their own money: Is my emergency fund enough? Am I under-insured? Am I investing enough to retire when I want to? The answers exist, but they are buried in jargon, spread across ten different apps, or come from someone trying to sell a policy or a fund.",
  "We built Finkoin to be one honest place where any working Indian can see their whole money life in a few minutes: what is strong, what is at risk, and the next step to fix it. No PAN, no Aadhaar, no jargon. Every suggestion explains why, in plain language, so you can decide for yourself.",
  "That is the idea behind Know it. Fix it. Grow it. Start with a free health check, track where your money goes, split shared costs with friends without the awkwardness, and come back each month to see your progress. If Finkoin helps one family build an emergency fund or get the right cover before they need it, it has done its job.",
];

const PROBLEMS: { icon: AppIconName; title: string; desc: string }[] = [
  {
    icon: "wallet",
    title: "Money disappears",
    desc: "Most Indians earn well but never know where their money goes. No tracking, no awareness, no plan.",
  },
  {
    icon: "hospital",
    title: "No emergency fund",
    desc: "78% of Indians have less than 3 months of expenses saved. One health emergency can wipe out years of savings.",
  },
  {
    icon: "shield",
    title: "Wrong insurance",
    desc: "Most people are underinsured or have the wrong kind of insurance. LIC endowment plans instead of term insurance.",
  },
  {
    icon: "chart",
    title: "Financial advice is expensive",
    desc: "Good financial advisors charge ₹5,000-50,000 per year. Most Indians cannot afford this.",
  },
];

const STEPS = () => [
  {
    step: "01",
    title: "Financial Health Check",
    desc: "Answer simple questions about your income, expenses, loans, and savings. No PAN. No Aadhaar. Just numbers.",
    color: Colors.primaryText,
  },
  {
    step: "02",
    title: "AI-Powered Analysis",
    desc: "Our engine calculates your health score across 5 areas: emergency fund, insurance, debt, investments, and goals.",
    color: Colors.success,
  },
  {
    step: "03",
    title: "Personalised Fix Plan",
    desc: "Get a step-by-step action plan specific to your situation. Know exactly what to fix first and in how many months.",
    color: Colors.warning,
  },
  {
    step: "04",
    title: "Monthly Tracking",
    desc: "Track your spending monthly. See where every rupee goes. Get nudged when you overspend on wants vs needs.",
    color: Colors.error,
  },
];

const VALUES: {
  icon: AppIconName | null;
  flag: string | null;
  title: string;
  desc: string;
}[] = [
  {
    icon: "lock",
    flag: null,
    title: "Privacy first",
    desc: "We never ask for PAN, Aadhaar, or bank details. Only numbers. Always encrypted.",
  },
  {
    icon: "notebook",
    flag: null,
    title: "Education over selling",
    desc: "We explain every concept so you learn while you plan. Not just results - understanding.",
  },
  {
    icon: null,
    flag: "🇮🇳",
    title: "Built for India",
    desc: "Indian tax laws, Indian investment products, Indian financial realities. Not a US product adapted.",
  },
  {
    icon: "coin",
    flag: null,
    title: "Affordable always",
    desc: "Core features free forever. Premium features at ₹99 - not ₹5,000/year like advisors.",
  },
  {
    icon: "bulb",
    flag: null,
    title: "AI with integrity",
    desc: "Our AI explains, not decides. You stay in control. We never push products for commission.",
  },
  {
    icon: "chart",
    flag: null,
    title: "Data-driven",
    desc: "Every suggestion backed by calculations, not opinions. Show the math, not just the answer.",
  },
];

export default function AboutScreen() {
  return (
    <ContentScreen
      barTitle="About"
      share={{
        title: "About Finkoin - Financial Health Platform for India",
        path: "/about",
      }}
    >
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>FK</Text>
        </View>
        <Text style={styles.h1}>
          Making financial health{"\n"}simple for every Indian
        </Text>
        <Text style={styles.heroSub}>
          Finkoin is a personal finance platform built specifically for India.
          We help you understand where you stand financially and what to do
          next.
        </Text>
      </View>

      <View style={styles.mission}>
        <GoldText style={styles.missionLabel}>OUR MISSION</GoldText>
        <GoldText style={styles.missionText}>
          To give every Indian access to personalised financial guidance that
          was previously only available to the wealthy few.
        </GoldText>
      </View>

      <View style={styles.block}>
        <Text style={styles.h2}>The problem we are solving</Text>
        <View style={{ gap: 14 }}>
          {PROBLEMS.map((p) => (
            <View key={p.title} style={styles.greyCard}>
              <View style={{ marginBottom: 12 }}>
                <AppIcon name={p.icon} size={28} color={Colors.primaryText} />
              </View>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <Text style={styles.cardText}>{p.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.h2}>How Finkoin helps</Text>
        <View style={{ gap: 14 }}>
          {STEPS().map((s) => (
            <View key={s.step} style={styles.stepCard}>
              <View
                style={[styles.stepBadge, { backgroundColor: `${s.color}20` }]}
              >
                <Text style={[styles.stepNum, { color: readable(s.color) }]}>
                  {s.step}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { marginBottom: 6 }]}>
                  {s.title}
                </Text>
                <Text style={styles.cardText}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={[styles.h2, { marginBottom: 6 }]}>What we believe in</Text>
        <Text style={styles.valuesSub}>
          Our principles guide every decision we make.
        </Text>
        <View style={{ gap: 12 }}>
          {VALUES.map((v) => (
            <View key={v.title} style={styles.valueCard}>
              <View style={{ marginBottom: 10 }}>
                {v.flag ? (
                  <Text style={{ fontSize: 28 }}>{v.flag}</Text>
                ) : v.icon ? (
                  <AppIcon name={v.icon} size={26} color={Colors.primaryText} />
                ) : null}
              </View>
              <Text style={styles.valueTitle}>{v.title}</Text>
              <Text style={styles.valueText}>{v.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.founderBox}>
        <Text style={styles.founderH2}>Why we built Finkoin</Text>
        {FOUNDER_NOTE.map((para) => (
          <Text key={para.slice(0, 24)} style={styles.founderBio}>
            {para}
          </Text>
        ))}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          <Text style={{ fontWeight: "700" }}>Disclaimer:</Text> Finkoin
          provides educational financial guidance only. We are not a
          SEBI-registered investment advisor, IRDAI-licensed insurance agent, or
          RBI-regulated financial entity. All analysis is algorithmic and
          educational. Always consult qualified professionals before making
          major financial decisions.
        </Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaH2}>Ready to check your financial health?</Text>
        <Text style={styles.ctaSub}>
          Free. Takes 5 minutes. No PAN or Aadhaar needed.
        </Text>
        <Pressable
          onPress={() => openContentHref("/analyse")}
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaBtnText}>Start free analysis →</Text>
        </Pressable>
      </View>
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  hero: { alignItems: "center", marginTop: 12, marginBottom: 40 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoText: { fontSize: 32, color: Colors.onPrimary, fontWeight: "800" },
  h1: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 16,
  },
  heroSub: {
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
  },
  mission: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 28,
    marginBottom: 40,
    alignItems: "center",
  },
  missionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primaryText,
    letterSpacing: 1,
    marginBottom: 14,
  },
  missionText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primaryDark,
    lineHeight: 32,
    textAlign: "center",
  },
  block: { marginBottom: 40 },
  h2: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  greyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  cardText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  stepCard: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 22,
  },
  stepBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { fontSize: 14, fontWeight: "800" },
  valuesSub: { fontSize: 15, color: Colors.textMuted, marginBottom: 20 },
  valueCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valueTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  valueText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 21 },
  founderBox: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
  },
  founderH2: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  founderBio: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  disclaimer: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningLight,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  disclaimerText: { fontSize: 13, color: Colors.warningText, lineHeight: 22 },
  cta: {
    alignItems: "center",
    padding: 28,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  ctaH2: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.onPrimary,
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 30,
  },
  ctaSub: {
    fontSize: 15,
    color: onPrimaryAlpha(0.8),
    marginBottom: 22,
    textAlign: "center",
  },
  ctaBtn: {
    backgroundColor: Colors.card,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  ctaBtnText: { color: Colors.primaryText, fontSize: 16, fontWeight: "700" },
}));
