import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { SITE_URL } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import CalculatorsClient from "../CalculatorsClient";
import {
  INDEXABLE_CALC_IDS,
  absoluteCalcUrl,
  buildCalculatorJsonLd,
  getSeoForCalc,
  resolveCalcIdFromPathSegment,
} from "../calculator-seo";

type PageProps = {
  params: { id: string };
};

export function generateStaticParams() {
  return INDEXABLE_CALC_IDS.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const calcId = resolveCalcIdFromPathSegment(params.id);
  if (!calcId) {
    return { title: "Calculator not found | Finkoin", robots: "noindex" };
  }
  if (calcId === "tax-regime") {
    return { alternates: { canonical: "/calculators/tax-regime-2026" } };
  }

  const seo = getSeoForCalc(calcId);
  const pageUrl = absoluteCalcUrl(seo.path);

  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: seo.path },
    robots: "index, follow",
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: pageUrl,
      siteName: "Finkoin",
      type: "website",
      images: [
        {
          url: `${SITE_URL}/og/og-home.png`,
          width: 1200,
          height: 630,
          alt: seo.appName,
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

export default function CalculatorByIdPage({ params }: PageProps) {
  const calcId = resolveCalcIdFromPathSegment(params.id);
  if (!calcId) notFound();

  // Keep a single canonical tax URL (matches existing dedicated page).
  if (calcId === "tax-regime" || params.id === "tax-regime-2026") {
    permanentRedirect("/calculators/tax-regime-2026");
  }

  const seo = getSeoForCalc(calcId);
  const jsonLd = buildCalculatorJsonLd(seo);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* SSR-visible copy for crawlers (calculator UI is client-hydrated). */}
      <section className="sr-only">
        <h1>{seo.appName}</h1>
        <p>{seo.description}</p>
        <ul>
          {seo.faq.map((f) => (
            <li key={f.q}>
              <h2>{f.q}</h2>
              <p>{f.a}</p>
            </li>
          ))}
        </ul>
      </section>
      <Suspense
        fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
      >
        <CalculatorsClient initialCalcId={calcId} />
      </Suspense>
    </>
  );
}
