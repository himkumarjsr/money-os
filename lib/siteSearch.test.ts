import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  groupSearchResults,
  normaliseSearchText,
  searchEntries,
} from "@/lib/siteSearch";
import { buildWebSearchIndex } from "@/lib/siteSearchIndex";

const index = buildWebSearchIndex();
const top = (q: string, n = 5) => searchEntries(index, q, n).map((r) => r.href);

describe("site search", () => {
  it("mobile keeps a byte-identical copy of the matcher", () => {
    const root = path.resolve(__dirname, "..");
    expect(
      readFileSync(path.join(root, "mobile/lib/siteSearch.ts"), "utf8"),
    ).toBe(readFileSync(path.join(root, "lib/siteSearch.ts"), "utf8"));
  });

  it("indexes every kind with unique, internal hrefs", () => {
    const kinds = new Set(index.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(
      ["blog", "calculator", "feature", "learn", "page"].sort(),
    );
    for (const e of index) expect(e.href.startsWith("/")).toBe(true);
    const articleHrefs = index
      .filter(
        (e) =>
          e.kind === "learn" || e.kind === "blog" || e.kind === "calculator",
      )
      .map((e) => e.href);
    expect(new Set(articleHrefs).size).toBe(articleHrefs.length);
  });

  it("never ships article bodies", () => {
    expect(JSON.stringify(index).length).toBeLessThan(250_000);
  });

  it("empty or punctuation-only queries return nothing", () => {
    expect(searchEntries(index, "")).toEqual([]);
    expect(searchEntries(index, "  ?! ")).toEqual([]);
  });

  it("puts the matching calculator first", () => {
    expect(top("sip", 1)).toEqual(["/calculators/sip"]);
    expect(top("ppf calculator", 1)).toEqual(["/calculators/ppf"]);
    expect(top("tax regime", 3)).toContain("/calculators/tax-regime-2026");
  });

  it("finds app features and screens", () => {
    expect(top("tracker", 3)).toContain("/tracker");
    expect(top("split", 3)).toContain("/split");
    expect(top("dark mode", 3)).toContain("/settings");
  });

  it("matches prefixes while typing and short forms", () => {
    expect(top("emerg", 10)).toContain("/calculators/emergency");
    expect(searchEntries(index, "pf").length).toBeGreaterThan(0);
    expect(top("pf", 10)).toContain("/calculators/epf");
  });

  it("returns Learn and blog articles", () => {
    const kinds = new Set(
      searchEntries(index, "term insurance").map((r) => r.kind),
    );
    expect(kinds.has("learn") || kinds.has("blog")).toBe(true);
  });

  it("requires every word to match", () => {
    expect(searchEntries(index, "sip zzzqqq")).toEqual([]);
  });

  it("groups results with the best match first", () => {
    const groups = groupSearchResults(searchEntries(index, "sip"));
    expect(groups[0].kind).toBe("calculator");
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });

  it("normalises accents, case and rupee signs", () => {
    expect(normaliseSearchText("  ₹1 Crore SIP!  ")).toBe("rs 1 crore sip");
  });
});
