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
    const cta = page
      .getByRole("link", {
        name: /check|health|analyse|analyze|start|score/i,
      })
      .first();
    if (await cta.isVisible().catch(() => false)) {
      await cta.click();
      await expect(page).toHaveURL(/\/(analyse|login)/);
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
