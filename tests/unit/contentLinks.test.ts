import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CALC_LEARN_GUIDES,
  INDEXABLE_CALC_IDS,
  getRelatedLinksForCalc,
} from "@/app/calculators/calculator-seo";
import { BLOG_ARTICLES, relatedBlogArticles } from "@/lib/blogContent";
import { getCuratedLearnFaqs } from "@/lib/learnArticleFaqs";
import { learnArticleById, learnArticles } from "@/lib/learnContent";
import { getRichLearnArticle } from "@/lib/learnRichArticles";

const learnIds = new Set(learnArticles.map((a) => a.id));
const blogSlugs = new Set(BLOG_ARTICLES.map((a) => a.slug));
const calcIds = new Set<string>([...INDEXABLE_CALC_IDS, "tax-regime-2026"]);
const appDir = path.resolve(__dirname, "../../app");

/** True when an internal href points at a page that exists. */
function resolves(href: string): boolean {
  const clean = href.split(/[?#]/)[0];
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return true;
  if (parts[0] === "learn" && parts[1]) return learnIds.has(parts[1]);
  if (parts[0] === "blog" && parts[1]) return blogSlugs.has(parts[1]);
  if (parts[0] === "calculators" && parts[1]) return calcIds.has(parts[1]);
  return fs.existsSync(path.join(appDir, ...parts, "page.tsx"));
}

function markdownLinks(body: string): string[] {
  return [...body.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
}

describe("blog and learn content", () => {
  it("has unique learn ids and blog slugs", () => {
    expect(learnIds.size).toBe(learnArticles.length);
    expect(blogSlugs.size).toBe(BLOG_ARTICLES.length);
  });

  it("lists blog posts newest first", () => {
    const dates = BLOG_ARTICLES.map((a) => a.publishedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("only links to pages that exist from blog posts", () => {
    for (const a of BLOG_ARTICLES) {
      const hrefs = [
        ...markdownLinks(a.body),
        ...(a.relatedTools ?? []).map((t) => t.href),
      ];
      for (const href of hrefs) {
        expect(resolves(href), `${a.slug} → ${href}`).toBe(true);
      }
    }
  });

  it("only links to pages that exist from learn guides", () => {
    for (const a of learnArticles) {
      const rich = getRichLearnArticle(a.id);
      if (!rich) continue;
      for (const r of rich.related) {
        expect(learnArticleById[r.id], `${a.id} → ${r.id}`).toBeDefined();
      }
      for (const t of rich.tools ?? []) {
        expect(resolves(t.href), `${a.id} → ${t.href}`).toBe(true);
      }
      if (rich.finkoinTipHref) {
        expect(resolves(rich.finkoinTipHref)).toBe(true);
      }
    }
  });

  it("keeps SEO titles and descriptions within search-result lengths for new guides", () => {
    for (const a of learnArticles.filter((x) => x.updatedAt)) {
      const rich = getRichLearnArticle(a.id);
      expect(rich, a.id).not.toBeNull();
      expect(rich!.seoTitle.length, a.id).toBeLessThanOrEqual(65);
      expect(rich!.seoDescription.length, a.id).toBeLessThanOrEqual(160);
      expect(getCuratedLearnFaqs(a.id)?.length ?? 0, a.id).toBeGreaterThan(0);
    }
    for (const a of BLOG_ARTICLES) {
      expect(a.description.length, a.slug).toBeLessThanOrEqual(160);
      if (a.metaTitle)
        expect(a.metaTitle.length, a.slug).toBeLessThanOrEqual(65);
    }
  });

  it("suggests related posts from the same category first", () => {
    const post = BLOG_ARTICLES.find((a) => a.category === "tax")!;
    const related = relatedBlogArticles(post);
    expect(related.length).toBeGreaterThan(0);
    expect(related.some((r) => r.slug === post.slug)).toBe(false);
    expect(related[0].category).toBe("tax");
  });
});

describe("calculator to learn links", () => {
  it("maps calculators to guides that exist", () => {
    for (const [calcId, guide] of Object.entries(CALC_LEARN_GUIDES)) {
      expect(calcIds.has(calcId), calcId).toBe(true);
      expect(learnIds.has(guide.id), `${calcId} → ${guide.id}`).toBe(true);
    }
  });

  it("puts the matching guide first without duplicates", () => {
    const links = getRelatedLinksForCalc("epf");
    expect(links[0].href).toBe(
      "/learn/epf-pf-explained-contribution-interest-withdrawal",
    );
    const hrefs = links.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(getRelatedLinksForCalc("sip")[0].href).toBe("/calculators/swp");
  });
});
