import { LearnArticleLayout } from "@/components/learn/LearnArticleLayout";
import LearnFaqAccordion from "@/components/learn/LearnFaqAccordion";
import { getLearnArticleFaqs, tocWithFaq } from "@/lib/learnArticleFaqs";
import type { LearnArticle } from "@/lib/learnContent";
import type { LearnTocItem } from "@/components/learn/LearnArticleLayout";
import type { ReactNode } from "react";

type LearnSimpleArticleProps = {
  article: LearnArticle;
  toc: LearnTocItem[];
  asideNote?: ReactNode;
  children: ReactNode;
};

export function LearnSimpleArticle({ article, toc, asideNote, children }: LearnSimpleArticleProps) {
  const faqs = getLearnArticleFaqs(article.id, article);

  return (
    <LearnArticleLayout toc={tocWithFaq(toc)} asideNote={asideNote}>
      <div className="min-w-0 space-y-12">
        {children}
        <LearnFaqAccordion faqs={faqs} />
      </div>
    </LearnArticleLayout>
  );
}

type LearnPlainArticleProps = {
  article: LearnArticle;
};

export function LearnPlainArticle({ article }: LearnPlainArticleProps) {
  const toc: LearnTocItem[] = [{ id: "overview", label: "Overview" }];

  return (
    <LearnSimpleArticle article={article} toc={toc}>
      <section id="overview" className="scroll-mt-24 space-y-6 text-[18px] leading-[1.8] text-slate-800">
        {article.content.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </section>
    </LearnSimpleArticle>
  );
}
