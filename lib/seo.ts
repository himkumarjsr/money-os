export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.finkoin.com"
).replace(/\/+$/, "");

/** Primary product tagline — use in meta, OG, and hero copy. */
export const FINKOIN_TAGLINE = "Know it. Fix it. Grow it.";
export const FINKOIN_TAGLINE_SUB = "Your complete money life.";
export const FINKOIN_TAGLINE_FULL = `${FINKOIN_TAGLINE} ${FINKOIN_TAGLINE_SUB}`;

/** Default Open Graph / Twitter share image (1200×630). */
export const DEFAULT_OG_IMAGE_PATH = "/og/og-home.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Absolute URL for an OG path under /public (e.g. `/og/og-sip.png`). */
export function absoluteOgUrl(
  imagePath: string = DEFAULT_OG_IMAGE_PATH,
): string {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${SITE_URL}${path}`;
}

/** Consistent OG + Twitter image tags (url, width, height, alt). */
export function socialImageTags(
  imagePath: string = DEFAULT_OG_IMAGE_PATH,
  alt: string = "Finkoin",
) {
  const url = absoluteOgUrl(imagePath);
  return {
    openGraphImages: [
      {
        url,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt,
      },
    ],
    twitterImages: [url],
  };
}

export const SEO_CONFIG = {
  siteName: "Finkoin",
  siteUrl: SITE_URL,
  defaultTitle: "Finkoin — Know it. Fix it. Grow it. Your complete money life.",
  defaultDescription:
    "Finkoin is India's complete personal finance platform. Know it. Fix it. Grow it. Your complete money life. Free financial health check, SIP calculator, tax calculator (Old vs New regime), home loan EMI, expense tracker, bill splitting. Built for Indians. No PAN needed.",
  defaultKeywords: [
    "Finkoin",
    "Finkoin app",
    "finkoin.com",
    "Know it Fix it Grow it",
    "financial advisor India free",
    "personal finance India free",
    "financial health check India",
    "free financial health score India",
    "SIP calculator India",
    "SIP returns calculator",
    "mutual fund SIP calculator India",
    "tax calculator India 2026",
    "old vs new tax regime calculator",
    "tax regime calculator 2025-26",
    "income tax calculator India FY 2025-26",
    "salary tax calculator 2025-26",
    "ITR calculator India",
    "home loan EMI calculator",
    "home loan calculator India 2026",
    "EMI calculator India",
    "term insurance calculator India",
    "emergency fund calculator India",
    "FIRE number calculator India",
    "expense tracker India",
    "budget tracker India",
    "bill split app India",
    "FK Split",
    "SWP calculator India",
    "PPF calculator India",
    "NPS calculator India",
    "wealth planning India",
    "financial planning India",
    "Know it Fix it Grow it",
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
  const ogImagePath = options?.openGraphImagePath ?? DEFAULT_OG_IMAGE_PATH;
  const titleField =
    options?.titleMode === "absolute"
      ? { absolute: title }
      : `${title} | ${SEO_CONFIG.siteName}`;
  const displayTitle =
    options?.titleMode === "absolute"
      ? title
      : `${title} | ${SEO_CONFIG.siteName}`;
  const { openGraphImages, twitterImages } = socialImageTags(
    ogImagePath,
    displayTitle,
  );

  return {
    title: titleField,
    description,
    keywords: [...(keywords || []), ...SEO_CONFIG.defaultKeywords],
    openGraph: {
      title: displayTitle,
      description,
      siteName: SEO_CONFIG.siteName,
      url: `${SEO_CONFIG.siteUrl}${canonicalPath === "/" ? "" : canonicalPath}`,
      type: options?.openGraphType ?? "website",
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: displayTitle,
      description,
      images: twitterImages,
    },
    robots: "index, follow" as const,
    alternates: {
      canonical: canonicalPath,
    },
  };
}
