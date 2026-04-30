export const SEO_CONFIG = {
  siteName: "Finkoin",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://finkoin.com",
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

export function generatePageMeta(
  title: string,
  description: string,
  keywords?: string[],
) {
  return {
    title: `${title} | ${SEO_CONFIG.siteName}`,
    description,
    keywords: [...(keywords || []), ...SEO_CONFIG.defaultKeywords].join(", "),
    openGraph: {
      title,
      description,
      siteName: SEO_CONFIG.siteName,
      url: SEO_CONFIG.siteUrl,
      type: "website",
      images: [
        {
          url: `${SEO_CONFIG.siteUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: "index, follow",
    alternates: {
      canonical: SEO_CONFIG.siteUrl,
    },
  };
}
