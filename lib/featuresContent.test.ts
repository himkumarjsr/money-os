import { describe, expect, it } from "vitest";
import { FEATURE_TAGS, FINKOIN_FEATURES } from "./featuresContent";

describe("featuresContent", () => {
  it("gives every feature a unique id, tags and an internal link", () => {
    const ids = FINKOIN_FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of FINKOIN_FEATURES) {
      expect(f.tags.length).toBeGreaterThan(0);
      expect(f.highlights.length).toBeGreaterThan(0);
      expect(f.href.startsWith("/")).toBe(true);
      for (const tag of f.tags) expect(FEATURE_TAGS).toContain(tag);
    }
  });

  it("marks each feature as Free or Pro", () => {
    for (const f of FINKOIN_FEATURES) {
      expect(f.tags.includes("Free") || f.tags.includes("Pro")).toBe(true);
    }
  });

  it("avoids investment-advice and insurance-selling claims", () => {
    const banned =
      /\b(advisor|adviser|recommend|best fund|guaranteed|commission|buy insurance|switch polic)/i;
    for (const f of FINKOIN_FEATURES) {
      const copy = [f.name, f.headline, f.body, ...f.highlights].join(" ");
      expect(copy).not.toMatch(banned);
    }
  });
});
