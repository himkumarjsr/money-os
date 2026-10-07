/**
 * Structured content model shared by native Legal, Learn and About screens.
 *
 * Inline strings support a tiny markup: `**bold**`, `*italic*` and
 * `[label](href)`. Hrefs are resolved in-app by `lib/contentLinks.ts`.
 */

export type ContentTone =
  /** Purple summary box (#EEEDFE / #3C3489). */
  | "violet"
  /** Learn emerald callout. */
  | "emerald"
  /** Learn amber callout (educational-only notes). */
  | "amber"
  /** Legal warm warning (#FFF8F0 / #633806). */
  | "warn"
  /** Legal green (#E1F5EE / #1D5C3A). */
  | "green"
  /** Legal red (#FCEBEB / #791F1F). */
  | "red"
  /** Learn rose callout. */
  | "rose"
  /** Learn sky callout. */
  | "sky"
  /** Neutral grey (#F7F7F4 / #5F5E5A). */
  | "grey"
  /** Finkoin tip box. */
  | "brand";

export type ContentAction = { label: string; href: string; primary?: boolean };

export type ContentBlock =
  | { kind: "p"; text: string; muted?: boolean; small?: boolean }
  | {
      kind: "ul";
      items: string[];
      ordered?: boolean;
      /** Hide the bullet glyph (item text carries its own marker). */
      plain?: boolean;
      /** Two-line items: first `**…**` line bold, rest as body. */
      spaced?: boolean;
    }
  | { kind: "h3"; text: string }
  | {
      kind: "callout";
      tone: ContentTone;
      title?: string;
      text?: string;
      blocks?: ContentBlock[];
    }
  | {
      kind: "table";
      headers: string[];
      rows: string[][];
      boldFirstCol?: boolean;
      /** Highlight the final row as a total. */
      totalRow?: boolean;
      /** Colour the last column in brand purple. */
      accentLastCol?: boolean;
      /** Relative column widths (non-scrolling tables). */
      colFlex?: number[];
      /** Force horizontal scrolling with this column width. */
      scrollColWidth?: number;
    }
  | { kind: "formula"; text: string }
  | {
      kind: "cards";
      items: { title: string; text: string; href?: string }[];
      tone?: "white" | "grey";
    }
  | {
      kind: "actions";
      title?: string;
      text?: string;
      actions: ContentAction[];
      tone?: "brand" | "grey";
    }
  | {
      kind: "tool";
      title: string;
      subtitle?: string;
      text?: string;
      href: string;
      label: string;
    }
  | { kind: "links"; title?: string; items: { label: string; href: string }[] }
  | { kind: "tags"; items: { label: string; tone?: ContentTone }[] }
  | { kind: "widget"; widget: string };

export type ContentSection = {
  id: string;
  title?: string;
  subtitle?: string;
  blocks: ContentBlock[];
  /** Render the section inside a white bordered card (Learn guide style). */
  card?: boolean;
};

export type TocItem = { id: string; label: string };
