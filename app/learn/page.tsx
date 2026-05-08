import { LearnHub } from "@/components/learn/learn-hub";
import { learnArticles } from "@/lib/learnContent";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Learn Personal Finance — India Guide | Finkoin",
  },
  description:
    "Learn personal finance the Indian way. Emergency fund, term insurance, SIP investing, tax saving — all explained simply with examples.",
  keywords: [
    "personal finance India guide",
    "how to save tax India",
    "term insurance guide India",
    "SIP investment guide India",
    "emergency fund guide India",
  ],
  alternates: {
    canonical: "/learn",
  },
  openGraph: {
    title: "Learn Personal Finance — India Guide | Finkoin",
    description:
      "Learn personal finance the Indian way. Emergency fund, term insurance, SIP investing, tax saving — all explained simply with examples.",
    url: `${SITE_URL}/learn`,
    siteName: "Finkoin",
    type: "website",
    images: [{ url: `${SITE_URL}/og/og-home.png`, width: 1200, height: 630, alt: "Finkoin Learn" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn Personal Finance — India Guide | Finkoin",
    description:
      "Learn personal finance the Indian way. Emergency fund, term insurance, SIP investing, tax saving — all explained simply with examples.",
    images: [`${SITE_URL}/og/og-home.png`],
  },
};

export default function LearnPage() {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-[#534AB7] hover:underline"
            >
              Back
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Learn finance
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Short, India-relevant guides — no paywall, no fluff. Pick a
              category or browse everything.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#534AB7]">
            <Link href="/calculators" className="hover:underline">
              Try calculators →
            </Link>
            <Link href="/analyse" className="hover:underline">
              Financial health check →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <LearnHub articles={learnArticles} />
      </main>
    </div>
  );
}
