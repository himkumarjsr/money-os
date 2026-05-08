import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Financial Health Check — Know Your Score Free | Finkoin",
  },
  description:
    "Get your personalised financial health score out of 100. Analyses emergency fund, term insurance gap, debt ratio, and investment health. Free. 5 minutes.",
  keywords: [
    "financial health check India",
    "financial health score",
    "free financial analysis India",
    "emergency fund check",
    "insurance gap calculator",
  ],
  alternates: {
    canonical: "/analyse",
  },
  openGraph: {
    title: "Financial Health Check — Know Your Score Free | Finkoin",
    description:
      "Get your personalised financial health score out of 100. Analyses emergency fund, term insurance gap, debt ratio, and investment health. Free. 5 minutes.",
    url: `${SITE_URL}/analyse`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: "https://finkoin.com/og/og-analyse.png",
        width: 1200,
        height: 630,
        alt: "Finkoin Financial Health Score",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Financial Health Check — Know Your Score Free | Finkoin",
    description:
      "Get your personalised financial health score out of 100. Free. 5 minutes.",
    images: [`${SITE_URL}/og/og-analyse.png`],
  },
};

export default function AnalyseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
