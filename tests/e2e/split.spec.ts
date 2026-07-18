import { expect, test } from "@playwright/test";

test.describe("FK Split", () => {
  test("split page loads when logged out", async ({ page }) => {
    await page.goto("/split");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test("split protected route stays usable when logged out", async ({
    page,
  }) => {
    await page.goto("/split");
    // Gate may redirect to /login, show spinner, or briefly stay on /split.
    await page.waitForTimeout(2500);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/\/(split|login)/);
  });

  test("join page handles invalid token without crash", async ({ page }) => {
    await page.goto("/split/join?token=invalidtoken123");
    await page.waitForTimeout(1500);
    await expect(page.locator("body")).toBeVisible();
  });
});
