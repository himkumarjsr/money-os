import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import CalculatorRelatedLinks from "@/components/seo/CalculatorRelatedLinks";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { SITE_URL } from "@/lib/seo";
import CalculatorsClient from "../CalculatorsClient";
import { getRelatedLinksForCalc } from "../calculator-seo";
import TaxExploreMore from "./TaxExploreMore";

const canonicalPath = "/calculators/tax-regime-2026";
const pageUrl = `${SITE_URL}${canonicalPath}`;

export const metadata: Metadata = {
  title: {
    absolute:
      "Old vs New Tax Regime Calculator 2025-26 — Which Saves More? | Finkoin",
  },
  description:
    "Free tax regime calculator for FY 2025-26. Compare old vs new tax regime with all deductions — 80C, HRA, NPS, home loan. Find which regime saves you more tax instantly. Works for salaried, freelancer, retired.",
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
    description:
      "Old vs New tax regime comparison. Free. Instant. Accurate. Know it. Fix it. Grow it.",
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
    description: "Old vs New tax regime comparison. Free. Instant. Accurate.",
    images: [`${SITE_URL}/og/og-tax-calculator.png`],
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Tax Regime Calculator 2025-26",
  url: pageUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  description:
    "Free old vs new tax regime calculator for FY 2025-26. Compare tax under both regimes instantly.",
  provider: {
    "@type": "Organization",
    name: "Finkoin",
    url: SITE_URL,
  },
  featureList: [
    "Old regime calculation with deductions",
    "New regime calculation",
    "Side by side comparison",
    "HRA, 80C, NPS deductions",
    "Instant results",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which tax regime is better for salaried employees in 2025-26?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For FY 2025-26, the new tax regime is better if your deductions (80C + HRA + home loan interest) are less than ₹3.75 lakh. If your deductions exceed ₹3.75 lakh, the old regime often saves more. Use Finkoin's calculator to find your exact saving.",
      },
    },
    {
      "@type": "Question",
      name: "What is the standard deduction in new tax regime 2025-26?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The standard deduction in the new tax regime for FY 2025-26 is ₹75,000 for salaried employees. This was increased from ₹50,000 in Budget 2024.",
      },
    },
    {
      "@type": "Question",
      name: "Can I switch between old and new tax regime every year?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Salaried employees can switch between old and new tax regime every financial year when filing ITR. Business owners can switch only once. Inform your employer at the start of the financial year.",
      },
    },
    {
      "@type": "Question",
      name: "What deductions are available in old tax regime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Old regime allows: Section 80C (₹1.5 lakh for PPF, ELSS, LIC), Section 80D (₹25,000 health insurance), HRA exemption, Section 24B (₹2 lakh home loan interest), NPS 80CCD(1B) (₹50,000 extra), and more.",
      },
    },
    {
      "@type": "Question",
      name: "Is income up to 12 lakh tax free in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Under the new tax regime, if your taxable income is up to ₹12 lakh after the ₹75,000 standard deduction, Section 87A rebate can bring tax to zero (subject to current Budget rules).",
      },
    },
  ],
};

export default function TaxRegime2026Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
      <div className="px-4 pb-4 sm:px-6">
        <CalculatorRelatedLinks links={getRelatedLinksForCalc("tax-regime")} />
      </div>
      <Suspense fallback={null}>
        <TaxExploreMore />
      </Suspense>
    </>
  );
}
