import { Linking } from "react-native";
import { router, type Href } from "expo-router";
import { CATEGORIES } from "@/constants/calculator-config";

/** Public site used only for share links — the app never opens it. */
export const PUBLIC_SITE_URL = "https://www.finkoin.com";

const FINKOIN_HOST = /^https?:\/\/(www\.)?finkoin\.com/i;

const CALCULATOR_IDS = new Set(
  CATEGORIES.flatMap((c) => c.items.map((i) => i.id)),
);

/** PWA calculator slugs that differ from native calculator ids. */
const CALCULATOR_ALIASES: Record<string, string> = {
  "tax-regime-2026": "tax-regime",
};

function calculatorRoute(rawId: string | null | undefined): string {
  const id = rawId ? (CALCULATOR_ALIASES[rawId] ?? rawId) : "";
  return id && CALCULATOR_IDS.has(id)
    ? `/calculators/${id}`
    : "/(tabs)/calculators";
}

/**
 * Map a PWA path (e.g. `/learn/x`, `/calculators?calc=fire`) to a native
 * route. Unknown paths fall back to home rather than the website.
 */
export function nativeRouteForPath(pathWithQuery: string): string {
  const [rawPath, query = ""] = pathWithQuery.split("?");
  const path = (rawPath.split("#")[0] || "/").replace(/\/+$/, "") || "/";
  const calcParam = query
    .split("&")
    .map((kv) => kv.split("="))
    .find(([k]) => k === "calc")?.[1];
  const segs = path.split("/").filter(Boolean);
  const [first, second] = segs;

  switch (first) {
    case undefined:
      return "/(tabs)";
    case "calculators":
      return calculatorRoute(second ?? calcParam);
    case "analyse":
      return "/(tabs)/analyse";
    case "tracker":
      return "/(tabs)/tracker";
    case "split":
      return "/(tabs)/split";
    case "profile":
      return "/(tabs)/profile";
    case "learn":
      return second ? `/learn/${second}` : "/learn";
    case "blog":
      return second ? `/blog/${second}` : "/blog";
    case "legal":
      return second ? `/legal/${second}` : "/legal/privacy";
    case "privacy":
    case "terms":
    case "refund":
    case "disclaimer":
      return `/legal/${first}`;
    case "about":
    case "careers":
    case "press":
    case "settings":
    case "notifications":
    case "leaderboard":
    case "goals":
    case "investments":
    case "rewards":
    case "refer":
    case "policies":
    case "portfolio":
      return `/${first}`;
    default:
      return "/(tabs)";
  }
}

/** Open a content link: mail/phone via the OS, Finkoin paths in-app. */
export function openContentHref(href: string): void {
  const h = href.trim();
  if (/^(mailto|tel):/i.test(h)) {
    void Linking.openURL(h).catch(() => {});
    return;
  }
  if (FINKOIN_HOST.test(h)) {
    const rest = h.replace(FINKOIN_HOST, "") || "/";
    router.push(nativeRouteForPath(rest) as Href);
    return;
  }
  if (/^https?:\/\//i.test(h)) {
    void Linking.openURL(h).catch(() => {});
    return;
  }
  if (h === "/contact") {
    void Linking.openURL("mailto:hello@finkoin.com").catch(() => {});
    return;
  }
  router.push(nativeRouteForPath(h) as Href);
}

export function goBackOr(fallback: string = "/(tabs)"): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as Href);
}
