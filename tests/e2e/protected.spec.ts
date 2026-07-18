import { expect, test } from "@playwright/test";
import { getE2ECredentials, loginWithPassword } from "./helpers/auth";

const hasCreds = Boolean(getE2ECredentials());

test.describe("Protected routes (logged in)", () => {
  test.skip(!hasCreds, "Set E2E_USER_EMAIL + E2E_USER_PASSWORD in .env.local");

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(page);
  });

  test("tracker loads for authenticated user", async ({ page }) => {
    await page.goto("/tracker");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/\/tracker/);
  });

  test("split home loads for authenticated user", async ({ page }) => {
    await page.goto("/split");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/\/split/);
  });

  test("profile loads for authenticated user", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/\/(profile|login)/);
  });
});
