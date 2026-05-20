import { ArticleShare } from "@/components/learn/article-share";
import { ArticleTracker } from "@/components/learn/article-tracker";
import CompoundInterestGuide from "@/components/learn/CompoundInterestGuide";
import EmergencyFundGuide from "@/components/learn/EmergencyFundGuide";
import IndexFundGuide from "@/components/learn/IndexFundGuide";
import TermInsuranceVsEndowmentGuide from "@/components/learn/TermInsuranceVsEndowmentGuide";
import IncomeTaxGuideFY2526 from "@/components/learn/tax/IncomeTaxGuideFY2526";
import OldVsNewRegimeGuideFY2526 from "@/components/learn/tax/OldVsNewRegimeGuideFY2526";
import {
  learnArticleById,
  learnArticles,
  type LearnCategory,
} from "@/lib/learnContent";
import { getRichLearnArticle } from "@/lib/learnRichArticles";
import { LearnRichArticleRenderer } from "@/components/learn/LearnRichArticleRenderer";
import { LearnPlainArticle, LearnSimpleArticle } from "@/components/learn/LearnSimpleArticle";
import { cn } from "@/lib/cn";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/seo";

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

  const richLearn = getRichLearnArticle(article.id);
  if (richLearn) {
    return {
      title: { absolute: richLearn.seoTitle },
      description: richLearn.seoDescription,
      alternates: { canonical: `/learn/${article.id}` },
      keywords: [...richLearn.tags, "India", "personal finance", "Finkoin"],
      openGraph: {
        title: richLearn.seoTitle,
        description: richLearn.seoDescription,
        type: "article",
        url: `${SITE_URL}/learn/${article.id}`,
      },
      twitter: {
        card: "summary_large_image",
        title: richLearn.seoTitle,
        description: richLearn.seoDescription,
      },
    };
  }

  // Custom SEO metadata for our two tax cornerstone guides.
  if (article.id === "know-taxation-in-india-old-vs-new-slabs-interest-rates") {
    const seoTitle =
      "Complete Guide to Indian Income Tax FY 2025-26 (AY 2026-27) – ITR, Tax Slabs, Old vs New Regime, Deductions & Filing Explained";
    const description =
      "Beginner-friendly Indian income tax guide for FY 2025-26 (AY 2026-27): FY vs AY, ITR forms (ITR-1 to ITR-7), tax slabs, 87A rebate, cess/surcharge, TDS (Form 16/AIS/26AS), and old vs new regime explained with examples.";

    return {
      title: { absolute: seoTitle },
      description,
      alternates: { canonical: `/learn/${article.id}` },
      keywords: [
        "Indian income tax guide",
        "FY 2025-26 tax slab",
        "AY 2026-27 meaning",
        "ITR filing India",
        "old tax regime vs new tax regime",
        "what is ITR1",
        "income tax deductions India",
        "section 80C explained",
        "how to file income tax return",
        "best tax regime India",
        "income tax for salaried employees",
        "Indian taxation basics",
      ],
      openGraph: {
        title: seoTitle,
        description,
        type: "article",
        url: `${SITE_URL}/learn/${article.id}`,
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description,
      },
    };
  }

  if (article.id === "old-vs-new-tax-regime-which-saves-you-more-money") {
    const seoTitle =
      "Old vs New Tax Regime FY 2025-26 (AY 2026-27) — Which Saves More? Slabs, Deductions, 87A & Examples";
    const description =
      "A simple, practical old vs new tax regime guide for FY 2025-26: what deductions matter (80C, 80D, HRA, home loan 24(b), NPS), how to decide, proof checklist, and when each regime usually wins.";

    return {
      title: { absolute: seoTitle },
      description,
      alternates: { canonical: `/learn/${article.id}` },
      keywords: [
        "old tax regime vs new tax regime",
        "best tax regime India",
        "FY 2025-26 tax slab",
        "income tax for salaried employees",
        "section 80C explained",
        "section 80D explained",
        "HRA exemption",
        "home loan interest 24(b)",
        "87A rebate",
      ],
      openGraph: {
        title: seoTitle,
        description,
        type: "article",
        url: `${SITE_URL}/learn/${article.id}`,
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description,
      },
    };
  }

  if (article.id === "emergency-fund-how-much-where-to-keep-it") {
    const seoTitle =
      "Emergency Fund India 2026 — How Much (Up to 12 Months), Where to Keep, Examples by Life Stage | Finkoin";
    const description =
      "Emergency fund guide for India: why it matters first, how to count essential monthly expenses, life-stage targets from bachelor to married with two kids and dependent parents (max 12 months), rupee example, liquid funds vs sweep FD, and how to rebuild after use.";

    return {
      title: { absolute: seoTitle },
      description,
      alternates: { canonical: `/learn/${article.id}` },
      keywords: [
        "emergency fund India",
        "how much emergency fund",
        "12 months emergency savings",
        "emergency fund for salaried India",
        "liquid mutual fund emergency fund",
        "sweep FD emergency fund",
        "bachelor emergency fund months",
        "married couple emergency fund India",
        "emergency fund with children India",
        "where to keep emergency money India",
        "financial cushion India",
      ],
      openGraph: {
        title: seoTitle,
        description,
        type: "article",
        url: `${SITE_URL}/learn/${article.id}`,
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description,
      },
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

  const richLearn = getRichLearnArticle(article.id);

  const related = learnArticles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  return (
    <div className="min-h-dvh min-w-0 bg-white text-slate-900">
      <ArticleTracker articleId={article.id} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-3 px-4 py-6 sm:px-6">
          <Link href="/learn" className="text-sm font-semibold text-[#534AB7] hover:underline">
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

      <article className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {article.id === "know-taxation-in-india-old-vs-new-slabs-interest-rates" ? (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Learn", item: `${SITE_URL}/learn` },
                    { "@type": "ListItem", position: 2, name: article.title, item: `${SITE_URL}/learn/${article.id}` },
                  ],
                }),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Article",
                  headline:
                    "Complete Guide to Indian Income Tax FY 2025-26 (AY 2026-27) – ITR, Tax Slabs, Old vs New Regime, Deductions & Filing Explained",
                  description: article.subtitle,
                  mainEntityOfPage: `${SITE_URL}/learn/${article.id}`,
                  author: { "@type": "Organization", name: "Finkoin" },
                  publisher: { "@type": "Organization", name: "Finkoin" },
                }),
              }}
            />
            <IncomeTaxGuideFY2526 />
          </>
        ) : article.id === "old-vs-new-tax-regime-which-saves-you-more-money" ? (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Learn", item: `${SITE_URL}/learn` },
                    { "@type": "ListItem", position: 2, name: article.title, item: `${SITE_URL}/learn/${article.id}` },
                  ],
                }),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Article",
                  headline:
                    "Old vs New Tax Regime FY 2025-26 (AY 2026-27) — Which Saves More? Slabs, Deductions, 87A & Examples",
                  description: article.subtitle,
                  mainEntityOfPage: `${SITE_URL}/learn/${article.id}`,
                  author: { "@type": "Organization", name: "Finkoin" },
                  publisher: { "@type": "Organization", name: "Finkoin" },
                }),
              }}
            />
            <OldVsNewRegimeGuideFY2526 />
          </>
        ) : article.id === "what-is-compound-interest-and-why-it-changes-everything" ? (
          <LearnSimpleArticle
            article={article}
            toc={[
              { id: "intro", label: "Start here" },
              { id: "formula", label: "The formula" },
              { id: "example", label: "Worked example" },
              { id: "mutual-funds", label: "Mutual funds" },
              { id: "rule-72", label: "Rule of 72" },
              { id: "habits", label: "Protect compounding" },
            ]}
          >
            <section
              id="intro"
              className="scroll-mt-24 space-y-4 text-[17px] leading-[1.75] text-slate-800 sm:text-[18px] sm:leading-[1.8]"
            >
              {article.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </section>
            <CompoundInterestGuide />
          </LearnSimpleArticle>
        ) : article.id === "term-insurance-vs-endowment-why-most-indians-buy-wrong" ? (
          <LearnSimpleArticle
            article={article}
            toc={[
              { id: "intro", label: "Start here" },
              { id: "why-matters", label: "Why this matters" },
              { id: "example", label: "Illustrative example" },
              { id: "buying-wrong", label: "Buying wrong" },
              { id: "premium-discipline", label: "Premium discipline" },
            ]}
          >
            <section
              id="intro"
              className="scroll-mt-24 space-y-4 text-[17px] leading-[1.75] text-slate-800 sm:text-[18px] sm:leading-[1.8]"
            >
              {article.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </section>
            <TermInsuranceVsEndowmentGuide />
          </LearnSimpleArticle>
        ) : article.id === "what-is-an-index-fund-and-why-it-beats-most-mutual-funds" ? (
          <LearnSimpleArticle
            article={article}
            toc={[
              { id: "intro", label: "Start here" },
              { id: "cricket-analogy", label: "Cricket analogy" },
              { id: "what-is-index", label: "What is an index?" },
              { id: "what-is-index-fund", label: "Index funds" },
              { id: "fee-example", label: "Fee example" },
              { id: "spiva", label: "SPIVA data" },
              { id: "expense-ratio", label: "Expense ratio" },
              { id: "active-wins", label: "Active funds" },
              { id: "how-to-start", label: "How to start" },
              { id: "taxes", label: "Taxes" },
              { id: "myths", label: "Myths busted" },
            ]}
          >
            <section
              id="intro"
              className="scroll-mt-24 space-y-4 text-[17px] leading-[1.75] text-slate-800 sm:text-[18px] sm:leading-[1.8]"
            >
              {article.content.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </section>
            <IndexFundGuide />
          </LearnSimpleArticle>
        ) : article.id === "emergency-fund-how-much-where-to-keep-it" ? (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Learn", item: `${SITE_URL}/learn` },
                    { "@type": "ListItem", position: 2, name: article.title, item: `${SITE_URL}/learn/${article.id}` },
                  ],
                }),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Article",
                  headline: "Emergency Fund India — How Much (Up to 12 Months), Where to Keep, Life-Stage Examples",
                  description: article.subtitle,
                  mainEntityOfPage: `${SITE_URL}/learn/${article.id}`,
                  author: { "@type": "Organization", name: "Finkoin" },
                  publisher: { "@type": "Organization", name: "Finkoin" },
                }),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "How much emergency fund should I have in India?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Count one month as essential expenses only (rent or EMI, groceries, fees, insurance, minimum loan payments). Many people start with a few months and build toward a higher target; Finkoin’s Learn guide caps the planning target at up to 12 months of those essentials, with higher months typical when you have children or dependents.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Is 12 months of expenses enough for an emergency fund?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Twelve months of essential expenses is a strong ceiling for a cash-only emergency bucket. Beyond that, extra safety usually comes from insurance (term, health) and diversified long-term investments rather than indefinitely increasing idle cash.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Where should I keep my emergency fund in India?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Use instruments you can access in about one to two business days with stable value: liquid mutual funds, sweep fixed deposits linked to savings, or a separate savings account you do not use for daily spending. Avoid equity and long lock-in deposits for this bucket.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Should a bachelor build an emergency fund?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes. Even with lower fixed costs, a small buffer (for example a few months of essentials) prevents a first job loss or medical bill from turning into debt; you can increase the target as rent, EMIs, or family responsibilities grow.",
                      },
                    },
                  ],
                }),
              }}
            />
            <LearnSimpleArticle
              article={article}
              asideNote={
                <>
                  Target: up to <strong>12 months</strong> of essential expenses.
                </>
              }
              toc={[
                { id: "intro", label: "Start here" },
                { id: "why-first", label: "Why first" },
                { id: "one-month", label: "Count one month" },
                { id: "life-stages", label: "Life stages" },
                { id: "rupee-example", label: "Rupee example" },
                { id: "where-to-keep", label: "Where to keep" },
                { id: "home-loan", label: "Home loan EMIs" },
                { id: "build-rebuild", label: "Build & rebuild" },
              ]}
            >
              <section
                id="intro"
                className="scroll-mt-24 space-y-4 text-[17px] leading-[1.75] text-slate-800 sm:text-[18px] sm:leading-[1.8]"
              >
                {article.content.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </section>
              <EmergencyFundGuide />
            </LearnSimpleArticle>
          </>
        ) : richLearn ? (
          <LearnRichArticleRenderer rich={richLearn} articleId={article.id} />
        ) : (
          <LearnPlainArticle article={article} />
        )}

        {!richLearn && related.length > 0 ? (
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
