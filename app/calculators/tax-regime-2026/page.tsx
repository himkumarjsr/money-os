import type { Metadata } from "next";
import { Suspense } from "react";
import CalculatorsClient from "../CalculatorsClient";
import { SITE_URL } from "@/lib/seo";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import TaxExploreMore from "./TaxExploreMore";

const canonicalPath = "/calculators/tax-regime-2026";
const pageUrl = `${SITE_URL}${canonicalPath}`;

export const metadata: Metadata = {
  title: {
    absolute: "Tax Regime Calculator 2026 — Old vs New Regime | Finkoin",
  },
  description:
    "Free tax regime calculator for FY 2025-26. Compare old and new tax regime with all deductions — 80C, HRA, home loan, NPS, education loan. Works for salaried, freelancer, retired. Updated for Budget 2025.",
  keywords: [
    "old vs new tax regime 2026",
    "tax regime calculator 2026",
    "income tax calculator India 2026",
    "which tax regime is better",
    "new tax regime slabs 2026",
    "87A rebate calculator",
    "80C deduction limit 2026",
    "HRA exemption calculator",
    "income tax FY 2025-26",
  ],
  alternates: {
    canonical: canonicalPath,
  },
  openGraph: {
    title: "Tax Regime Calculator 2026 — Old vs New | Finkoin",
    description:
      "Free. Compare old and new tax regime. All deductions included.",
    url: pageUrl,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-tax-calculator.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Tax Regime Calculator 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tax Regime Calculator 2026 — Old vs New | Finkoin",
    description:
      "Free. Compare old and new tax regime. All deductions included.",
    images: [`${SITE_URL}/og/og-tax-calculator.png`],
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Finkoin Tax Regime Calculator 2026",
  description:
    "Free calculator to compare old and new tax regime for FY 2025-26",
  url: pageUrl,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  featureList: [
    "Old vs New tax regime comparison",
    "All deductions: 80C, HRA, NPS, home loan",
    "Works for salaried, freelancer, retired",
    "FY 2025-26 slabs",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which tax regime is better in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on your deductions. If your total deductions (80C, HRA, home loan, NPS) exceed ₹3.75 lakh, old regime usually saves more. If your deductions are less, new regime is better. Use our free calculator to find out exactly.",
      },
    },
    {
      "@type": "Question",
      name: "What is the new tax regime slab for FY 2025-26?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "New regime slabs: ₹0-4L: 0%, ₹4-8L: 5%, ₹8-12L: 10%, ₹12-16L: 15%, ₹16-20L: 20%, ₹20-24L: 25%, above ₹24L: 30%. Income up to ₹12L gets full tax rebate under 87A.",
      },
    },
    {
      "@type": "Question",
      name: "Is income up to 12 lakh tax free in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Under the new tax regime, if your taxable income is up to ₹12 lakh after standard deduction of ₹75,000, you get full tax rebate under Section 87A and pay zero tax.",
      },
    },
    {
      "@type": "Question",
      name: "Can I switch tax regime every year?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Salaried employees can switch between old and new regime every year. Business owners can switch only once from new to old regime.",
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
      <Suspense
        fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
      >
        <CalculatorsClient
          initialCalcId="tax-regime"
          urlBaseForTaxCanonical="/calculators/tax-regime-2026"
        />
      </Suspense>
      <Suspense fallback={null}>
        <TaxExploreMore />
      </Suspense>
    </>
  );
}
