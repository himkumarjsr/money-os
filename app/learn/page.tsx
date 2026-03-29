import { LearnHub } from "@/components/learn/learn-hub";
import { learnArticles } from "@/lib/learnContent";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn personal finance — guides for India | MoneyOS",
  description:
    "Free, practical explainers on tax, investing, insurance, loans, and property — written for Indian households. Filter by topic and read in minutes.",
  openGraph: {
    title: "MoneyOS Learn — personal finance education",
    description:
      "Compound interest, tax regimes, SIPs, home loans, insurance, and more — clear articles with no jargon overload.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MoneyOS Learn — personal finance education",
    description:
      "Compound interest, tax regimes, SIPs, home loans, insurance, and more.",
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
              className="text-sm font-medium text-[#534AB7] hover:underline"
            >
              ← MoneyOS
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Learn finance
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Short, India-relevant guides — no paywall, no fluff. Pick a
              category or browse everything.
            </p>
          </div>
          <Link
            href="/calculators"
            className="text-sm font-semibold text-[#534AB7] hover:underline"
          >
            Try calculators →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <LearnHub articles={learnArticles} />
      </main>
    </div>
  );
}
