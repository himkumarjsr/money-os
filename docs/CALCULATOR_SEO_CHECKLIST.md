# Finkoin calculator pages: SEO checklist

Applies to every calculator page under `/calculators/<id>` (70 calculators) and the tax regime page at `/calculators/tax-regime-2026`.
Items marked **(test)** are enforced by `tests/unit/calculatorSeo.test.ts`, so a new calculator can't ship without them. Full forms live in `app/calculators/calculator-abbreviations.ts`; add a new abbreviation there before using it in a title or description.

## 1. Abbreviations and full forms

- [ ] Every abbreviation in the calculator name is spelled out in the **meta description**, written as "full form (ABBR)" or "ABBR (full form)". Example: "Systematic Transfer Plan (STP) calculator…" **(test)**
- [ ] The full form also appears in the **title** when it fits in 60 characters (e.g. "STP Calculator — Systematic Transfer Plan").
- [ ] Other abbreviations used in the title or description are spelled out too, at least once (EMI, TDS, XIRR, CAGR, SGB, ETF, STCG/LTCG, CTC, GST, IRR, DA and so on), or reworded away. Unknown abbreviations fail the test. **(test)**
- [ ] The intro paragraph right under the H1 spells out the abbreviation on first use. **(test)**
- [ ] One FAQ (first where possible) answers "What is <ABBR>?" with the full form. **(test)**
- [ ] Keywords include the full-form search phrase (e.g. "systematic transfer plan calculator"); added automatically. **(test)**

## 2. Title tag

- [ ] 30–60 characters so Google doesn't cut it (the " | Finkoin" suffix is dropped automatically when it pushes past 60). **(test)**
- [ ] Starts with the primary keyword: "<Name> Calculator". **(test)**
- [ ] Unique across all calculators. **(test)**
- [ ] Says what the user gets (maturity, EMI, tax, corpus…) after the dash.

## 3. Meta description

- [ ] 120–155 characters: long enough to fill the snippet, short enough not to be cut. **(test)**
- [ ] Opens with "Free <name> calculator" and names the main outputs. **(test: contains "calculator")**
- [ ] Unique across all calculators. **(test)**
- [ ] Mentions India where it reads naturally (INR, Indian rules, notified rates).
- [ ] No keyword stuffing ("best … calculator 2026" repeated).

## 4. Other meta tags (handled centrally, checked once)

- [ ] Canonical URL is the clean `/calculators/<id>` path.
- [ ] `robots: index, follow`.
- [ ] Open Graph and Twitter title, description and 1200×630 image with alt text.
- [ ] Page is listed in `sitemap.xml`. **(test)**

## 5. Headings and on-page content

- [ ] Exactly one H1, the calculator name, in server-rendered HTML.
- [ ] Intro paragraph under the H1 (25+ words) says what the calculator answers. **(test)**
- [ ] H2s: How it works / guide, About, FAQ. H3s for formula, worked example, tips.
- [ ] Worked example with real rupee numbers, and a ready-reckoner table where it helps.
- [ ] Breadcrumb: Home › Calculators › <Name>.

## 6. FAQ

- [ ] At least 3 questions per calculator. **(test)**
- [ ] First question defines the term (see section 1).
- [ ] Answers are 1–3 plain sentences, specific to India, no duplicates across the same page. **(test: unique questions)**
- [ ] Same Q&A is visible on the page and in the FAQPage schema.

## 7. Structured data (JSON-LD)

- [ ] `WebApplication` with name, description, URL, `applicationCategory: FinanceApplication`, free `Offer` in INR, `inLanguage: en-IN`, `isAccessibleForFree`. **(test)**
- [ ] `alternateName` carries the full-form name (e.g. "Systematic Transfer Plan Calculator"). **(test)**
- [ ] `featureList` says what the calculator does (its blurb), not the FAQ questions.
- [ ] `FAQPage` mirrors the visible FAQ, and every FAQ in the schema is visible on the page. **(test)**
- [ ] `BreadcrumbList` (from the breadcrumb component).

## 8. Internal links

- [ ] At least 3 related links: a Learn guide where one exists, sibling calculators, Financial Health Check. **(test)**
- [ ] Hub page `/calculators` links to every calculator.

## 9. Freshness and accuracy

- [ ] Rates and limits quoted in title/description match the calculator (PPF, SCSS, SSY, KVP rates; ₹1.25 lakh LTCG limit; FY 2025-26 slabs).
- [ ] When a rate quarter changes, update the description and FAQ in the same PR.
