import { describe, expect, it } from "vitest";
import {
  findAbbreviations,
  hasFullForm,
} from "@/app/calculators/calculator-abbreviations";
import { CATEGORIES } from "@/app/calculators/calculator-config";
import { getCalcGuide } from "@/app/calculators/calculator-guides";
import {
  INDEXABLE_CALC_IDS,
  SEO_COPY,
  buildCalculatorJsonLd,
  getRelatedLinksForCalc,
  getSeoForCalc,
} from "@/app/calculators/calculator-seo";
import { ABBREVIATIONS } from "@/app/calculators/calculator-abbreviations";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, fitTitle } from "@/lib/seo";

/**
 * Enforces the calculator SEO checklist (docs/CALCULATOR_SEO_CHECKLIST.md)
 * for every calculator, so a new one can't ship without it.
 */
const ALL_IDS = CATEGORIES.flatMap((c) => c.items.map((i) => i.id));
const seoOf = (id: string) => getSeoForCalc(id);
/** Abbreviations in the calculator's own name, e.g. STP for "STP Calculator". */
const ownAbbr = (id: string) => findAbbreviations(seoOf(id).appName);

describe("calculator SEO checklist", () => {
  it("covers all 70 calculators with their own copy", () => {
    expect(ALL_IDS).toHaveLength(70);
    for (const id of ALL_IDS) expect(SEO_COPY[id], id).toBeDefined();
  });

  it("lists every calculator except tax regime in the sitemap ids", () => {
    expect([...INDEXABLE_CALC_IDS, "tax-regime"].sort()).toEqual(
      [...ALL_IDS].sort(),
    );
  });

  it.each(ALL_IDS)("%s: abbreviations are known and spelled out", (id) => {
    const seo = seoOf(id);
    const text = `${seo.title} ${seo.description}`;
    for (const abbr of findAbbreviations(text)) {
      expect(
        ABBREVIATIONS[abbr],
        `${id}: add ${abbr} to ABBREVIATIONS`,
      ).toBeDefined();
      expect(
        hasFullForm(text, abbr),
        `${id}: spell out ${abbr} in the title or description`,
      ).toBe(true);
    }
  });

  it.each(ALL_IDS)(
    "%s: its own abbreviation is spelled out in the description, intro, FAQ and keywords",
    (id) => {
      const seo = seoOf(id);
      const intro = getCalcGuide(id)?.intro;
      const faqText = seo.faq.map((f) => `${f.q} ${f.a}`).join(" ");
      for (const abbr of ownAbbr(id)) {
        expect(hasFullForm(seo.description, abbr), `${id} description`).toBe(
          true,
        );
        if (intro) expect(hasFullForm(intro, abbr), `${id} intro`).toBe(true);
        expect(hasFullForm(faqText, abbr), `${id} FAQ`).toBe(true);
        expect(
          seo.keywords.some((k) => hasFullForm(k, abbr)),
          `${id} keywords`,
        ).toBe(true);
      }
    },
  );

  it.each(ALL_IDS)("%s: title fits and leads with the calculator", (id) => {
    const title = fitTitle(seoOf(id).title);
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
    expect(title.split(" - ")[0]).toMatch(/Calculator|Calculations/);
  });

  it.each(ALL_IDS)("%s: description is 120–155 characters", (id) => {
    const { description } = seoOf(id);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    expect(description.toLowerCase()).toContain("calculator");
  });

  it("titles and descriptions are unique", () => {
    const titles = ALL_IDS.map((id) => fitTitle(seoOf(id).title));
    const descriptions = ALL_IDS.map((id) => seoOf(id).description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it.each(ALL_IDS)("%s: has at least 3 distinct FAQs", (id) => {
    const qs = seoOf(id).faq.map((f) => f.q);
    expect(qs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(qs).size).toBe(qs.length);
  });

  it.each(INDEXABLE_CALC_IDS)("%s: has a 25+ word intro", (id) => {
    const intro = getCalcGuide(id)?.intro ?? "";
    expect(intro.split(/\s+/).length).toBeGreaterThanOrEqual(25);
  });

  it.each(ALL_IDS)("%s: has at least 3 related links", (id) => {
    expect(getRelatedLinksForCalc(id).length).toBeGreaterThanOrEqual(3);
  });

  it.each(ALL_IDS)("%s: JSON-LD has the app, full name and FAQ", (id) => {
    const seo = seoOf(id);
    const graph = buildCalculatorJsonLd(seo, id)["@graph"];
    const app = graph[0] as Record<string, unknown>;
    expect(app["@type"]).toBe("WebApplication");
    expect(app.inLanguage).toBe("en-IN");
    expect(app.isAccessibleForFree).toBe(true);
    for (const abbr of ownAbbr(id)) {
      expect(hasFullForm(String(app.alternateName), abbr)).toBe(true);
    }
    const faq = graph[1] as { mainEntity: unknown[] };
    expect(faq.mainEntity).toHaveLength(seo.faq.length);
  });
});

describe("abbreviation helpers", () => {
  it("finds abbreviations but not section numbers", () => {
    expect(findAbbreviations("STP and SIP under 80C or 44ADA, STP")).toEqual([
      "STP",
      "SIP",
    ]);
  });

  it("matches full forms regardless of case, apostrophes and hyphens", () => {
    expect(hasFullForm("a systematic transfer plan", "STP")).toBe(true);
    expect(hasFullForm("Senior Citizens Savings Scheme", "SCSS")).toBe(true);
    expect(hasFullForm("long term capital gains", "LTCG")).toBe(true);
    expect(hasFullForm("STP calculator", "STP")).toBe(false);
    expect(hasFullForm("anything", "UNKNOWN")).toBe(false);
  });
});
