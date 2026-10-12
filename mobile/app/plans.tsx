/**
 * Native Plans — port of web app/plans/page.tsx (cards verbatim).
 * Difference from web: the paid buttons never unlock a tier. Mobile payments
 * are off (store billing rules), so Pro / Pro Max show "Available soon in the
 * app" instead of calling setSubscription.
 */
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";
import { ContentScreen } from "@/components/content/ContentScreen";
import { openContentHref } from "@/lib/contentLinks";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: [
      { label: "Financial health score", yes: true },
      { label: "15+ calculators", yes: true },
      { label: "Learn finance articles", yes: true },
      { label: "AI fix plan", yes: false },
      { label: "MF portfolio analysis", yes: false },
    ],
  },
  {
    name: "Pro",
    price: "₹49",
    period: "/month",
    features: [
      { label: "Everything in Free", yes: true },
      { label: "AI fix plan with ₹ amounts", yes: true },
      { label: "Goal roadmap", yes: true },
      { label: "Smart debt advice", yes: true },
      { label: "MF portfolio analysis", yes: false },
    ],
  },
  {
    name: "Pro Max",
    price: "₹99",
    period: "/month",
    features: [
      { label: "Everything in Pro", yes: true },
      { label: "MF portfolio analysis", yes: true },
      { label: "AI fund verdicts", yes: true },
      { label: "Portfolio migration", yes: true },
    ],
  },
] as const;

export default function PlansScreen() {
  return (
    <ContentScreen barTitle="Plans">
      <Text style={styles.h1}>Choose your Finkoin plan</Text>
      <Text style={styles.sub}>
        Paid plans are not available in the app yet. Everything is free during
        early access.
      </Text>

      <View style={{ marginTop: 32, gap: 16 }}>
        {plans.map((plan) => {
          const popular = plan.name === "Pro";
          return (
            <View
              key={plan.name}
              style={[styles.card, popular && styles.cardPopular]}
            >
              {popular ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Most popular</Text>
                </View>
              ) : null}
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.priceRow}>
                <Text style={styles.price}>{plan.price}</Text>
                <Text style={styles.period}> {plan.period}</Text>
              </Text>
              <View style={{ marginTop: 16, gap: 8 }}>
                {plan.features.map((f) => (
                  <Text
                    key={f.label}
                    style={f.yes ? styles.featYes : styles.featNo}
                  >
                    {f.yes ? "✓" : "✗"} {f.label}
                  </Text>
                ))}
              </View>
              <View style={{ marginTop: 24 }}>
                {plan.name === "Free" ? (
                  <Pressable
                    onPress={() => openContentHref("/analyse")}
                    style={styles.btnOutline}
                    accessibilityRole="button"
                  >
                    <Text style={styles.btnOutlineText}>Start free</Text>
                  </Pressable>
                ) : (
                  <View
                    style={styles.btnSoon}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: true }}
                    accessibilityLabel={`${plan.name}: available soon in the app`}
                  >
                    <Text style={styles.btnSoonText}>
                      Available soon in the app
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.replace("/(tabs)")}
        style={styles.home}
        accessibilityRole="link"
      >
        <Text style={styles.homeText}>← Back to home</Text>
      </Pressable>
    </ContentScreen>
  );
}

const styles = themedStyles(() => ({
  h1: { fontSize: 30, fontWeight: "600", color: Colors.textPrimary },
  sub: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 24,
  },
  cardPopular: { borderColor: Colors.primary, borderWidth: 2 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.primaryLight,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: Colors.primaryDark },
  planName: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  priceRow: { marginTop: 8 },
  price: { fontSize: 30, fontWeight: "700", color: Colors.textPrimary },
  period: { fontSize: 16, color: Colors.textSecondary },
  featYes: { fontSize: 14, color: Colors.textPrimary },
  featNo: { fontSize: 14, color: Colors.textMuted },
  btnOutline: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    fontWeight: "600",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  btnSoon: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSoonText: { fontWeight: "600", fontSize: 15, color: Colors.textSecondary },
  home: { marginTop: 32, minHeight: 44, justifyContent: "center" },
  homeText: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
}));
