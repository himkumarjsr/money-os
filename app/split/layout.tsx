import type { Metadata } from "next";
import { SITE_URL, fitMetadata } from "@/lib/seo";

const title = "Finkoin Settle Up - Split Expenses with Friends | India";
const description =
  "Split bills, track shared expenses and settle debts with friends. Free expense splitting app for Indians - a simple Splitwise alternative. Finkoin Settle Up.";

export const metadata: Metadata = fitMetadata({
  title: { absolute: title },
  description,
  keywords: [
    "Finkoin Settle Up",
    "expense splitting app India",
    "split bills friends India",
    "splitwise alternative India",
    "group expense tracker India",
    "trip expense splitter",
  ],
  alternates: { canonical: "/split" },
  robots: "index, follow",
  openGraph: {
    title: "Finkoin Settle Up - Free Expense Splitting",
    description:
      "Split expenses with friends. Track group spending. Settle debts easily. Free forever.",
    url: `${SITE_URL}/split`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-split.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Settle Up - Split expenses with friends",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finkoin Settle Up - Free Expense Splitting",
    description:
      "Split expenses with friends. Track group spending. Settle debts easily.",
    images: [`${SITE_URL}/og/og-split.png`],
  },
});

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Finkoin Settle Up",
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
          name: "What is Finkoin Settle Up?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A free expense-splitting app for friends, roommates, and trips in India. Create a group, add spends, and see who owes whom.",
          },
        },
        {
          "@type": "Question",
          name: "Is Finkoin Settle Up a Splitwise alternative?",
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
            text: "No. Core splitting on Finkoin Settle Up is free.",
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
