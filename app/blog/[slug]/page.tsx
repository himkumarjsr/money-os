import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_ARTICLES, getBlogArticle } from "@/lib/blogContent";
import { renderBlogBody } from "@/lib/renderBlogBody";
import { SITE_URL } from "@/lib/seo";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return BLOG_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getBlogArticle(params.slug);
  if (!article) {
    return { title: "Article not found | Finkoin" };
  }
  const ogPath = `/og/blog/${article.slug}.png`;
  const pageTitle = article.metaTitle ?? `${article.title} | Finkoin`;
  return {
    title: article.metaTitle ? { absolute: article.metaTitle } : pageTitle,
    description: article.description,
    keywords: article.keywords,
    authors: [{ name: "Himanshu Kumar" }],
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      title: article.metaTitle ?? article.title,
      description: article.description,
      type: "article",
      publishedTime: article.publishedAt,
      authors: ["Himanshu Kumar"],
      url: `${SITE_URL}/blog/${article.slug}`,
      siteName: "Finkoin",
      images: [{ url: `${SITE_URL}${ogPath}`, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle ?? article.title,
      description: article.description,
      images: [`${SITE_URL}${ogPath}`],
    },
  };
}

export default function BlogArticlePage({ params }: Props) {
  const article = getBlogArticle(params.slug);
  if (!article) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: {
      "@type": "Person",
      name: "Himanshu Kumar",
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
    dateModified: article.publishedAt,
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

  const others = BLOG_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
      <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link href="/blog" className="text-sm font-semibold text-[#534AB7] hover:underline">
          ← All articles
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{article.category}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{article.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          By Himanshu Kumar · {article.publishedAt}
          {article.readTimeMinutes ? ` · ${article.readTimeMinutes} min read` : null}
        </p>
        <div className="prose-slate mt-8 max-w-none">{renderBlogBody(article.body)}</div>

        {article.faq && article.faq.length > 0 ? (
          <section className="mt-14 border-t border-slate-200 pt-10" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-xl font-bold text-slate-900">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {article.faq.map((f) => (
                <div key={f.q}>
                  <dt className="text-base font-semibold text-slate-900">{f.q}</dt>
                  <dd className="mt-2 text-base leading-relaxed text-slate-700">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Next steps</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-[#534AB7]">
            <li>
              <Link href="/analyse" className="hover:underline">
                Run the free financial health check
              </Link>
            </li>
            <li>
              <Link href="/calculators/tax-regime-2026" className="hover:underline">
                Open tax regime calculator
              </Link>
            </li>
            <li>
              <Link href="/tracker" className="hover:underline">
                Track monthly expenses
              </Link>
            </li>
          </ul>
        </section>
        {others.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Related</h2>
            <ul className="mt-3 space-y-3">
              {others.map((a) => (
                <li key={a.slug}>
                  <Link href={`/blog/${a.slug}`} className="font-semibold text-[#534AB7] hover:underline">
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
