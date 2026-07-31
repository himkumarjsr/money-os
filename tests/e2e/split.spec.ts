import { expect, test } from "@playwright/test";

test.describe("FK Split", () => {
  test("split page loads when logged out", async ({ page }) => {
    await page.goto("/split");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/error/);
  });

  test("logged-out split shows public marketing landing", async ({ page }) => {
    await page.goto("/split");
    await expect(page).toHaveURL(/\/split/);
    await expect(
      page.getByRole("heading", {
        name: /split expenses with friends/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("link", { name: /create free split account/i }).first(),
    ).toBeVisible();
  });

  test("join page handles invalid token without crash", async ({ page }) => {
    await page.goto("/split/join?token=invalidtoken123");
    await page.waitForTimeout(1500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("join page with token shows joining or result UI", async ({ page }) => {
    await page.goto("/split/join?token=e2e-open-invite-token");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
    // Smoke: join client mounted (loading / success / error / login redirect).
    const url = page.url();
    expect(url).toMatch(/\/(split\/join|login)/);
  });
});
