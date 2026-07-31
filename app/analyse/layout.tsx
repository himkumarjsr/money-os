import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

const title = "Financial Health Check — Know Your Score Free | Finkoin";
const description =
  "Get your personalised Finkoin financial health score out of 100. Analyses emergency fund, term insurance gap, debt ratio, and investment health. Free. 5 minutes.";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  keywords: [
    "Finkoin financial health check",
    "financial health check India",
    "financial health score",
    "free financial analysis India",
    "emergency fund check",
    "insurance gap calculator",
    "Finkoin analyse",
  ],
  alternates: {
    canonical: "/analyse",
  },
  robots: "index, follow",
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/analyse`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-analyse.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Financial Health Score",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Get your personalised financial health score out of 100. Free. 5 minutes.",
    images: [`${SITE_URL}/og/og-analyse.png`],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Finkoin Financial Health Check",
      description,
      url: `${SITE_URL}/analyse`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
      provider: {
        "@type": "Organization",
        name: "Finkoin",
        url: SITE_URL,
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Finkoin financial health check?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A free 5-minute assessment that scores emergency fund, insurance, debt, and investment health for Indian users.",
          },
        },
        {
          "@type": "Question",
          name: "Is the Finkoin analyse tool free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The core financial health check on Finkoin is free to start.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need PAN or Aadhaar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Finkoin does not require PAN or Aadhaar for the financial health check.",
          },
        },
      ],
    },
  ],
};

export default function AnalyseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
