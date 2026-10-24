import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import {
  BLOG_ARTICLES,
  getBlogArticle,
  relatedBlogArticles,
} from "@/lib/blogContent";
import { renderBlogBody } from "@/lib/renderBlogBody";
import { SITE_URL, socialImageTags, fitMetadata } from "@/lib/seo";
import { existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_NEXT_STEPS = [
  { href: "/analyse", label: "Run the free financial health check" },
  { href: "/calculators/tax-regime-2026", label: "Open tax regime calculator" },
  { href: "/tracker", label: "Track monthly expenses" },
];

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_ARTICLES.map((a) => ({ slug: a.slug }));
}

function blogOgPath(slug: string): string {
  const candidate = `/og/blog/${slug}.png`;
  const abs = path.join(process.cwd(), "public", candidate);
  return existsSync(abs) ? candidate : "/og/og-home.png";
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const article = getBlogArticle(params.slug);
  if (!article) {
    return { title: "Article not found | Finkoin" };
  }
  const ogPath = blogOgPath(article.slug);
  const pageTitle = article.metaTitle ?? `${article.title} | Finkoin`;
  const ogTitle = article.metaTitle ?? article.title;
  const { openGraphImages, twitterImages } = socialImageTags(
    ogPath,
    article.title,
  );
  return fitMetadata({
    title: article.metaTitle ? { absolute: article.metaTitle } : pageTitle,
    description: article.description,
    keywords: article.keywords,
    authors: [{ name: "Finkoin Team" }],
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      title: ogTitle,
      description: article.description,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      section: article.category,
      tags: article.keywords,
      authors: ["Finkoin Team"],
      url: `${SITE_URL}/blog/${article.slug}`,
      siteName: "Finkoin",
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: article.description,
      images: twitterImages,
    },
  });
}

export default async function BlogArticlePage(props: Props) {
  const params = await props.params;
  const article = getBlogArticle(params.slug);
  if (!article) notFound();

  const ogUrl = `${SITE_URL}${blogOgPath(article.slug)}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: [ogUrl],
    author: {
      "@type": "Organization",
      name: "Finkoin Team",
      url: `${SITE_URL}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: "Finkoin",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/icon-512x512.png`,
      },
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    keywords: article.keywords.join(", "),
    articleSection: article.category,
    inLanguage: "en-IN",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${article.slug}`,
    },
  };

  const faqJsonLd =
    article.faq && article.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: article.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.a,
            },
          })),
        }
      : null;

  const others = relatedBlogArticles(article);
  const nextSteps = article.relatedTools ?? DEFAULT_NEXT_STEPS;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Breadcrumb
          items={[
            { label: "Blog", href: "/blog" },
            { label: article.title, href: `/blog/${article.slug}` },
          ]}
        />
        <Link
          href="/blog"
          className="text-sm font-semibold text-[#534AB7] hover:underline"
        >
          ← All articles
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {article.category}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          By Finkoin Team ·{" "}
          <time dateTime={article.publishedAt}>{article.publishedAt}</time>
          {article.updatedAt && article.updatedAt !== article.publishedAt ? (
            <>
              {" "}
              · Updated{" "}
              <time dateTime={article.updatedAt}>{article.updatedAt}</time>
            </>
          ) : null}
          {article.readTimeMinutes
            ? ` · ${article.readTimeMinutes} min read`
            : null}
        </p>
        <div className="prose-slate mt-8 max-w-none">
          {renderBlogBody(article.body)}
        </div>

        {article.faq && article.faq.length > 0 ? (
          <section
            className="mt-14 border-t border-slate-200 pt-10"
            aria-labelledby="faq-heading"
          >
            <h2 id="faq-heading" className="text-xl font-bold text-slate-900">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {article.faq.map((f) => (
                <div key={f.q}>
                  <dt className="text-base font-semibold text-slate-900">
                    {f.q}
                  </dt>
                  <dd className="mt-2 text-base leading-relaxed text-slate-700">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Next steps</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-[#534AB7]">
            {nextSteps.map((step) => (
              <li key={step.href}>
                <Link href={step.href} className="hover:underline">
                  {step.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        {others.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Related
            </h2>
            <ul className="mt-3 space-y-3">
              {others.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/blog/${a.slug}`}
                    className="font-semibold text-[#534AB7] hover:underline"
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </>
  );
}
