import { CATEGORIES } from "@/constants/calculator-config";
import { FINKOIN_FEATURES } from "@/components/content/featuresContent";
import { BLOG_ARTICLES } from "@/lib/blogContent";
import { learnArticles } from "@/lib/learnContent";
import { APP_PAGES, type SearchEntry } from "@/lib/siteSearch";

/**
 * Native port of web lib/siteSearchIndex.ts, built from the app's own content.
 * Hrefs are web paths; open them with openContentHref.
 */
export function buildAppSearchIndex(): SearchEntry[] {
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
      href: `/calculators/${item.id}`,
      tag: cat.label,
    })),
  );

  const learn: SearchEntry[] = learnArticles.map((a) => ({
    kind: "learn",
    title: a.title,
    description: a.subtitle,
    href: `/learn/${a.id}`,
    tag: a.category,
  }));

  const blog: SearchEntry[] = BLOG_ARTICLES.map((a) => ({
    kind: "blog",
    title: a.title,
    description: a.description,
    href: `/blog/${a.slug}`,
    keywords: a.keywords,
    tag: a.category,
  }));

  return [...features, ...APP_PAGES, ...calculators, ...learn, ...blog];
}
