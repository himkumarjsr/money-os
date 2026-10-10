import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Colors, Radius, themedStyles } from "@/constants/theme";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { useAuthStore } from "@/store/authStore";

type Card = {
  key: string;
  title: string;
  body: string;
  cta: string;
  route?: string;
  needsAuth?: boolean;
  badge?: "new" | "soon";
  accent: string;
  border: string;
  ctaColor: string;
  icon: AppIconName | "dot";
};

/** Built per render so card colours follow the active theme. */
const cards = (): Card[] => [
  {
    key: "advisor",
    title: "Meet your finance advisor",
    body: "Start your financial independence journey with interactive guidance — not just form filling.",
    cta: "Start guided checkup →",
    route: "/(tabs)/analyse",
    needsAuth: true,
    accent: Colors.backgroundDeep,
    border: Colors.borderIndigo,
    ctaColor: Colors.indigo600,
    icon: "dot",
  },
  {
    key: "tax",
    title: "New vs old tax regime",
    body: "Compare regimes with HRA, 80C, NPS, and equity gains — built for FY 2025-26 planning.",
    cta: "Open calculator →",
    route: "/calculators/tax-regime",
    accent: Colors.primaryLight,
    border: Colors.primaryTintBorder,
    ctaColor: Colors.violet600,
    icon: "receipt",
  },
  {
    key: "portfolio",
    title: "Portfolio analysis",
    body: "Review holdings and allocation in one workspace — built for Indian investors.",
    cta: "Coming soon",
    badge: "soon",
    accent: Colors.surfaceMuted,
    border: Colors.slate300,
    ctaColor: Colors.textMuted,
    icon: "chart",
  },
  {
    key: "tracker",
    title: "Expense Tracker",
    body: "Track every rupee. See where money goes. Get insights to spend better.",
    cta: "Start tracking →",
    route: "/(tabs)/tracker",
    needsAuth: true,
    badge: "new",
    accent: Colors.successLight,
    border: Colors.successLight,
    ctaColor: Colors.successDark,
    icon: "chart",
  },
  {
    key: "split",
    title: "FK Split",
    body: "Split bills, track shared expenses, and settle up — ₹ first. No ads.",
    cta: "Open Split →",
    route: "/(tabs)/split",
    accent: Colors.primaryLight,
    border: Colors.primaryTintBorder,
    ctaColor: Colors.violet600,
    icon: "users",
  },
];

export function TopPicks() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const go = (c: Card) => {
    if (!c.route || c.badge === "soon") return;
    if (c.needsAuth && !isLoggedIn) {
      router.push("/(auth)/login");
      return;
    }
    router.push(c.route as any);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Start here</Text>
      <Text style={styles.head}>
        Top picks on Finkoin — advisor, tax, portfolio, and tracking
      </Text>
      <View style={styles.list}>
        {cards().map((c) => (
          <Pressable
            key={c.key}
            disabled={c.badge === "soon"}
            onPress={() => go(c)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: c.accent,
                borderColor: c.border,
                opacity: pressed && c.badge !== "soon" ? 0.95 : 1,
                borderStyle: c.badge === "soon" ? "dashed" : "solid",
              },
            ]}
          >
            {c.badge === "new" ? (
              <View style={styles.badgeNew}>
                <Text style={styles.badgeNewText}>NEW</Text>
              </View>
            ) : null}
            {c.badge === "soon" ? (
              <View style={styles.badgeSoon}>
                <Text style={styles.badgeSoonText}>Coming soon</Text>
              </View>
            ) : null}
            {c.icon === "dot" ? (
              <Text style={styles.dotIcon}>◉</Text>
            ) : (
              <AppIcon name={c.icon} size={28} color={Colors.primary} />
            )}
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.body}>{c.body}</Text>
            <Text style={[styles.cta, { color: c.ctaColor }]}>{c.cta}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  wrap: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  kicker: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: Colors.accent,
  },
  head: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  list: { marginTop: 20, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeNew: {
    position: "absolute",
    right: 14,
    top: 14,
    backgroundColor: "#047857",
    borderRadius: Radius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeNewText: {
    color: Colors.onPrimary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  badgeSoon: {
    position: "absolute",
    right: 14,
    top: 14,
    backgroundColor: Colors.border,
    borderRadius: Radius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeSoonText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dotIcon: { fontSize: 26, color: Colors.primary },
  title: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  body: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    flexGrow: 1,
  },
  cta: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "700",
  },
}));
