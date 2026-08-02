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

  test("SIP rate field accepts decimals and syncs slider", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/calculators/sip");

    // Desktop panel (mobile sheet also mounts a copy off-screen).
    const panel = page.locator("div.md\\:grid section[aria-live='polite']");
    await expect(panel.getByText("Expected annual return")).toBeVisible({
      timeout: 15_000,
    });

    const rateField = panel
      .locator("div.flex-col")
      .filter({ hasText: "Expected annual return" })
      .first();
    const rateInput = rateField.locator('input[inputmode="decimal"]');
    const rateSlider = rateField.locator('input[type="range"]');

    await rateInput.fill("12.5");
    await rateInput.blur();

    await expect(rateInput).toHaveValue("12.5");
    await expect(rateSlider).toHaveValue("12.5");
    await expect(rateField.getByText("12.5% p.a.")).toBeVisible();

    await rateSlider.fill("11.3");
    await expect(rateInput).toHaveValue("11.3");
    await expect(rateField.getByText("11.3% p.a.")).toBeVisible();
  });

  test("SIP money field clamps above ₹99 crore", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/calculators/sip");

    const panel = page.locator("div.md\\:grid section[aria-live='polite']");
    await expect(panel.getByText("Monthly SIP")).toBeVisible({
      timeout: 15_000,
    });

    const moneyField = panel
      .locator("div.flex-col")
      .filter({ hasText: "Monthly SIP" })
      .first();
    const moneyInput = moneyField.locator('input[type="text"]');

    await moneyInput.fill("2000000000");
    await moneyInput.blur();

    await expect(moneyInput).toHaveValue("99,00,00,000");
  });

  test("Post Office suite and TD calculator load", async ({ page }) => {
    await page.goto("/calculators/po");
    await expect(page).toHaveURL(/\/calculators\/po/);
    await expect(
      page.getByText(/Choose a scheme|Time Deposit|All schemes/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/calculators/po-td");
    await expect(page).toHaveURL(/\/calculators\/po-td/);
    await expect(
      page.getByText(/Deposit amount|Tenure|Maturity/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test("NSC and SCSS calculator pages load", async ({ page }) => {
    await page.goto("/calculators/nsc");
    await expect(
      page.getByText(/One-time investment|5-year maturity|NSC/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/calculators/po-scss");
    await expect(
      page.getByText(/Senior|Quarterly|Deposit/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
