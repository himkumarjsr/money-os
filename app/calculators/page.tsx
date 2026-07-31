import BrandPageLoader from "@/components/ui/BrandPageLoader";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import CalculatorsClient from "./CalculatorsClient";
import { getItemById } from "./calculator-config";
import { buildCalculatorJsonLd, getSeoForCalc } from "./calculator-seo";
import { SITE_URL } from "@/lib/seo";

type PageProps = {
  searchParams?: { calc?: string | string[]; from?: string | string[] };
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const calcParam = Array.isArray(searchParams?.calc)
    ? searchParams?.calc[0]
    : searchParams?.calc;

  // Query deep-links permanently redirect; still set canonical for safety.
  if (calcParam) {
    const active = getItemById(calcParam);
    const seo = getSeoForCalc(active.id);
    return {
      title: { absolute: seo.title },
      description: seo.description,
      alternates: { canonical: seo.path },
      robots: "index, follow",
    };
  }

  const seo = getSeoForCalc();
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: "/calculators" },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SITE_URL}/calculators`,
      siteName: "Finkoin",
      type: "website",
      images: [
        {
          url: `${SITE_URL}/og/og-home.png`,
          width: 1200,
          height: 630,
          alt: "Finkoin calculators",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [`${SITE_URL}/og/og-home.png`],
    },
  };
}

export default async function CalculatorsPage({ searchParams }: PageProps) {
  const calc = Array.isArray(searchParams?.calc)
    ? searchParams?.calc[0]
    : searchParams?.calc;
  const from = Array.isArray(searchParams?.from)
    ? searchParams?.from[0]
    : searchParams?.from;

  // Consolidate SEO equity onto clean path URLs (/calculators/sip, …).
  if (calc) {
    const active = getItemById(calc);
    const seo = getSeoForCalc(active.id);
    const qs = from === "home" ? "?from=home" : "";
    permanentRedirect(`${seo.path}${qs}`);
  }

  const seo = getSeoForCalc();
  const jsonLd = buildCalculatorJsonLd({
    ...seo,
    path: "/calculators",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="sr-only">
        <h1>{seo.appName}</h1>
        <p>{seo.description}</p>
      </section>
      <Suspense
        fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
      >
        <CalculatorsClient initialCalcId="sip" />
      </Suspense>
    </>
  );
}
