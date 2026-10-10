import type { Metadata } from "next";
import FeaturesShowcase from "@/components/landing/FeaturesShowcase";
import { FINKOIN_FEATURES } from "@/lib/featuresContent";
import { SITE_URL } from "@/lib/seo";

const TITLE = "Finkoin Features — Health Check, Tracker, Split & Calculators";
const DESCRIPTION =
  "Everything Finkoin does in one place: a free financial health check, 20+ India-ready calculators, a monthly tracker, FK Split and more. No PAN needed.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/features" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/features`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-home.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin features",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og/og-home.png`],
  },
};

const featuresJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Finkoin features",
  itemListElement: FINKOIN_FEATURES.map((f, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: f.name,
    description: f.headline,
    url: `${SITE_URL}/features#${f.id}`,
  })),
};

export default function FeaturesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(featuresJsonLd) }}
      />
      <FeaturesShowcase />
    </>
  );
}
