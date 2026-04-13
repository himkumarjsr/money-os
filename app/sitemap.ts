import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finkoin.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/calculators`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/plans`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/portfolio`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
}
