/**
 * "Pricing" home section — web HomePageBelowFold pricing tiers (copy verbatim).
 * Mobile payments are off, so a note says the app is free during early access.
 */
import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { GoldText } from "@/components/ui/GoldMirror";

const PRICING = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Financial health check, calculators, and basic guidance.",
    cta: { label: "Start free", href: "/(tabs)/analyse", highlight: false },
    popular: false,
  },
  {
    name: "Pro",
    price: "₹49",
    period: "/mo",
    description:
      "AI fix plan plus optional chat with a qualified advisor for clarifications.",
    cta: { label: "Get Pro — ₹49/mo", href: "/plans", highlight: true },
    popular: true,
  },
  {
    name: "Pro Max",
    price: "₹99",
    period: "/mo",
    description:
      "Full workspace: goals, automations, exports, and priority support.",
    cta: { label: "Get Pro Max — ₹99/mo", href: "/plans", highlight: false },
    popular: false,
  },
] as const;

export function Pricing() {
  return (
    <View style={styles.section}>
      <GoldText style={styles.kicker}>Pricing</GoldText>
      <Text style={styles.heading}>
        Start free. Upgrade when you want a human in the loop.
      </Text>

      <View style={styles.list}>
        {PRICING.map((tier) => (
          <View
            key={tier.name}
            style={[styles.card, tier.cta.highlight && styles.cardHighlight]}
          >
            {tier.popular ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Most Popular</Text>
              </View>
            ) : null}
            <Text style={styles.name}>{tier.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{tier.price}</Text>
              <Text style={styles.period}>{tier.period}</Text>
            </View>
            <Text style={styles.desc}>{tier.description}</Text>
            <Pressable
              onPress={() => router.push(tier.cta.href as Href)}
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.cta,
                tier.cta.highlight ? styles.ctaPrimary : styles.ctaOutline,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text
                style={[
                  styles.ctaText,
                  tier.cta.highlight
                    ? { color: Colors.onPrimary }
                    : { color: Colors.textPrimary },
                ]}
              >
                {tier.cta.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        Free during early access: paid plans are not charged in the app yet.
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    backgroundColor: Colors.background,
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
    maxWidth: 380,
    textAlign: "center",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  list: { marginTop: 40, gap: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 24,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 2,
  },
  cardHighlight: { borderColor: Colors.primaryMedium, borderWidth: 2 },
  badge: {
    position: "absolute",
    right: 16,
    top: 16,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.onPrimary,
  },
  name: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  priceRow: { marginTop: 8, flexDirection: "row", alignItems: "baseline", gap: 4 },
  price: { fontSize: 30, fontWeight: "600", letterSpacing: -0.5, color: Colors.textPrimary },
  period: { fontSize: 16, color: Colors.textSecondary },
  desc: { marginTop: 16, fontSize: 14, lineHeight: 23, color: Colors.textSecondary },
  cta: {
    marginTop: 24,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ctaPrimary: { backgroundColor: Colors.primary },
  ctaOutline: {
    borderWidth: 1,
    borderColor: Colors.slate300,
    backgroundColor: Colors.card,
  },
  ctaText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  note: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
}));
