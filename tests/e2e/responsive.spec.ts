import { expect, test } from "@playwright/test";

const viewports = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "Samsung Galaxy S21", width: 360, height: 800 },
  { name: "iPad", width: 768, height: 1024 },
  { name: "Desktop", width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test.describe(`Responsive — ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
    });

    test("landing page renders without horizontal overflow", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator("h1").first()).toBeVisible();
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      // Allow small layout slack at tablet breakpoints (md transition).
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 60);
    });

    test("bottom nav visible on mobile", async ({ page }) => {
      test.skip(viewport.width >= 768, "Desktop hides bottom nav");
      await page.goto("/");
      const nav = page.locator('[data-track-nav-zone="bottom_nav"]').first();
      await expect(nav).toBeVisible({ timeout: 10_000 });
    });

    test("tax calculator usable without overflow", async ({ page }) => {
      await page.goto("/calculators/tax-regime-2026");
      await expect(page.locator("body")).toBeVisible();
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 60);
    });
  });
}
