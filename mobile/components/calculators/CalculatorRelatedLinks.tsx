/**
 * "Related tools & guides" (web `components/seo/CalculatorRelatedLinks.tsx` +
 * `getRelatedLinksForCalc`) and the tax page's "Explore more" block
 * (web `app/calculators/tax-regime-2026/TaxExploreMore.tsx`).
 */
import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Colors, themedStyles } from "@/constants/theme";

type RelatedLink = { href: string; title: string; desc: string };

const COMMON: RelatedLink[] = [
  {
    href: "/analyse",
    title: "Financial Health Check",
    desc: "Know it. Fix it. Grow it. — free score",
  },
];

function getRelatedLinksForCalc(calcId: string): RelatedLink[] {
  if (calcId === "sip") {
    return [
      {
        href: "/calculators/swp",
        title: "SWP Calculator",
        desc: "Plan systematic withdrawals",
      },
      {
        href: "/calculators/tax-regime-2026",
        title: "Tax Regime Calculator",
        desc: "Old vs new regime for FY 2025-26",
      },
      {
        href: "/learn/sip-vs-lumpsum-when-to-use-which",
        title: "SIP vs lump sum guide",
        desc: "When to use which",
      },
      ...COMMON,
    ];
  }
  if (calcId === "home" || calcId === "emi") {
    return [
      {
        href: "/calculators/home",
        title: "Home Loan Calculator",
        desc: "EMI & affordability",
      },
      {
        href: "/calculators/tax-regime-2026",
        title: "Tax Regime Calculator",
        desc: "Include 24B & 80C benefits",
      },
      {
        href: "/learn/how-home-loan-tax-benefits-work-80c-24b",
        title: "Home loan tax benefits",
        desc: "80C + 24B explained",
      },
      ...COMMON,
    ];
  }
  if (
    calcId === "po" ||
    calcId.startsWith("po-") ||
    calcId === "nsc" ||
    calcId === "ppf"
  ) {
    return [
      {
        href: "/calculators/po",
        title: "All Post Office schemes",
        desc: "Compare TD, RD, NSC, KVP, MIS, SCSS, SSY",
      },
      {
        href: "/calculators/po-td",
        title: "Post Office TD",
        desc: "1–5 year time deposit maturity",
      },
      {
        href: "/calculators/po-scss",
        title: "SCSS Calculator",
        desc: "8.2% senior citizen income",
      },
      {
        href: "/calculators/ppf",
        title: "PPF Calculator",
        desc: "15-year EEE tax-free corpus",
      },
      ...COMMON,
    ];
  }
  return [
    {
      href: "/calculators/sip",
      title: "SIP Calculator",
      desc: "Plan monthly investments",
    },
    {
      href: "/calculators/tax-regime-2026",
      title: "Tax Regime Calculator",
      desc: "Old vs new — which saves more",
    },
    {
      href: "/learn/section-80c-limits-and-beyond",
      title: "80C and beyond",
      desc: "Deductions explained",
    },
    ...COMMON,
  ];
}

/** Map a web path to the matching mobile route. */
function toRoute(href: string): Href {
  if (href === "/analyse") return "/(tabs)/analyse" as Href;
  if (href === "/calculators/tax-regime-2026")
    return "/calculators/tax-regime" as Href;
  return href as Href;
}

export function CalculatorRelatedLinks({ calcId }: { calcId: string }) {
  const links = getRelatedLinksForCalc(calcId);
  return (
    <View style={styles.aside}>
      <Text style={styles.asideTitle}>Related tools & guides</Text>
      <View style={{ gap: 10 }}>
        {links.map((link) => (
          <Pressable
            key={link.href}
            onPress={() => router.push(toRoute(link.href))}
            accessibilityRole="link"
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.linkTitle}>{link.title}</Text>
            <Text style={styles.linkDesc}>{link.desc}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const EXPLORE: { label: string; href: string }[] = [
  { label: "Financial health check", href: "/(tabs)/analyse" },
  { label: "Learn personal finance", href: "/learn" },
  { label: "80C deductions guide 2026", href: "/blog/80c-deductions-guide-2026" },
  { label: "SIP calculator", href: "/calculators/sip" },
];

export function TaxExploreMore() {
  return (
    <View style={styles.explore}>
      <Text style={styles.exploreTitle}>Explore more</Text>
      <View style={styles.exploreRow}>
        {EXPLORE.map((l) => (
          <Pressable
            key={l.href}
            onPress={() => router.push(l.href as Href)}
            accessibilityRole="link"
            hitSlop={6}
          >
            <Text style={styles.exploreLink}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  aside: {
    marginTop: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    padding: 20,
  },
  asideTitle: {
    marginBottom: 14,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  link: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkTitle: {
    marginBottom: 2,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primaryText,
  },
  linkDesc: { fontSize: 11, color: Colors.textMuted },
  explore: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 24,
  },
  exploreTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  exploreRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 16 },
  exploreLink: { fontSize: 14, fontWeight: "600", color: Colors.primaryText },
}));
