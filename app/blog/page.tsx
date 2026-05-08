import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_ARTICLES } from "@/lib/blogContent";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Personal Finance Blog India — Tips, Guides, Calculators | Finkoin",
  },
  description:
    "Free personal finance guides for India. Tax saving, insurance planning, investment advice, expense tracking. Written in plain language.",
  keywords: [
    "personal finance blog India",
    "tax saving tips India 2026",
    "investment guide India",
    "financial planning India",
  ],
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Personal Finance Blog India — Tips, Guides, Calculators | Finkoin",
    description:
      "Free personal finance guides for India. Tax saving, insurance planning, investment advice, expense tracking.",
    url: `${SITE_URL}/blog`,
    siteName: "Finkoin",
    type: "website",
    images: [{ url: `${SITE_URL}/og/og-home.png`, width: 1200, height: 630, alt: "Finkoin blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal Finance Blog India — Tips, Guides, Calculators | Finkoin",
    description:
      "Free personal finance guides for India. Tax saving, insurance planning, investment advice, expense tracking.",
    images: [`${SITE_URL}/og/og-home.png`],
  },
};

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Blog</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Money guides for India</h1>
      <p className="mt-4 text-slate-600">
        Plain-language articles on tax, insurance, saving, and investing — with links to free calculators and tools.
      </p>
      <ul className="mt-10 space-y-6">
        {BLOG_ARTICLES.map((a) => (
          <li key={a.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{a.category}</p>
            <Link href={`/blog/${a.slug}`} className="mt-2 block text-lg font-semibold text-slate-900 hover:text-[#534AB7]">
              {a.title}
            </Link>
            <p className="mt-2 text-sm text-slate-600">{a.description}</p>
            <p className="mt-3 text-xs text-slate-500">Published {a.publishedAt}</p>
            <Link href={`/blog/${a.slug}`} className="mt-3 inline-block text-sm font-semibold text-[#534AB7] hover:underline">
              Read article →
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-12 flex flex-wrap gap-4 text-sm font-semibold text-[#534AB7]">
        <Link href="/calculators/tax-regime-2026" className="hover:underline">
          Tax calculator
        </Link>
        <Link href="/analyse" className="hover:underline">
          Financial health check
        </Link>
        <Link href="/learn" className="hover:underline">
          Learn hub
        </Link>
        <Link href="/" className="hover:underline">
          ← Home
        </Link>
      </div>
    </div>
  );
}
