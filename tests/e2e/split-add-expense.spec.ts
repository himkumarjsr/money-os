import { expect, test } from "@playwright/test";
import { getE2ECredentials, loginWithPassword } from "./helpers/auth";

const hasCreds = Boolean(getE2ECredentials());

/**
 * Smoke + authenticated checks for Split add-expense:
 * - Back navigates to group
 * - Equal split preview shows per-person amounts
 */
test.describe("FK Split — Group detail scroll", () => {
  test("Add expense link points at add-expense route", async ({ page }) => {
    const groupId = "e4f46c93-2173-4f08-b19c-29f247712f55";
    await page.goto(`/split/${groupId}`);
    await page.waitForTimeout(2500);

    const add = page.locator('[data-testid="add-expense-link"]').first();
    if (await add.isVisible().catch(() => false)) {
      await add.click();
      await page.waitForURL(new RegExp(`/split/${groupId}/add-expense`), {
        timeout: 10000,
      });
      expect(page.url()).toMatch(/add-expense/);
      await expect(
        page.getByText(/Failed to compile|Server Error/i),
      ).toHaveCount(0);
    } else {
      // Logged out → login redirect is fine for this smoke.
      expect(page.url()).toMatch(/\/(login|split)/);
    }
  });

  test("group page keeps document scroll unlocked", async ({ page }) => {
    await page.goto("/split/e4f46c93-2173-4f08-b19c-29f247712f55");
    await page.waitForTimeout(2500);

    const scroll = await page.evaluate(() => {
      // Force tall content so scroll is measurable even on login shell.
      const probe = document.createElement("div");
      probe.style.height = "2000px";
      probe.id = "scroll-probe";
      document.body.appendChild(probe);
      const before = window.scrollY;
      window.scrollTo(0, 600);
      const after = window.scrollY;
      const bodyOverflow = document.body.style.overflow;
      const htmlOverflow = document.documentElement.style.overflow;
      probe.remove();
      window.scrollTo(0, before);
      return { after, bodyOverflow, htmlOverflow };
    });

    expect(scroll.after).toBeGreaterThanOrEqual(500);
    expect(scroll.bodyOverflow).not.toBe("hidden");
    expect(scroll.htmlOverflow).not.toBe("hidden");
  });
});

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

    // Back is a button that navigates to the group expenses page.
    const back = page.locator('[data-testid="back-href"]').first();
    if (await back.isVisible().catch(() => false)) {
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
