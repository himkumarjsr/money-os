import Link from "next/link";
import type { RichArticle, RichBlock, RichSection } from "@/lib/learnRichArticles";
import { getLearnArticleFaqs, tocWithFaq } from "@/lib/learnArticleFaqs";
import { LearnArticleLayout } from "@/components/learn/LearnArticleLayout";
import LearnFaqAccordion from "@/components/learn/LearnFaqAccordion";

function Block({ block }: { block: RichBlock }) {
  if (block.kind === "p") {
    return <p className="text-[17px] leading-[1.75] text-slate-800 sm:text-[18px] sm:leading-[1.8]">{block.text}</p>;
  }
  if (block.kind === "ul") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-[17px] leading-relaxed text-slate-800 sm:text-[18px]">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.kind === "callout") {
    const tones = {
      violet: "border-violet-200 bg-violet-50/90 text-violet-950",
      emerald: "border-emerald-200 bg-emerald-50/90 text-emerald-950",
      amber: "border-amber-200 bg-amber-50/90 text-amber-950",
    } as const;
    return (
      <div className={`rounded-xl border p-4 text-sm leading-relaxed sm:text-base ${tones[block.tone]}`}>
        {block.title ? <p className="font-semibold">{block.title}</p> : null}
        <p className={block.title ? "mt-2" : ""}>{block.text}</p>
      </div>
    );
  }
  if (block.kind === "table") {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {block.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-slate-800">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

function SectionBlock({ section }: { section: RichSection }) {
  return (
    <section id={section.id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{section.title}</h2>
      <div className="space-y-4">
        {section.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </section>
  );
}

export function LearnRichArticleRenderer({ rich, articleId }: { rich: RichArticle; articleId: string }) {
  const faqs = getLearnArticleFaqs(articleId);
  const toc = tocWithFaq([{ id: "intro", label: "Introduction" }, ...rich.toc]);

  return (
    <LearnArticleLayout
      toc={toc}
      asideNote={
        <>
          Last updated: <strong>May 2026</strong>
        </>
      }
    >
      <div className="min-w-0 space-y-12 pb-8 text-slate-900">
        <div id="intro" className="scroll-mt-24 space-y-3 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap gap-2">
            {rich.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="space-y-4">
            {rich.intro.map((text, i) => (
              <p key={i} className="text-[17px] leading-[1.75] text-slate-800 sm:text-[18px] sm:leading-[1.8]">
                {text}
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          {rich.sections.map((s) => (
            <SectionBlock key={s.id} section={s} />
          ))}
        </div>

        {rich.finkoinTip ? (
          <div className="rounded-xl border border-[#534AB7]/30 bg-[#F7F6FE] p-4 text-sm text-[#3C3489] sm:text-base">
            <p className="font-semibold text-[#534AB7]">Finkoin tip</p>
            <p className="mt-2 leading-relaxed">{rich.finkoinTip}</p>
            <Link href={rich.finkoinTipHref ?? "/analyse"} className="mt-3 inline-block font-semibold hover:underline">
              Try it on Finkoin →
            </Link>
          </div>
        ) : null}

        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 sm:text-sm">
          <strong className="font-semibold">Educational only.</strong> Not personalised financial, tax, or investment
          advice. Finkoin is not a SEBI-registered investment advisor. Verify rates, rules, and product terms with your
          bank, insurer, or a qualified professional before acting.
        </div>

        <LearnFaqAccordion faqs={faqs} />

        <section aria-labelledby="rich-related" className="border-t border-slate-200 pt-10">
          <h2 id="rich-related" className="text-lg font-semibold text-slate-900">
            Related articles
          </h2>
          <ul className="mt-4 space-y-3">
            {rich.related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/learn/${r.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 font-semibold text-[#534AB7] transition hover:border-[#534AB7]/40 hover:underline"
                >
                  {r.title} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </LearnArticleLayout>
  );
}
