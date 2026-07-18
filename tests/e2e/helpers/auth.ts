import { expect, type Page } from "@playwright/test";

/** Never commit real passwords — set these in `.env.local` (gitignored). */
export function getE2ECredentials(): {
  email: string;
  password: string;
} | null {
  const email = (
    process.env.E2E_USER_EMAIL ||
    process.env.TEST_USER_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  const password = (
    process.env.E2E_USER_PASSWORD ||
    process.env.TEST_USER_PASSWORD ||
    ""
  ).trim();
  if (!email || !password) return null;
  return { email, password };
}

export function requireE2ECredentials() {
  const creds = getE2ECredentials();
  if (!creds) {
    throw new Error(
      "Missing E2E_USER_EMAIL / E2E_USER_PASSWORD. Add them to .env.local (see .env.example).",
    );
  }
  return creds;
}

/** Password login via /login UI. Assumes email is already confirmed. */
export async function loginWithPassword(page: Page) {
  const { email, password } = requireE2ECredentials();
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  // Prefer stable labels / placeholders used on login page
  const emailInput = page
    .locator(
      'input[type="email"], input[name="email"], input[placeholder*="mail" i]',
    )
    .first();
  const passwordInput = page.locator('input[type="password"]').first();

  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submit = page
    .getByRole("button", { name: /log in|sign in|continue/i })
    .first();
  await submit.click();

  // Land anywhere except stuck on /login with an error forever
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
}
