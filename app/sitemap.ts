import type { MetadataRoute } from "next";
import { BLOG_ARTICLES } from "@/lib/blogContent";
import { INDEXABLE_CALC_IDS } from "./calculators/calculator-seo";

const baseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.finkoin.com"
).replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/analyse`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/split`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calculators`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calculators/tax-regime-2026`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.95,
    },
    ...INDEXABLE_CALC_IDS.map((id) => ({
      url: `${baseUrl}/calculators/${id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority:
        id === "sip" || id === "swp" || id === "emi" || id === "fire"
          ? 0.9
          : 0.75,
    })),
    {
      url: `${baseUrl}/tracker`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...BLOG_ARTICLES.map((a) => ({
      url: `${baseUrl}/blog/${a.slug}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/refund`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/legal/disclaimer`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
