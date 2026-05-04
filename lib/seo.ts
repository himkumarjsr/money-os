export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://finkoin.com";

export const SEO_CONFIG = {
  siteName: "Finkoin",
  siteUrl: SITE_URL,
  defaultTitle: "Finkoin — Personal Finance Health Check for India",
  defaultDescription:
    "Get your free financial health score. Build emergency fund, fix insurance gaps, and create your personalised 12-month wealth plan. Made for India.",
  defaultKeywords: [
    "personal finance India",
    "financial health check",
    "emergency fund calculator India",
    "term insurance calculator",
    "financial planning India",
    "SIP calculator",
    "budget tracker India",
    "wealth planning India",
    "FIRE India",
    "financial advisor India",
  ],
};

type PageMetaOptions = {
  /** Path starting with / — merged with SITE_URL for OG absolute URLs */
  canonicalPath?: string;
  /** Use full title string without appending "| Finkoin" (respects root title.template as absolute) */
  titleMode?: "template" | "absolute";
  openGraphImagePath?: string;
  openGraphType?: "website" | "article";
};

export function generatePageMeta(
  title: string,
  description: string,
  keywords?: string[],
  options?: PageMetaOptions,
) {
  const canonicalPath = options?.canonicalPath ?? "/";
  const ogImagePath = options?.openGraphImagePath ?? "/og/home.png";
  const titleField =
    options?.titleMode === "absolute" ? { absolute: title } : `${title} | ${SEO_CONFIG.siteName}`;

  return {
    title: titleField,
    description,
    keywords: [...(keywords || []), ...SEO_CONFIG.defaultKeywords],
    openGraph: {
      title: options?.titleMode === "absolute" ? title : `${title} | ${SEO_CONFIG.siteName}`,
      description,
      siteName: SEO_CONFIG.siteName,
      url: `${SEO_CONFIG.siteUrl}${canonicalPath === "/" ? "" : canonicalPath}`,
      type: options?.openGraphType ?? "website",
      images: [
        {
          url: `${SEO_CONFIG.siteUrl}${ogImagePath}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: options?.titleMode === "absolute" ? title : `${title} | ${SEO_CONFIG.siteName}`,
      description,
      images: [`${SEO_CONFIG.siteUrl}${ogImagePath}`],
    },
    robots: "index, follow" as const,
    alternates: {
      canonical: canonicalPath,
    },
  };
}
