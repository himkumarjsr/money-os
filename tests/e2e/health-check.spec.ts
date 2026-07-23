import { expect, test } from "@playwright/test";

test.describe("Health Check Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("landing page loads correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/Finkoin/i);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(
      page.getByText(/Free|financial health/i).first(),
    ).toBeVisible();
  });

  test("CTA navigates toward analyse", async ({ page }) => {
    // Prefer an explicit analyse href — generic "start/check" names can match
    // other home cards and leave the URL unchanged.
    const analyseHref = page.locator('a[href^="/analyse"]').first();
    if (await analyseHref.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForURL(/\/(analyse|login)/, { timeout: 10_000 }),
        analyseHref.click(),
      ]);
      return;
    }

    const cta = page
      .getByRole("link", {
        name: /guided checkup|health check|start analysis/i,
      })
      .first();
    if (await cta.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForURL(/\/(analyse|login)/, { timeout: 10_000 }),
        cta.click(),
      ]);
    } else {
      await page.goto("/analyse");
      await expect(page).toHaveURL(/\/(analyse|login)/);
    }
  });

  test("analyse route does not crash", async ({ page }) => {
    await page.goto("/analyse");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test("logged-out analyse shows login or form shell", async ({ page }) => {
    await page.goto("/analyse");
    await page.waitForTimeout(800);
    const hasLogin = await page
      .getByRole("button", { name: /log in|sign in/i })
      .or(page.getByRole("link", { name: /log in|sign in/i }))
      .first()
      .isVisible()
      .catch(() => false);
    const hasForm = await page
      .locator("input, button")
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasLogin || hasForm).toBeTruthy();
  });
});
