import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Load KEY=VALUE from .env.local / .env.test.local without adding a dotenv dependency. */
function loadEnvFile(filename: string) {
  const full = path.join(process.cwd(), filename);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.test.local");

// Opt-in only (unset in CI and for any normal contributor): some sandboxed
// environments only ship a plain Chromium binary, not the separate
// chrome-headless-shell build Playwright's headless Chromium project wants
// by default. Setting this in a local, gitignored .env.test.local points
// Playwright at that binary instead of failing to launch; everyone else's
// setup is untouched.
const chromiumExecutablePath = process.env.PW_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...(chromiumExecutablePath
      ? { launchOptions: { executablePath: chromiumExecutablePath } }
      : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Chromium-based mobile profile (no separate WebKit install required).
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      // Optional WebKit project — run after `npx playwright install webkit`.
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    // Prefer a stable route — `/` can briefly 404 during Fast Refresh / CSR bailout.
    url: "http://localhost:3000/calculators",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
