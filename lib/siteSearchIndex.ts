import { CATEGORIES } from "@/app/calculators/calculator-config";
import {
  ABBREVIATIONS,
  findAbbreviations,
} from "@/app/calculators/calculator-abbreviations";
import { BLOG_ARTICLES } from "@/lib/blogContent";
import { FINKOIN_FEATURES } from "@/lib/featuresContent";
import { learnArticles } from "@/lib/learnContent";
import { getLearnSeoOverride } from "@/lib/learnSeo";
import { APP_PAGES, type SearchEntry } from "@/lib/siteSearch";

function calcHref(calcId: string) {
  if (calcId === "tax-regime") return "/calculators/tax-regime-2026";
  return `/calculators/${calcId}`;
}

/** Full forms of abbreviations in a title, so "SWP" also finds "withdrawal". */
function fullForms(text: string): string[] {
  return findAbbreviations(text).flatMap((a) => ABBREVIATIONS[a] ?? []);
}

/**
 * Every searchable thing on the web/PWA, small enough to ship to the browser
 * (titles, one-liners and keywords; never article bodies).
 */
export function buildWebSearchIndex(): SearchEntry[] {
  const features: SearchEntry[] = FINKOIN_FEATURES.map((f) => ({
    kind: "feature",
    title: f.name,
    description: f.headline,
    href: f.href,
    keywords: [...f.tags, ...f.highlights],
    tag: f.category,
  }));

  const calculators: SearchEntry[] = CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => ({
      kind: "calculator" as const,
      title: `${item.title} calculator`,
      description: item.blurb,
      href: calcHref(item.id),
      keywords: [...(item.keywords ?? []), ...fullForms(item.title)],
      tag: cat.label,
    })),
  );

  const learn: SearchEntry[] = learnArticles.map((a) => ({
    kind: "learn",
    title: a.title,
    description: a.subtitle,
    href: `/learn/${a.id}`,
    keywords: [
      ...(getLearnSeoOverride(a.id)?.keywords ?? []),
      ...fullForms(a.title),
    ],
    tag: a.category,
  }));

  const blog: SearchEntry[] = BLOG_ARTICLES.map((a) => ({
    kind: "blog",
    title: a.title,
    description: a.description,
    href: `/blog/${a.slug}`,
    keywords: [...a.keywords, ...fullForms(a.title)],
    tag: a.category,
  }));

  return [...features, ...APP_PAGES, ...calculators, ...learn, ...blog];
}
