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

/** Google shows ~60 title characters and ~155 description characters. */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 155;

/** Drop the " | Finkoin" suffix when it pushes a title past the limit. */
export function fitTitle(title: string): string {
  if (title.length <= SEO_TITLE_MAX) return title;
  const bare = title.replace(/\s*\|\s*Finkoin(\s+Learn)?\s*$/, "");
  return bare;
}

/** Trim a description to the limit at a sentence or word boundary. */
export function fitDescription(description: string): string {
  if (description.length <= SEO_DESCRIPTION_MAX) return description;
  const cut = description.slice(0, SEO_DESCRIPTION_MAX);
  const sentence = cut.lastIndexOf(". ");
  if (sentence >= 90) return cut.slice(0, sentence + 1);
  const word = cut.slice(0, SEO_DESCRIPTION_MAX - 1).lastIndexOf(" ");
  return `${cut.slice(0, word).replace(/[\s,;:—–-]+$/, "")}…`;
}

type FittableMetadata = {
  title?: unknown;
  description?: string | null;
  openGraph?: object | null;
  twitter?: object | null;
};

/** Apply fitTitle / fitDescription to a page's title, description, OG and Twitter tags. */
export function fitMetadata<T extends FittableMetadata>(meta: T): T {
  const fitText = (v: unknown, fit: (x: string) => string) =>
    typeof v === "string" ? fit(v) : v;
  const t = meta.title;
  // A plain string title gets the root " | Finkoin" template appended, so a
  // title that already names Finkoin (or would overflow) becomes absolute.
  const title =
    typeof t === "string"
      ? /Finkoin/.test(t) || t.length + " | Finkoin".length > SEO_TITLE_MAX
        ? { absolute: fitTitle(t) }
        : t
      : t && typeof t === "object" && "absolute" in t
        ? {
            ...t,
            absolute: fitTitle(String((t as { absolute: string }).absolute)),
          }
        : t;
  const social = (o: object | null | undefined) =>
    o
      ? {
          ...o,
          title: fitText((o as { title?: unknown }).title, fitTitle),
          description: fitText(
            (o as { description?: unknown }).description,
            fitDescription,
          ),
        }
      : o;
  return {
    ...meta,
    title,
    description:
      typeof meta.description === "string"
        ? fitDescription(meta.description)
        : meta.description,
    openGraph: social(meta.openGraph),
    twitter: social(meta.twitter),
  } as T;
}

/**
 * Full metadata for a simple page: its own title, description, canonical and
 * share card, so nothing falls back to the home page's tags.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
}) {
  const title = fitTitle(opts.title);
  const description = fitDescription(opts.description);
  const { openGraphImages, twitterImages } = socialImageTags(
    opts.image ?? DEFAULT_OG_IMAGE_PATH,
    title,
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: opts.path },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${opts.path === "/" ? "" : opts.path}`,
      siteName: "Finkoin",
      type: "website" as const,
      locale: "en_IN",
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: twitterImages,
    },
  };
}

export const SEO_CONFIG = {
  siteName: "Finkoin",
  siteUrl: SITE_URL,
  defaultTitle: "Finkoin — Free Personal Finance App for India",
  defaultDescription:
    "Free financial health check, SIP, tax and EMI calculators, expense tracker and bill splitting for India. Know it. Fix it. Grow it. No PAN needed.",
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
  // Without a path, emit no canonical: defaulting to "/" would mark the page
  // as a copy of the home page.
  const canonicalPath = options?.canonicalPath;
  const ogImagePath = options?.openGraphImagePath ?? DEFAULT_OG_IMAGE_PATH;
  const displayTitle = fitTitle(
    options?.titleMode === "absolute"
      ? title
      : `${title} | ${SEO_CONFIG.siteName}`,
  );
  description = fitDescription(description);
  const { openGraphImages, twitterImages } = socialImageTags(
    ogImagePath,
    displayTitle,
  );

  return {
    title: { absolute: displayTitle },
    description,
    keywords: [...(keywords || []), ...SEO_CONFIG.defaultKeywords],
    openGraph: {
      title: displayTitle,
      description,
      siteName: SEO_CONFIG.siteName,
      url: `${SEO_CONFIG.siteUrl}${!canonicalPath || canonicalPath === "/" ? "" : canonicalPath}`,
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
    ...(canonicalPath ? { alternates: { canonical: canonicalPath } } : {}),
  };
}
