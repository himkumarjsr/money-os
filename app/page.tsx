import type { Metadata } from "next";
import HomePageClient from "@/components/landing/HomePageClient";
import {
  FINKOIN_TAGLINE,
  FINKOIN_TAGLINE_FULL,
  FINKOIN_TAGLINE_SUB,
  SEO_CONFIG,
  SITE_URL,
} from "@/lib/seo";

const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Finkoin?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Finkoin is India's free personal finance platform. ${FINKOIN_TAGLINE_FULL} Check your financial health score, compare old vs new tax regime, plan SIPs, track expenses, and split bills — no PAN or Aadhaar needed.`,
      },
    },
    {
      "@type": "Question",
      name: "How much emergency fund do I need in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For single individuals in India, 6 months of expenses. For married couples, 9 months. For families with kids, 12 months. Keep in liquid mutual funds or a savings account.",
      },
    },
    {
      "@type": "Question",
      name: "How much term insurance do I need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Annual income multiplied by 10, adjusted for age, loans, and dependents. Minimum ₹50 lakh. Always buy pure term, not ULIP or endowment.",
      },
    },
    {
      "@type": "Question",
      name: "How much should I invest per month in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Minimum 20% of take-home salary. Start with a Nifty 50 index fund SIP. Increase by 10% every year as income grows.",
      },
    },
    {
      "@type": "Question",
      name: "What is a good financial health score?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Above 70 is good. 50-70 is on track. Below 50 needs attention. The score considers emergency fund, insurance coverage, debt ratio, and investment rate.",
      },
    },
    {
      "@type": "Question",
      name: "Which tax regime is better for salaried employees in 2025-26?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For FY 2025-26, the new tax regime is often better if your deductions (80C + HRA + home loan interest) are below about ₹3.75 lakh. If deductions are higher, compare with Finkoin's free old vs new tax regime calculator.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: {
    absolute: SEO_CONFIG.defaultTitle,
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.defaultKeywords,
  openGraph: {
    title: SEO_CONFIG.defaultTitle,
    description: `${FINKOIN_TAGLINE_FULL} Free financial health check, tax calculator, SIP calculator, home loan EMI, expense tracker and more. Built for Indians.`,
    url: SITE_URL,
    siteName: "Finkoin",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: `${SITE_URL}/og/og-home.png`,
        width: 1200,
        height: 630,
        alt: `Finkoin — ${FINKOIN_TAGLINE_FULL}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Finkoin — ${FINKOIN_TAGLINE}`,
    description: `${FINKOIN_TAGLINE_FULL} Free financial health check for every Indian. No PAN needed.`,
    images: [`${SITE_URL}/og/og-home.png`],
  },
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }}
      />
      <HomePageClient>
        <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          <span className="block font-semibold text-[#534AB7]">
            {FINKOIN_TAGLINE_SUB}
          </span>
          <span className="mt-1 block text-slate-900 sm:mt-2">
            {FINKOIN_TAGLINE}
          </span>
        </h1>
        <h2 className="mx-auto mt-3 max-w-2xl text-pretty text-center text-[13px] font-normal leading-relaxed text-slate-600 sm:mt-4 sm:text-base">
          Check your financial health score, calculate tax savings, plan
          investments — everything in one place. No PAN needed.
        </h2>
      </HomePageClient>
    </>
  );
}
