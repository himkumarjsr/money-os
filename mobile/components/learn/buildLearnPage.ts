import type { ContentBlock, ContentSection } from "@/components/content/types";
import type { LearnArticle } from "@/lib/learnContent";
import { getLearnArticleFaqs, tocWithFaq } from "@/lib/learnArticleFaqs";
import { getRichLearnArticle, type RichArticle, type RichBlock } from "@/lib/learnRichArticles";
import { COMPOUND_INTEREST_GUIDE } from "./guides/compoundInterestGuide";
import { EMERGENCY_FUND_GUIDE } from "./guides/emergencyFundGuide";
import { FORM16_GUIDE } from "./guides/form16Guide";
import { INCOME_TAX_GUIDE } from "./guides/incomeTaxGuide";
import { INDEX_FUND_GUIDE } from "./guides/indexFundGuide";
import { OLD_VS_NEW_REGIME_GUIDE } from "./guides/oldVsNewRegimeGuide";
import { SIP_CRORE_GUIDE } from "./guides/sipCroreGuide";
import { TERM_INSURANCE_GUIDE } from "./guides/termInsuranceGuide";
import type { LearnGuideBody, LearnPage } from "./types";

/** Article ids that render a bespoke (hand-built) guide on the PWA. */
export const BESPOKE_GUIDES: Record<string, LearnGuideBody> = {
  "sip-calculator-1-crore-10-15-20-years": SIP_CRORE_GUIDE,
  "form-16-what-to-verify": FORM16_GUIDE,
  "know-taxation-in-india-old-vs-new-slabs-interest-rates": INCOME_TAX_GUIDE,
  "old-vs-new-tax-regime-which-saves-you-more-money": OLD_VS_NEW_REGIME_GUIDE,
  "what-is-compound-interest-and-why-it-changes-everything": COMPOUND_INTEREST_GUIDE,
  "term-insurance-vs-endowment-why-most-indians-buy-wrong": TERM_INSURANCE_GUIDE,
  "what-is-an-index-fund-and-why-it-beats-most-mutual-funds": INDEX_FUND_GUIDE,
  "emergency-fund-how-much-where-to-keep-it": EMERGENCY_FUND_GUIDE,
};

/** Port of components/learn/tools/HomeLoanPrepayEmbed (as a native calculator link). */
const HOME_LOAN_PREPAY_TOOL: ContentSection = {
  id: "prepay-tool",
  blocks: [
    {
      kind: "tool",
      title: "Home loan prepayment calculator",
      subtitle: "Should you reduce EMI or tenure? Target: home loan prepayment calculator.",
      text: "Model prepayments, EMI and tenure on your own loan numbers.",
      href: "/calculators/home",
      label: "Open home loan calculator →",
    },
  ],
};

function richBlock(b: RichBlock): ContentBlock {
  switch (b.kind) {
    case "p":
      return { kind: "p", text: b.text };
    case "ul":
      return { kind: "ul", items: b.items };
    case "callout":
      return { kind: "callout", tone: b.tone, title: b.title, text: b.text };
    case "table":
      return { kind: "table", headers: b.headers, rows: b.rows };
  }
}

/** Port of components/learn/LearnRichArticleRenderer.tsx. */
function richPage(rich: RichArticle, articleId: string): LearnPage {
  const sections: ContentSection[] = [
    {
      id: "intro",
      blocks: [
        { kind: "tags", items: rich.tags.map((label) => ({ label })) },
        ...rich.intro.map((text): ContentBlock => ({ kind: "p", text })),
      ],
    },
    ...rich.sections.map(
      (s): ContentSection => ({ id: s.id, title: s.title, blocks: s.blocks.map(richBlock) }),
    ),
  ];
  if (rich.finkoinTip) {
    sections.push({
      id: "finkoin-tip",
      blocks: [
        {
          kind: "callout",
          tone: "brand",
          title: "Finkoin tip",
          text: rich.finkoinTip,
          blocks: [
            { kind: "p", text: `[Try it on Finkoin →](${rich.finkoinTipHref ?? "/analyse"})` },
          ],
        },
      ],
    });
  }
  sections.push({
    id: "disclaimer",
    blocks: [
      {
        kind: "callout",
        tone: "amber",
        text: "**Educational only.** Not personalised financial, tax, or investment advice. Finkoin is not a SEBI-registered investment advisor. Verify rates, rules, and product terms with your bank, insurer, or a qualified professional before acting.",
      },
    ],
  });

  return {
    toc: tocWithFaq([{ id: "intro", label: "Introduction" }, ...rich.toc]),
    asideNote: "Last updated: **May 2026**",
    sections,
    faqs: getLearnArticleFaqs(articleId),
    afterFaq: [
      {
        id: "rich-related",
        blocks: [
          {
            kind: "links",
            title: "Related articles",
            items: rich.related.map((r) => ({ label: `${r.title} →`, href: `/learn/${r.id}` })),
          },
        ],
      },
    ],
    showCategoryRelated: false,
  };
}

function introSection(article: LearnArticle): ContentSection {
  return {
    id: "intro",
    blocks: article.content.map((text): ContentBlock => ({ kind: "p", text })),
  };
}

export function buildLearnPage(article: LearnArticle): LearnPage {
  const rich = getRichLearnArticle(article.id);
  const bespoke = BESPOKE_GUIDES[article.id];

  if (bespoke) {
    return {
      toc: tocWithFaq(bespoke.toc),
      asideNote: bespoke.asideNote,
      sections: bespoke.includeArticleIntro
        ? [introSection(article), ...bespoke.sections]
        : bespoke.sections,
      faqs: bespoke.faqs ?? getLearnArticleFaqs(article.id, article),
      faqSubtitle: bespoke.faqSubtitle,
      faqPlaceholder: bespoke.faqPlaceholder,
      afterFaq: bespoke.afterFaq ?? [],
      showCategoryRelated: !rich,
    };
  }

  if (rich) {
    const page = richPage(rich, article.id);
    if (article.id === "prepayment-vs-tenure-reduction-home-loan") {
      page.sections = [HOME_LOAN_PREPAY_TOOL, ...page.sections];
    }
    return page;
  }

  return {
    toc: tocWithFaq([{ id: "overview", label: "Overview" }]),
    sections: [{ ...introSection(article), id: "overview" }],
    faqs: getLearnArticleFaqs(article.id, article),
    afterFaq: [],
    showCategoryRelated: true,
  };
}
