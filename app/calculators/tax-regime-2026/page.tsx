import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import CalculatorRelatedLinks from "@/components/seo/CalculatorRelatedLinks";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { SITE_URL, fitMetadata } from "@/lib/seo";
import CalculatorsClient from "../CalculatorsClient";
import {
  buildCalculatorJsonLd,
  getRelatedLinksForCalc,
  getSeoForCalc,
} from "../calculator-seo";
import TaxExploreMore from "./TaxExploreMore";

const canonicalPath = "/calculators/tax-regime-2026";
const pageUrl = `${SITE_URL}${canonicalPath}`;
const seo = getSeoForCalc("tax-regime");

export const metadata: Metadata = fitMetadata({
  title: {
    absolute:
      "Old vs New Tax Regime Calculator 2025-26 — Which Saves More? | Finkoin",
  },
  description: seo.description,
  keywords: [
    "old vs new tax regime calculator",
    "tax regime calculator 2025-26",
    "income tax calculator India 2026",
    "which tax regime is better",
    "tax saving calculator India",
    "80C deduction calculator",
    "HRA exemption calculator",
    "new tax regime slabs 2026",
    "87A rebate calculator",
    "80C deduction limit 2026",
    "income tax FY 2025-26",
    "salary tax calculator 2025-26",
    "ITR calculator India",
    "old vs new tax regime 2026",
    "Finkoin tax calculator",
  ],
  alternates: {
    canonical: canonicalPath,
  },
  openGraph: {
    title: "Tax Regime Calculator 2025-26 | Finkoin",
    description: seo.description,
    url: pageUrl,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-tax-calculator.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Tax Regime Calculator 2025-26",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tax Regime Calculator 2025-26 | Finkoin",
    description: seo.description,
    images: [`${SITE_URL}/og/og-tax-calculator.png`],
  },
});

const jsonLd = buildCalculatorJsonLd(seo, "tax-regime");

export default function TaxRegime2026Page() {
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
            {
              label: "Tax Regime Calculator 2025-26",
              href: canonicalPath,
            },
          ]}
        />
      </div>
      <Suspense
        fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
      >
        <CalculatorsClient
          initialCalcId="tax-regime"
          urlBaseForTaxCanonical="/calculators/tax-regime-2026"
        />
      </Suspense>
      {/* Visible FAQ: FAQPage schema must match text on the page. */}
      <section
        aria-labelledby="tax-faq"
        className="mx-auto mt-10 max-w-3xl px-4 text-slate-700 sm:px-6"
      >
        <h2 id="tax-faq" className="text-lg font-semibold text-slate-900">
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
      <div className="px-4 pb-4 sm:px-6">
        <CalculatorRelatedLinks links={getRelatedLinksForCalc("tax-regime")} />
      </div>
      <Suspense fallback={null}>
        <TaxExploreMore />
      </Suspense>
    </>
  );
}
