import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

const title = "Portfolio Analysis — Mutual Fund Review | Finkoin";
const description =
  "Analyse your mutual fund portfolio. See what to continue, watch, or switch. Free portfolio insights for India.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [
    "portfolio analysis India",
    "mutual fund portfolio review",
    "Finkoin portfolio analysis",
    "fund performance review India",
  ],
  alternates: { canonical: "/portfolio" },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/portfolio`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-portfolio.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Portfolio Analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${SITE_URL}/og/og-portfolio.png`],
  },
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
