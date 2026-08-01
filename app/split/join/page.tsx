import { Suspense } from "react";
import type { Metadata } from "next";
import JoinSplitGroupClient from "./JoinSplitGroupClient";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Join group — Finkoin Split" },
  description:
    "You've been invited to split expenses on Finkoin. Open the link to join the group and track shared spends together.",
  robots: "noindex, nofollow",
  openGraph: {
    title: "Finkoin Split — Free Expense Splitting",
    description:
      "Split expenses with friends. Track group spending. Settle debts easily. Free forever.",
    url: `${SITE_URL}/split/join`,
    siteName: "Finkoin",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og/og-split.png`,
        width: 1200,
        height: 630,
        alt: "Finkoin Split — Split expenses with friends",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finkoin Split — Free Expense Splitting",
    description:
      "Split expenses with friends. Track group spending. Settle debts easily.",
    images: [`${SITE_URL}/og/og-split.png`],
  },
};

export default function JoinSplitGroupPage() {
  return (
    <Suspense
      fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
    >
      <JoinSplitGroupClient />
    </Suspense>
  );
}
