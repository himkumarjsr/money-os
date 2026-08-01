import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Monthly Expense Tracker India — Free | Finkoin",
  },
  description:
    "Track monthly expenses by category. See where your money goes. Get insights on tea, coffee, EMIs, groceries. Free expense tracker for India.",
  keywords: [
    "expense tracker India free",
    "monthly budget tracker India",
    "personal finance tracker India",
    "spending tracker app India",
  ],
  alternates: {
    canonical: "/tracker",
  },
  openGraph: {
    title: "Monthly Expense Tracker India — Free | Finkoin",
    description:
      "Track monthly expenses by category. See where your money goes. Free expense tracker for India.",
    url: `${SITE_URL}/tracker`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-tracker.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Monthly Expense Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monthly Expense Tracker India — Free | Finkoin",
    description:
      "Track monthly expenses by category. See where your money goes.",
    images: [`${SITE_URL}/og/og-tracker.png`],
  },
};

export default function TrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
