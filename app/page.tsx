import type { Metadata } from "next";
import HomePageClient from "@/components/landing/HomePageClient";
import { SITE_URL } from "@/lib/seo";

const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much emergency fund do I need in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For single individuals in India, 6 months of expenses. For married couples, 9 months. For families with kids, 12 months. Keep in liquid mutual funds or savings account.",
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
        text: "Minimum 20% of take-home salary. Start with Nifty 50 index fund SIP. Increase by 10% every year as income grows.",
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
  ],
};

export const metadata: Metadata = {
  title: {
    absolute: "Finkoin — Free Financial Health Check for India",
  },
  description:
    "Finkoin helps Indians check their financial health score in 5 minutes. Emergency fund, insurance gap, net worth, fix plan. Free. No PAN. No Aadhaar.",
  keywords: ["Finkoin", "finkoin.com", "Finkoin app", "financial health check India"],
  openGraph: {
    title: "Finkoin — Free Financial Health Check",
    description:
      "Finkoin helps Indians check their financial health score in 5 minutes. Emergency fund, insurance gap, net worth, fix plan. Free. No PAN. No Aadhaar.",
    url: SITE_URL,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: "https://finkoin.com/og/og-home.png",
        width: 1200,
        height: 630,
        alt: "Finkoin — Free Financial Health Check for India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finkoin — Free Financial Health Check",
    description:
      "Finkoin helps Indians check their financial health score in 5 minutes. Emergency fund, insurance gap, net worth, fix plan. Free. No PAN. No Aadhaar.",
    images: [`${SITE_URL}/og/og-home.png`],
  },
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }} />
      <HomePageClient>
        <h1 className="mx-auto max-w-4xl text-balance text-center text-3xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Finkoin — Free Financial Health Check for India
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-center text-sm leading-relaxed text-slate-600 sm:text-base sm:leading-relaxed">
          Finkoin helps Indians check their financial health score in 5 minutes—emergency fund, insurance gap, net
          worth, and a clear fix plan. Free. No PAN. No Aadhaar.
        </p>
      </HomePageClient>
    </>
  );
}
