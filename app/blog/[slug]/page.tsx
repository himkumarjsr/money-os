import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_ARTICLES, getBlogArticle } from "@/lib/blogContent";
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
  return {
    title: `${article.title} | Finkoin`,
    description: article.description,
    keywords: article.keywords,
    authors: [{ name: "Himanshu Kumar" }],
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
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
      title: article.title,
      description: article.description,
      images: [`${SITE_URL}${ogPath}`],
    },
  };
}

function renderMarkdownish(body: string) {
  const blocks = body.trim().split(/\n\n+/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    const first = lines[0] ?? "";
    if (first.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-10 text-xl font-bold text-slate-900">
          {first.replace(/^##\s+/, "")}
        </h2>
      );
    }
    const parts = block.split(/(\[[^\]]+\]\([^)]+\))/g);
    return (
      <p key={i} className="mt-4 text-base leading-relaxed text-slate-700">
        {parts.map((part, j) => {
          const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (m) {
            return (
              <Link key={j} href={m[2]} className="font-semibold text-[#534AB7] hover:underline">
                {m[1]}
              </Link>
            );
          }
          const bolded = part.split(/\*\*([^*]+)\*\*/g);
          if (bolded.length > 1) {
            return bolded.map((b, k) =>
              k % 2 === 1 ? (
                <strong key={k} className="font-semibold text-slate-900">
                  {b}
                </strong>
              ) : (
                <span key={k}>{b}</span>
              ),
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </p>
    );
  });
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

  const others = BLOG_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link href="/blog" className="text-sm font-semibold text-[#534AB7] hover:underline">
          ← All articles
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{article.category}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{article.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          By Himanshu Kumar · {article.publishedAt}
        </p>
        <div className="prose-slate mt-8 max-w-none">{renderMarkdownish(article.body)}</div>
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
