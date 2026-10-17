import { describe, expect, it } from "vitest";
import {
  fitDescription,
  fitMetadata,
  fitTitle,
  generatePageMeta,
  pageMetadata,
} from "@/lib/seo";

describe("SEO length helpers", () => {
  it("drops the Finkoin suffix only when a title is too long", () => {
    expect(fitTitle("SIP Calculator | Finkoin")).toBe(
      "SIP Calculator | Finkoin",
    );
    const long = "A".repeat(55) + " | Finkoin Learn";
    expect(fitTitle(long)).toBe("A".repeat(55));
  });

  it("trims descriptions at a sentence or word boundary", () => {
    const sentences = `${"Word ".repeat(20).trim()}. ${"More ".repeat(30).trim()}.`;
    const fitted = fitDescription(sentences);
    expect(fitted.length).toBeLessThanOrEqual(155);
    expect(fitted.endsWith(".")).toBe(true);
    const words = "word ".repeat(60).trim();
    expect(fitDescription(words).endsWith("…")).toBe(true);
    expect(fitDescription("Short.")).toBe("Short.");
  });

  it("makes branded string titles absolute so the template does not double the suffix", () => {
    const meta = fitMetadata({
      title: "80C Guide | Finkoin",
      description: "x".repeat(200),
      openGraph: { title: "t", description: "y ".repeat(120) },
    });
    expect(meta.title).toEqual({ absolute: "80C Guide | Finkoin" });
    expect((meta.description as string).length).toBeLessThanOrEqual(155);
    expect(
      (meta.openGraph as { description: string }).description.length,
    ).toBeLessThanOrEqual(155);
    expect(fitMetadata({ title: "Short" }).title).toBe("Short");
  });

  it("never points a page's canonical at the home page by default", () => {
    expect("alternates" in generatePageMeta("Tool", "Desc")).toBe(false);
    const meta = pageMetadata({
      title: "Goals | Finkoin",
      description: "d",
      path: "/goals",
      noindex: true,
    });
    expect(meta.alternates.canonical).toBe("/goals");
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});
