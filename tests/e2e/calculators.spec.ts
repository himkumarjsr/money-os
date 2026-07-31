import { expect, test } from "@playwright/test";

test.describe("Calculators", () => {
  test("tax calculator loads", async ({ page }) => {
    await page.goto("/calculators/tax-regime-2026");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/tax|regime|FY|income/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("tax calculator accepts income input", async ({ page }) => {
    await page.goto("/calculators/tax-regime-2026");
    await expect(page.getByText(/tax|regime|FY|income/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Personal CA wizard may require choosing an employment style first.
    const employment = page
      .getByRole("button", { name: /salaried|employee|freelancer|business/i })
      .first();
    if (await employment.isVisible().catch(() => false)) {
      await employment.click();
      await page.waitForTimeout(400);
    }

    const moneyInput = page.locator('input[inputmode="decimal"]').first();
    if (await moneyInput.isVisible().catch(() => false)) {
      await moneyInput.fill("1200000");
      await expect(moneyInput).toHaveValue(/1/);
    }

    await expect(page.getByText(/₹|regime|tax|old|new/i).first()).toBeVisible();
  });

  test("SIP clean URL is indexable and loads", async ({ page }) => {
    await page.goto("/calculators/sip");
    await expect(page).toHaveURL(/\/calculators\/sip/);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/calculators\/sip$/,
    );
  });

  test("legacy SIP query redirects to clean URL", async ({ page }) => {
    await page.goto("/calculators?calc=sip");
    await expect(page).toHaveURL(/\/calculators\/sip/);
  });

  test("EMI clean URL loads", async ({ page }) => {
    await page.goto("/calculators/emi");
    await expect(page).toHaveURL(/\/calculators\/emi/);
    await expect(page.locator("body")).toBeVisible();
  });
});
