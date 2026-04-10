import { ArticleShare } from "@/components/learn/article-share";
import { ArticleTracker } from "@/components/learn/article-tracker";
import {
  learnArticleById,
  learnArticles,
  type LearnCategory,
} from "@/lib/learnContent";
import { cn } from "@/lib/cn";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const badgeColors: Record<LearnCategory, string> = {
  Basics: "bg-slate-100 text-slate-800 ring-slate-200",
  Tax: "bg-violet-50 text-violet-800 ring-violet-200",
  Investment: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Insurance: "bg-sky-50 text-sky-800 ring-sky-200",
  Loans: "bg-amber-50 text-amber-900 ring-amber-200",
  Property: "bg-rose-50 text-rose-900 ring-rose-200",
};

type PageProps = {
  params: { id: string };
};

export function generateStaticParams() {
  return learnArticles.map((a) => ({ id: a.id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const article = learnArticleById[params.id];
  if (!article) {
    return {
      title: "Article not found | Finkoin Learn",
      robots: { index: false, follow: false },
    };
  }

  const title = `${article.title} | Finkoin Learn`;
  const description = article.subtitle;

  return {
    title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
    alternates: {
      canonical: `/learn/${article.id}`,
    },
    keywords: [
      article.category,
      "India",
      "personal finance",
      "Finkoin",
      article.title,
    ],
  };
}

export default function LearnArticlePage({ params }: PageProps) {
  const article = learnArticleById[params.id];
  if (!article) notFound();

  const related = learnArticles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <ArticleTracker articleId={article.id} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 sm:px-6">
          <Link
            href="/learn"
            className="text-sm font-medium text-[#534AB7] hover:underline"
          >
            ← All articles
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                badgeColors[article.category],
              )}
            >
              {article.category}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {article.readTime} min read
            </span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="text-lg text-slate-600 sm:text-xl">{article.subtitle}</p>
          <ArticleShare title={article.title} path={`/learn/${article.id}`} />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="space-y-6 text-[18px] leading-[1.8] text-slate-800">
          {article.content.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {related.length > 0 ? (
          <section className="mt-16 border-t border-slate-200 pt-12">
            <h2 className="text-xl font-semibold text-slate-900">
              Related articles
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              More in <strong>{article.category}</strong>
            </p>
            <ul className="mt-6 space-y-4">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/learn/${r.id}`}
                    className="group block rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-[#534AB7]/40"
                  >
                    <span className="text-xs font-semibold text-[#534AB7]">
                      {r.readTime} min read
                    </span>
                    <p className="mt-1 font-semibold text-slate-900 group-hover:text-[#534AB7]">
                      {r.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{r.subtitle}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
