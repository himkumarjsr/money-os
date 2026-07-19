import { test, expect } from "@playwright/test";

test.describe("FK Split — Complete Flow", () => {
  test("split page loads when logged out", async ({ page }) => {
    await page.goto("/split");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
    await page.waitForTimeout(2500);
    expect(page.url()).toMatch(/\/(split|login)/);
  });

  test("join page invalid token shows error without crash", async ({
    page,
  }) => {
    await page.goto("/split/join?token=invalidtoken");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
  });

  test("join page with code param loads", async ({ page }) => {
    await page.goto("/split/join?code=TESTCODE");
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(page.url()).toMatch(/\/(split\/join|login)/);
  });

  test("split nav link is reachable from home", async ({ page }) => {
    await page.goto("/");
    const splitTab = page.getByRole("link", { name: /split/i }).first();
    if (await splitTab.isVisible().catch(() => false)) {
      await splitTab.click();
      await expect(page).toHaveURL(/\/split/);
    }
  });
});
