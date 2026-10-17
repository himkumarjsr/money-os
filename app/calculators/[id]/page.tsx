import Breadcrumb from "@/components/Breadcrumb";
import CalculatorRelatedLinks from "@/components/seo/CalculatorRelatedLinks";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { socialImageTags, fitMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import CalculatorsClient from "../CalculatorsClient";
import {
  INDEXABLE_CALC_IDS,
  absoluteCalcUrl,
  buildCalculatorJsonLd,
  getOgImagePathForCalc,
  getRelatedLinksForCalc,
  getSeoForCalc,
  resolveCalcIdFromPathSegment,
} from "../calculator-seo";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return INDEXABLE_CALC_IDS.map((id) => ({ id }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const calcId = resolveCalcIdFromPathSegment(params.id);
  if (!calcId) {
    return { title: "Calculator not found | Finkoin", robots: "noindex" };
  }
  if (calcId === "tax-regime") {
    return { alternates: { canonical: "/calculators/tax-regime-2026" } };
  }

  const seo = getSeoForCalc(calcId);
  const pageUrl = absoluteCalcUrl(seo.path);
  const { openGraphImages, twitterImages } = socialImageTags(
    getOgImagePathForCalc(calcId),
    seo.appName,
  );

  return fitMetadata({
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
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: twitterImages,
    },
  });
}

export default async function CalculatorByIdPage(props: PageProps) {
  const params = await props.params;
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
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <Breadcrumb
          items={[
            { label: "Calculators", href: "/calculators" },
            { label: seo.appName, href: seo.path },
          ]}
        />
      </div>
      {/* The calculator UI hydrates on the client; keep the page heading in the server HTML. */}
      <h1 className="sr-only">{seo.appName}</h1>
      <Suspense
        fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
      >
        <CalculatorsClient initialCalcId={calcId} />
      </Suspense>
      {/* Visible, server-rendered explainer and FAQ: the text search engines index for this page. */}
      <section
        aria-labelledby="calc-about"
        className="mx-auto mt-10 max-w-3xl px-4 text-slate-700 sm:px-6"
      >
        <h2 id="calc-about" className="text-lg font-semibold text-slate-900">
          About the {seo.appName}
        </h2>
        <p className="mt-2 text-sm leading-relaxed sm:text-base">
          {seo.description}
        </p>
        <h2 className="mt-8 text-lg font-semibold text-slate-900">
          Frequently asked questions
        </h2>
        <dl className="mt-4 space-y-5">
          {seo.faq.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-slate-900">{f.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed sm:text-base">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="px-4 pb-10 sm:px-6">
        <CalculatorRelatedLinks links={getRelatedLinksForCalc(calcId)} />
      </div>
    </>
  );
}
