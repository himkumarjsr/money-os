import type { ContentBlock, ContentTone } from "@/components/content/types";

export type LegalSection = { title: string; blocks: ContentBlock[] };

export type LegalDoc = {
  slug: string;
  /** Purple uppercase eyebrow above the title. */
  eyebrow: string;
  title: string;
  /** "Last updated …" line (or the page's subtitle line). */
  meta: string;
  summary?: { tone: ContentTone; text: string };
  /** `underlined` = h2 with bottom rule (Privacy/Terms); `plain` = h2 only. */
  headingStyle: "underlined" | "plain" | "small";
  sections: LegalSection[];
  /** Centered small print under a top rule. Each entry is a paragraph. */
  footer?: string[];
  /** Small muted note after the sections (no rule). */
  note?: string;
};
