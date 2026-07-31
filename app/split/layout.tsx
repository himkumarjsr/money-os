import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

const title = "Finkoin Split — Split Expenses with Friends | India";
const description =
  "Split bills, track shared expenses and settle debts with friends. Free expense splitting app for Indians — a simple Splitwise alternative. Finkoin Split.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [
    "Finkoin Split",
    "expense splitting app India",
    "split bills friends India",
    "splitwise alternative India",
    "group expense tracker India",
    "trip expense splitter",
  ],
  alternates: { canonical: "/split" },
  robots: "index, follow",
  openGraph: {
    title: "Finkoin Split — Free Expense Splitting",
    description:
      "Split expenses with friends. Track group spending. Settle debts easily. Free forever.",
    url: `${SITE_URL}/split`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-home.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Split",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finkoin Split — Free Expense Splitting",
    description:
      "Split expenses with friends. Track group spending. Settle debts easily.",
    images: [`${SITE_URL}/og/og-home.png`],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Finkoin Split",
      description,
      url: `${SITE_URL}/split`,
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
          name: "What is Finkoin Split?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A free expense-splitting app for friends, roommates, and trips in India. Create a group, add spends, and see who owes whom.",
          },
        },
        {
          "@type": "Question",
          name: "Is Finkoin Split a Splitwise alternative?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. It is built for Indian groups who want simple bill splitting. Free to start.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need to pay to split bills?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Core splitting on Finkoin Split is free.",
          },
        },
      ],
    },
  ],
};

export default function SplitLayout({
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
