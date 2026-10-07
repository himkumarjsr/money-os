import type { ContentSection, TocItem } from "@/components/content/types";
import type { Faq } from "@/components/content/FaqAccordion";

/** Widget ids rendered natively inside Learn guides. */
export const LEARN_WIDGETS = {
  sipCrore: "learn-sip-crore",
  taxRegimeToggle: "learn-tax-regime-toggle",
} as const;

/** A bespoke guide body (port of components/learn/*Guide.tsx). */
export type LearnGuideBody = {
  toc: TocItem[];
  asideNote?: string;
  /** Prepend `article.content` paragraphs as an "intro" section. */
  includeArticleIntro?: boolean;
  sections: ContentSection[];
  /** Own FAQ list (tax guides); otherwise lib/learnArticleFaqs is used. */
  faqs?: Faq[];
  faqSubtitle?: string;
  faqPlaceholder?: string;
  afterFaq?: ContentSection[];
};

/** Fully resolved page model rendered by app/learn/[id].tsx. */
export type LearnPage = {
  toc: TocItem[];
  asideNote?: string;
  sections: ContentSection[];
  faqs: Faq[];
  faqSubtitle?: string;
  faqPlaceholder?: string;
  afterFaq: ContentSection[];
  /** Show "Related articles" from the same category (non-rich pages). */
  showCategoryRelated: boolean;
};
