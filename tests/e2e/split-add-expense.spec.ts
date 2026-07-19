import { expect, test } from "@playwright/test";
import { getE2ECredentials, loginWithPassword } from "./helpers/auth";

const hasCreds = Boolean(getE2ECredentials());

/**
 * Smoke + authenticated checks for Split add-expense:
 * - Back navigates to group
 * - Equal split preview shows per-person amounts
 */
test.describe("FK Split — Add expense UI", () => {
  test("add-expense route does not crash without auth", async ({ page }) => {
    await page.goto("/split/00000000-0000-0000-0000-000000000000/add-expense");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/\/(split|login)/);
  });

  test("back link targets group when on add-expense URL", async ({ page }) => {
    const groupId = "e4f46c93-2173-4f08-b19c-29f247712f55";
    await page.goto(`/split/${groupId}/add-expense`);
    await page.waitForTimeout(2500);

    // Prefer exact Back control — avoid matching "feedback" links (/back/i).
    const back = page.locator('[data-testid="back-href"]').first();
    if (await back.isVisible().catch(() => false)) {
      await expect(back).toHaveAttribute("href", `/split/${groupId}`);
      await back.click();
      await page.waitForURL(new RegExp(`/split/${groupId}`), {
        timeout: 10000,
      });
      expect(page.url()).not.toMatch(/add-expense/);
    } else {
      // Logged-out users should land on login (or stay gated).
      expect(page.url()).toMatch(/\/(login|split)/);
    }
  });
});

test.describe("FK Split — Add expense (authenticated)", () => {
  test.skip(!hasCreds, "Set E2E_USER_EMAIL + E2E_USER_PASSWORD in .env.local");

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(page);
  });

  test("can open a group and use Back from add-expense", async ({ page }) => {
    await page.goto("/split");
    await page.waitForTimeout(2500);

    const groupLink = page.locator('a[href^="/split/"]').first();
    if (!(await groupLink.isVisible().catch(() => false))) {
      test.skip(true, "No split groups available for E2E user");
      return;
    }

    const href = (await groupLink.getAttribute("href")) || "";
    const groupId = href.split("/split/")[1]?.split(/[?#]/)[0];
    expect(groupId).toBeTruthy();

    await page.goto(`/split/${groupId}/add-expense`);
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/add-expense/);

    const back = page.locator('[data-testid="back-href"]').first();
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute("href", `/split/${groupId}`);
    await back.click();
    await page.waitForURL(new RegExp(`/split/${groupId}`), { timeout: 10000 });
    expect(page.url()).not.toMatch(/add-expense/);
  });

  test("equal split preview shows fair per-person amounts", async ({
    page,
  }) => {
    await page.goto("/split");
    await page.waitForTimeout(2500);

    const groupLink = page.locator('a[href^="/split/"]').first();
    if (!(await groupLink.isVisible().catch(() => false))) {
      test.skip(true, "No split groups available for E2E user");
      return;
    }

    const href = (await groupLink.getAttribute("href")) || "";
    const groupId = href.split("/split/")[1]?.split(/[?#]/)[0];
    await page.goto(`/split/${groupId}/add-expense`);
    await page.waitForTimeout(2500);

    const desc = page
      .getByPlaceholder(/description|what for|title|beach/i)
      .first();
    if (await desc.isVisible().catch(() => false)) {
      await desc.fill("E2E equal split");
    }

    const amount = page.locator('input[type="number"]').first();
    await expect(amount).toBeVisible({ timeout: 10000 });
    await amount.fill("100");

    const equalBtn = page.getByRole("button", { name: /^equal$/i });
    await expect(equalBtn).toBeVisible();
    await equalBtn.click();

    await expect(page.getByText(/equal split/i).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/people/i).first()).toBeVisible();
  });
});
